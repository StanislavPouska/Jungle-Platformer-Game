/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Level } from './types';
import { INITIAL_LEVELS } from './data';
import LevelEditor from './components/LevelEditor';
import { Lang, UI, LANGUAGES } from './i18n';
import { readSaveData, writeLevelsToSave, readSavedLang, LANG_KEY } from './storage';
import { SquarePen } from 'lucide-react';

// Merge any saved levels with the full built-in set, keyed by id, so an old or
// partial save (e.g. from before the game grew to 10 levels) never hides
// levels in the editor. Saved edits win where ids match; custom levels (ids not
// in the defaults) are kept and appended.
function seedLevels(): Level[] {
  const saved = readSaveData()?.levels ?? [];
  if (!saved.length) return JSON.parse(JSON.stringify(INITIAL_LEVELS));
  const byId = new Map(saved.map((l) => [l.id, l]));
  const merged: Level[] = INITIAL_LEVELS.map((def) => byId.get(def.id) ?? def);
  for (const l of saved) {
    if (!INITIAL_LEVELS.some((d) => d.id === l.id)) merged.push(l);
  }
  return JSON.parse(JSON.stringify(merged));
}

// Standalone host for the level editor — what editor.exe opens. Shares the
// game's localStorage save, so designs made here appear in the game's Load and
// in one-click Playtest (which navigates to index.html?play=N).
export default function EditorApp() {
  const [language, setLanguage] = useState<Lang>(() => readSavedLang());
  const [levels, setLevels] = useState<Level[]>(seedLevels);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const t = UI[language];

  // If the seed recovered levels a stale/partial save was missing, persist the
  // upgraded set so the game's Load and future opens stay consistent.
  useEffect(() => {
    const savedCount = readSaveData()?.levels?.length ?? 0;
    if (savedCount > 0 && savedCount < levels.length) {
      writeLevelsToSave(levels);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLevelsChange = (next: Level[]) => {
    setLevels(next);
    const data = writeLevelsToSave(next);
    setSavedAt(data?.savedAt ?? null);
  };

  const handleLanguageChange = (lang: Lang) => {
    setLanguage(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  const handlePlaytest = (idx: number) => {
    writeLevelsToSave(levels); // make sure the latest edits are persisted
    window.location.href = `index.html?play=${idx}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0e0722] via-[#140a2d] to-[#04010a] text-gray-100 font-sans px-4 md:px-6 py-5 select-none">
      <div className="w-full max-w-[1700px] mx-auto space-y-5">
        <header className="flex flex-col md:flex-row justify-between items-center bg-[#1d0735]/70 border-2 border-fuchsia-500/25 px-6 py-4 rounded-3xl gap-4 backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.15)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-fuchsia-950/45 rounded-2xl border border-fuchsia-500/40 text-fuchsia-400">
              <SquarePen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-xl tracking-tight text-white">{t.editorStandaloneTitle}</h1>
              <p className="text-[11px] text-gray-400 font-mono">{t.editorStandaloneSubtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && <span className="text-[10px] font-mono text-emerald-400" id="editor-autosave-indicator">● {t.editorAutosaved}</span>}
            <div className="flex gap-1 bg-[#0d071f] p-1 rounded-xl border border-purple-900/40">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => handleLanguageChange(l.code)}
                  className={`px-2 py-1 rounded-lg text-base leading-none cursor-pointer ${language === l.code ? 'bg-fuchsia-600/60 ring-1 ring-fuchsia-400' : 'hover:bg-purple-950/60 opacity-70'}`}
                  title={l.label}
                >
                  {l.flag}
                </button>
              ))}
            </div>
            <a href="index.html" className="text-xs font-mono text-fuchsia-300 hover:text-white border border-fuchsia-500/40 bg-fuchsia-950/45 px-3 py-2 rounded-xl cursor-pointer" id="editor-open-game">
              {t.editorOpenGame}
            </a>
          </div>
        </header>

        <LevelEditor levels={levels} onLevelsChange={handleLevelsChange} onPlaytest={handlePlaytest} language={language} />
      </div>
    </div>
  );
}
