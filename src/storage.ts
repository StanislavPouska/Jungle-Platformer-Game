/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared persistence for the game and the standalone level editor. Both read
// and write the same localStorage save so levels designed in the editor show up
// in the game's Load (and vice-versa).

import { GameStats, GameSettings, Level } from './types';
import { INITIAL_SETTINGS } from './data';
import { Lang } from './i18n';

export const SAVE_KEY = 'jungle-platformer-save-v1';
export const LANG_KEY = 'jungle-platformer-lang';

export interface SaveData {
  stats: GameStats;
  settings: GameSettings;
  levels: Level[];
  savedAt: string;
}

export function readSaveData(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
}

export function readSavedLang(): Lang {
  try {
    const raw = localStorage.getItem(LANG_KEY);
    return raw === 'cs' ? 'cs' : 'en';
  } catch {
    return 'en';
  }
}

const DEFAULT_STATS: GameStats = {
  score: 0,
  bananasCollected: 0,
  deaths: 0,
  timeElapsed: 0,
  currentLevel: 0,
  gameState: 'start_screen',
};

/**
 * Persist an edited level list into the shared save, preserving any existing
 * stats/settings. Used by the standalone editor's autosave. Returns the data
 * written (or null if storage was unavailable).
 */
export function writeLevelsToSave(levels: Level[]): SaveData | null {
  const existing = readSaveData();
  const data: SaveData = existing
    ? { ...existing, levels, savedAt: new Date().toLocaleString() }
    : { stats: DEFAULT_STATS, settings: INITIAL_SETTINGS, levels, savedAt: new Date().toLocaleString() };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return data;
  } catch {
    return null;
  }
}
