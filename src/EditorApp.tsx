/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { WorldData } from './types';
import LevelEditor from './components/LevelEditor';
import { Lang, UI, LANGUAGES } from './i18n';
import { readSavedLang, LANG_KEY } from './storage';
import { loadWorldFromServer, saveWorldToServer } from './worldFile';
import { SquarePen, Loader2 } from 'lucide-react';

// Standalone host for the world editor — what editor.exe opens via the local
// editor server. It reads and writes the game's content file (public/world.json)
// directly on disk through the server's /api/world endpoint. Missions designed
// here permanently change the game content; the browser game reads the same
// file at startup.
export default function EditorApp() {
  const [language, setLanguage] = useState<Lang>(() => readSavedLang());
  const [world, setWorld] = useState<WorldData | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);
  const t = UI[language];

  // Debounced file save: every edit schedules a write; the actual POST runs
  // once edits go quiet. A ref holds the freshest world so a flush always
  // persists the latest state.
  const worldRef = useRef<WorldData | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const persist = async (next: WorldData) => {
    const result = await saveWorldToServer(next);
    setSaveFailed(!result.ok);
    if (result.ok) setSavedAt(result.savedAt ?? new Date().toISOString());
  };

  const flush = () => {
    clearTimeout(saveTimer.current);
    if (worldRef.current) void persist(worldRef.current);
  };

  // Load the current game content from disk on mount.
  useEffect(() => {
    let alive = true;
    loadWorldFromServer().then((w) => {
      if (alive) {
        setWorld(w);
        worldRef.current = w;
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  // Flush any pending write before the page closes.
  useEffect(() => {
    const onUnload = () => {
      // Best-effort synchronous flush via sendBeacon so the last edits land.
      if (worldRef.current) {
        try {
          navigator.sendBeacon('/api/world', new Blob([JSON.stringify(worldRef.current)], { type: 'application/json' }));
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);

  const handleWorldChange = (next: WorldData) => {
    setWorld(next);
    worldRef.current = next;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(next), 600);
  };

  const handleLanguageChange = (lang: Lang) => {
    setLanguage(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      /* ignore */
    }
  };

  // Explicit Save: force the pending write out immediately.
  const handleSave = () => {
    flush();
  };

  const handlePlaytest = async (idx: number) => {
    // Persist to disk first, then hand off to the game (which reads the file).
    clearTimeout(saveTimer.current);
    if (worldRef.current) await persist(worldRef.current);
    window.location.href = `index.html?play=${idx}`;
  };

  if (!world) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e0722] via-[#140a2d] to-[#04010a] text-gray-100 flex items-center justify-center">
        <div className="flex items-center gap-3 text-fuchsia-300 font-mono text-sm">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading world…
        </div>
      </div>
    );
  }

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
              <span className="text-[10px] font-mono text-rose-400" id="editor-save-error">⚠ {t.editorSaveFailedFile}</span>
            ) : savedAt ? (
              <span className="text-[10px] font-mono text-emerald-400" id="editor-autosave-indicator">● {t.editorSavedToFile}</span>
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

        <LevelEditor world={world} onWorldChange={handleWorldChange} onPlaytest={handlePlaytest} onSave={handleSave} language={language} />
      </div>
    </div>
  );
}
