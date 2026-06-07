/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { GameSettings } from '../types';
import { Sliders, Volume2, Award, Zap, RefreshCw, KeyRound, HelpCircle } from 'lucide-react';

interface JungleControlsProps {
  settings: GameSettings;
  onSettingsChange: (newSettings: GameSettings) => void;
  deaths: number;
  score: number;
  bananaCount: number;
  onResetProgress: () => void;
}

export default function JungleControls({
  settings,
  onSettingsChange,
  deaths,
  score,
  bananaCount,
  onResetProgress,
}: JungleControlsProps) {

  const handleSliderChange = (key: keyof GameSettings, value: number) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  const handleCheckboxToggle = (key: 'doubleJumpEnabled') => {
    onSettingsChange({
      ...settings,
      [key]: !settings[key]
    });
  };

  return (
    <div className="w-full bg-[#160b2d]/90 border-2 border-fuchsia-500/25 rounded-2xl p-5 text-gray-200 shadow-[0_0_30px_rgba(236,72,153,0.15)] space-y-6 select-none font-sans">
      
      {/* Interactive Title */}
      <div className="flex items-center justify-between border-b-2 border-purple-900/40 pb-3" id="jungle-controls-header">
        <h3 className="font-sans font-bold text-lg tracking-tight text-fuchsia-400 flex items-center gap-2">
          <Sliders className="w-5 h-5 text-fuchsia-400" />
          <span>Jungle Physics & Sound Deck</span>
        </h3>
        <button
          onClick={onResetProgress}
          className="flex items-center gap-1 text-xs bg-fuchsia-950/40 hover:bg-fuchsia-800/80 text-fuchsia-300 hover:text-white px-3 py-1.5 rounded-lg border border-fuchsia-800/50 transition-all duration-200 cursor-pointer"
          title="Reset score and levels"
          id="btn-reset-stats"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset Run</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Physics Modifiers Panel */}
        <div className="space-y-4 bg-[#21113e]/75 p-4 rounded-xl border border-purple-500/15" id="ctr-physics">
          <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-fuchsia-400 flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-pink-400 animate-pulse" />
            Physics Tuners (Real-time)
          </h4>
          
          {/* Gravity Density */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-gray-300">
              <span>Gravity Density:</span>
              <span className="text-fuchsia-400 font-bold">{settings.gravity.toFixed(2)}G</span>
            </div>
            <input
              type="range"
              min="0.30"
              max="1.20"
              step="0.05"
              value={settings.gravity}
              onChange={(e) => handleSliderChange('gravity', parseFloat(e.target.value))}
              className="w-full accent-fuchsia-500 h-1.5 bg-purple-950/80 rounded-lg cursor-pointer"
              id="slider-gravity"
            />
          </div>

          {/* Jump Velocity */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-gray-300">
              <span>Jump Velocity:</span>
              <span className="text-fuchsia-400 font-bold">{settings.jumpForce.toFixed(0)}m/s</span>
            </div>
            <input
              type="range"
              min="8"
              max="18"
              step="1"
              value={settings.jumpForce}
              onChange={(e) => handleSliderChange('jumpForce', parseInt(e.target.value))}
              className="w-full accent-fuchsia-500 h-1.5 bg-purple-950/80 rounded-lg cursor-pointer"
              id="slider-jumpforce"
            />
          </div>

          {/* Mowgli Movement Speed */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-gray-300">
              <span>Mowgli Jog Speed:</span>
              <span className="text-fuchsia-400 font-bold">{settings.movementSpeed.toFixed(1)} km/h</span>
            </div>
            <input
              type="range"
              min="3.0"
              max="8.0"
              step="0.2"
              value={settings.movementSpeed}
              onChange={(e) => handleSliderChange('movementSpeed', parseFloat(e.target.value))}
              className="w-full accent-fuchsia-500 h-1.5 bg-purple-950/80 rounded-lg cursor-pointer"
              id="slider-speed"
            />
          </div>

          {/* Double Jump Toggle */}
          <label className="flex items-center gap-2 cursor-pointer pt-1" id="label-doublejump">
            <input
              type="checkbox"
              checked={settings.doubleJumpEnabled}
              onChange={() => handleCheckboxToggle('doubleJumpEnabled')}
              className="rounded border-purple-950/50 text-fuchsia-500 focus:ring-fuchsia-400 bg-purple-950/80 h-4 w-4 accent-fuchsia-500 cursor-pointer"
              id="chk-doublejump"
            />
            <span className="text-xs font-mono text-gray-350">Enable Jungle Double Jump</span>
          </label>
        </div>

        {/* Audio Mixing Panel */}
        <div className="space-y-4 bg-[#21113e]/75 p-4 rounded-xl border border-purple-500/15" id="ctr-audio">
          <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-fuchsia-400 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-pink-400 animate-pulse" />
            Audio Mixer
          </h4>

          {/* SFX Volume */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-gray-300">
              <span>FX (Jump, Boing, Fruits):</span>
              <span className="text-fuchsia-400 font-bold">{(settings.soundVolume * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={settings.soundVolume}
              onChange={(e) => handleSliderChange('soundVolume', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-purple-950/80 rounded-lg accent-fuchsia-500 cursor-pointer"
              id="slider-sfx"
            />
          </div>

          {/* Background Music Volume */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-gray-300">
              <span>Music (Tribal Loop):</span>
              <span className="text-fuchsia-400 font-bold">{(settings.musicVolume * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={settings.musicVolume}
              onChange={(e) => handleSliderChange('musicVolume', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-purple-950/80 rounded-lg accent-fuchsia-500 cursor-pointer"
              id="slider-music"
            />
          </div>

          {/* Achievements brief info */}
          <div className="pt-2 flex items-center gap-2 border-t border-purple-900/30">
            <Award className="w-4 h-4 text-pink-400 shrink-0" />
            <div className="text-[11px] text-gray-405 leading-tight">
              Adjust variables dynamically to make hard levels easier (or test your speedrun limits)!
            </div>
          </div>
        </div>

        {/* Binds & Control Scheme */}
        <div className="space-y-4 bg-[#21113e]/75 p-4 rounded-xl border border-purple-500/15" id="ctr-keys">
          <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-fuchsia-400 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            Mowgli Action Controls
          </h4>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono leading-relaxed text-gray-300">
            <div className="flex items-center gap-1">
              <span className="bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40 text-white font-bold">←</span>
              <span className="bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40 text-white font-bold">A</span>
              <span>Left</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40 text-white font-bold">→</span>
              <span className="bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40 text-white font-bold">D</span>
              <span>Right</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="bg-purple-950/60 text-[10px] px-2 py-0.5 rounded border border-purple-800/40 text-white font-bold">SPACE</span>
              <span className="bg-purple-950/60 text-[10px] px-2 py-0.5 rounded border border-purple-800/40 text-white font-bold">W</span>
              <span>Jump</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40 text-white font-bold">↓</span>
              <span className="bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800/40 text-white font-bold">S</span>
              <span>Crouch</span>
            </div>
          </div>

          <div className="flex gap-2 items-start bg-fuchsia-950/20 p-2.5 rounded-lg border border-fuchsia-900/30 text-[11px] text-fuchsia-300">
            <HelpCircle className="w-4 h-4 shrink-0 text-fuchsia-400 mt-0.5" />
            <span>
              Tip: Land directly on top of <strong>colored Toads</strong> to bounce high into the canopy! Hold the Jump key while bouncing for maximum spring momentum.
            </span>
          </div>
        </div>

      </div>

      {/* Footer stats line */}
      <div className="flex justify-between items-center text-xs font-mono text-gray-500 pt-2 border-t border-purple-900/30" id="jungle-stats-summary">
        <span>Active Session: 2D side-viewed physics loop compiled successfully</span>
        <div className="flex gap-4">
          <span>Deaths: <strong className="text-rose-500 font-bold">{deaths}</strong></span>
          <span>Bananas: <strong className="text-yellow-400 font-bold">{bananaCount}</strong></span>
          <span>Score: <strong className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 font-extrabold font-mono">{score} XP</strong></span>
        </div>
      </div>

    </div>
  );
}
