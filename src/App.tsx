/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { INITIAL_LEVELS, INITIAL_SETTINGS } from './data';
import { GameStats, GameSettings } from './types';
import GameCanvas from './components/GameCanvas';
import JungleControls from './components/JungleControls';
import { 
  Trees, 
  Dribbble, 
  Flame, 
  HelpCircle, 
  VolumeX, 
  Volume2, 
  MapPin, 
  TrendingUp, 
  RotateCcw,
  Sparkles,
  Info
} from 'lucide-react';
import { audioSynth } from './audio';

export default function App() {
  const [levels, setLevels] = useState(INITIAL_LEVELS);
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
  
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    bananasCollected: 0,
    deaths: 0,
    timeElapsed: 0,
    currentLevel: 0, // Level Index: (levels[0] has id=1)
    gameState: 'playing' // 'start_screen' | 'playing' | 'paused' | 'level_completed'
  });

  const [activeTab, setActiveTab] = useState<'game' | 'help'>('game');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const currentLevelData = levels[stats.currentLevel];

  // Advance level
  const handleNextLevel = () => {
    setStats((prev) => {
      const nextIndex = (prev.currentLevel + 1) % levels.length;
      return {
        ...prev,
        currentLevel: nextIndex,
        gameState: 'playing'
      };
    });
  };

  // Skip or change level directly
  const handleSelectLevel = (idx: number) => {
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
    setStats({
      score: 0,
      bananasCollected: 0,
      deaths: 0,
      timeElapsed: 0,
      currentLevel: 0,
      gameState: 'playing'
    });
    // Re-import default level states
    setLevels(JSON.parse(JSON.stringify(INITIAL_LEVELS)));
    audioSynth.playJump();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0e0722] via-[#140a2d] to-[#04010a] text-gray-100 flex flex-col font-sans relative pb-10 select-none">
      
      {/* Decorative Jungle Leaves Ivy in Margins (Clean CSS design) */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.18),transparent_70%)] pointer-events-none" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_70%)] pointer-events-none" />

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
                <span className="text-[10px] font-mono tracking-widest font-bold uppercase text-fuchsia-400 bg-fuchsia-950/80 px-1.5 py-0.5 rounded border border-fuchsia-800/20">SIDE-VIEW 2D</span>
                <span className="text-[10px] font-mono tracking-widest text-[#67e8f9] font-bold">HTML5 ULTRA</span>
              </div>
              <h1 className="font-sans font-extrabold text-xl tracking-tight text-white flex items-center gap-1">
                <span>Mowgli's</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400 font-extrabold">Toad Jumper</span>
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
              title="Toggle all sounds"
              id="btn-sound-mute"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
                Game Center
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
                Jungle Guide
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
                  Jungle Levels
                </h2>
                
                <div className="space-y-3 pt-1">
                  {levels.map((lvl, index) => {
                    const isActive = stats.currentLevel === index;
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
                          <span className="text-[10px] font-mono tracking-widest text-pink-400 font-bold">STAGE 0{lvl.id}</span>
                          {isActive && <span className="w-2 h-2 rounded-full bg-fuchsia-400 animate-ping" />}
                        </div>
                        <h3 className="font-sans font-bold text-sm tracking-tight text-white mt-0.5">{lvl.name}</h3>
                        <p className="text-[11px] text-gray-400 mt-1 line-clamp-2 leading-tight">
                          {lvl.description}
                        </p>
                        <div className="flex justify-between items-center text-[10px] text-cyan-400 font-mono mt-2 pt-2 border-t border-purple-900/40">
                          <span>Items: {lvl.collectibles.length} Pcs</span>
                          <span>Start: {lvl.startX}x</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Score breakdown card */}
              <div className="bg-[#180a2d]/80 p-4 rounded-2xl border border-purple-500/15 shadow-md shadow-fuchsia-950/10 space-y-2 text-center" id="score-tip-panel">
                <div className="text-[10px] font-mono tracking-wider uppercase text-fuchsia-400 font-bold flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-305 animate-bounce" />
                  Jungle Score Multipliers
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-2">
                  <div className="bg-[#0c0419] p-2 rounded-lg border border-purple-950/40">
                    <div className="text-[10px] text-gray-400">Banana</div>
                    <div className="text-xs font-mono font-bold text-yellow-300">+15 XP</div>
                  </div>
                  <div className="bg-[#0c0419] p-2 rounded-lg border border-purple-950/40">
                    <div className="text-[10px] text-gray-400">Mango</div>
                    <div className="text-xs font-mono font-bold text-pink-400">+30 XP</div>
                  </div>
                  <div className="bg-[#0c0419] p-2 rounded-lg border border-purple-950/40">
                    <div className="text-[10px] text-gray-400">Golden Star</div>
                    <div className="text-xs font-mono font-bold text-[#67e8f9]">+100 XP</div>
                  </div>
                </div>
              </div>
            </aside>

            {/* Central Canvas Zone */}
            <main className="lg:col-span-9 flex flex-col gap-6" id="main-column">
              
              {/* Responsive Active Level Alert Info Banner */}
              <div className="bg-gradient-to-r from-[#17082e]/45 to-[#240c42]/30 px-5 py-4 rounded-2xl border-2 border-fuchsia-500/25 flex items-start gap-3 relative overflow-hidden animate-[pulse_6000ms_infinite]" id="level-alert-banner">
                <div className="absolute right-0 top-0 text-[100px] text-fuchsia-950/20 font-sans font-black pointer-events-none select-none leading-none">
                  0{currentLevelData.id}
                </div>
                <Info className="w-5 h-5 text-fuchsia-450 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-white leading-none">
                      Active Mission: {currentLevelData.name}
                    </h2>
                    <span className="text-[10px] bg-fuchsia-950/50 text-fuchsia-300 font-mono px-1.5 py-0.5 rounded border border-fuchsia-500/30 font-extrabold">
                      SAFETY AT {currentLevelData.endX}m
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                    {currentLevelData.description} Help Mowgli jog, jump, crouch and slide over the custom bouncy Toad mushrooms safely. Reach the glowing fuchsia energy portal to progress!
                  </p>
                </div>
              </div>

              {/* Game Viewport screen component */}
              <GameCanvas
                level={currentLevelData}
                settings={settings}
                stats={stats}
                onStatsChange={setStats}
                onNextLevel={handleNextLevel}
                onRestartLevel={handleRestartLevel}
              />

              {/* Tuning dashboard deck underneath */}
              <JungleControls
                settings={settings}
                onSettingsChange={setSettings}
                deaths={stats.deaths}
                score={stats.score}
                bananaCount={stats.bananasCollected}
                onResetProgress={handleResetProgress}
              />

            </main>

          </div>
        ) : (
          
          /* "Jungle Guide" informational Tab view */
          <main className="bg-[#180a2d]/80 border-2 border-fuchsia-500/25 rounded-3xl p-6 space-y-6 max-w-4xl mx-auto shadow-2xl shadow-fuchsia-950/20" id="guide-sec">
            
            <div className="flex gap-3 items-center border-b border-purple-900/40 pb-4">
              <HelpCircle className="w-6 h-6 text-fuchsia-400" />
              <div>
                <h2 className="text-lg font-bold text-white font-sans">Jungle Survival Hand-Book</h2>
                <p className="text-xs text-gray-400">Master physics variables, keyboard shortcuts, and toad-spring forces.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 leading-relaxed text-sm text-gray-200">
              
              <div className="space-y-3">
                <h3 className="font-bold font-sans text-fuchsia-300 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-pink-400 animate-pulse" />
                  How Toad Springs Work
                </h3>
                <p className="text-xs text-gray-300">
                  Stepping directly onto colored Toads activates their elastic muscles. When a player lands on a Toad:
                </p>
                <div className="bg-[#0b0317] p-4 rounded-xl border border-purple-900/40 text-xs text-gray-400 space-y-1.5">
                  <div><strong>Spring Coefficient:</strong> Purple and Red Toads feature higher base elasticity compared to Green ones.</div>
                  <div><strong>Action Momentum:</strong> Pressing the <strong>JUMP</strong> key exactly as you make contact boosts your velocity upward by an additional <strong>25%</strong>, perfect for soaring to high canopies.</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-bold font-sans text-fuchsia-300 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  Physics Modifier Deck Engine
                </h3>
                <p className="text-xs text-gray-300">
                  Unlike stiff pre-built side-scrollers, Mowgli Jumper lets you modify gravity in real-time. Feel free to tweak values on the main panel:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-gray-400">
                  <li><strong>Lower Gravity</strong> for longer airy hang-times to cross vast canyons easily.</li>
                  <li><strong>Increase Jog Speed</strong> to speed-run stages with swift momentum.</li>
                  <li>Toggle <strong>Double Jump</strong> on or off to change game difficulty.</li>
                </ul>
              </div>

            </div>

            <div className="pt-4 border-t border-purple-900/40 text-center">
              <button
                onClick={() => setActiveTab('game')}
                className="bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg border border-fuchsia-400 hover:border-fuchsia-300 transition-all cursor-pointer shadow-lg shadow-fuchsia-950/20"
                id="btn-return-game"
              >
                ➔ Load Game Center
              </button>
            </div>

          </main>
        )}

      </div>

    </div>
  );
}
