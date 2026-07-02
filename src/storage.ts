/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared persistence for the game and the standalone level editor. Both read
// and write the same localStorage save so levels designed in the editor show up
// in the game's Load (and vice-versa).

import { GameStats, GameSettings, Level } from './types';
import { INITIAL_LEVELS, INITIAL_SETTINGS } from './data';
import { Lang } from './i18n';

export const SAVE_KEY = 'jungle-platformer-save-v1';
export const LANG_KEY = 'jungle-platformer-lang';

export interface SaveData {
  stats: GameStats;
  settings: GameSettings;
  levels: Level[];
  savedAt: string;
  // Ids of the built-in levels that existed when this save was written. Lets
  // mergeWithDefaults tell "default level missing because the save predates
  // it" (re-add it) apart from "user deleted it on purpose" (stay deleted).
  knownDefaultIds?: number[];
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
 * Merge saved levels with the built-in set. Saved edits win where ids match;
 * built-in levels the save has never seen (it predates them) are restored;
 * built-in levels the save knew about but no longer contains were deleted by
 * the user and stay deleted. Custom levels (ids not in the defaults) are kept
 * and appended. Returns a deep copy safe to mutate.
 */
export function mergeWithDefaults(saved: Level[], knownDefaultIds?: number[]): Level[] {
  const known = new Set(knownDefaultIds ?? []);
  const byId = new Map(saved.map((l) => [l.id, l]));
  const merged: Level[] = [];
  for (const def of INITIAL_LEVELS) {
    const savedLevel = byId.get(def.id);
    if (savedLevel) merged.push(savedLevel);
    else if (!known.has(def.id)) merged.push(def);
  }
  for (const l of saved) {
    if (!INITIAL_LEVELS.some((d) => d.id === l.id)) merged.push(l);
  }
  return JSON.parse(JSON.stringify(merged));
}

/** Persist a full save, stamping it with the current built-in level ids. */
export function writeSaveData(data: Omit<SaveData, 'knownDefaultIds'>): SaveData | null {
  const stamped: SaveData = { ...data, knownDefaultIds: INITIAL_LEVELS.map((l) => l.id) };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(stamped));
    return stamped;
  } catch {
    return null;
  }
}

/**
 * Persist an edited level list into the shared save, preserving any existing
 * stats/settings. Returns the data written (or null if storage failed, e.g.
 * quota exceeded).
 */
export function writeLevelsToSave(levels: Level[]): SaveData | null {
  const existing = readSaveData();
  return writeSaveData(
    existing
      ? { ...existing, levels, savedAt: new Date().toLocaleString() }
      : { stats: DEFAULT_STATS, settings: INITIAL_SETTINGS, levels, savedAt: new Date().toLocaleString() },
  );
}

// Debounced level autosave: editors call scheduleLevelsSave on every change
// (including every drag pointermove); the actual JSON serialization +
// localStorage write runs once things go quiet. flushLevelsSave forces any
// pending write out immediately (playtest handoff, beforeunload).
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingLevels: Level[] | null = null;
let pendingOnSaved: ((data: SaveData | null) => void) | undefined;

export function scheduleLevelsSave(
  levels: Level[],
  onSaved?: (data: SaveData | null) => void,
  delayMs = 600,
): void {
  pendingLevels = levels;
  pendingOnSaved = onSaved;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushLevelsSave, delayMs);
}

export function flushLevelsSave(): void {
  clearTimeout(saveTimer);
  if (!pendingLevels) return;
  const data = writeLevelsToSave(pendingLevels);
  pendingLevels = null;
  const cb = pendingOnSaved;
  pendingOnSaved = undefined;
  cb?.(data);
}
