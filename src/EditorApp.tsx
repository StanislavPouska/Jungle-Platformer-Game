/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Level } from './types';
import { INITIAL_LEVELS } from './data';
import LevelEditor from './components/LevelEditor';
import { Lang, UI, LANGUAGES } from './i18n';
import {
  readSaveData,
  writeLevelsToSave,
  scheduleLevelsSave,
  flushLevelsSave,
  mergeWithDefaults,
  readSavedLang,
  LANG_KEY,
} from './storage';
import { SquarePen } from 'lucide-react';

// Seed the editor's level list from the shared save, merged against the
// built-in set: recovers levels an old/partial save is missing while keeping
// the user's deliberate deletions deleted (knownDefaultIds tells them apart).
function seedLevels(): Level[] {
  const saved = readSaveData();
  if (!saved?.levels?.length) return JSON.parse(JSON.stringify(INITIAL_LEVELS));
  return mergeWithDefaults(saved.levels, saved.knownDefaultIds);
}

// Standalone host for the level editor — what editor.exe opens. Shares the
// game's localStorage save, so designs made here appear in the game's Load and
// in one-click Playtest (which navigates to index.html?play=N).
export default function EditorApp() {
  const [language, setLanguage] = useState<Lang>(() => readSavedLang());
  const [levels, setLevels] = useState<Level[]>(seedLevels);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const t = UI[language];

  // Re-stamp the save on mount: persists any levels the merge recovered and
  // records knownDefaultIds so future deletions of built-ins stay durable.
  useEffect(() => {
    if (readSaveData()) writeLevelsToSave(levels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosaves are debounced — push any pending write out before the page
  // closes so the last edits aren't lost.
  useEffect(() => {
    const flush = () => flushLevelsSave();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  const handleLevelsChange = (next: Level[]) => {
    setLevels(next);
    scheduleLevelsSave(next, (data) => {
      setSavedAt(data?.savedAt ?? null);
      setSaveFailed(data === null);
    });
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
    // Persist exactly the current state, then hand off to the game.
    scheduleLevelsSave(levels);
    flushLevelsSave();
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
            {saveFailed ? (
              <span className="text-[10px] font-mono text-rose-400" id="editor-save-error">⚠ {t.editorSaveFailed}</span>
            ) : savedAt ? (
              <span className="text-[10px] font-mono text-emerald-400" id="editor-autosave-indicator">● {t.editorAutosaved}</span>
            ) : null}
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
