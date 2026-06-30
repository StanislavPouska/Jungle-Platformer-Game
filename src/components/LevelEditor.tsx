/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Level, Platform, Toad, Collectible, LevelBackgroundId } from '../types';
import { INITIAL_LEVELS } from '../data';
import { Lang, UI } from '../i18n';
import {
  Plus,
  Copy,
  Trash2,
  Play,
  RotateCcw,
  Flag,
  DoorOpen,
  Upload,
  X,
  MousePointerClick,
  Box,
  Bug,
  Cherry,
  Star,
} from 'lucide-react';

// The platformer world is authored 420px tall but content can sit lower (fall
// line ~550); the editor shows a slightly taller band so low platforms fit.
const WORLD_H = 640;
const VIEWPORT_H = 460; // on-screen height of the editing canvas (px)
const SCALE = VIEWPORT_H / WORLD_H;
const GRID = 10; // world-units the editor snaps placements to
const MIN_WORLD_W = 3000; // canvas always at least this wide (scrollable)

const PLATFORM_COLOR: Record<Platform['type'], string> = {
  moss_log: '#15803d',
  jungle_brick: '#64748b',
  vine_bridge: '#b45309',
  canopy_leaves: '#16a34a',
};

const COLLECTIBLE_COLOR: Record<Collectible['type'], string> = {
  banana: '#facc15',
  mango: '#f59e0b',
  star: '#67e8f9',
};

type Selection =
  | { kind: 'platform'; id: string }
  | { kind: 'toad'; id: string }
  | { kind: 'collectible'; id: string }
  | { kind: 'start' }
  | { kind: 'end' };

type PaletteItem =
  | { group: 'platform'; type: Platform['type'] }
  | { group: 'toad' }
  | { group: 'collectible'; type: Collectible['type'] };

type DragState = {
  sel: Selection;
  mode: 'move' | 'resize';
  grabDX: number;
  grabDY: number;
  startW: number;
  startH: number;
  startWX: number;
  startWY: number;
};

interface LevelEditorProps {
  levels: Level[];
  onLevelsChange: (next: Level[]) => void;
  onPlaytest: (index: number) => void;
  language: Lang;
}

const snap = (v: number) => Math.round(v / GRID) * GRID;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function LevelEditor({ levels, onLevelsChange, onPlaytest, language }: LevelEditorProps) {
  const t = UI[language];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [armed, setArmed] = useState<PaletteItem | null>(null);

  const index = clamp(selectedIndex, 0, levels.length - 1);
  const level = levels[index];

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const applyDragRef = useRef<(d: DragState, wx: number, wy: number) => void>(() => {});

  const worldW = Math.max(level.endX + 350, MIN_WORLD_W);

  // ---- immutable level updates ---------------------------------------------
  const updateLevel = (mutator: (lvl: Level) => Level) => {
    const next = levels.slice();
    next[index] = mutator(level);
    onLevelsChange(next);
  };

  // ---- coordinate helpers ---------------------------------------------------
  const pointerWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { wx: 0, wy: 0 };
    return { wx: (clientX - rect.left) / SCALE, wy: (clientY - rect.top) / SCALE };
  };

  // ---- item position lookup / mutation -------------------------------------
  const getPos = (sel: Selection): { x: number; y: number; w: number; h: number } => {
    if (sel.kind === 'platform') {
      const p = level.platforms.find((q) => q.id === sel.id)!;
      return { x: p.x, y: p.y, w: p.width, h: p.height };
    }
    if (sel.kind === 'toad') {
      const td = level.toads.find((q) => q.id === sel.id)!;
      return { x: td.x, y: td.y, w: td.width, h: td.height };
    }
    if (sel.kind === 'collectible') {
      const c = level.collectibles.find((q) => q.id === sel.id)!;
      return { x: c.x, y: c.y, w: 18, h: 18 };
    }
    if (sel.kind === 'start') return { x: level.startX, y: level.startY, w: 28, h: 48 };
    return { x: level.endX, y: level.endY, w: 40, h: 40 };
  };

  const moveItem = (sel: Selection, x: number, y: number) => {
    const nx = clamp(x, 0, worldW);
    const ny = clamp(y, 0, WORLD_H);
    updateLevel((lvl) => {
      if (sel.kind === 'platform') {
        return { ...lvl, platforms: lvl.platforms.map((p) => (p.id === sel.id ? { ...p, x: nx, y: ny, startX: p.moving ? nx : p.startX, startY: p.moving ? ny : p.startY } : p)) };
      }
      if (sel.kind === 'toad') {
        return { ...lvl, toads: lvl.toads.map((td) => (td.id === sel.id ? { ...td, x: nx, y: ny } : td)) };
      }
      if (sel.kind === 'collectible') {
        return { ...lvl, collectibles: lvl.collectibles.map((c) => (c.id === sel.id ? { ...c, x: nx, y: ny } : c)) };
      }
      if (sel.kind === 'start') return { ...lvl, startX: nx, startY: ny };
      return { ...lvl, endX: nx, endY: ny };
    });
  };

  const resizePlatform = (sel: Selection, w: number, h: number) => {
    if (sel.kind !== 'platform') return;
    updateLevel((lvl) => ({
      ...lvl,
      platforms: lvl.platforms.map((p) => (p.id === sel.id ? { ...p, width: w, height: h } : p)),
    }));
  };

  // Keep a latest-state drag applier for the window listeners below.
  applyDragRef.current = (d, wx, wy) => {
    if (d.mode === 'move') {
      moveItem(d.sel, snap(wx - d.grabDX), snap(wy - d.grabDY));
    } else {
      resizePlatform(d.sel, Math.max(GRID, snap(d.startW + (wx - d.startWX))), Math.max(GRID, snap(d.startH + (wy - d.startWY))));
    }
  };

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!dragRef.current) return;
      const { wx, wy } = pointerWorld(e.clientX, e.clientY);
      applyDragRef.current(dragRef.current, wx, wy);
    };
    const up = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, []);

  const beginDrag = (e: React.PointerEvent, sel: Selection, mode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(sel);
    setArmed(null);
    const { wx, wy } = pointerWorld(e.clientX, e.clientY);
    const pos = getPos(sel);
    dragRef.current = { sel, mode, grabDX: wx - pos.x, grabDY: wy - pos.y, startW: pos.w, startH: pos.h, startWX: wx, startWY: wy };
  };

  // ---- id + factories -------------------------------------------------------
  const makeId = (lvl: Level, prefix: string) => {
    const ids = new Set<string>([
      ...lvl.platforms.map((p) => p.id),
      ...lvl.toads.map((td) => td.id),
      ...lvl.collectibles.map((c) => c.id),
    ]);
    let n = 1;
    let id = `l${lvl.id}-${prefix}${n}`;
    while (ids.has(id)) id = `l${lvl.id}-${prefix}${++n}`;
    return id;
  };

  const placeItem = (item: PaletteItem, wx: number, wy: number) => {
    updateLevel((lvl) => {
      if (item.group === 'platform') {
        const x = snap(wx - 80);
        const y = snap(wy - 17);
        const base: Platform = { id: makeId(lvl, 'p'), x, y, width: 160, height: 35, type: item.type };
        const plat: Platform = item.type === 'vine_bridge'
          ? { ...base, moving: true, startX: x, startY: y, range: 150, speed: 2 }
          : base;
        return { ...lvl, platforms: [...lvl.platforms, plat] };
      }
      if (item.group === 'toad') {
        const toad: Toad = { id: makeId(lvl, 't'), x: snap(wx - 22), y: snap(wy - 12), width: 44, height: 24, springForce: 18, color: '#4ade80', isSquished: false, squishTimer: 0 };
        return { ...lvl, toads: [...lvl.toads, toad] };
      }
      const col: Collectible = { id: makeId(lvl, 'c'), x: snap(wx), y: snap(wy), type: item.type, collected: false, bobOffset: Math.floor(Math.random() * 300) };
      return { ...lvl, collectibles: [...lvl.collectibles, col] };
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as PaletteItem;
      const { wx, wy } = pointerWorld(e.clientX, e.clientY);
      placeItem(item, wx, wy);
    } catch {
      /* ignore malformed drops */
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only react to clicks on the empty canvas itself — clicks that bubble up
    // from an item must not clear that item's freshly-set selection.
    if (e.target !== e.currentTarget) return;
    if (armed) {
      const { wx, wy } = pointerWorld(e.clientX, e.clientY);
      placeItem(armed, wx, wy);
      return;
    }
    setSelected(null);
  };

  // ---- level management -----------------------------------------------------
  const selectLevel = (i: number) => {
    setSelectedIndex(i);
    setSelected(null);
    setArmed(null);
  };

  const handleNewLevel = () => {
    const maxId = levels.reduce((m, l) => Math.max(m, l.id), 0);
    const id = maxId + 1;
    // Start with one long ground run so a brand-new level is completable right
    // away (just walk to the goal); the designer carves it into platforms,
    // adds gaps, toads and fruit from there.
    const blank: Level = {
      id,
      name: `${t.editorNewLevelName} ${id}`,
      description: t.editorNewLevelDesc,
      startX: 100,
      startY: 360,
      endX: 1180,
      endY: 360,
      platforms: [
        { id: `l${id}-p1`, x: 40, y: 410, width: 1340, height: 40, type: 'moss_log' },
      ],
      toads: [],
      collectibles: [],
      background: 'jungle',
    };
    onLevelsChange([...levels, blank]);
    selectLevel(levels.length);
  };

  const handleDuplicate = () => {
    const maxId = levels.reduce((m, l) => Math.max(m, l.id), 0);
    const clone: Level = JSON.parse(JSON.stringify(level));
    clone.id = maxId + 1;
    clone.name = `${level.name} (copy)`;
    const next = [...levels, clone];
    onLevelsChange(next);
    selectLevel(next.length - 1);
  };

  const handleDelete = () => {
    if (levels.length <= 1) return;
    if (!window.confirm(t.editorConfirmDelete)) return;
    const next = levels.filter((_, i) => i !== index);
    onLevelsChange(next);
    selectLevel(clamp(index, 0, next.length - 1));
  };

  // Restore the canonical built-in level set (recovers from a stale save).
  const handleReset = () => {
    if (!window.confirm(t.editorConfirmReset)) return;
    onLevelsChange(JSON.parse(JSON.stringify(INITIAL_LEVELS)));
    selectLevel(0);
  };

  // ---- background -----------------------------------------------------------
  const downscaleImage = (file: File, maxW: number): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const ratio = Math.min(1, maxW / img.width);
          const w = Math.round(img.width * ratio);
          const h = Math.round(img.height * ratio);
          const c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          const cx = c.getContext('2d');
          if (!cx) return reject(new Error('no 2d context'));
          cx.drawImage(img, 0, 0, w, h);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleBgFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await downscaleImage(file, 1280);
      updateLevel((lvl) => ({ ...lvl, backgroundImage: dataUrl }));
    } catch {
      /* ignore decode failures */
    }
  };

  // ---- small field helpers --------------------------------------------------
  const NumberField = ({ label, value, onChange, step = 10 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) => (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white focus:border-fuchsia-500 outline-none"
      />
    </label>
  );

  const selPlatform = selected?.kind === 'platform' ? level.platforms.find((p) => p.id === selected.id) : undefined;
  const selToad = selected?.kind === 'toad' ? level.toads.find((td) => td.id === selected.id) : undefined;
  const selCollectible = selected?.kind === 'collectible' ? level.collectibles.find((c) => c.id === selected.id) : undefined;

  // ---- palette descriptors --------------------------------------------------
  const platformPalette: { item: PaletteItem; label: string; color: string }[] = [
    { item: { group: 'platform', type: 'moss_log' }, label: t.palMossLog, color: PLATFORM_COLOR.moss_log },
    { item: { group: 'platform', type: 'jungle_brick' }, label: t.palBrick, color: PLATFORM_COLOR.jungle_brick },
    { item: { group: 'platform', type: 'vine_bridge' }, label: t.palVineBridge, color: PLATFORM_COLOR.vine_bridge },
    { item: { group: 'platform', type: 'canopy_leaves' }, label: t.palCanopy, color: PLATFORM_COLOR.canopy_leaves },
  ];
  const collectiblePalette: { item: PaletteItem; label: string; color: string }[] = [
    { item: { group: 'collectible', type: 'banana' }, label: t.palBanana, color: COLLECTIBLE_COLOR.banana },
    { item: { group: 'collectible', type: 'mango' }, label: t.palMango, color: COLLECTIBLE_COLOR.mango },
    { item: { group: 'collectible', type: 'star' }, label: t.palStar, color: COLLECTIBLE_COLOR.star },
  ];

  const isArmed = (item: PaletteItem) => armed != null && JSON.stringify(armed) === JSON.stringify(item);

  const PaletteButton = ({ item, label, color, icon }: { item: PaletteItem; label: string; color: string; icon: React.ReactNode }) => (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => setArmed((prev) => (prev && JSON.stringify(prev) === JSON.stringify(item) ? null : item))}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left cursor-grab active:cursor-grabbing transition-all ${
        isArmed(item)
          ? 'border-fuchsia-400 bg-fuchsia-950/50 ring-1 ring-fuchsia-400'
          : 'border-purple-900/50 bg-[#0c0419] hover:bg-purple-950/40'
      }`}
      data-palette={`${item.group}${'type' in item ? '-' + item.type : ''}`}
    >
      <span className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0" style={{ color }}>{icon}</span>
      <span className="text-xs text-gray-200">{label}</span>
    </button>
  );

  const guideY = (worldY: number) => worldY * SCALE;

  return (
    <div className="w-full bg-[#140a28]/80 border-2 border-fuchsia-500/25 rounded-3xl p-4 shadow-xl shadow-fuchsia-950/20" id="level-editor">
      <div className="flex flex-col xl:flex-row gap-4 items-stretch">

        {/* LEFT — palette + level manager */}
        <aside className="w-full xl:w-[220px] xl:shrink-0 space-y-4">
          <div className="bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-3">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400">{t.editorLevelsHeader}</div>
            <select
              value={index}
              onChange={(e) => selectLevel(Number(e.target.value))}
              className="w-full bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-fuchsia-500"
              id="editor-level-select"
            >
              {levels.map((l, i) => (
                <option key={l.id} value={i}>{String(l.id).padStart(2, '0')} — {l.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-1.5">
              <button onClick={handleNewLevel} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-emerald-700/40 hover:bg-emerald-600/50 border border-emerald-600/40 text-emerald-200 text-[10px] cursor-pointer" id="editor-new-level" title={t.editorNewLevel}>
                <Plus className="w-3.5 h-3.5" />{t.editorNewLevel}
              </button>
              <button onClick={handleDuplicate} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-purple-800/40 hover:bg-purple-700/50 border border-purple-600/40 text-purple-200 text-[10px] cursor-pointer" id="editor-duplicate-level" title={t.editorDuplicate}>
                <Copy className="w-3.5 h-3.5" />{t.editorDuplicate}
              </button>
              <button onClick={handleDelete} disabled={levels.length <= 1} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" id="editor-delete-level" title={t.editorDelete}>
                <Trash2 className="w-3.5 h-3.5" />{t.editorDelete}
              </button>
            </div>
            <button onClick={() => onPlaytest(index)} className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white font-bold text-xs cursor-pointer shadow-lg shadow-fuchsia-950/30" id="editor-playtest">
              <Play className="w-4 h-4" />{t.editorPlaytest}
            </button>
            <button onClick={handleReset} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-[#0c0419] hover:bg-purple-950/50 border border-purple-900/50 text-gray-400 hover:text-gray-200 text-[11px] cursor-pointer" id="editor-reset-levels" title={t.editorReset}>
              <RotateCcw className="w-3.5 h-3.5" />{t.editorReset}
            </button>
          </div>

          <div className="bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-2.5">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
              <Box className="w-3.5 h-3.5" />{t.editorToolbox}
            </div>
            <p className="text-[10px] text-gray-400 leading-snug flex items-start gap-1">
              <MousePointerClick className="w-3 h-3 mt-0.5 shrink-0 text-cyan-400" />{t.editorToolboxHint}
            </p>
            <div className="text-[10px] font-mono uppercase text-gray-500">{t.editorGroupPlatforms}</div>
            <div className="grid grid-cols-1 gap-1.5">
              {platformPalette.map((p) => (
                <React.Fragment key={p.label}>
                  <PaletteButton item={p.item} label={p.label} color={p.color} icon={<Box className="w-4 h-4" fill="currentColor" />} />
                </React.Fragment>
              ))}
            </div>
            <div className="text-[10px] font-mono uppercase text-gray-500 pt-1">{t.editorGroupCreatures}</div>
            <PaletteButton item={{ group: 'toad' }} label={t.palToad} color="#4ade80" icon={<Bug className="w-4 h-4" />} />
            <div className="text-[10px] font-mono uppercase text-gray-500 pt-1">{t.editorGroupCollectibles}</div>
            <div className="grid grid-cols-1 gap-1.5">
              {collectiblePalette.map((c) => (
                <React.Fragment key={c.label}>
                  <PaletteButton item={c.item} label={c.label} color={c.color} icon={c.item.group === 'collectible' && c.item.type === 'star' ? <Star className="w-4 h-4" fill="currentColor" /> : <Cherry className="w-4 h-4" fill="currentColor" />} />
                </React.Fragment>
              ))}
            </div>
          </div>
        </aside>

        {/* CENTER — schematic editing canvas */}
        <div className="flex-1 min-w-0 bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400">{String(level.id).padStart(2, '0')} — {level.name}</span>
            <span className="text-[10px] font-mono text-gray-500">{worldW}×{WORLD_H} world</span>
          </div>
          <div className="overflow-x-auto overflow-y-hidden rounded-lg border border-purple-900/40 bg-[#0a0414]" style={{ height: VIEWPORT_H }}>
            <div
              ref={canvasRef}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={handleCanvasClick}
              className={`relative ${armed ? 'cursor-copy' : 'cursor-default'}`}
              style={{
                width: worldW * SCALE,
                height: VIEWPORT_H,
                backgroundImage:
                  'linear-gradient(to right, rgba(168,85,247,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(168,85,247,0.07) 1px, transparent 1px)',
                backgroundSize: `${50 * SCALE}px ${50 * SCALE}px`,
              }}
              id="editor-canvas"
            >
              {/* guide lines */}
              <div className="absolute left-0 right-0 border-t border-dashed border-cyan-500/40" style={{ top: guideY(420) }}>
                <span className="absolute right-1 -top-3 text-[8px] font-mono text-cyan-500/70">{t.editorGuideScreen}</span>
              </div>
              <div className="absolute left-0 right-0 border-t border-dashed border-rose-500/40" style={{ top: guideY(550) }}>
                <span className="absolute right-1 -top-3 text-[8px] font-mono text-rose-500/70">{t.editorGuideFall}</span>
              </div>

              {/* platforms */}
              {level.platforms.map((p) => {
                const isSel = selected?.kind === 'platform' && selected.id === p.id;
                return (
                  <div
                    key={p.id}
                    onPointerDown={(e) => beginDrag(e, { kind: 'platform', id: p.id }, 'move')}
                    className={`absolute rounded-sm flex items-center justify-center overflow-hidden ${isSel ? 'ring-2 ring-fuchsia-400 z-20' : 'z-10'}`}
                    style={{ left: p.x * SCALE, top: p.y * SCALE, width: p.width * SCALE, height: p.height * SCALE, background: PLATFORM_COLOR[p.type], opacity: p.moving ? 0.85 : 1, cursor: 'move' }}
                    data-item="platform"
                    data-id={p.id}
                  >
                    {p.moving && <span className="text-[7px] text-white/80 font-mono">⇄</span>}
                    {isSel && (
                      <span
                        onPointerDown={(e) => beginDrag(e, { kind: 'platform', id: p.id }, 'resize')}
                        className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-fuchsia-400 border border-white cursor-nwse-resize"
                        data-resize="platform"
                      />
                    )}
                  </div>
                );
              })}

              {/* toads */}
              {level.toads.map((td) => {
                const isSel = selected?.kind === 'toad' && selected.id === td.id;
                return (
                  <div
                    key={td.id}
                    onPointerDown={(e) => beginDrag(e, { kind: 'toad', id: td.id }, 'move')}
                    className={`absolute rounded-full z-20 ${isSel ? 'ring-2 ring-fuchsia-400' : ''}`}
                    style={{ left: td.x * SCALE, top: td.y * SCALE, width: td.width * SCALE, height: td.height * SCALE, background: td.color, cursor: 'move' }}
                    data-item="toad"
                    data-id={td.id}
                  />
                );
              })}

              {/* collectibles */}
              {level.collectibles.map((c) => {
                const isSel = selected?.kind === 'collectible' && selected.id === c.id;
                const sz = 18 * SCALE;
                return (
                  <div
                    key={c.id}
                    onPointerDown={(e) => beginDrag(e, { kind: 'collectible', id: c.id }, 'move')}
                    className={`absolute rounded-full z-20 border border-black/30 ${isSel ? 'ring-2 ring-fuchsia-400' : ''}`}
                    style={{ left: c.x * SCALE - sz / 2, top: c.y * SCALE - sz / 2, width: sz, height: sz, background: COLLECTIBLE_COLOR[c.type], cursor: 'move' }}
                    data-item="collectible"
                    data-id={c.id}
                  />
                );
              })}

              {/* start marker */}
              <div
                onPointerDown={(e) => beginDrag(e, { kind: 'start' }, 'move')}
                className={`absolute z-30 flex flex-col items-center ${selected?.kind === 'start' ? 'ring-2 ring-fuchsia-400 rounded' : ''}`}
                style={{ left: level.startX * SCALE - 8, top: level.startY * SCALE - 10, cursor: 'move' }}
                data-item="start"
                title={t.editorMarkerStart}
              >
                <Flag className="w-4 h-4 text-emerald-400" fill="currentColor" />
              </div>

              {/* end / goal marker */}
              <div
                onPointerDown={(e) => beginDrag(e, { kind: 'end' }, 'move')}
                className={`absolute z-30 flex items-center justify-center rounded-full border-2 border-fuchsia-400 bg-fuchsia-500/20 ${selected?.kind === 'end' ? 'ring-2 ring-fuchsia-300' : ''}`}
                style={{ left: level.endX * SCALE - 14, top: level.endY * SCALE - 14, width: 28, height: 28, cursor: 'move' }}
                data-item="end"
                title={t.editorMarkerGoal}
              >
                <DoorOpen className="w-3.5 h-3.5 text-fuchsia-300" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT — inspector + level settings */}
        <aside className="w-full xl:w-[250px] xl:shrink-0 space-y-4">
          {/* Selected-item inspector */}
          <div className="bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-3">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400">{t.editorInspector}</div>

            {!selected && <p className="text-[11px] text-gray-400 leading-snug">{t.editorNoSelection}</p>}

            {selPlatform && (
              <div className="space-y-2.5" id="inspector-platform">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label={t.editorFieldX} value={selPlatform.x} onChange={(v) => moveItem(selected!, v, selPlatform.y)} />
                  <NumberField label={t.editorFieldY} value={selPlatform.y} onChange={(v) => moveItem(selected!, selPlatform.x, v)} />
                  <NumberField label={t.editorFieldWidth} value={selPlatform.width} onChange={(v) => resizePlatform(selected!, Math.max(GRID, v), selPlatform.height)} />
                  <NumberField label={t.editorFieldHeight} value={selPlatform.height} onChange={(v) => resizePlatform(selected!, selPlatform.width, Math.max(GRID, v))} />
                </div>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorFieldType}</span>
                  <select
                    value={selPlatform.type}
                    onChange={(e) => updateLevel((lvl) => ({ ...lvl, platforms: lvl.platforms.map((p) => (p.id === selPlatform.id ? { ...p, type: e.target.value as Platform['type'] } : p)) }))}
                    className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500"
                  >
                    <option value="moss_log">{t.palMossLog}</option>
                    <option value="jungle_brick">{t.palBrick}</option>
                    <option value="vine_bridge">{t.palVineBridge}</option>
                    <option value="canopy_leaves">{t.palCanopy}</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selPlatform.moving}
                    onChange={(e) => updateLevel((lvl) => ({ ...lvl, platforms: lvl.platforms.map((p) => (p.id === selPlatform.id ? { ...p, moving: e.target.checked, startX: e.target.checked ? p.x : p.startX, startY: e.target.checked ? p.y : p.startY, range: p.range ?? 150, speed: p.speed ?? 2 } : p)) }))}
                    className="accent-fuchsia-500 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] text-gray-300">{t.editorFieldMoving}</span>
                </label>
                {selPlatform.moving && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label={t.editorFieldRange} value={selPlatform.range ?? 150} step={10} onChange={(v) => updateLevel((lvl) => ({ ...lvl, platforms: lvl.platforms.map((p) => (p.id === selPlatform.id ? { ...p, range: v } : p)) }))} />
                    <NumberField label={t.editorFieldSpeed} value={selPlatform.speed ?? 2} step={0.5} onChange={(v) => updateLevel((lvl) => ({ ...lvl, platforms: lvl.platforms.map((p) => (p.id === selPlatform.id ? { ...p, speed: v } : p)) }))} />
                  </div>
                )}
                <button onClick={() => { updateLevel((lvl) => ({ ...lvl, platforms: lvl.platforms.filter((p) => p.id !== selPlatform.id) })); setSelected(null); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />{t.editorDeleteItem}
                </button>
              </div>
            )}

            {selToad && (
              <div className="space-y-2.5" id="inspector-toad">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label={t.editorFieldX} value={selToad.x} onChange={(v) => moveItem(selected!, v, selToad.y)} />
                  <NumberField label={t.editorFieldY} value={selToad.y} onChange={(v) => moveItem(selected!, selToad.x, v)} />
                </div>
                <NumberField label={t.editorFieldSpring} value={selToad.springForce} step={1} onChange={(v) => updateLevel((lvl) => ({ ...lvl, toads: lvl.toads.map((td) => (td.id === selToad.id ? { ...td, springForce: v } : td)) }))} />
                <label className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorFieldColor}</span>
                  <input type="color" value={selToad.color} onChange={(e) => updateLevel((lvl) => ({ ...lvl, toads: lvl.toads.map((td) => (td.id === selToad.id ? { ...td, color: e.target.value } : td)) }))} className="w-10 h-6 bg-transparent cursor-pointer" />
                </label>
                <button onClick={() => { updateLevel((lvl) => ({ ...lvl, toads: lvl.toads.filter((td) => td.id !== selToad.id) })); setSelected(null); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />{t.editorDeleteItem}
                </button>
              </div>
            )}

            {selCollectible && (
              <div className="space-y-2.5" id="inspector-collectible">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label={t.editorFieldX} value={selCollectible.x} onChange={(v) => moveItem(selected!, v, selCollectible.y)} />
                  <NumberField label={t.editorFieldY} value={selCollectible.y} onChange={(v) => moveItem(selected!, selCollectible.x, v)} />
                </div>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorFieldType}</span>
                  <select value={selCollectible.type} onChange={(e) => updateLevel((lvl) => ({ ...lvl, collectibles: lvl.collectibles.map((c) => (c.id === selCollectible.id ? { ...c, type: e.target.value as Collectible['type'] } : c)) }))} className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500">
                    <option value="banana">{t.palBanana}</option>
                    <option value="mango">{t.palMango}</option>
                    <option value="star">{t.palStar}</option>
                  </select>
                </label>
                <button onClick={() => { updateLevel((lvl) => ({ ...lvl, collectibles: lvl.collectibles.filter((c) => c.id !== selCollectible.id) })); setSelected(null); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />{t.editorDeleteItem}
                </button>
              </div>
            )}

            {selected?.kind === 'start' && (
              <div className="grid grid-cols-2 gap-2" id="inspector-start">
                <NumberField label={t.editorFieldX} value={level.startX} onChange={(v) => moveItem(selected, v, level.startY)} />
                <NumberField label={t.editorFieldY} value={level.startY} onChange={(v) => moveItem(selected, level.startX, v)} />
              </div>
            )}
            {selected?.kind === 'end' && (
              <div className="grid grid-cols-2 gap-2" id="inspector-end">
                <NumberField label={t.editorFieldX} value={level.endX} onChange={(v) => moveItem(selected, v, level.endY)} />
                <NumberField label={t.editorFieldY} value={level.endY} onChange={(v) => moveItem(selected, level.endX, v)} />
              </div>
            )}
          </div>

          {/* Level settings */}
          <div className="bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-3" id="editor-level-settings">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400">{t.editorLevelSettings}</div>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorName}</span>
              <input value={level.name} onChange={(e) => updateLevel((lvl) => ({ ...lvl, name: e.target.value }))} className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500" id="editor-field-name" />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorDescription}</span>
              <textarea value={level.description} onChange={(e) => updateLevel((lvl) => ({ ...lvl, description: e.target.value }))} rows={2} className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500 resize-none" />
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={level.timeLimit !== undefined}
                onChange={(e) => updateLevel((lvl) => { if (e.target.checked) return { ...lvl, timeLimit: lvl.timeLimit ?? 15, collectibleBonusSeconds: lvl.collectibleBonusSeconds ?? 2 }; const { timeLimit, collectibleBonusSeconds, ...rest } = lvl; return rest as Level; })}
                className="accent-fuchsia-500 w-3.5 h-3.5"
                id="editor-timed-toggle"
              />
              <span className="text-[11px] text-gray-300">{t.editorTimedLevel}</span>
            </label>
            {level.timeLimit !== undefined && (
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={t.editorTimeLimit} value={level.timeLimit} step={1} onChange={(v) => updateLevel((lvl) => ({ ...lvl, timeLimit: Math.max(1, v) }))} />
                <NumberField label={t.editorBonusSeconds} value={level.collectibleBonusSeconds ?? 2} step={1} onChange={(v) => updateLevel((lvl) => ({ ...lvl, collectibleBonusSeconds: Math.max(0, v) }))} />
              </div>
            )}

            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorBackground}</span>
              <select
                value={level.background ?? 'jungle'}
                onChange={(e) => updateLevel((lvl) => ({ ...lvl, background: e.target.value as LevelBackgroundId }))}
                className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500"
                id="editor-background-select"
              >
                <option value="jungle">{t.editorBgJungle}</option>
                <option value="night_raid">{t.editorBgNightRaid}</option>
              </select>
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" id="editor-bg-file" onChange={(e) => { handleBgFile(e.target.files?.[0]); e.target.value = ''; }} />
            {level.backgroundImage ? (
              <div className="flex items-center justify-between gap-2 bg-emerald-950/30 border border-emerald-700/40 rounded-md px-2 py-1.5">
                <span className="text-[10px] text-emerald-300 flex items-center gap-1"><img src={level.backgroundImage} alt="" className="w-6 h-4 object-cover rounded-sm" />{t.editorBgCustomActive}</span>
                <button onClick={() => updateLevel((lvl) => { const { backgroundImage, ...rest } = lvl; return rest as Level; })} className="text-rose-300 hover:text-rose-200 cursor-pointer" title={t.editorBgClearCustom}><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-purple-900/40 hover:bg-purple-800/50 border border-purple-700/40 text-purple-200 text-[11px] cursor-pointer" id="editor-bg-upload">
                <Upload className="w-3.5 h-3.5" />{t.editorBgCustom}
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
