/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { INITIAL_MISSIONS, INITIAL_FIGHTS, INITIAL_QUIZZES, INITIAL_QUESTIONS, INITIAL_SPRITES, INITIAL_SETTINGS } from './data';
import { GameStats, GameSettings, WorldData, ChapterId } from './types';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import StealthCanvas from './components/StealthCanvas';
import LevelEditor from './components/LevelEditor';
import ChapterCard from './components/ChapterCard';
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
  SquarePen
} from 'lucide-react';
import { audioSynth } from './audio';
import { Lang, UI, getMissionText } from './i18n';
import {
  LANG_KEY,
  SaveData,
  readSaveData,
  readSavedLang,
  mergeWithDefaults,
  writeSaveData,
  scheduleWorldSave,
  flushWorldSave,
} from './storage';

const initialWorld = (): WorldData =>
  JSON.parse(JSON.stringify({ missions: INITIAL_MISSIONS, fights: INITIAL_FIGHTS, quizzes: INITIAL_QUIZZES, questionPool: INITIAL_QUESTIONS, sprites: INITIAL_SPRITES }));

export default function App() {
  const [world, setWorld] = useState<WorldData>(initialWorld);
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    bananasCollected: 0,
    deaths: 0,
    timeElapsed: 0,
    currentLevel: 0,
    gameState: 'start_screen'
  });

  const [activeTab, setActiveTab] = useState<'game' | 'help' | 'editor'>('game');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [saveData, setSaveData] = useState<SaveData | null>(() => readSaveData());
  const [language, setLanguage] = useState<Lang>(() => readSavedLang());
  // Chapter title cards: which chapter the player is currently in, plus a
  // pending card to show (with the mission index to launch once they begin).
  const [activeChapter, setActiveChapter] = useState<ChapterId | null>(null);
  const [chapterCard, setChapterCard] = useState<ChapterId | null>(null);
  const [pendingStage, setPendingStage] = useState<number | null>(null);

  const t = UI[language];
  const missions = world.missions;
  // Clamp in case the editor deleted the mission the game was sitting on.
  const currentIndex = Math.min(stats.currentLevel, missions.length - 1);
  const currentMission = missions[currentIndex];
  const currentMissionText = getMissionText(currentMission, language);

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

  // Standalone editor "Playtest" navigates here with ?play=N — load the world
  // the editor saved (merged against the built-in set, same as Load) and jump
  // straight into mission N via the shared launch path, then strip the param.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const playRaw = params.get('play');
    if (playRaw === null) return;
    const saved = readSaveData();
    const sourceWorld = saved?.world?.missions?.length
      ? mergeWithDefaults(saved.world, saved.knownDefaults)
      : world;
    if (saved?.world?.missions?.length) setWorld(sourceWorld);
    const idx = parseInt(playRaw, 10);
    const safeIdx = Number.isFinite(idx) ? Math.max(0, Math.min(idx, sourceWorld.missions.length - 1)) : 0;
    setActiveTab('game');
    launchStage(safeIdx, sourceWorld);
    params.delete('play');
    const qs = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, []);

  // Editor autosaves are debounced — force any pending write out before the
  // page goes away so the last few edits aren't lost.
  useEffect(() => {
    const flush = () => flushWorldSave();
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, []);

  // Launch a mission immediately (no chapter card).
  const launchStage = (index: number, inWorld: WorldData = world) => {
    setMenuOpen(false);
    setChapterCard(null);
    setPendingStage(null);
    setActiveChapter(inWorld.missions[index]?.chapter ?? null);
    setStats((prev) => ({ ...prev, currentLevel: index, gameState: 'playing' }));
  };

  // Navigate to a mission. Crossing into a new chapter first shows its title
  // card; navigating within the current chapter launches the mission directly.
  const requestStage = (index: number, forceCard = false) => {
    const chapter = missions[index]?.chapter ?? null;
    if (chapter && (forceCard || chapter !== activeChapter)) {
      setPendingStage(index);
      setChapterCard(chapter);
    } else {
      launchStage(index);
    }
  };

  // Begin the pending chapter from its title card.
  const handleBeginChapter = () => {
    if (pendingStage !== null) launchStage(pendingStage);
  };

  // Advance mission — after the final mission the story is complete: back to
  // the main menu (the finale fight lives inside the last mission as a trigger).
  const handleNextLevel = () => {
    const cur = Math.min(stats.currentLevel, missions.length - 1);
    if (cur === missions.length - 1) {
      setChapterCard(null);
      setPendingStage(null);
      setActiveChapter(null);
      setMenuOpen(false);
      setStats((prev) => ({ ...prev, gameState: 'start_screen' }));
    } else {
      requestStage(cur + 1);
    }
  };

  // Skip or change mission directly from the sidebar
  const handleSelectMission = (idx: number) => {
    requestStage(idx);
  };

  // Playtest a mission from the in-app editor tab — jump straight into it.
  const handlePlaytestLevel = (idx: number) => {
    flushWorldSave(); // persist any pending editor autosave before playing
    setActiveTab('game');
    launchStage(idx);
  };

  // In-app editor writes: update state, keep the running mission index valid
  // if missions were deleted, and autosave (debounced) so editor work survives
  // a refresh — mirroring the standalone editor's behavior.
  const handleEditorWorldChange = (next: WorldData) => {
    setWorld(next);
    setStats((prev) =>
      prev.currentLevel >= next.missions.length ? { ...prev, currentLevel: next.missions.length - 1 } : prev,
    );
    scheduleWorldSave(next, (data) => {
      if (data) setSaveData(data);
    });
  };

  const handleEditorSave = () => {
    // Force any pending debounced saves to execute immediately
    flushWorldSave();
  };

  // Reload current mission
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

  // Hard Reset — resets run progress only. The world (missions/fights/quizzes)
  // is the player's work (editor); restoring built-ins is an explicit editor action.
  const handleResetProgress = () => {
    setStats((prev) => ({
      score: 0,
      bananasCollected: 0,
      deaths: 0,
      timeElapsed: 0,
      currentLevel: 0,
      gameState: prev.gameState === 'start_screen' ? 'start_screen' : 'playing'
    }));
    setChapterCard(null);
    setPendingStage(null);
    setActiveChapter(missions[0]?.chapter ?? null);
    audioSynth.playJump();
  };

  // Start a brand new run from the menu — opens with the first mission's
  // chapter card. Deliberately leaves the world alone: resetting it here
  // would wipe editor work (and a following Save would make that permanent).
  const handleNewGame = () => {
    setStats({
      score: 0,
      bananasCollected: 0,
      deaths: 0,
      timeElapsed: 0,
      currentLevel: 0,
      gameState: 'playing'
    });
    setActiveChapter(null);
    setMenuOpen(false);
    setPendingStage(0);
    setChapterCard(missions[0]?.chapter ?? 'ch1');
  };

  // Persist current run to localStorage (stamps knownDefaults so future
  // merges can tell "new built-in content" apart from "deliberately deleted")
  const handleSaveGame = () => {
    const data = writeSaveData({
      stats,
      settings,
      world,
      savedAt: new Date().toLocaleString()
    });
    if (data) setSaveData(data);
  };

  // Restore a previously saved run — resume directly, no chapter card.
  // The world is merged against the built-in set so an old/partial save never
  // hides content (the same recovery the standalone editor does).
  const handleLoadGame = () => {
    const data = readSaveData();
    if (!data) return;
    const mergedWorld = mergeWithDefaults(data.world, data.knownDefaults);
    const safeLevel = Math.min(data.stats.currentLevel, mergedWorld.missions.length - 1);
    setWorld(mergedWorld);
    setSettings(data.settings);
    setStats({ ...data.stats, currentLevel: safeLevel, gameState: 'playing' });
    setSaveData(data);
    setChapterCard(null);
    setPendingStage(null);
    setActiveChapter(mergedWorld.missions[safeLevel]?.chapter ?? null);
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

  // Chapter title card — shown between chapters before the mission loads
  if (chapterCard) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0e0722] via-[#140a2d] to-[#04010a] text-gray-100 font-sans">
        <ChapterCard chapterId={chapterCard} language={language} onBegin={handleBeginChapter} />
      </div>
    );
  }

  const isStealth = currentMission.type === 'stealth';

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

      {/* Main Container (widened so the 16:9 720p game window has room) */}
      <div className="w-full max-w-[1700px] mx-auto px-4 md:px-6 flex-1 flex flex-col gap-6 pt-5">

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
              <button
                onClick={() => setActiveTab('editor')}
                className={`flex items-center gap-1 px-4 py-1.5 text-xs font-mono rounded-lg transition-all ${
                  activeTab === 'editor'
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-bold shadow-[0_0_12px_rgba(236,72,153,0.35)]'
                  : 'text-gray-400 hover:text-white'
                } cursor-pointer`}
                id="tab-editor"
              >
                <SquarePen className="w-3.5 h-3.5" />
                {t.tabEditor}
              </button>
            </nav>
          </div>

        </header>

        {/* Main Body */}
        {activeTab === 'editor' ? (
          <LevelEditor
            world={world}
            onWorldChange={handleEditorWorldChange}
            onPlaytest={handlePlaytestLevel}
            onSave={handleEditorSave}
            language={language}
          />
        ) : activeTab === 'game' ? (
          <div className="flex flex-col xl:flex-row gap-6 items-start justify-center">

            {/* Left sidebar - Mission List Selector */}
            <aside className="w-full xl:w-[300px] xl:shrink-0 space-y-4" id="lvl-selector-aside">
              <div className="bg-[#180a2d]/80 rounded-2xl p-4 border-2 border-fuchsia-500/25 shadow-xl shadow-fuchsia-950/20 space-y-3">
                <h2 className="text-xs font-mono font-bold tracking-wider uppercase text-fuchsia-400 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-fuchsia-400" />
                  {t.jungleLevels}
                </h2>

                <div className="space-y-3 pt-1">
                  {missions.map((m, index) => {
                    const isActive = currentIndex === index;
                    const mText = getMissionText(m, language);
                    const stealth = m.type === 'stealth';
                    return (
                      <button
                        key={m.id}
                        onClick={() => handleSelectMission(index)}
                        className={`w-full text-left p-3 rounded-xl border-2 transition-all block cursor-pointer ${
                          isActive
                          ? stealth
                            ? 'bg-[#2a1408]/70 border-orange-500/80 shadow-[0_0_15px_rgba(249,115,22,0.3)] transform scale-[1.02]'
                            : 'bg-[#29134a]/65 border-fuchsia-500/80 shadow-[0_0_15px_rgba(236,72,153,0.3)] transform scale-[1.02]'
                          : 'bg-[#0d071f]/50 hover:bg-[#200d3d]/40 border-transparent text-gray-300'
                        }`}
                        id={`btn-select-level-${m.id}`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-mono tracking-widest font-bold ${stealth ? 'text-orange-400' : 'text-pink-400'}`}>
                            {t.stage} {String(m.id).padStart(2, '0')}
                          </span>
                          {isActive && <span className={`w-2 h-2 rounded-full animate-ping ${stealth ? 'bg-orange-400' : 'bg-fuchsia-400'}`} />}
                        </div>
                        <h3 className="font-sans font-bold text-sm tracking-tight text-white mt-0.5 flex items-center gap-1.5">
                          {stealth && <Skull className="w-3.5 h-3.5 text-orange-300" />}
                          {mText.name}
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-tight">
                          {mText.description}
                        </p>
                        {m.type === 'platformer' && (
                          <div className="flex justify-between items-center text-[10px] text-cyan-400 font-mono mt-2 pt-2 border-t border-purple-900/40">
                            <span>{t.items}: {m.collectibles.length} {t.pcs}</span>
                            <span>{t.start}: {m.startX}x</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
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
            <main className="w-full xl:flex-1 min-w-0 flex flex-col gap-6" id="main-column">

              {isStealth ? (
                <div className="bg-gradient-to-r from-[#2a1408]/55 to-[#1a0a08]/40 px-5 py-4 rounded-2xl border-2 border-orange-500/25 flex items-start gap-3 relative overflow-hidden animate-[pulse_6000ms_infinite]" id="stealth-alert-banner">
                  <div className="absolute right-0 top-0 text-[100px] text-orange-950/25 font-sans font-black pointer-events-none select-none leading-none">
                    {String(currentMission.id).padStart(2, '0')}
                  </div>
                  <Skull className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h2 className="text-sm font-bold text-white leading-none">
                      {t.activeMission}: {currentMissionText.name}
                    </h2>
                    <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                      {currentMissionText.description}
                    </p>
                  </div>
                </div>
              ) : (
                /* Responsive Active Level Alert Info Banner */
                <div className="bg-gradient-to-r from-[#17082e]/45 to-[#240c42]/30 px-5 py-4 rounded-2xl border-2 border-fuchsia-500/25 flex items-start gap-3 relative overflow-hidden animate-[pulse_6000ms_infinite]" id="level-alert-banner">
                  <div className="absolute right-0 top-0 text-[100px] text-fuchsia-950/20 font-sans font-black pointer-events-none select-none leading-none">
                    {String(currentMission.id).padStart(2, '0')}
                  </div>
                  <Info className="w-5 h-5 text-fuchsia-450 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-white leading-none">
                        {t.activeMission}: {currentMissionText.name}
                      </h2>
                      {currentMission.type === 'platformer' && (
                        <span className="text-[10px] bg-fuchsia-950/50 text-fuchsia-300 font-mono px-1.5 py-0.5 rounded border border-fuchsia-500/30 font-extrabold">
                          {t.safetyAt} {currentMission.endX}m
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                      {currentMissionText.description} {t.bannerSuffix}
                    </p>
                  </div>
                </div>
              )}

              {/* Game Viewport screen component */}
              {currentMission.type === 'stealth' ? (
                <StealthCanvas
                  mission={currentMission}
                  fights={world.fights}
                  quizzes={world.quizzes}
                  questionPool={world.questionPool}
                  sprites={world.sprites}
                  language={language}
                  onComplete={handleNextLevel}
                  paused={isPausedByMenu}
                  onTogglePause={() => setMenuOpen((prev) => !prev)}
                />
              ) : (
                <GameCanvas
                  level={currentMission}
                  fights={world.fights}
                  quizzes={world.quizzes}
                  questionPool={world.questionPool}
                  sprites={world.sprites}
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
