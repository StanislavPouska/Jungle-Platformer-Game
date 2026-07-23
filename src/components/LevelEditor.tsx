/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  ChapterId,
  Collectible,
  FightDef,
  HidingSpot,
  LevelBackgroundId,
  Mission,
  MissionType,
  Platform,
  PlatformerMission,
  QuizDef,
  StealthMission,
  StepPlatform,
  Toad,
  TriggerPlacement,
  WorldData,
} from '../types';
import { INITIAL_MISSIONS, INITIAL_FIGHTS, INITIAL_QUIZZES, INITIAL_QUESTIONS, INITIAL_SPRITES } from '../data';
import { Lang, UI, UIStrings } from '../i18n';
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
  Swords,
  HelpCircle,
  Cat,
  SquarePen,
  Image as ImageIcon,
} from 'lucide-react';
import { NumberField, SelectField, makeLibraryId, downscaleImage } from './editorFields';
import { platformExtendsDown } from '../sprites';
import FightEditor from './FightEditor';
import QuizEditor from './QuizEditor';
import SpriteEditor from './SpriteEditor';

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

const SPOT_COLOR: Record<HidingSpot['kind'], string> = {
  cave: '#57534e',
  leaf_shadow: '#166534',
  goal_cave: '#b45309',
};

type Selection =
  | { kind: 'platform'; id: string }
  | { kind: 'toad'; id: string }
  | { kind: 'collectible'; id: string }
  | { kind: 'sPlatform'; id: string }
  | { kind: 'spot'; id: string }
  | { kind: 'tiger' }
  | { kind: 'start' }
  | { kind: 'end' }
  | { kind: 'trigger'; id: string };

type PaletteItem =
  | { group: 'platform'; type: Platform['type'] }
  | { group: 'toad' }
  | { group: 'collectible'; type: Collectible['type'] }
  | { group: 'sPlatform' }
  | { group: 'spot' }
  | { group: 'trigger'; kind: 'fight' | 'quiz' }
  | { group: 'sprite'; id: string };

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
  world: WorldData;
  onWorldChange: (next: WorldData) => void;
  onPlaytest: (index: number) => void;
  language: Lang;
}

const snap = (v: number) => Math.round(v / GRID) * GRID;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Ground surface height at x in a stealth mission (same walk rule the game uses).
const stealthGroundY = (m: StealthMission, x: number): number => {
  for (const p of m.platforms) {
    if (x >= p.x && x < p.x + p.width) return p.y;
  }
  return m.platforms[0]?.y ?? 420;
};

// Fresh type-specific mission bodies — both templates are completable as-is
// (walk/crawl straight to the goal) so a brand-new mission never starts broken.
const platformerBody = (id: number): Omit<PlatformerMission, keyof MissionCommon> => ({
  type: 'platformer',
  startX: 100,
  startY: 360,
  endX: 1180,
  endY: 360,
  platforms: [{ id: `l${id}-p1`, x: 40, y: 410, width: 1340, height: 40, type: 'moss_log' }],
  toads: [],
  collectibles: [],
});

const stealthBody = (id: number): Omit<StealthMission, keyof MissionCommon> => ({
  type: 'stealth',
  startX: 60,
  levelMinX: 20,
  levelMaxX: 1500,
  platforms: [{ id: `l${id}-sp1`, x: 30, width: 1460, y: 420, height: 30 }],
  hidingSpots: [
    { id: `l${id}-hs1`, x: 600, y: 420, width: 70, height: 70, kind: 'cave' },
    { id: `l${id}-goal`, x: 1330, y: 420, width: 110, height: 95, kind: 'goal_cave' },
  ],
  goalSpotId: `l${id}-goal`,
  tigerStartX: 800,
  tigerSpeed: 1.8,
});

// The fields every mission keeps when its type is switched in the editor.
interface MissionCommon {
  id: number;
  name: string;
  description: string;
  chapter: ChapterId;
  triggers: TriggerPlacement[];
  background?: LevelBackgroundId;
  backgroundImage?: string;
}

const missionCommon = (m: Mission): MissionCommon => ({
  id: m.id,
  name: m.name,
  description: m.description,
  chapter: m.chapter,
  triggers: m.triggers,
  background: m.background,
  backgroundImage: m.backgroundImage,
});

function PaletteButton({ item, label, color, icon, armed, onToggle }: { item: PaletteItem; label: string; color: string; icon: React.ReactNode; armed: boolean; onToggle: () => void }) {
  return (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify(item));
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={onToggle}
      className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left cursor-grab active:cursor-grabbing transition-all ${
        armed
          ? 'border-fuchsia-400 bg-fuchsia-950/50 ring-1 ring-fuchsia-400'
          : 'border-purple-900/50 bg-[#0c0419] hover:bg-purple-950/40'
      }`}
      data-palette={`${item.group}${'type' in item ? '-' + item.type : ''}${'kind' in item ? '-' + item.kind : ''}${'id' in item ? '-' + item.id : ''}`}
    >
      <span className="w-4 h-4 rounded-sm flex items-center justify-center shrink-0" style={{ color }}>{icon}</span>
      <span className="text-xs text-gray-200">{label}</span>
    </button>
  );
}

type EditorMode = 'missions' | 'fights' | 'quizzes' | 'sprites';

export default function LevelEditor({ world, onWorldChange, onPlaytest, language }: LevelEditorProps) {
  const t = UI[language];
  const [mode, setMode] = useState<EditorMode>('missions');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [armed, setArmed] = useState<PaletteItem | null>(null);
  const [bgError, setBgError] = useState(false);

  const missions = world.missions;
  const index = clamp(selectedIndex, 0, missions.length - 1);
  const mission = missions[index];

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const applyDragRef = useRef<(d: DragState, wx: number, wy: number) => void>(() => {});

  const worldW = Math.max(
    mission.type === 'platformer' ? mission.endX + 350 : mission.levelMaxX + 200,
    MIN_WORLD_W,
  );

  // ---- immutable world/mission updates --------------------------------------
  const updateMissions = (next: Mission[]) => onWorldChange({ ...world, missions: next });

  const updateMission = (mutator: (m: Mission) => Mission) => {
    const next = missions.slice();
    next[index] = mutator(mission);
    updateMissions(next);
  };

  // For async completions (e.g. image decode): resolve the target by id
  // against the freshest world, so edits made while the work was in flight
  // aren't clobbered by a stale snapshot.
  const worldRef = useRef(world);
  worldRef.current = world;
  const updateMissionById = (id: number, mutator: (m: Mission) => Mission) => {
    const cur = worldRef.current;
    const i = cur.missions.findIndex((m) => m.id === id);
    if (i < 0) return;
    const next = cur.missions.slice();
    next[i] = mutator(next[i]);
    onWorldChange({ ...cur, missions: next });
  };

  // ---- coordinate helpers ----------------------------------------------------
  const pointerWorld = (clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { wx: 0, wy: 0 };
    return { wx: (clientX - rect.left) / SCALE, wy: (clientY - rect.top) / SCALE };
  };

  // ---- item position lookup / mutation ---------------------------------------
  const getPos = (sel: Selection): { x: number; y: number; w: number; h: number } => {
    if (sel.kind === 'platform' && mission.type === 'platformer') {
      const p = mission.platforms.find((q) => q.id === sel.id)!;
      return { x: p.x, y: p.y, w: p.width, h: p.height };
    }
    if (sel.kind === 'toad' && mission.type === 'platformer') {
      const td = mission.toads.find((q) => q.id === sel.id)!;
      return { x: td.x, y: td.y, w: td.width, h: td.height };
    }
    if (sel.kind === 'collectible' && mission.type === 'platformer') {
      const c = mission.collectibles.find((q) => q.id === sel.id)!;
      return { x: c.x, y: c.y, w: 18, h: 18 };
    }
    if (sel.kind === 'sPlatform' && mission.type === 'stealth') {
      const p = mission.platforms.find((q) => q.id === sel.id)!;
      return { x: p.x, y: p.y, w: p.width, h: p.height };
    }
    if (sel.kind === 'spot' && mission.type === 'stealth') {
      const hs = mission.hidingSpots.find((q) => q.id === sel.id)!;
      return { x: hs.x, y: hs.y, w: hs.width, h: hs.height };
    }
    if (sel.kind === 'tiger' && mission.type === 'stealth') {
      return { x: mission.tigerStartX, y: stealthGroundY(mission, mission.tigerStartX) - 34, w: 60, h: 34 };
    }
    if (sel.kind === 'trigger') {
      const tr = mission.triggers.find((q) => q.id === sel.id);
      return { x: tr?.triggerX ?? 0, y: 0, w: 8, h: WORLD_H };
    }
    if (sel.kind === 'start') {
      if (mission.type === 'stealth') return { x: mission.startX, y: stealthGroundY(mission, mission.startX) - 20, w: 28, h: 20 };
      return { x: mission.startX, y: mission.startY, w: 28, h: 48 };
    }
    // 'end' (platformer only)
    if (mission.type === 'platformer') return { x: mission.endX, y: mission.endY, w: 40, h: 40 };
    return { x: 0, y: 0, w: 0, h: 0 };
  };

  const moveItem = (sel: Selection, x: number, y: number) => {
    const nx = clamp(x, 0, worldW);
    const ny = clamp(y, 0, WORLD_H);
    updateMission((m) => {
      if (sel.kind === 'trigger') {
        return { ...m, triggers: m.triggers.map((tr) => (tr.id === sel.id ? { ...tr, triggerX: nx } : tr)) };
      }
      if (m.type === 'platformer') {
        if (sel.kind === 'platform') {
          return { ...m, platforms: m.platforms.map((p) => (p.id === sel.id ? { ...p, x: nx, y: ny, startX: p.moving ? nx : p.startX, startY: p.moving ? ny : p.startY } : p)) };
        }
        if (sel.kind === 'toad') {
          return { ...m, toads: m.toads.map((td) => (td.id === sel.id ? { ...td, x: nx, y: ny } : td)) };
        }
        if (sel.kind === 'collectible') {
          return { ...m, collectibles: m.collectibles.map((c) => (c.id === sel.id ? { ...c, x: nx, y: ny } : c)) };
        }
        if (sel.kind === 'start') return { ...m, startX: nx, startY: ny };
        if (sel.kind === 'end') return { ...m, endX: nx, endY: ny };
        return m;
      }
      // stealth
      if (sel.kind === 'sPlatform') {
        return { ...m, platforms: m.platforms.map((p) => (p.id === sel.id ? { ...p, x: nx, y: ny } : p)) };
      }
      if (sel.kind === 'spot') {
        return { ...m, hidingSpots: m.hidingSpots.map((hs) => (hs.id === sel.id ? { ...hs, x: nx, y: ny } : hs)) };
      }
      if (sel.kind === 'tiger') return { ...m, tigerStartX: nx };
      if (sel.kind === 'start') return { ...m, startX: nx };
      return m;
    });
  };

  const resizeItem = (sel: Selection, w: number, h: number) => {
    updateMission((m) => {
      if (sel.kind === 'platform' && m.type === 'platformer') {
        return { ...m, platforms: m.platforms.map((p) => (p.id === sel.id ? { ...p, width: w, height: h } : p)) };
      }
      if (sel.kind === 'sPlatform' && m.type === 'stealth') {
        return { ...m, platforms: m.platforms.map((p) => (p.id === sel.id ? { ...p, width: w, height: h } : p)) };
      }
      return m;
    });
  };

  // Keep a latest-state drag applier for the window listeners below.
  applyDragRef.current = (d, wx, wy) => {
    if (d.mode === 'move') {
      const pos = getPos(d.sel);
      // Triggers and the tiger/stealth-start only move horizontally.
      const yLocked = d.sel.kind === 'trigger' || d.sel.kind === 'tiger' || (d.sel.kind === 'start' && mission.type === 'stealth');
      moveItem(d.sel, snap(wx - d.grabDX), yLocked ? pos.y : snap(wy - d.grabDY));
    } else {
      resizeItem(d.sel, Math.max(GRID, snap(d.startW + (wx - d.startWX))), Math.max(GRID, snap(d.startH + (wy - d.startWY))));
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

  const beginDrag = (e: React.PointerEvent, sel: Selection, dragMode: 'move' | 'resize') => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(sel);
    setArmed(null);
    const { wx, wy } = pointerWorld(e.clientX, e.clientY);
    const pos = getPos(sel);
    dragRef.current = { sel, mode: dragMode, grabDX: wx - pos.x, grabDY: wy - pos.y, startW: pos.w, startH: pos.h, startWX: wx, startWY: wy };
  };

  // ---- id + factories ---------------------------------------------------------
  const makeId = (m: Mission, prefix: string) => {
    const ids = new Set<string>([
      ...m.platforms.map((p) => p.id),
      ...m.triggers.map((tr) => tr.id),
      ...(m.type === 'platformer' ? m.toads.map((td) => td.id) : []),
      ...(m.type === 'platformer' ? m.collectibles.map((c) => c.id) : []),
      ...(m.type === 'stealth' ? m.hidingSpots.map((hs) => hs.id) : []),
    ]);
    let n = 1;
    let id = `l${m.id}-${prefix}${n}`;
    while (ids.has(id)) id = `l${m.id}-${prefix}${++n}`;
    return id;
  };

  const defaultFight = (id: string): FightDef => ({
    id,
    name: t.editorNewFightName,
    description: t.editorNewFightDesc,
    background: 'village',
    player: { sprite: 'mowgli_torch', maxHp: 100, damage: 20, parryChance: 0 },
    opponent: { sprite: 'shere_khan', maxHp: 100, damage: 20, parryChance: 0.2 },
    restartOnLose: false,
  });

  const defaultQuiz = (id: string): QuizDef => ({
    id,
    title: t.editorNewQuizTitle,
    intro: t.editorNewQuizIntro,
    questionCount: 3,
  });

  // Placing a trigger may also have to seed the library (when it's empty),
  // so it writes the whole world in one change.
  const placeTrigger = (kind: 'fight' | 'quiz', wx: number) => {
    let fights = world.fights;
    let quizzes = world.quizzes;
    if (kind === 'fight' && fights.length === 0) fights = [defaultFight(makeLibraryId('fight', fights))];
    if (kind === 'quiz' && quizzes.length === 0) quizzes = [defaultQuiz(makeLibraryId('quiz', quizzes))];
    const refId = kind === 'fight' ? fights[0].id : quizzes[0].id;
    const tr: TriggerPlacement = { id: makeId(mission, 'tr'), kind, refId, triggerX: clamp(snap(wx), 0, worldW) };
    const nextMissions = missions.slice();
    nextMissions[index] = { ...mission, triggers: [...mission.triggers, tr] };
    onWorldChange({ ...world, missions: nextMissions, fights, quizzes });
    setSelected({ kind: 'trigger', id: tr.id });
  };

  const placeItem = (item: PaletteItem, wx: number, wy: number) => {
    if (item.group === 'trigger') {
      placeTrigger(item.kind, wx);
      return;
    }
    updateMission((m) => {
      if (m.type === 'platformer') {
        if (item.group === 'platform') {
          const x = snap(wx - 80);
          const y = snap(wy - 17);
          const base: Platform = { id: makeId(m, 'p'), x, y, width: 160, height: 35, type: item.type };
          const plat: Platform = item.type === 'vine_bridge'
            ? { ...base, moving: true, startX: x, startY: y, range: 150, speed: 2 }
            : base;
          return { ...m, platforms: [...m.platforms, plat] };
        }
        if (item.group === 'toad') {
          const toad: Toad = { id: makeId(m, 't'), x: snap(wx - 22), y: snap(wy - 12), width: 44, height: 24, springForce: 18, color: '#4ade80', isSquished: false, squishTimer: 0 };
          return { ...m, toads: [...m.toads, toad] };
        }
        if (item.group === 'collectible') {
          const col: Collectible = { id: makeId(m, 'c'), x: snap(wx), y: snap(wy), type: item.type, collected: false, bobOffset: Math.floor(Math.random() * 300) };
          return { ...m, collectibles: [...m.collectibles, col] };
        }
        if (item.group === 'sprite') {
          // Custom sprite building block: a standable platform rendered with
          // the sprite's image, sized from the sprite's defaults.
          const spr = world.sprites.find((s) => s.id === item.id);
          if (!spr) return m;
          const plat: Platform = {
            id: makeId(m, 'p'),
            x: snap(wx - spr.width / 2),
            y: snap(wy - spr.height / 2),
            width: spr.width,
            height: spr.height,
            type: 'canopy_leaves',
            spriteId: spr.id,
          };
          return { ...m, platforms: [...m.platforms, plat] };
        }
        return m;
      }
      // stealth
      if (item.group === 'sPlatform') {
        const plat: StepPlatform = { id: makeId(m, 'sp'), x: snap(wx - 100), y: snap(wy), width: 200, height: 30 };
        return { ...m, platforms: [...m.platforms, plat] };
      }
      if (item.group === 'spot') {
        const spot: HidingSpot = { id: makeId(m, 'hs'), x: snap(wx - 35), y: snap(wy), width: 70, height: 70, kind: 'cave' };
        return { ...m, hidingSpots: [...m.hidingSpots, spot] };
      }
      return m;
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

  // ---- mission management ------------------------------------------------------
  const selectMission = (i: number) => {
    setSelectedIndex(i);
    setSelected(null);
    setArmed(null);
    setBgError(false);
  };

  const handleNewMission = (type: MissionType) => {
    const maxId = missions.reduce((m, l) => Math.max(m, l.id), 0);
    const id = maxId + 1;
    const common: MissionCommon = {
      id,
      name: `${t.editorNewLevelName} ${id}`,
      description: type === 'stealth' ? t.editorNewStealthDesc : t.editorNewLevelDesc,
      chapter: missions[missions.length - 1]?.chapter ?? 'ch2',
      triggers: [],
      background: type === 'stealth' ? 'night_raid' : 'jungle',
    };
    const blank: Mission =
      type === 'stealth'
        ? { ...common, ...stealthBody(id) }
        : { ...common, ...platformerBody(id) };
    updateMissions([...missions, blank]);
    selectMission(missions.length);
  };

  // Switch a mission's type in place: name/description/chapter/triggers and
  // background survive; the type-specific body is rebuilt from its template.
  const handleTypeChange = (type: MissionType) => {
    if (type === mission.type) return;
    updateMission((m) => {
      const common = missionCommon(m);
      return type === 'stealth'
        ? { ...common, ...stealthBody(m.id), background: m.background ?? 'night_raid' }
        : { ...common, ...platformerBody(m.id), background: m.background ?? 'jungle' };
    });
    setSelected(null);
  };

  const handleDuplicate = () => {
    const maxId = missions.reduce((m, l) => Math.max(m, l.id), 0);
    const clone: Mission = JSON.parse(JSON.stringify(mission));
    clone.id = maxId + 1;
    clone.name = `${mission.name} (copy)`;
    const next = [...missions, clone];
    updateMissions(next);
    selectMission(next.length - 1);
  };

  const handleDelete = () => {
    if (missions.length <= 1) return;
    if (!window.confirm(t.editorConfirmDelete)) return;
    const next = missions.filter((_, i) => i !== index);
    updateMissions(next);
    selectMission(clamp(index, 0, next.length - 1));
  };

  // Restore the canonical built-in content (recovers from a stale save).
  const handleReset = () => {
    if (!window.confirm(t.editorConfirmReset)) return;
    onWorldChange(
      JSON.parse(
        JSON.stringify({ missions: INITIAL_MISSIONS, fights: INITIAL_FIGHTS, quizzes: INITIAL_QUIZZES, questionPool: INITIAL_QUESTIONS, sprites: INITIAL_SPRITES }),
      ),
    );
    selectMission(0);
  };

  // ---- background --------------------------------------------------------------
  const handleBgFile = async (file: File | undefined) => {
    if (!file) return;
    const targetId = mission.id; // the upload belongs to the mission shown at pick time
    setBgError(false);
    try {
      const dataUrl = await downscaleImage(file, 1280);
      updateMissionById(targetId, (m) => ({ ...m, backgroundImage: dataUrl }));
    } catch {
      setBgError(true);
    }
  };

  // ---- selection lookups ---------------------------------------------------------
  const selPlatform = selected?.kind === 'platform' && mission.type === 'platformer' ? mission.platforms.find((p) => p.id === selected.id) : undefined;
  const selToad = selected?.kind === 'toad' && mission.type === 'platformer' ? mission.toads.find((td) => td.id === selected.id) : undefined;
  const selCollectible = selected?.kind === 'collectible' && mission.type === 'platformer' ? mission.collectibles.find((c) => c.id === selected.id) : undefined;
  const selSPlatform = selected?.kind === 'sPlatform' && mission.type === 'stealth' ? mission.platforms.find((p) => p.id === selected.id) : undefined;
  const selSpot = selected?.kind === 'spot' && mission.type === 'stealth' ? mission.hidingSpots.find((hs) => hs.id === selected.id) : undefined;
  const selTrigger = selected?.kind === 'trigger' ? mission.triggers.find((tr) => tr.id === selected.id) : undefined;

  // ---- palette descriptors ---------------------------------------------------------
  // Block sprites without a dedicated palette entry (props + user-created
  // blocks) get their own placeable entries; the classic platform types,
  // creatures and pickups already appear via their groups below.
  const dedicatedPaletteIds = ['moss_log', 'jungle_brick', 'vine_bridge', 'canopy_leaves', 'toad', 'banana', 'mango', 'star', 'portal'];
  const customBlockSprites = world.sprites.filter(
    (s) => s.kind === 'block' && !dedicatedPaletteIds.includes(s.id),
  );

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
  const toggleArmed = (item: PaletteItem) =>
    setArmed((prev) => (prev && JSON.stringify(prev) === JSON.stringify(item) ? null : item));

  const guideY = (worldY: number) => worldY * SCALE;

  const chapterOptions: { value: ChapterId; label: string }[] = [
    { value: 'prologue', label: t.chapterPrologueName },
    { value: 'ch1', label: t.chapter1Eyebrow },
    { value: 'ch2', label: t.chapter2Eyebrow },
    { value: 'epilogue', label: t.chapterEpilogueName },
  ];

  const modeTabs: { id: EditorMode; label: keyof UIStrings; icon: React.ReactNode }[] = [
    { id: 'missions', label: 'editorTabMissions', icon: <SquarePen className="w-3.5 h-3.5" /> },
    { id: 'fights', label: 'editorTabFights', icon: <Swords className="w-3.5 h-3.5" /> },
    { id: 'quizzes', label: 'editorTabQuizzes', icon: <HelpCircle className="w-3.5 h-3.5" /> },
    { id: 'sprites', label: 'editorTabSprites', icon: <ImageIcon className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full bg-[#140a28]/80 border-2 border-fuchsia-500/25 rounded-3xl p-4 shadow-xl shadow-fuchsia-950/20 space-y-4" id="level-editor">
      {/* Mode tabs: Missions | Fights | Quizzes */}
      <nav className="flex bg-[#0d071f] p-1 rounded-xl border border-fuchsia-950/45 shadow-inner w-fit">
        {modeTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-mono rounded-lg transition-all cursor-pointer ${
              mode === tab.id
                ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-bold shadow-[0_0_12px_rgba(236,72,153,0.35)]'
                : 'text-gray-400 hover:text-white'
            }`}
            id={`editor-mode-${tab.id}`}
          >
            {tab.icon}
            {t[tab.label]}
          </button>
        ))}
      </nav>

      {mode === 'fights' ? (
        <FightEditor world={world} onWorldChange={onWorldChange} language={language} />
      ) : mode === 'quizzes' ? (
        <QuizEditor world={world} onWorldChange={onWorldChange} language={language} />
      ) : mode === 'sprites' ? (
        <SpriteEditor world={world} onWorldChange={onWorldChange} language={language} />
      ) : (
      <div className="flex flex-col xl:flex-row gap-4 items-stretch">

        {/* LEFT — palette + mission manager */}
        <aside className="w-full xl:w-[220px] xl:shrink-0 space-y-4">
          <div className="bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-3">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400">{t.editorLevelsHeader}</div>
            <select
              value={index}
              onChange={(e) => selectMission(Number(e.target.value))}
              className="w-full bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1.5 text-xs text-white outline-none focus:border-fuchsia-500"
              id="editor-level-select"
            >
              {missions.map((m, i) => (
                <option key={m.id} value={i}>{String(m.id).padStart(2, '0')} — {m.name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => handleNewMission('platformer')} className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-emerald-700/40 hover:bg-emerald-600/50 border border-emerald-600/40 text-emerald-200 text-[10px] cursor-pointer" id="editor-new-platformer" title={`${t.editorNewLevel} — ${t.editorTypePlatformer}`}>
                <Plus className="w-3 h-3" />{t.editorNewPlatformer}
              </button>
              <button onClick={() => handleNewMission('stealth')} className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-amber-800/40 hover:bg-amber-700/50 border border-amber-600/40 text-amber-200 text-[10px] cursor-pointer" id="editor-new-stealth" title={`${t.editorNewLevel} — ${t.editorTypeStealth}`}>
                <Plus className="w-3 h-3" />{t.editorNewStealth}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={handleDuplicate} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-purple-800/40 hover:bg-purple-700/50 border border-purple-600/40 text-purple-200 text-[10px] cursor-pointer" id="editor-duplicate-level" title={t.editorDuplicate}>
                <Copy className="w-3.5 h-3.5" />{t.editorDuplicate}
              </button>
              <button onClick={handleDelete} disabled={missions.length <= 1} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[10px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" id="editor-delete-level" title={t.editorDelete}>
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

            {mission.type === 'platformer' ? (
              <>
                <div className="text-[10px] font-mono uppercase text-gray-500">{t.editorGroupPlatforms}</div>
                <div className="grid grid-cols-1 gap-1.5">
                  {platformPalette.map((p) => (
                    <React.Fragment key={p.label}>
                      <PaletteButton item={p.item} label={p.label} color={p.color} icon={<Box className="w-4 h-4" fill="currentColor" />} armed={isArmed(p.item)} onToggle={() => toggleArmed(p.item)} />
                    </React.Fragment>
                  ))}
                </div>
                <div className="text-[10px] font-mono uppercase text-gray-500 pt-1">{t.editorGroupCreatures}</div>
                <PaletteButton item={{ group: 'toad' }} label={t.palToad} color="#4ade80" icon={<Bug className="w-4 h-4" />} armed={isArmed({ group: 'toad' })} onToggle={() => toggleArmed({ group: 'toad' })} />
                <div className="text-[10px] font-mono uppercase text-gray-500 pt-1">{t.editorGroupCollectibles}</div>
                <div className="grid grid-cols-1 gap-1.5">
                  {collectiblePalette.map((c) => (
                    <React.Fragment key={c.label}>
                      <PaletteButton item={c.item} label={c.label} color={c.color} icon={c.item.group === 'collectible' && c.item.type === 'star' ? <Star className="w-4 h-4" fill="currentColor" /> : <Cherry className="w-4 h-4" fill="currentColor" />} armed={isArmed(c.item)} onToggle={() => toggleArmed(c.item)} />
                    </React.Fragment>
                  ))}
                </div>
                {customBlockSprites.length > 0 && (
                  <>
                    <div className="text-[10px] font-mono uppercase text-gray-500 pt-1">{t.editorGroupSprites}</div>
                    <div className="grid grid-cols-1 gap-1.5">
                      {customBlockSprites.map((s) => (
                        <React.Fragment key={s.id}>
                          <PaletteButton
                            item={{ group: 'sprite', id: s.id }}
                            label={s.name}
                            color="#67e8f9"
                            icon={s.frames.length > 0 ? <img src={s.frames[0]} alt="" className="w-4 h-4 object-contain" /> : <ImageIcon className="w-4 h-4" />}
                            armed={isArmed({ group: 'sprite', id: s.id })}
                            onToggle={() => toggleArmed({ group: 'sprite', id: s.id })}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="text-[10px] font-mono uppercase text-gray-500">{t.editorGroupTerrain}</div>
                <div className="grid grid-cols-1 gap-1.5">
                  <PaletteButton item={{ group: 'sPlatform' }} label={t.palStepPlatform} color="#a16207" icon={<Box className="w-4 h-4" fill="currentColor" />} armed={isArmed({ group: 'sPlatform' })} onToggle={() => toggleArmed({ group: 'sPlatform' })} />
                  <PaletteButton item={{ group: 'spot' }} label={t.palHidingSpot} color={SPOT_COLOR.cave} icon={<Box className="w-4 h-4" fill="currentColor" />} armed={isArmed({ group: 'spot' })} onToggle={() => toggleArmed({ group: 'spot' })} />
                </div>
              </>
            )}

            <div className="text-[10px] font-mono uppercase text-gray-500 pt-1">{t.editorGroupTriggers}</div>
            <div className="grid grid-cols-1 gap-1.5">
              <PaletteButton item={{ group: 'trigger', kind: 'fight' }} label={t.palFightTrigger} color="#fb7185" icon={<Swords className="w-4 h-4" />} armed={isArmed({ group: 'trigger', kind: 'fight' })} onToggle={() => toggleArmed({ group: 'trigger', kind: 'fight' })} />
              <PaletteButton item={{ group: 'trigger', kind: 'quiz' }} label={t.palQuizGate} color="#fbbf24" icon={<HelpCircle className="w-4 h-4" />} armed={isArmed({ group: 'trigger', kind: 'quiz' })} onToggle={() => toggleArmed({ group: 'trigger', kind: 'quiz' })} />
            </div>
          </div>
        </aside>

        {/* CENTER — schematic editing canvas */}
        <div className="flex-1 min-w-0 bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400">
              {String(mission.id).padStart(2, '0')} — {mission.name}
              <span className={`ml-2 px-1.5 py-0.5 rounded border text-[9px] ${mission.type === 'stealth' ? 'text-amber-300 border-amber-500/40 bg-amber-950/40' : 'text-emerald-300 border-emerald-500/40 bg-emerald-950/40'}`} id="editor-type-badge">
                {mission.type === 'stealth' ? t.editorTypeStealth : t.editorTypePlatformer}
              </span>
            </span>
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
              {/* guide lines (decoration only — must not eat placement clicks) */}
              <div className="absolute left-0 right-0 border-t border-dashed border-cyan-500/40 pointer-events-none" style={{ top: guideY(420) }}>
                <span className="absolute right-1 -top-3 text-[8px] font-mono text-cyan-500/70">{t.editorGuideScreen}</span>
              </div>
              {mission.type === 'platformer' && (
                <div className="absolute left-0 right-0 border-t border-dashed border-rose-500/40 pointer-events-none" style={{ top: guideY(550) }}>
                  <span className="absolute right-1 -top-3 text-[8px] font-mono text-rose-500/70">{t.editorGuideFall}</span>
                </div>
              )}

              {mission.type === 'platformer' ? (
                <>
                  {/* platforms */}
                  {mission.platforms.map((p) => {
                    const isSel = selected?.kind === 'platform' && selected.id === p.id;
                    const sprFrame = p.spriteId
                      ? world.sprites.find((s) => s.id === p.spriteId)?.frames[0]
                      : undefined;
                    return (
                      <React.Fragment key={p.id}>
                      {platformExtendsDown(p) && (
                        // preview of "extend to bottom" (decoration — no clicks)
                        <div
                          className="absolute pointer-events-none z-0"
                          style={{
                            left: p.x * SCALE,
                            top: (p.y + p.height) * SCALE,
                            width: p.width * SCALE,
                            height: Math.max(0, VIEWPORT_H - (p.y + p.height) * SCALE),
                            background: sprFrame ? `bottom / 100% 500% no-repeat url(${JSON.stringify(sprFrame)})` : PLATFORM_COLOR[p.type],
                            opacity: 0.35,
                          }}
                          data-extension={p.id}
                        />
                      )}
                      {!p.moving && p.extendLeft && (
                        <div
                          className="absolute pointer-events-none z-0"
                          style={{ left: 0, top: p.y * SCALE, width: p.x * SCALE, height: p.height * SCALE, background: sprFrame ? `left / auto 100% no-repeat url(${JSON.stringify(sprFrame)})` : PLATFORM_COLOR[p.type], opacity: 0.35 }}
                          data-extension-left={p.id}
                        />
                      )}
                      {!p.moving && p.extendRight && (
                        <div
                          className="absolute pointer-events-none z-0"
                          style={{ left: (p.x + p.width) * SCALE, top: p.y * SCALE, width: Math.max(0, (worldW - p.x - p.width) * SCALE), height: p.height * SCALE, background: sprFrame ? `right / auto 100% no-repeat url(${JSON.stringify(sprFrame)})` : PLATFORM_COLOR[p.type], opacity: 0.35 }}
                          data-extension-right={p.id}
                        />
                      )}
                      <div
                        onPointerDown={(e) => beginDrag(e, { kind: 'platform', id: p.id }, 'move')}
                        className={`absolute rounded-sm flex items-center justify-center overflow-hidden ${isSel ? 'ring-2 ring-fuchsia-400 z-20' : 'z-10'}`}
                        style={{
                          left: p.x * SCALE,
                          top: p.y * SCALE,
                          width: p.width * SCALE,
                          height: p.height * SCALE,
                          background: sprFrame ? `center / 100% 100% no-repeat url(${JSON.stringify(sprFrame)})` : PLATFORM_COLOR[p.type],
                          opacity: p.moving ? 0.85 : 1,
                          cursor: 'move',
                        }}
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
                      </React.Fragment>
                    );
                  })}

                  {/* toads */}
                  {mission.toads.map((td) => {
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
                  {mission.collectibles.map((c) => {
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
                    style={{ left: mission.startX * SCALE - 8, top: mission.startY * SCALE - 10, cursor: 'move' }}
                    data-item="start"
                    title={t.editorMarkerStart}
                  >
                    <Flag className="w-4 h-4 text-emerald-400" fill="currentColor" />
                  </div>

                  {/* end / goal marker */}
                  <div
                    onPointerDown={(e) => beginDrag(e, { kind: 'end' }, 'move')}
                    className={`absolute z-30 flex items-center justify-center rounded-full border-2 border-fuchsia-400 bg-fuchsia-500/20 ${selected?.kind === 'end' ? 'ring-2 ring-fuchsia-300' : ''}`}
                    style={{ left: mission.endX * SCALE - 14, top: mission.endY * SCALE - 14, width: 28, height: 28, cursor: 'move' }}
                    data-item="end"
                    title={t.editorMarkerGoal}
                  >
                    <DoorOpen className="w-3.5 h-3.5 text-fuchsia-300" />
                  </div>
                </>
              ) : (
                <>
                  {/* stealth ground steps */}
                  {mission.platforms.map((p) => {
                    const isSel = selected?.kind === 'sPlatform' && selected.id === p.id;
                    return (
                      <React.Fragment key={p.id}>
                      {p.extendDown && (
                        // preview of "extend to bottom" (decoration — no clicks)
                        <div
                          className="absolute pointer-events-none z-0"
                          style={{
                            left: p.x * SCALE,
                            top: (p.y + p.height) * SCALE,
                            width: p.width * SCALE,
                            height: Math.max(0, VIEWPORT_H - (p.y + p.height) * SCALE),
                            background: '#3f2a18',
                            opacity: 0.35,
                          }}
                          data-extension={p.id}
                        />
                      )}
                      {p.extendLeft && (
                        <div
                          className="absolute pointer-events-none z-0"
                          style={{ left: 0, top: p.y * SCALE, width: p.x * SCALE, height: p.height * SCALE, background: '#3f2a18', opacity: 0.35 }}
                          data-extension-left={p.id}
                        />
                      )}
                      {p.extendRight && (
                        <div
                          className="absolute pointer-events-none z-0"
                          style={{ left: (p.x + p.width) * SCALE, top: p.y * SCALE, width: Math.max(0, (worldW - p.x - p.width) * SCALE), height: p.height * SCALE, background: '#3f2a18', opacity: 0.35 }}
                          data-extension-right={p.id}
                        />
                      )}
                      <div
                        onPointerDown={(e) => beginDrag(e, { kind: 'sPlatform', id: p.id }, 'move')}
                        className={`absolute rounded-sm overflow-hidden ${isSel ? 'ring-2 ring-fuchsia-400 z-20' : 'z-10'}`}
                        style={{ left: p.x * SCALE, top: p.y * SCALE, width: p.width * SCALE, height: p.height * SCALE, background: '#3f2a18', borderTop: '3px solid #1f5132', cursor: 'move' }}
                        data-item="sPlatform"
                        data-id={p.id}
                      >
                        {isSel && (
                          <span
                            onPointerDown={(e) => beginDrag(e, { kind: 'sPlatform', id: p.id }, 'resize')}
                            className="absolute right-0 bottom-0 w-2.5 h-2.5 bg-fuchsia-400 border border-white cursor-nwse-resize"
                            data-resize="sPlatform"
                          />
                        )}
                      </div>
                      </React.Fragment>
                    );
                  })}

                  {/* hiding spots (drawn upward from their surface y) */}
                  {mission.hidingSpots.map((hs) => {
                    const isSel = selected?.kind === 'spot' && selected.id === hs.id;
                    const isGoal = hs.id === mission.goalSpotId;
                    return (
                      <div
                        key={hs.id}
                        onPointerDown={(e) => beginDrag(e, { kind: 'spot', id: hs.id }, 'move')}
                        className={`absolute z-20 rounded-t-full border border-black/40 flex items-end justify-center ${isSel ? 'ring-2 ring-fuchsia-400' : ''} ${isGoal ? 'ring-1 ring-amber-300' : ''}`}
                        style={{ left: hs.x * SCALE, top: (hs.y - hs.height) * SCALE, width: hs.width * SCALE, height: hs.height * SCALE, background: SPOT_COLOR[hs.kind], opacity: 0.9, cursor: 'move' }}
                        data-item="spot"
                        data-id={hs.id}
                        title={isGoal ? t.spotGoalCave : hs.kind === 'leaf_shadow' ? t.spotLeafShadow : t.spotCave}
                      >
                        <span className="text-[8px] text-white/80 font-mono pb-0.5 select-none">{isGoal ? '★' : hs.kind === 'leaf_shadow' ? '☘' : '◠'}</span>
                      </div>
                    );
                  })}

                  {/* tiger start marker */}
                  <div
                    onPointerDown={(e) => beginDrag(e, { kind: 'tiger' }, 'move')}
                    className={`absolute z-30 flex items-center justify-center gap-0.5 rounded-md border-2 border-orange-400 bg-orange-500/30 ${selected?.kind === 'tiger' ? 'ring-2 ring-orange-300' : ''}`}
                    style={{ left: mission.tigerStartX * SCALE - 30 * SCALE, top: (stealthGroundY(mission, mission.tigerStartX) - 34) * SCALE, width: 60 * SCALE, height: 34 * SCALE, cursor: 'ew-resize' }}
                    data-item="tiger"
                    title={t.editorMarkerTiger}
                  >
                    <Cat className="w-3.5 h-3.5 text-orange-300" />
                  </div>

                  {/* start marker */}
                  <div
                    onPointerDown={(e) => beginDrag(e, { kind: 'start' }, 'move')}
                    className={`absolute z-30 flex flex-col items-center ${selected?.kind === 'start' ? 'ring-2 ring-fuchsia-400 rounded' : ''}`}
                    style={{ left: mission.startX * SCALE - 8, top: (stealthGroundY(mission, mission.startX) - 20) * SCALE, cursor: 'ew-resize' }}
                    data-item="start"
                    title={t.editorMarkerStart}
                  >
                    <Flag className="w-4 h-4 text-emerald-400" fill="currentColor" />
                  </div>
                </>
              )}

              {/* trigger markers — invisible walls launching a fight or quiz */}
              {mission.triggers.map((tr) => {
                const isSel = selected?.kind === 'trigger' && selected.id === tr.id;
                const isFight = tr.kind === 'fight';
                return (
                  <div
                    key={tr.id}
                    onPointerDown={(e) => beginDrag(e, { kind: 'trigger', id: tr.id }, 'move')}
                    className={`absolute top-0 bottom-0 z-20 w-2 border-l-2 border-dashed ${
                      isFight ? 'border-rose-400/80 bg-rose-400/10' : 'border-amber-400/80 bg-amber-400/10'
                    } ${isSel ? (isFight ? 'ring-2 ring-rose-300' : 'ring-2 ring-amber-300') : ''}`}
                    style={{ left: tr.triggerX * SCALE - 1, cursor: 'ew-resize' }}
                    data-item="trigger"
                    data-id={tr.id}
                    data-kind={tr.kind}
                    title={isFight ? t.editorTriggerFight : t.editorTriggerQuiz}
                  >
                    <span className={`absolute top-1 -left-2.5 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center select-none ${isFight ? 'bg-rose-400 text-white' : 'bg-amber-400 text-black'}`}>
                      {isFight ? '⚔' : '?'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — inspector + mission settings */}
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
                  <NumberField label={t.editorFieldWidth} value={selPlatform.width} onChange={(v) => resizeItem(selected!, Math.max(GRID, v), selPlatform.height)} />
                  <NumberField label={t.editorFieldHeight} value={selPlatform.height} onChange={(v) => resizeItem(selected!, selPlatform.width, Math.max(GRID, v))} />
                </div>
                <label className="flex flex-col gap-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorFieldType}</span>
                  <select
                    value={selPlatform.type}
                    onChange={(e) => updateMission((m) => (m.type === 'platformer' ? { ...m, platforms: m.platforms.map((p) => (p.id === selPlatform.id ? { ...p, type: e.target.value as Platform['type'] } : p)) } : m))}
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
                    onChange={(e) => updateMission((m) => (m.type === 'platformer' ? { ...m, platforms: m.platforms.map((p) => (p.id === selPlatform.id ? { ...p, moving: e.target.checked, startX: e.target.checked ? p.x : p.startX, startY: e.target.checked ? p.y : p.startY, range: p.range ?? 150, speed: p.speed ?? 2 } : p)) } : m))}
                    className="accent-fuchsia-500 w-3.5 h-3.5"
                  />
                  <span className="text-[11px] text-gray-300">{t.editorFieldMoving}</span>
                </label>
                {selPlatform.moving && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label={t.editorFieldRange} value={selPlatform.range ?? 150} step={10} onChange={(v) => updateMission((m) => (m.type === 'platformer' ? { ...m, platforms: m.platforms.map((p) => (p.id === selPlatform.id ? { ...p, range: v } : p)) } : m))} />
                    <NumberField label={t.editorFieldSpeed} value={selPlatform.speed ?? 2} step={0.5} onChange={(v) => updateMission((m) => (m.type === 'platformer' ? { ...m, platforms: m.platforms.map((p) => (p.id === selPlatform.id ? { ...p, speed: v } : p)) } : m))} />
                  </div>
                )}
                {!selPlatform.moving && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer" title={t.editorExtendDownHint}>
                      <input
                        type="checkbox"
                        checked={platformExtendsDown(selPlatform)}
                        onChange={(e) => updateMission((m) => (m.type === 'platformer' ? { ...m, platforms: m.platforms.map((p) => (p.id === selPlatform.id ? { ...p, extendDown: e.target.checked } : p)) } : m))}
                        className="accent-fuchsia-500 w-3.5 h-3.5"
                        id="editor-extend-down"
                      />
                      <span className="text-[11px] text-gray-300">{t.editorFieldExtendDown}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer" title={t.editorExtendSideHint}>
                      <input
                        type="checkbox"
                        checked={!!selPlatform.extendLeft}
                        onChange={(e) => updateMission((m) => (m.type === 'platformer' ? { ...m, platforms: m.platforms.map((p) => (p.id === selPlatform.id ? { ...p, extendLeft: e.target.checked } : p)) } : m))}
                        className="accent-fuchsia-500 w-3.5 h-3.5"
                        id="editor-extend-left"
                      />
                      <span className="text-[11px] text-gray-300">{t.editorFieldExtendLeft}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer" title={t.editorExtendSideHint}>
                      <input
                        type="checkbox"
                        checked={!!selPlatform.extendRight}
                        onChange={(e) => updateMission((m) => (m.type === 'platformer' ? { ...m, platforms: m.platforms.map((p) => (p.id === selPlatform.id ? { ...p, extendRight: e.target.checked } : p)) } : m))}
                        className="accent-fuchsia-500 w-3.5 h-3.5"
                        id="editor-extend-right"
                      />
                      <span className="text-[11px] text-gray-300">{t.editorFieldExtendRight}</span>
                    </label>
                  </>
                )}
                <button onClick={() => { updateMission((m) => (m.type === 'platformer' ? { ...m, platforms: m.platforms.filter((p) => p.id !== selPlatform.id) } : m)); setSelected(null); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer">
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
                <NumberField label={t.editorFieldSpring} value={selToad.springForce} step={1} onChange={(v) => updateMission((m) => (m.type === 'platformer' ? { ...m, toads: m.toads.map((td) => (td.id === selToad.id ? { ...td, springForce: v } : td)) } : m))} />
                <label className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorFieldColor}</span>
                  <input type="color" value={selToad.color} onChange={(e) => updateMission((m) => (m.type === 'platformer' ? { ...m, toads: m.toads.map((td) => (td.id === selToad.id ? { ...td, color: e.target.value } : td)) } : m))} className="w-10 h-6 bg-transparent cursor-pointer" />
                </label>
                <button onClick={() => { updateMission((m) => (m.type === 'platformer' ? { ...m, toads: m.toads.filter((td) => td.id !== selToad.id) } : m)); setSelected(null); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer">
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
                  <select value={selCollectible.type} onChange={(e) => updateMission((m) => (m.type === 'platformer' ? { ...m, collectibles: m.collectibles.map((c) => (c.id === selCollectible.id ? { ...c, type: e.target.value as Collectible['type'] } : c)) } : m))} className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500">
                    <option value="banana">{t.palBanana}</option>
                    <option value="mango">{t.palMango}</option>
                    <option value="star">{t.palStar}</option>
                  </select>
                </label>
                <button onClick={() => { updateMission((m) => (m.type === 'platformer' ? { ...m, collectibles: m.collectibles.filter((c) => c.id !== selCollectible.id) } : m)); setSelected(null); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer">
                  <Trash2 className="w-3.5 h-3.5" />{t.editorDeleteItem}
                </button>
              </div>
            )}

            {selSPlatform && (
              <div className="space-y-2.5" id="inspector-splatform">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label={t.editorFieldX} value={selSPlatform.x} onChange={(v) => moveItem(selected!, v, selSPlatform.y)} />
                  <NumberField label={t.editorFieldY} value={selSPlatform.y} onChange={(v) => moveItem(selected!, selSPlatform.x, v)} />
                  <NumberField label={t.editorFieldWidth} value={selSPlatform.width} onChange={(v) => resizeItem(selected!, Math.max(GRID, v), selSPlatform.height)} />
                  <NumberField label={t.editorFieldHeight} value={selSPlatform.height} onChange={(v) => resizeItem(selected!, selSPlatform.width, Math.max(GRID, v))} />
                </div>
                <label className="flex items-center gap-2 cursor-pointer" title={t.editorExtendDownHint}>
                  <input
                    type="checkbox"
                    checked={!!selSPlatform.extendDown}
                    onChange={(e) => updateMission((m) => (m.type === 'stealth' ? { ...m, platforms: m.platforms.map((p) => (p.id === selSPlatform.id ? { ...p, extendDown: e.target.checked } : p)) } : m))}
                    className="accent-fuchsia-500 w-3.5 h-3.5"
                    id="editor-extend-down-stealth"
                  />
                  <span className="text-[11px] text-gray-300">{t.editorFieldExtendDown}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title={t.editorExtendSideHint}>
                  <input
                    type="checkbox"
                    checked={!!selSPlatform.extendLeft}
                    onChange={(e) => updateMission((m) => (m.type === 'stealth' ? { ...m, platforms: m.platforms.map((p) => (p.id === selSPlatform.id ? { ...p, extendLeft: e.target.checked } : p)) } : m))}
                    className="accent-fuchsia-500 w-3.5 h-3.5"
                    id="editor-extend-left-stealth"
                  />
                  <span className="text-[11px] text-gray-300">{t.editorFieldExtendLeft}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer" title={t.editorExtendSideHint}>
                  <input
                    type="checkbox"
                    checked={!!selSPlatform.extendRight}
                    onChange={(e) => updateMission((m) => (m.type === 'stealth' ? { ...m, platforms: m.platforms.map((p) => (p.id === selSPlatform.id ? { ...p, extendRight: e.target.checked } : p)) } : m))}
                    className="accent-fuchsia-500 w-3.5 h-3.5"
                    id="editor-extend-right-stealth"
                  />
                  <span className="text-[11px] text-gray-300">{t.editorFieldExtendRight}</span>
                </label>
                <button onClick={() => { updateMission((m) => (m.type === 'stealth' ? { ...m, platforms: m.platforms.filter((p) => p.id !== selSPlatform.id) } : m)); setSelected(null); }} disabled={mission.type === 'stealth' && mission.platforms.length <= 1} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer disabled:opacity-40">
                  <Trash2 className="w-3.5 h-3.5" />{t.editorDeleteItem}
                </button>
              </div>
            )}

            {selSpot && mission.type === 'stealth' && (
              <div className="space-y-2.5" id="inspector-spot">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label={t.editorFieldX} value={selSpot.x} onChange={(v) => moveItem(selected!, v, selSpot.y)} />
                  <NumberField label={t.editorFieldY} value={selSpot.y} onChange={(v) => moveItem(selected!, selSpot.x, v)} />
                </div>
                <SelectField
                  label={t.editorSpotKind}
                  value={selSpot.kind}
                  onChange={(v) =>
                    updateMission((m) => {
                      if (m.type !== 'stealth') return m;
                      const kind = v as HidingSpot['kind'];
                      // Exactly one goal: promoting a spot to goal_cave demotes
                      // the previous goal and re-points goalSpotId here.
                      if (kind === 'goal_cave') {
                        return {
                          ...m,
                          goalSpotId: selSpot.id,
                          hidingSpots: m.hidingSpots.map((hs) =>
                            hs.id === selSpot.id
                              ? { ...hs, kind }
                              : hs.kind === 'goal_cave'
                                ? { ...hs, kind: 'cave' }
                                : hs,
                          ),
                        };
                      }
                      return { ...m, hidingSpots: m.hidingSpots.map((hs) => (hs.id === selSpot.id ? { ...hs, kind } : hs)) };
                    })
                  }
                  options={[
                    { value: 'cave', label: t.spotCave },
                    { value: 'leaf_shadow', label: t.spotLeafShadow },
                    { value: 'goal_cave', label: t.spotGoalCave },
                  ]}
                  id="editor-spot-kind"
                />
                {selSpot.id === mission.goalSpotId && (
                  <p className="text-[10px] text-amber-200/80 leading-snug">{t.editorGoalSpotNote}</p>
                )}
                <button
                  onClick={() => { updateMission((m) => (m.type === 'stealth' ? { ...m, hidingSpots: m.hidingSpots.filter((hs) => hs.id !== selSpot.id) } : m)); setSelected(null); }}
                  disabled={selSpot.id === mission.goalSpotId}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />{t.editorDeleteItem}
                </button>
              </div>
            )}

            {selected?.kind === 'tiger' && mission.type === 'stealth' && (
              <div className="space-y-2" id="inspector-tiger">
                <div className="text-[11px] font-bold text-orange-300">{t.editorMarkerTiger}</div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label={t.editorFieldX} value={mission.tigerStartX} onChange={(v) => moveItem(selected, v, 0)} />
                  <NumberField label={t.editorFieldTigerSpeed} value={mission.tigerSpeed} step={0.2} onChange={(v) => updateMission((m) => (m.type === 'stealth' ? { ...m, tigerSpeed: Math.max(0.2, v) } : m))} />
                </div>
              </div>
            )}

            {selected?.kind === 'start' && (
              <div className="grid grid-cols-2 gap-2" id="inspector-start">
                <NumberField label={t.editorFieldX} value={mission.startX} onChange={(v) => moveItem(selected, v, mission.type === 'platformer' ? mission.startY : 0)} />
                {mission.type === 'platformer' && (
                  <NumberField label={t.editorFieldY} value={mission.startY} onChange={(v) => moveItem(selected, mission.startX, v)} />
                )}
              </div>
            )}
            {selected?.kind === 'end' && mission.type === 'platformer' && (
              <div className="grid grid-cols-2 gap-2" id="inspector-end">
                <NumberField label={t.editorFieldX} value={mission.endX} onChange={(v) => moveItem(selected, v, mission.endY)} />
                <NumberField label={t.editorFieldY} value={mission.endY} onChange={(v) => moveItem(selected, mission.endX, v)} />
              </div>
            )}

            {selTrigger && (
              <div className="space-y-2" id="inspector-trigger">
                <div className={`text-[11px] font-bold ${selTrigger.kind === 'fight' ? 'text-rose-300' : 'text-amber-300'}`}>
                  {selTrigger.kind === 'fight' ? t.editorTriggerFight : t.editorTriggerQuiz}
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">{t.editorTriggerHint}</p>
                <SelectField
                  label={t.editorTriggerRef}
                  value={selTrigger.refId}
                  onChange={(v) => updateMission((m) => ({ ...m, triggers: m.triggers.map((tr) => (tr.id === selTrigger.id ? { ...tr, refId: v } : tr)) }))}
                  options={(selTrigger.kind === 'fight'
                    ? world.fights.map((f) => ({ value: f.id, label: f.name }))
                    : world.quizzes.map((q) => ({ value: q.id, label: q.title })))}
                  id="editor-trigger-ref"
                />
                <NumberField label={t.editorFieldX} value={selTrigger.triggerX} onChange={(v) => moveItem(selected!, v, 0)} />
                <button onClick={() => { updateMission((m) => ({ ...m, triggers: m.triggers.filter((tr) => tr.id !== selTrigger.id) })); setSelected(null); }} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[11px] cursor-pointer" id="editor-delete-trigger">
                  <Trash2 className="w-3.5 h-3.5" />{t.editorDeleteItem}
                </button>
              </div>
            )}
          </div>

          {/* Mission settings */}
          <div className="bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-3" id="editor-level-settings">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400">{t.editorLevelSettings}</div>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorName}</span>
              <input value={mission.name} onChange={(e) => updateMission((m) => ({ ...m, name: e.target.value }))} className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500" id="editor-field-name" />
            </label>
            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorDescription}</span>
              <textarea value={mission.description} onChange={(e) => updateMission((m) => ({ ...m, description: e.target.value }))} rows={2} className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500 resize-none" />
            </label>

            <div className="grid grid-cols-2 gap-2">
              <SelectField
                label={t.editorMissionType}
                value={mission.type}
                onChange={(v) => handleTypeChange(v as MissionType)}
                options={[
                  { value: 'platformer', label: t.editorTypePlatformer },
                  { value: 'stealth', label: t.editorTypeStealth },
                ]}
                id="editor-mission-type"
              />
              <SelectField
                label={t.editorChapter}
                value={mission.chapter}
                onChange={(v) => updateMission((m) => ({ ...m, chapter: v as ChapterId }))}
                options={chapterOptions}
                id="editor-mission-chapter"
              />
            </div>

            {mission.type === 'platformer' && (
              <>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mission.timeLimit !== undefined}
                    onChange={(e) => updateMission((m) => { if (m.type !== 'platformer') return m; if (e.target.checked) return { ...m, timeLimit: m.timeLimit ?? 15, collectibleBonusSeconds: m.collectibleBonusSeconds ?? 2 }; const { timeLimit, collectibleBonusSeconds, ...rest } = m; return rest as Mission; })}
                    className="accent-fuchsia-500 w-3.5 h-3.5"
                    id="editor-timed-toggle"
                  />
                  <span className="text-[11px] text-gray-300">{t.editorTimedLevel}</span>
                </label>
                {mission.timeLimit !== undefined && (
                  <div className="grid grid-cols-2 gap-2">
                    <NumberField label={t.editorTimeLimit} value={mission.timeLimit} step={1} onChange={(v) => updateMission((m) => (m.type === 'platformer' ? { ...m, timeLimit: Math.max(1, v) } : m))} />
                    <NumberField label={t.editorBonusSeconds} value={mission.collectibleBonusSeconds ?? 2} step={1} onChange={(v) => updateMission((m) => (m.type === 'platformer' ? { ...m, collectibleBonusSeconds: Math.max(0, v) } : m))} />
                  </div>
                )}
              </>
            )}

            {mission.type === 'stealth' && (
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={t.editorFieldMinX} value={mission.levelMinX} onChange={(v) => updateMission((m) => (m.type === 'stealth' ? { ...m, levelMinX: Math.max(0, v) } : m))} />
                <NumberField label={t.editorFieldMaxX} value={mission.levelMaxX} onChange={(v) => updateMission((m) => (m.type === 'stealth' ? { ...m, levelMaxX: Math.max(200, v) } : m))} />
              </div>
            )}

            <label className="flex flex-col gap-0.5">
              <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorBackground}</span>
              <select
                value={mission.background ?? (mission.type === 'stealth' ? 'night_raid' : 'jungle')}
                onChange={(e) => updateMission((m) => ({ ...m, background: e.target.value as LevelBackgroundId }))}
                className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500"
                id="editor-background-select"
              >
                <option value="jungle">{t.editorBgJungle}</option>
                <option value="night_raid">{t.editorBgNightRaid}</option>
                <option value="deep_jungle">{t.editorBgDeepJungle}</option>
              </select>
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" id="editor-bg-file" onChange={(e) => { handleBgFile(e.target.files?.[0]); e.target.value = ''; }} />
            {mission.backgroundImage ? (
              <div className="flex items-center justify-between gap-2 bg-emerald-950/30 border border-emerald-700/40 rounded-md px-2 py-1.5">
                <span className="text-[10px] text-emerald-300 flex items-center gap-1"><img src={mission.backgroundImage} alt="" className="w-6 h-4 object-cover rounded-sm" />{t.editorBgCustomActive}</span>
                <button onClick={() => updateMission((m) => { const { backgroundImage, ...rest } = m; return rest as Mission; })} className="text-rose-300 hover:text-rose-200 cursor-pointer" title={t.editorBgClearCustom}><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md bg-purple-900/40 hover:bg-purple-800/50 border border-purple-700/40 text-purple-200 text-[11px] cursor-pointer" id="editor-bg-upload">
                <Upload className="w-3.5 h-3.5" />{t.editorBgCustom}
              </button>
            )}
            {bgError && (
              <p className="text-[10px] text-rose-400" id="editor-bg-error">{t.editorBgUploadFailed}</p>
            )}
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}
