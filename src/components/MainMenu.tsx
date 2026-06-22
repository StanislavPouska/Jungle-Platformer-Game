/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameSettings } from '../types';
import {
  Trees,
  Play,
  Save,
  FolderOpen,
  Sliders,
  X,
  RefreshCw,
  Volume2,
  Zap,
  KeyRound,
  HelpCircle,
} from 'lucide-react';
import { Lang, LANGUAGES, UI } from '../i18n';

type MenuTab = 'play' | 'save' | 'load' | 'settings';

interface MainMenuProps {
  mode: 'start' | 'pause';
  settings: GameSettings;
  onSettingsChange: (newSettings: GameSettings) => void;
  onNewGame: () => void;
  onSaveGame: () => void;
  onLoadGame: () => void;
  onClose?: () => void;
  onResetProgress: () => void;
  hasSaveData: boolean;
  saveInfo: string | null;
  deaths: number;
  score: number;
  bananaCount: number;
  language: Lang;
  onLanguageChange: (lang: Lang) => void;
}

export default function MainMenu({
  mode,
  settings,
  onSettingsChange,
  onNewGame,
  onSaveGame,
  onLoadGame,
  onClose,
  onResetProgress,
  hasSaveData,
  saveInfo,
  deaths,
  score,
  bananaCount,
  language,
  onLanguageChange,
}: MainMenuProps) {
  const [tab, setTab] = useState<MenuTab>('play');
  const t = UI[language];

  const handleSliderChange = (key: keyof GameSettings, value: number) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleCheckboxToggle = (key: 'doubleJumpEnabled') => {
    onSettingsChange({ ...settings, [key]: !settings[key] });
  };

  const tabs: { id: MenuTab; label: string; icon: React.ReactNode }[] = [
    { id: 'play', label: t.menuTabPlay, icon: <Play className="w-4 h-4" /> },
    { id: 'save', label: t.menuTabSave, icon: <Save className="w-4 h-4" /> },
    { id: 'load', label: t.menuTabLoad, icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'settings', label: t.menuTabSettings, icon: <Sliders className="w-4 h-4" /> },
  ];

  return (
    <div
      className={`${
        mode === 'pause' ? 'absolute inset-0 z-50 bg-black/70 backdrop-blur-sm' : 'min-h-screen'
      } flex items-center justify-center p-4`}
      id="main-menu-overlay"
    >
      <div
        className="w-full max-w-2xl bg-[#160b2d] border-2 border-fuchsia-500/30 rounded-3xl shadow-[0_0_45px_rgba(168,85,247,0.25)] overflow-hidden"
        id="main-menu-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-purple-900/40 bg-[#1d0735]/70">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-fuchsia-950/45 rounded-xl border border-fuchsia-500/40 text-fuchsia-400">
              <Trees className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-sans font-extrabold text-lg text-white leading-tight">
                {t.brandName1} <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-pink-400">{t.brandName2}</span>
              </h1>
              <p className="text-[11px] text-gray-400 font-mono">{mode === 'pause' ? t.menuPauseTitle : t.menuMainTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="flex gap-1 bg-[#0d071f] p-1 rounded-xl border border-purple-900/40" id="lang-switcher" title={t.languageLabel}>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => onLanguageChange(l.code)}
                  className={`px-2 py-1 rounded-lg text-base leading-none transition-all cursor-pointer ${
                    language === l.code ? 'bg-fuchsia-600/60 ring-1 ring-fuchsia-400' : 'hover:bg-purple-950/60 opacity-70'
                  }`}
                  title={l.label}
                  id={`btn-lang-${l.code}`}
                >
                  {l.flag}
                </button>
              ))}
            </div>
            {mode === 'pause' && onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl border border-purple-800/40 text-gray-300 hover:text-white hover:bg-fuchsia-900/40 cursor-pointer"
                title={t.resumeTooltip}
                id="btn-close-menu"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pt-4">
          {tabs.map((tabItem) => (
            <button
              key={tabItem.id}
              onClick={() => setTab(tabItem.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-mono rounded-lg transition-all cursor-pointer ${
                tab === tabItem.id
                  ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white font-bold shadow-[0_0_12px_rgba(236,72,153,0.35)]'
                  : 'text-gray-400 hover:text-white hover:bg-purple-950/40'
              }`}
              id={`menu-tab-${tabItem.id}`}
            >
              {tabItem.icon}
              {tabItem.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-6 min-h-[280px]">
          {tab === 'play' && (
            <div className="flex flex-col items-center text-center gap-4 py-6" id="menu-panel-play">
              <p className="text-sm text-gray-300 max-w-md">
                {t.playIntro}
              </p>
              <button
                onClick={onNewGame}
                className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-600 hover:to-pink-700 text-white font-bold text-sm px-8 py-3 rounded-xl border border-fuchsia-400 shadow-lg shadow-fuchsia-950/30 cursor-pointer"
                id="btn-start-new-game"
              >
                <Play className="w-4 h-4" />
                {mode === 'pause' ? t.restartNewGame : t.startNewGame}
              </button>
              {mode === 'pause' && onClose && (
                <button
                  onClick={onClose}
                  className="text-xs font-mono text-gray-400 hover:text-white underline cursor-pointer"
                  id="btn-resume-from-play-tab"
                >
                  {t.resumeCurrentRun}
                </button>
              )}
            </div>
          )}

          {tab === 'save' && (
            <div className="flex flex-col items-center text-center gap-4 py-6" id="menu-panel-save">
              <p className="text-sm text-gray-300 max-w-md">
                {t.saveIntro}
              </p>
              <button
                onClick={onSaveGame}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-8 py-3 rounded-xl border border-emerald-400 shadow-lg cursor-pointer"
                id="btn-save-game"
              >
                <Save className="w-4 h-4" />
                {t.saveGame}
              </button>
              {saveInfo && (
                <p className="text-[11px] text-gray-500 font-mono">{t.lastSave} {saveInfo}</p>
              )}
            </div>
          )}

          {tab === 'load' && (
            <div className="flex flex-col items-center text-center gap-4 py-6" id="menu-panel-load">
              <p className="text-sm text-gray-300 max-w-md">
                {hasSaveData ? t.loadIntroFound : t.loadIntroMissing}
              </p>
              <button
                onClick={onLoadGame}
                disabled={!hasSaveData}
                className={`flex items-center gap-2 font-bold text-sm px-8 py-3 rounded-xl border shadow-lg cursor-pointer ${
                  hasSaveData
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400'
                    : 'bg-slate-800 text-gray-500 border-slate-700 cursor-not-allowed'
                }`}
                id="btn-load-game"
              >
                <FolderOpen className="w-4 h-4" />
                {t.loadGame}
              </button>
              {saveInfo && (
                <p className="text-[11px] text-gray-500 font-mono">{t.saved} {saveInfo}</p>
              )}
            </div>
          )}

          {tab === 'settings' && (
            <div className="space-y-5" id="menu-panel-settings">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physics tuners */}
                <div className="space-y-4 bg-[#21113e]/75 p-4 rounded-xl border border-purple-500/15" id="ctr-physics">
                  <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-fuchsia-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-pink-400" />
                    {t.physicsTuners}
                  </h4>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-gray-300">
                      <span>{t.gravityDensity}</span>
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

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-gray-300">
                      <span>{t.jumpVelocity}</span>
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

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-gray-300">
                      <span>{t.jogSpeed}</span>
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

                  <label className="flex items-center gap-2 cursor-pointer pt-1" id="label-doublejump">
                    <input
                      type="checkbox"
                      checked={settings.doubleJumpEnabled}
                      onChange={() => handleCheckboxToggle('doubleJumpEnabled')}
                      className="rounded border-purple-950/50 text-fuchsia-500 focus:ring-fuchsia-400 bg-purple-950/80 h-4 w-4 accent-fuchsia-500 cursor-pointer"
                      id="chk-doublejump"
                    />
                    <span className="text-xs font-mono text-gray-300">{t.enableDoubleJump}</span>
                  </label>
                </div>

                {/* Audio mixer */}
                <div className="space-y-4 bg-[#21113e]/75 p-4 rounded-xl border border-purple-500/15" id="ctr-audio">
                  <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-fuchsia-400 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-pink-400" />
                    {t.audioMixer}
                  </h4>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-gray-300">
                      <span>{t.fxLabel}</span>
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

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-mono text-gray-300">
                      <span>{t.musicLabel}</span>
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

                  <div className="pt-2 border-t border-purple-900/30 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span className="text-[11px] text-gray-400">{t.controlsHint}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#0c0419] p-3 rounded-xl border border-purple-950/40">
                <div className="flex gap-4 text-xs font-mono text-gray-400">
                  <span>{t.deathsLabel} <strong className="text-rose-500">{deaths}</strong></span>
                  <span>{t.bananasLabel} <strong className="text-yellow-400">{bananaCount}</strong></span>
                  <span>{t.scoreLabel} <strong className="text-fuchsia-400">{score} XP</strong></span>
                </div>
                <button
                  onClick={onResetProgress}
                  className="flex items-center gap-1 text-xs bg-fuchsia-950/40 hover:bg-fuchsia-800/80 text-fuchsia-300 hover:text-white px-3 py-1.5 rounded-lg border border-fuchsia-800/50 transition-all cursor-pointer"
                  title={t.resetTooltip}
                  id="btn-reset-stats"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t.resetRun}</span>
                </button>
              </div>

              <div className="flex gap-2 items-start bg-fuchsia-950/20 p-2.5 rounded-lg border border-fuchsia-900/30 text-[11px] text-fuchsia-300">
                <HelpCircle className="w-4 h-4 shrink-0 text-fuchsia-400 mt-0.5" />
                <span>
                  {t.tipText}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
