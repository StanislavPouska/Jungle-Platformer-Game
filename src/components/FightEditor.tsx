/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FightDef, FighterSpriteId, FightBackgroundId, WorldData } from '../types';
import { Lang, UI } from '../i18n';
import { Plus, Copy, Trash2, Swords } from 'lucide-react';
import { NumberField, TextField, TextAreaField, SelectField, makeLibraryId } from './editorFields';

// Fight-library pane of the editor: define reusable 1v1 duels that missions
// launch via placed fight triggers.
interface FightEditorProps {
  world: WorldData;
  onWorldChange: (next: WorldData) => void;
  language: Lang;
}

export default function FightEditor({ world, onWorldChange, language }: FightEditorProps) {
  const t = UI[language];
  const fights = world.fights;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fight = fights.find((f) => f.id === selectedId) ?? fights[0] ?? null;

  const update = (mutator: (f: FightDef) => FightDef) => {
    if (!fight) return;
    onWorldChange({
      ...world,
      fights: fights.map((f) => (f.id === fight.id ? mutator(f) : f)),
    });
  };

  const handleNew = () => {
    const blank: FightDef = {
      id: makeLibraryId('fight', fights),
      name: t.editorNewFightName,
      description: t.editorNewFightDesc,
      background: 'village',
      player: { sprite: 'mowgli_torch', maxHp: 100, damage: 20, parryChance: 0 },
      opponent: { sprite: 'shere_khan', maxHp: 100, damage: 20, parryChance: 0.2 },
      restartOnLose: false,
    };
    onWorldChange({ ...world, fights: [...fights, blank] });
    setSelectedId(blank.id);
  };

  const handleDuplicate = () => {
    if (!fight) return;
    const clone: FightDef = JSON.parse(JSON.stringify(fight));
    clone.id = makeLibraryId('fight', fights);
    clone.name = `${fight.name} (copy)`;
    onWorldChange({ ...world, fights: [...fights, clone] });
    setSelectedId(clone.id);
  };

  // Missions whose triggers launch this fight (shown as usage + cascade scope).
  const usedByMissions = (id: string) =>
    world.missions.filter((m) => m.triggers.some((tr) => tr.kind === 'fight' && tr.refId === id));

  const handleDelete = () => {
    if (!fight) return;
    const used = usedByMissions(fight.id);
    const prompt = used.length
      ? `${t.editorCascadeConfirm1}${used.map((m) => m.name).join(', ')}${t.editorCascadeConfirm2}`
      : t.editorConfirmDeleteObject;
    if (!window.confirm(prompt)) return;
    onWorldChange({
      ...world,
      fights: fights.filter((f) => f.id !== fight.id),
      missions: world.missions.map((m) => ({
        ...m,
        triggers: m.triggers.filter((tr) => !(tr.kind === 'fight' && tr.refId === fight.id)),
      })),
    });
    setSelectedId(null);
  };

  const used = fight ? usedByMissions(fight.id) : [];

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start" id="fight-editor">
      {/* Fight list */}
      <aside className="w-full xl:w-[240px] xl:shrink-0 bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
          <Swords className="w-3.5 h-3.5" />{t.editorFightsHeader}
        </div>
        <div className="space-y-1.5">
          {fights.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedId(f.id)}
              className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                fight?.id === f.id
                  ? 'border-rose-400 bg-rose-950/40 text-white ring-1 ring-rose-400'
                  : 'border-purple-900/50 bg-[#0c0419] text-gray-300 hover:bg-purple-950/40'
              }`}
              data-fight-id={f.id}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={handleNew} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-emerald-700/40 hover:bg-emerald-600/50 border border-emerald-600/40 text-emerald-200 text-[10px] cursor-pointer" id="editor-new-fight" title={t.editorNewLevel}>
            <Plus className="w-3.5 h-3.5" />{t.editorNewLevel}
          </button>
          <button onClick={handleDuplicate} disabled={!fight} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-purple-800/40 hover:bg-purple-700/50 border border-purple-600/40 text-purple-200 text-[10px] cursor-pointer disabled:opacity-40" id="editor-duplicate-fight" title={t.editorDuplicate}>
            <Copy className="w-3.5 h-3.5" />{t.editorDuplicate}
          </button>
          <button onClick={handleDelete} disabled={!fight} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[10px] cursor-pointer disabled:opacity-40" id="editor-delete-fight" title={t.editorDelete}>
            <Trash2 className="w-3.5 h-3.5" />{t.editorDelete}
          </button>
        </div>
      </aside>

      {/* Fight form */}
      {fight && (
        <div className="flex-1 min-w-0 bg-[#180a2d]/80 rounded-2xl p-4 border border-purple-500/20 space-y-4 w-full" id="fight-form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <TextField label={t.editorName} value={fight.name} onChange={(v) => update((f) => ({ ...f, name: v }))} id="editor-fight-name" />
            <SelectField
              label={t.editorFightBg}
              value={fight.background}
              onChange={(v) => update((f) => ({ ...f, background: v as FightBackgroundId }))}
              options={[{ value: 'village', label: t.fightBgVillage }]}
            />
          </div>
          <TextAreaField label={t.editorDescription} value={fight.description} onChange={(v) => update((f) => ({ ...f, description: v }))} />

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={fight.restartOnLose}
              onChange={(e) => update((f) => ({ ...f, restartOnLose: e.target.checked }))}
              className="accent-fuchsia-500 w-3.5 h-3.5"
              id="editor-fight-restart"
            />
            <span className="text-[11px] text-gray-300">{t.editorRestartOnLose}</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#0c0419]/60 rounded-xl p-3 border border-purple-900/40 space-y-2" id="fight-player-panel">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-300">{t.editorFightPlayer}</div>
              <div className="grid grid-cols-2 gap-2">
                <NumberField label={t.editorFieldMaxHp} value={fight.player.maxHp} step={5} onChange={(v) => update((f) => ({ ...f, player: { ...f.player, maxHp: Math.max(1, v) } }))} />
                <NumberField label={t.editorFieldDamage} value={fight.player.damage} step={5} onChange={(v) => update((f) => ({ ...f, player: { ...f.player, damage: Math.max(1, v) } }))} />
              </div>
            </div>
            <div className="bg-[#0c0419]/60 rounded-xl p-3 border border-purple-900/40 space-y-2" id="fight-opponent-panel">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-rose-300">{t.editorFightOpponent}</div>
              <SelectField
                label={t.editorFieldSprite}
                value={fight.opponent.sprite}
                onChange={(v) => update((f) => ({ ...f, opponent: { ...f.opponent, sprite: v as FighterSpriteId } }))}
                options={[
                  { value: 'shere_khan', label: t.spriteShereKhan },
                  { value: 'mowgli_torch', label: t.spriteMowgliTorch },
                ]}
                id="editor-fight-opponent-sprite"
              />
              <div className="grid grid-cols-3 gap-2">
                <NumberField label={t.editorFieldMaxHp} value={fight.opponent.maxHp} step={5} onChange={(v) => update((f) => ({ ...f, opponent: { ...f.opponent, maxHp: Math.max(1, v) } }))} />
                <NumberField label={t.editorFieldDamage} value={fight.opponent.damage} step={5} onChange={(v) => update((f) => ({ ...f, opponent: { ...f.opponent, damage: Math.max(1, v) } }))} />
                <NumberField label={t.editorFieldParry} value={fight.opponent.parryChance} step={0.05} onChange={(v) => update((f) => ({ ...f, opponent: { ...f.opponent, parryChance: Math.max(0, Math.min(1, v)) } }))} />
              </div>
            </div>
          </div>

          {used.length > 0 && (
            <p className="text-[10px] font-mono text-gray-400" id="fight-used-by">
              {t.editorUsedBy}: {used.map((m) => m.name).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
