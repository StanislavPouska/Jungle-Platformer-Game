/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { Mission, SpriteDef, SpriteKind, WorldData } from '../types';
import { Lang, UI } from '../i18n';
import { Plus, Copy, Trash2, X, Image as ImageIcon, Upload, Box, PersonStanding } from 'lucide-react';
import { TextField, NumberField, makeLibraryId, downscaleImage } from './editorFields';

// Sprite-library pane of the editor: every graphical object the game draws.
// Blocks are placeable in missions as building blocks; characters carry frame
// sequences that play as their move animation. A sprite without frames keeps
// the game's original procedural art.
interface SpriteEditorProps {
  world: WorldData;
  onWorldChange: (next: WorldData) => void;
  language: Lang;
}

const FRAME_MAX_W = 256; // uploads are downscaled to keep the save small

export default function SpriteEditor({ world, onWorldChange, language }: SpriteEditorProps) {
  const t = UI[language];
  const sprites = world.sprites;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sprite = sprites.find((s) => s.id === selectedId) ?? sprites[0] ?? null;

  const update = (mutator: (s: SpriteDef) => SpriteDef) => {
    if (!sprite) return;
    onWorldChange({
      ...world,
      sprites: sprites.map((s) => (s.id === sprite.id ? mutator(s) : s)),
    });
  };

  const handleNew = (kind: SpriteKind) => {
    const blank: SpriteDef = {
      id: makeLibraryId('sprite', sprites),
      name: t.editorSpriteNewName,
      kind,
      width: kind === 'block' ? 120 : 40,
      height: kind === 'block' ? 40 : 60,
      frames: [],
      frameDuration: 140,
    };
    onWorldChange({ ...world, sprites: [...sprites, blank] });
    setSelectedId(blank.id);
  };

  const handleDuplicate = () => {
    if (!sprite) return;
    const clone: SpriteDef = JSON.parse(JSON.stringify(sprite));
    clone.id = makeLibraryId('sprite', sprites);
    clone.name = `${sprite.name} (copy)`;
    onWorldChange({ ...world, sprites: [...sprites, clone] });
    setSelectedId(clone.id);
  };

  const usedByMissions = (id: string): Mission[] =>
    world.missions.filter(
      (m) => m.type === 'platformer' && m.platforms.some((p) => p.spriteId === id),
    );

  const handleDelete = () => {
    if (!sprite) return;
    const used = usedByMissions(sprite.id);
    const prompt = used.length
      ? `${t.editorCascadeConfirm1}${used.map((m) => m.name).join(', ')}${t.editorCascadeConfirm2}`
      : t.editorConfirmDeleteObject;
    if (!window.confirm(prompt)) return;
    onWorldChange({
      ...world,
      sprites: sprites.filter((s) => s.id !== sprite.id),
      // Placed blocks lose their override and fall back to their type's art.
      missions: world.missions.map((m) =>
        m.type === 'platformer'
          ? {
              ...m,
              platforms: m.platforms.map((p) =>
                p.spriteId === sprite.id ? { ...p, spriteId: undefined } : p,
              ),
            }
          : m,
      ),
    });
    setSelectedId(null);
  };

  const handleFrameFiles = async (files: FileList | null) => {
    if (!files || files.length === 0 || !sprite) return;
    const targetId = sprite.id; // uploads belong to the sprite shown at pick time
    setUploadError(false);
    try {
      const dataUrls: string[] = [];
      for (const file of Array.from(files)) {
        dataUrls.push(await downscaleImage(file, FRAME_MAX_W));
      }
      onWorldChange({
        ...world,
        sprites: world.sprites.map((s) =>
          s.id === targetId ? { ...s, frames: [...s.frames, ...dataUrls] } : s,
        ),
      });
    } catch {
      setUploadError(true);
    }
  };

  const used = sprite ? usedByMissions(sprite.id) : [];
  const blocks = sprites.filter((s) => s.kind === 'block');
  const characters = sprites.filter((s) => s.kind === 'character');

  const listButton = (s: SpriteDef) => (
    <button
      key={s.id}
      onClick={() => { setSelectedId(s.id); setUploadError(false); }}
      className={`w-full flex items-center gap-2 text-left px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-all ${
        sprite?.id === s.id
          ? 'border-cyan-400 bg-cyan-950/40 text-white ring-1 ring-cyan-400'
          : 'border-purple-900/50 bg-[#0c0419] text-gray-300 hover:bg-purple-950/40'
      }`}
      data-sprite-id={s.id}
    >
      {s.frames.length > 0 ? (
        <img src={s.frames[0]} alt="" className="w-5 h-5 object-contain rounded-sm shrink-0 bg-black/30" />
      ) : (
        <span className="w-5 h-5 flex items-center justify-center shrink-0 text-gray-500">
          {s.kind === 'block' ? <Box className="w-3.5 h-3.5" /> : <PersonStanding className="w-3.5 h-3.5" />}
        </span>
      )}
      <span className="truncate">{s.name}</span>
    </button>
  );

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start" id="sprite-editor">
      {/* Sprite list */}
      <aside className="w-full xl:w-[260px] xl:shrink-0 bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
          <ImageIcon className="w-3.5 h-3.5" />{t.editorSpritesHeader}
        </div>
        <p className="text-[10px] text-gray-400 leading-snug">{t.editorSpriteHint}</p>

        <div className="text-[10px] font-mono uppercase text-gray-500">{t.editorSpriteBlocks}</div>
        <div className="space-y-1">{blocks.map(listButton)}</div>
        <div className="text-[10px] font-mono uppercase text-gray-500 pt-1">{t.editorSpriteCharacters}</div>
        <div className="space-y-1">{characters.map(listButton)}</div>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button onClick={() => handleNew('block')} className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-emerald-700/40 hover:bg-emerald-600/50 border border-emerald-600/40 text-emerald-200 text-[10px] cursor-pointer" id="editor-new-sprite-block">
            <Plus className="w-3 h-3" />{t.editorNewBlock}
          </button>
          <button onClick={() => handleNew('character')} className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-emerald-700/40 hover:bg-emerald-600/50 border border-emerald-600/40 text-emerald-200 text-[10px] cursor-pointer" id="editor-new-sprite-character">
            <Plus className="w-3 h-3" />{t.editorNewCharacter}
          </button>
          <button onClick={handleDuplicate} disabled={!sprite} className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-purple-800/40 hover:bg-purple-700/50 border border-purple-600/40 text-purple-200 text-[10px] cursor-pointer disabled:opacity-40" id="editor-duplicate-sprite">
            <Copy className="w-3 h-3" />{t.editorDuplicate}
          </button>
          <button onClick={handleDelete} disabled={!sprite} className="flex items-center justify-center gap-1 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[10px] cursor-pointer disabled:opacity-40" id="editor-delete-sprite">
            <Trash2 className="w-3 h-3" />{t.editorDelete}
          </button>
        </div>
      </aside>

      {/* Sprite form */}
      {sprite && (
        <div className="flex-1 min-w-0 bg-[#180a2d]/80 rounded-2xl p-4 border border-purple-500/20 space-y-4 w-full" id="sprite-form">
          <TextField label={t.editorName} value={sprite.name} onChange={(v) => update((s) => ({ ...s, name: v }))} id="editor-sprite-name" />

          <div className="grid grid-cols-3 gap-2 max-w-[420px]">
            <NumberField label={t.editorFieldWidth} value={sprite.width} step={5} onChange={(v) => update((s) => ({ ...s, width: Math.max(5, v) }))} />
            <NumberField label={t.editorFieldHeight} value={sprite.height} step={5} onChange={(v) => update((s) => ({ ...s, height: Math.max(5, v) }))} />
            {(sprite.kind === 'character' || sprite.frames.length > 1) && (
              <NumberField label={t.editorFrameDuration} value={sprite.frameDuration} step={20} onChange={(v) => update((s) => ({ ...s, frameDuration: Math.max(40, v) }))} />
            )}
          </div>

          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-300">{t.editorFrames}</div>
          {sprite.frames.length === 0 && (
            <p className="text-[10px] text-gray-400" id="sprite-no-frames">{t.editorSpriteNoFrames}</p>
          )}
          <div className="flex flex-wrap gap-2" id="sprite-frames">
            {sprite.frames.map((frame, fi) => (
              <div key={fi} className="relative group" data-frame-index={fi}>
                <img
                  src={frame}
                  alt={`frame ${fi + 1}`}
                  className="w-20 h-20 object-contain rounded-lg border border-purple-900/50 bg-[#0c0419]"
                />
                <span className="absolute bottom-0.5 left-1 text-[9px] font-mono text-gray-400">{fi + 1}</span>
                <button
                  onClick={() => update((s) => ({ ...s, frames: s.frames.filter((_, i) => i !== fi) }))}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-rose-800 hover:bg-rose-700 text-white cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  title={t.editorDeleteItem}
                  id={`sprite-frame-${fi}-delete`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            id="sprite-frame-file"
            onChange={(e) => { handleFrameFiles(e.target.files); e.target.value = ''; }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-1.5 py-1.5 px-4 rounded-md bg-cyan-900/40 hover:bg-cyan-800/50 border border-cyan-700/40 text-cyan-200 text-[11px] cursor-pointer"
            id="sprite-add-frame"
          >
            <Upload className="w-3.5 h-3.5" />{t.editorAddFrame}
          </button>
          {uploadError && (
            <p className="text-[10px] text-rose-400" id="sprite-upload-error">{t.editorBgUploadFailed}</p>
          )}

          {used.length > 0 && (
            <p className="text-[10px] font-mono text-gray-400" id="sprite-used-by">
              {t.editorUsedBy}: {used.map((m) => m.name).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
