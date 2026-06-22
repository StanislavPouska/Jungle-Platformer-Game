/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { INITIAL_LEVELS, INITIAL_SETTINGS } from './data';
import { GameStats, GameSettings, Level } from './types';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import PrologueCanvas from './components/PrologueCanvas';
import FighterCanvas from './components/FighterCanvas';
import { PROLOGUE_LEVEL } from './prologueData';
import { EPILOGUE_FIGHT } from './fighterData';
import {
  Trees,
  HelpCircle,
  VolumeX,
  Volume2,
  MapPin,
  Flame,
  TrendingUp,
  Sparkles,
  Info,
  Menu as MenuIcon,
  Skull,
  Swords
} from 'lucide-react';
import { audioSynth } from './audio';
import { Lang, UI, getLevelText, getPrologueText, getEpilogueText } from './i18n';

const SAVE_KEY = 'jungle-platformer-save-v1';
const LANG_KEY = 'jungle-platformer-lang';

function readSavedLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    return raw === 'cs' ? 'cs' : 'en';
  } catch {
    return 'en';
  }
}

interface SaveData {
  stats: GameStats;
  settings: GameSettings;
  levels: Level[];
  savedAt: string;
}

function readSaveData(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export default function App() {
  const [levels, setLevels] = useState(INITIAL_LEVELS);
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    bananasCollected: 0,
    deaths: 0,
    timeElapsed: 0,
    currentLevel: 0,
    gameState: 'start_screen'
  });

  const [activeTab, setActiveTab] = useState<'game' | 'help'>('game');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveData, setSaveData] = useState<SaveData | null>(() => readSaveData());
  const [language, setLanguage] = useState<Lang>(() => readSavedLang());
  const [showPrologue, setShowPrologue] = useState(false);
  const [showEpilogue, setShowEpilogue] = useState(false);

  const t = UI[language];
  const currentLevelData = levels[stats.currentLevel];
  const currentLevelText = getLevelText(currentLevelData, language);
  const prologueText = getPrologueText(PROLOGUE_LEVEL, language);
  const epilogueText = getEpilogueText(EPILOGUE_FIGHT, language);

  const handleLanguageChange = (lang: Lang) => {
    setLanguage(lang);
    try {
      localStorage.setItem(LANG_KEY, lang);
    } catch {
      // ignore storage failures (private browsing, quota, etc.)
    }
  };

  // Esc key toggles the in-game menu (only relevant once a run has started)
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (stats.gameState === 'start_screen') return;
      setMenuOpen((prev) => !prev);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [stats.gameState]);

  // Advance level — after the final level, flow into the Epilogue fight
  const handleNextLevel = () => {
    if (stats.currentLevel === levels.length - 1) {
      setShowEpilogue(true);
      setShowPrologue(false);
      setStats((prev) => ({ ...prev, gameState: 'playing' }));
      return;
    }
    setStats((prev) => ({
      ...prev,
      currentLevel: prev.currentLevel + 1,
      gameState: 'playing'
    }));
  };

  // Skip or change level directly
  const handleSelectLevel = (idx: number) => {
    setShowPrologue(false);
    setShowEpilogue(false);
    setStats((prev) => ({
      ...prev,
      currentLevel: idx,
      gameState: 'playing'
    }));
  };

  // Reload current stage
  const handleRestartLevel = () => {
    setStats((prev) => ({
      ...prev,
      gameState: 'playing'
    }));
  };

  // Toggle master system sound
  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (!nextState) {
      audioSynth.setVolumes(0, 0);
      audioSynth.stopJungleMusic();
    } else {
      audioSynth.setVolumes(settings.soundVolume, settings.musicVolume);
      audioSynth.startJungleMusic();
    }
  };

  // Hard Reset
  const handleResetProgress = () => {
    setStats((prev) => ({
      score: 0,
      bananasCollected: 0,
      deaths: 0,
      timeElapsed: 0,
      currentLevel: 0,
      gameState: prev.gameState === 'start_screen' ? 'start_screen' : 'playing'
    }));
    setLevels(JSON.parse(JSON.stringify(INITIAL_LEVELS)));
    audioSynth.playJump();
  };

  // Start a brand new run from the menu
  const handleNewGame = () => {
    setLevels(JSON.parse(JSON.stringify(INITIAL_LEVELS)));
    setStats({
      score: 0,
      bananasCollected: 0,
      deaths: 0,
      timeElapsed: 0,
      currentLevel: 0,
      gameState: 'playing'
    });
    setShowPrologue(true);
    setShowEpilogue(false);
    setMenuOpen(false);
  };

  // Jump straight to the prologue from the level selector
  const handleSelectPrologue = () => {
    setShowPrologue(true);
    setShowEpilogue(false);
    setStats((prev) => ({ ...prev, gameState: 'playing' }));
  };

  // Prologue's escape sequence finished — drop into the main level list
  const handlePrologueComplete = () => {
    setShowPrologue(false);
  };

  // Jump straight to the Epilogue fight from the level selector
  const handleSelectEpilogue = () => {
    setShowEpilogue(true);
    setShowPrologue(false);
    setStats((prev) => ({ ...prev, gameState: 'playing' }));
  };

  // Epilogue won — story complete, return to the main menu
  const handleEpilogueComplete = () => {
    setShowEpilogue(false);
    setMenuOpen(false);
    setStats((prev) => ({ ...prev, gameState: 'start_screen' }));
  };

  // Persist current run to localStorage
  const handleSaveGame = () => {
    const data: SaveData = {
      stats,
      settings,
      levels,
      savedAt: new Date().toLocaleString()
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    setSaveData(data);
  };

  // Restore a previously saved run
  const handleLoadGame = () => {
    const data = readSaveData();
    if (!data) return;
    setLevels(data.levels);
    setSettings(data.settings);
    setStats({ ...data.stats, gameState: 'playing' });
    setSaveData(data);
    setMenuOpen(false);
  };

  const handleCloseMenu = () => setMenuOpen(false);

  const isStartScreen = stats.gameState === 'start_screen';
  const isPausedByMenu = menuOpen || stats.gameState === 'paused';

  if (isStartScreen) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e0722] via-[#140a2d] to-[#04010a] text-gray-100 font-sans select-none">
        <MainMenu
          mode="start"
          settings={settings}
          onSettingsChange={setSettings}
          onNewGame={handleNewGame}
          onSaveGame={handleSaveGame}
          onLoadGame={handleLoadGame}
          onResetProgress={handleResetProgress}
          hasSaveData={!!saveData}
          saveInfo={saveData?.savedAt ?? null}
          deaths={stats.deaths}
          score={stats.score}
          bananaCount={stats.bananasCollected}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0e0722] via-[#140a2d] to-[#04010a] text-gray-100 flex flex-col font-sans relative pb-10 select-none">

      {/* Decorative Jungle Leaves Ivy in Margins (Clean CSS design) */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.18),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_70%)] pointer-events-none" />

      {/* In-game menu overlay (Esc key) */}
      {menuOpen && (
        <MainMenu
          mode="pause"
          settings={settings}
          onSettingsChange={setSettings}
          onNewGame={handleNewGame}
          onSaveGame={handleSaveGame}
          onLoadGame={handleLoadGame}
          onClose={handleCloseMenu}
          onResetProgress={handleResetProgress}
          hasSaveData={!!saveData}
          saveInfo={saveData?.savedAt ?? null}
          deaths={stats.deaths}
          score={stats.score}
          bananaCount={stats.bananasCollected}
          language={language}
          onLanguageChange={handleLanguageChange}
        />
      )}

      {/* Main Container */}
      <div className="w-full max-w-7xl mx-auto px-4 md:px-6 flex-1 flex flex-col gap-6 pt-5">

        {/* Navigation / Brand Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-[#1d0735]/70 border-2 border-fuchsia-500/25 px-6 py-4 rounded-3xl backdrop-blur-md shadow-[0_0_25px_rgba(168,85,247,0.15)] gap-4" id="main-header">

          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-fuchsia-950/45 rounded-2xl border border-fuchsia-500/40 text-fuchsia-400">
              <Trees className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono tracking-widest font-bold uppercase text-fuchsia-400 bg-fuchsia-950/80 px-1.5 py-0.5 rounded border border-fuchsia-800/20">{t.brandTag1}</span>
                <span className="text-[10px] font-mono tracking-widest text-[#67e8f9] font-bold">{t.brandTag2}</span>
              </div>
              <h1 className="font-sans font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                <span>{t.brandName1}</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400 font-extrabold">{t.brandName2}</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Audio control */}
            <button
              onClick={handleToggleSound}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all ${
                soundEnabled
                ? 'bg-fuchsia-950/45 border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-900/40'
                : 'bg-slate-900 border-slate-700 text-rose-400'
              } cursor-pointer`}
              title={t.toggleSound}
              id="btn-sound-mute"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Menu button (same as Esc) */}
            <button
              onClick={() => setMenuOpen(true)}
              className="p-2 rounded-xl border border-fuchsia-500/40 bg-fuchsia-950/45 text-fuchsia-300 hover:bg-fuchsia-900/40 cursor-pointer flex items-center justify-center"
              title={t.openMenu}
              id="btn-open-menu"
            >
              <MenuIcon className="w-4 h-4" />
            </button>

            {/* Navigation Tabs */}
            <nav className="flex bg-[#0d071f] p-1 rounded-xl border border-fuchsia-950/45 shadow-inner">
              <button
                onClick={() => setActiveTab('game')}
                className={`px-4 py-1.5 text-xs font-mono rounded-lg transition-all ${
                  activeTab === 'game'
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-bold shadow-[0_0_12px_rgba(236,72,153,0.35)]'
                  : 'text-gray-400 hover:text-white'
                } cursor-pointer`}
                id="tab-game"
              >
                {t.tabGame}
              </button>
              <button
                onClick={() => setActiveTab('help')}
                className={`px-4 py-1.5 text-xs font-mono rounded-lg transition-all ${
                  activeTab === 'help'
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-bold shadow-[0_0_12px_rgba(236,72,153,0.35)]'
                  : 'text-gray-400 hover:text-white'
                } cursor-pointer`}
                id="tab-help"
              >
                {t.tabHelp}
              </button>
            </nav>
          </div>

        </header>

        {/* Main Body */}
        {activeTab === 'game' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

            {/* Left sidebar - Levels List Selector */}
            <aside className="lg:col-span-3 space-y-4" id="lvl-selector-aside">
              <div className="bg-[#180a2d]/80 rounded-2xl p-4 border-2 border-fuchsia-500/25 shadow-xl shadow-fuchsia-950/20 space-y-3">
                <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-fuchsia-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-fuchsia-400" />
                  {t.jungleLevels}
                </h2>

                <div className="space-y-3 pt-1">
                  <button
                    onClick={handleSelectPrologue}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all block cursor-pointer ${
                      showPrologue
                      ? 'bg-[#2a1408]/70 border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)] transform scale-[1.02]'
                      : 'bg-[#0d071f]/50 hover:bg-[#200d3d]/40 border-transparent text-gray-300'
                    }`}
                    id="btn-select-prologue"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-widest text-orange-400 font-bold">{t.stage} 00</span>
                      {showPrologue && <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />}
                    </div>
                    <h3 className="font-sans font-bold text-sm tracking-tight text-white mt-0.5 flex items-center gap-1.5">
                      <Skull className="w-3.5 h-3.5 text-orange-300" />
                      {prologueText.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-tight">
                      {prologueText.description}
                    </p>
                  </button>

                  {levels.map((lvl, index) => {
                    const isActive = !showPrologue && !showEpilogue && stats.currentLevel === index;
                    const lvlText = getLevelText(lvl, language);
                    return (
                      <button
                        key={lvl.id}
                        onClick={() => handleSelectLevel(index)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all block cursor-pointer ${
                          isActive
                          ? 'bg-[#29134a]/65 border-fuchsia-500/80 shadow-[0_0_15px_rgba(236,72,153,0.3)] transform scale-[1.02]'
                          : 'bg-[#0d071f]/50 hover:bg-[#200d3d]/40 border-transparent text-gray-300'
                        }`}
                        id={`btn-select-level-${lvl.id}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono tracking-widest text-pink-400 font-bold">{t.stage} {String(lvl.id).padStart(2, '0')}</span>
                          {isActive && <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping" />}
                        </div>
                        <h3 className="font-sans font-bold text-sm tracking-tight text-white mt-0.5">{lvlText.name}</h3>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-tight">
                          {lvlText.description}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-cyan-400 font-mono mt-2 pt-2 border-t border-purple-900/40">
                          <span>{t.items}: {lvl.collectibles.length} {t.pcs}</span>
                          <span>{t.start}: {lvl.startX}x</span>
                        </div>
                      </button>
                    );
                  })}

                  <button
                    onClick={handleSelectEpilogue}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all block cursor-pointer ${
                      showEpilogue
                      ? 'bg-[#2a0d0d]/70 border-rose-500/80 shadow-[0_0_15px_rgba(244,63,94,0.3)] transform scale-[1.02]'
                      : 'bg-[#0d071f]/50 hover:bg-[#200d3d]/40 border-transparent text-gray-300'
                    }`}
                    id="btn-select-epilogue"
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono tracking-widest text-rose-400 font-bold">{t.stage} 11</span>
                      {showEpilogue && <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />}
                    </div>
                    <h3 className="font-sans font-bold text-sm tracking-tight text-white mt-0.5 flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-rose-300" />
                      {epilogueText.name}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-tight">
                      {epilogueText.description}
                    </p>
                  </button>
                </div>
              </div>

              {/* Score breakdown card */}
              <div className="bg-[#180a2d]/80 p-4 rounded-2xl border border-purple-500/15 shadow-md shadow-fuchsia-950/10 space-y-2 text-center" id="score-tip-panel">
                <div className="text-[10px] font-mono tracking-wider uppercase text-fuchsia-400 font-bold flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300 animate-bounce" />
                  {t.scoreMultipliers}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="bg-[#0c0419] p-2 rounded-lg border border-purple-950/40">
                    <div className="text-[10px] text-gray-400">{t.banana}</div>
                    <div className="text-xs font-mono font-bold text-yellow-300">+15 XP</div>
                  </div>
                  <div className="bg-[#0c0419] p-2 rounded-lg border border-purple-950/40">
                    <div className="text-[10px] text-gray-400">{t.mango}</div>
                    <div className="text-xs font-mono font-bold text-pink-400">+30 XP</div>
                  </div>
                  <div className="bg-[#0c0419] p-2 rounded-lg border border-purple-950/40">
                    <div className="text-[10px] text-gray-400">{t.goldenStar}</div>
                    <div className="text-xs font-mono font-bold text-[#67e8f9]">+100 XP</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Central Canvas Zone */}
            <main className="lg:col-span-9 flex flex-col gap-6" id="main-column">

              {showEpilogue ? (
                <div className="bg-gradient-to-r from-[#2a0d0d]/55 to-[#1a0808]/40 px-5 py-4 rounded-2xl border-2 border-rose-500/25 flex items-start gap-3 relative overflow-hidden animate-[pulse_6000ms_infinite]" id="epilogue-alert-banner">
                  <div className="absolute right-0 top-0 text-[100px] text-rose-950/25 font-sans font-black pointer-events-none select-none leading-none">
                    11
                  </div>
                  <Swords className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-white leading-none">
                      {t.activeMission}: {epilogueText.name}
                    </h2>
                    <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                      {epilogueText.description}
                    </p>
                  </div>
                </div>
              ) : showPrologue ? (
                <div className="bg-gradient-to-r from-[#2a1408]/55 to-[#1a0a08]/40 px-5 py-4 rounded-2xl border-2 border-orange-500/25 flex items-start gap-3 relative overflow-hidden animate-[pulse_6000ms_infinite]" id="prologue-alert-banner">
                  <div className="absolute right-0 top-0 text-[100px] text-orange-950/25 font-sans font-black pointer-events-none select-none leading-none">
                    00
                  </div>
                  <Skull className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-white leading-none">
                      {t.activeMission}: {prologueText.name}
                    </h2>
                    <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                      {prologueText.description}
                    </p>
                  </div>
                </div>
              ) : (
                /* Responsive Active Level Alert Info Banner */
                <div className="bg-gradient-to-r from-[#17082e]/45 to-[#240c42]/30 px-5 py-4 rounded-2xl border-2 border-fuchsia-500/25 flex items-start gap-3 relative overflow-hidden animate-[pulse_6000ms_infinite]" id="level-alert-banner">
                  <div className="absolute right-0 top-0 text-[100px] text-fuchsia-950/20 font-sans font-black pointer-events-none select-none leading-none">
                    {String(currentLevelData.id).padStart(2, '0')}
                  </div>
                  <Info className="w-5 h-5 text-fuchsia-450 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white leading-none">
                        {t.activeMission}: {currentLevelText.name}
                      </h2>
                      <span className="text-[10px] bg-fuchsia-950/50 text-fuchsia-300 font-mono px-1.5 py-0.5 rounded border border-fuchsia-500/30 font-extrabold">
                        {t.safetyAt} {currentLevelData.endX}m
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                      {currentLevelText.description} {t.bannerSuffix}
                    </p>
                  </div>
                </div>
              )}

              {/* Game Viewport screen component */}
              {showEpilogue ? (
                <FighterCanvas
                  fight={EPILOGUE_FIGHT}
                  language={language}
                  onComplete={handleEpilogueComplete}
                  paused={isPausedByMenu}
                  onTogglePause={() => setMenuOpen((prev) => !prev)}
                />
              ) : showPrologue ? (
                <PrologueCanvas
                  prologue={PROLOGUE_LEVEL}
                  language={language}
                  onComplete={handlePrologueComplete}
                  paused={isPausedByMenu}
                  onTogglePause={() => setMenuOpen((prev) => !prev)}
                />
              ) : (
                <GameCanvas
                  level={currentLevelData}
                  settings={settings}
                  stats={stats}
                  onStatsChange={setStats}
                  onNextLevel={handleNextLevel}
                  onRestartLevel={handleRestartLevel}
                  paused={isPausedByMenu}
                  onTogglePause={() => setMenuOpen((prev) => !prev)}
                  language={language}
                />
              )}

            </main>

          </div>
        ) : (

          /* "Jungle Guide" informational Tab view */
          <main className="bg-[#180a2d]/80 border-2 border-fuchsia-500/25 rounded-3xl p-6 space-y-6 max-w-4xl mx-auto shadow-2xl shadow-fuchsia-950/20" id="guide-sec">

            <div className="flex gap-3 items-center border-b border-purple-900/40 pb-4">
              <HelpCircle className="w-6 h-6 text-fuchsia-400" />
              <div>
                <h2 className="text-lg font-bold text-white font-sans">{t.guideTitle}</h2>
                <p className="text-xs text-gray-400">{t.guideSubtitle}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed text-sm text-gray-200">

              <div className="space-y-3">
                <h3 className="font-bold font-sans text-fuchsia-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-pink-400 animate-pulse" />
                  {t.howToadSprings}
                </h3>
                <p className="text-xs text-gray-300">
                  {t.toadSpringsIntro}
                </p>
                <div className="bg-[#0b0317] p-4 rounded-xl border border-purple-900/40 text-xs text-gray-400 space-y-1.5">
                  <div><strong>{t.springCoefficient}</strong> {t.springCoefficientBody}</div>
                  <div><strong>{t.actionMomentum}</strong> {t.actionMomentumBody}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold font-sans text-fuchsia-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  {t.physicsDeck}
                </h3>
                <p className="text-xs text-gray-300">
                  {t.physicsDeckIntro}
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-400">
                  <li><strong>{t.lowerGravity}</strong> {t.lowerGravityBody}</li>
                  <li><strong>{t.increaseJogSpeed}</strong> {t.increaseJogSpeedBody}</li>
                  <li><strong>{t.toggleDoubleJumpBold}</strong> {t.toggleDoubleJumpBody}</li>
                </ul>
              </div>

            </div>

            <div className="pt-4 border-t border-purple-900/40 text-center">
              <button
                onClick={() => setActiveTab('game')}
                className="bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg border border-fuchsia-400 hover:border-fuchsia-300 transition-all cursor-pointer shadow-lg shadow-fuchsia-950/20"
                id="btn-return-game"
              >
                {t.loadGameCenter}
              </button>
            </div>

          </main>
        )}

      </div>

    </div>
  );
}
