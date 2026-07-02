/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Shared persistence for the game and the standalone level editor. Both read
// and write the same localStorage save so worlds designed in the editor show up
// in the game's Load (and vice-versa).

import {
  GameStats,
  GameSettings,
  Mission,
  PlatformerMission,
  PuzzleQuestion,
  QuizDef,
  TriggerPlacement,
  WorldData,
} from './types';
import { INITIAL_MISSIONS, INITIAL_FIGHTS, INITIAL_QUIZZES, INITIAL_SETTINGS } from './data';
import { Lang } from './i18n';

export const SAVE_KEY = 'jungle-platformer-save-v1';
export const LANG_KEY = 'jungle-platformer-lang';

// Ids of the built-in content that existed when a save was written. Lets
// mergeWithDefaults tell "default entry missing because the save predates it"
// (re-add it) apart from "user deleted it on purpose" (stay deleted).
export interface KnownDefaults {
  missions?: number[];
  fights?: string[];
  quizzes?: string[];
}

export interface SaveData {
  version: 2;
  stats: GameStats;
  settings: GameSettings;
  world: WorldData;
  savedAt: string;
  knownDefaults?: KnownDefaults;
}

// --- v1 legacy shape (levels-only saves written before the mission refactor) --

interface LegacyPuzzle {
  triggerX: number;
  title: string;
  intro: string;
  questions: PuzzleQuestion[];
}

type LegacyLevel = Omit<PlatformerMission, 'type' | 'chapter' | 'triggers'> & {
  puzzle?: LegacyPuzzle;
};

interface SaveDataV1 {
  stats: GameStats;
  settings: GameSettings;
  levels: LegacyLevel[];
  savedAt: string;
  knownDefaultIds?: number[];
}

/**
 * Convert a pre-mission-era save: levels become platformer missions, the
 * hardcoded prologue/epilogue become the editable stealth mission 0 and the
 * fight library's final duel (placed as a trigger at the end of the last
 * mission), and level 7's embedded puzzle moves into the quiz library.
 */
function migrateV1(v1: SaveDataV1): SaveData {
  const quizzes: QuizDef[] = JSON.parse(JSON.stringify(INITIAL_QUIZZES));
  const fights = JSON.parse(JSON.stringify(INITIAL_FIGHTS)) as WorldData['fights'];
  const missions: Mission[] = [JSON.parse(JSON.stringify(INITIAL_MISSIONS[0]))];

  for (const lvl of v1.levels ?? []) {
    const { puzzle, ...rest } = lvl;
    const triggers: TriggerPlacement[] = [];
    if (puzzle) {
      // Reuse a library quiz with identical content (the unmodified default),
      // otherwise carve the embedded puzzle out into its own library entry.
      let quiz = quizzes.find(
        (q) =>
          q.title === puzzle.title &&
          q.intro === puzzle.intro &&
          JSON.stringify(q.questions) === JSON.stringify(puzzle.questions),
      );
      if (!quiz) {
        quiz = { id: `quiz-l${lvl.id}`, title: puzzle.title, intro: puzzle.intro, questions: puzzle.questions };
        quizzes.push(quiz);
      }
      triggers.push({ id: `m${lvl.id}-tr1`, kind: 'quiz', refId: quiz.id, triggerX: puzzle.triggerX });
    }
    missions.push({
      ...rest,
      type: 'platformer',
      chapter: lvl.id <= 4 ? 'ch1' : 'ch2',
      triggers,
    });
  }

  // The old Epilogue always followed the final level — recreate that beat as a
  // fight trigger (with its chapter card) shortly before the last goal.
  const last = missions[missions.length - 1];
  if (last && last.type === 'platformer') {
    last.triggers.push({
      id: `m${last.id}-tr${last.triggers.length + 1}`,
      kind: 'fight',
      refId: 'shere-khan-final',
      triggerX: Math.max(0, last.endX - 150),
      chapterCard: 'epilogue',
    });
  }

  return {
    version: 2,
    // The prologue now occupies mission index 0, shifting every level down one.
    stats: { ...v1.stats, currentLevel: (v1.stats?.currentLevel ?? 0) + 1 },
    settings: v1.settings,
    world: { missions, fights, quizzes },
    savedAt: v1.savedAt,
    knownDefaults: v1.knownDefaultIds
      ? {
          missions: [0, ...v1.knownDefaultIds],
          fights: INITIAL_FIGHTS.map((f) => f.id),
          quizzes: INITIAL_QUIZZES.map((q) => q.id),
        }
      : undefined,
  };
}

export function readSaveData(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData | SaveDataV1;
    if ('version' in parsed && parsed.version === 2 && parsed.world) return parsed;
    if ('levels' in parsed && Array.isArray(parsed.levels)) return migrateV1(parsed);
    return null;
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
 * Merge one saved collection with its built-in set. Saved edits win where ids
 * match; built-in entries the save has never seen (it predates them) are
 * restored; built-in entries the save knew about but no longer contains were
 * deleted by the user and stay deleted. Custom entries (ids not in the
 * defaults) are kept and appended.
 */
function mergeCollection<Id extends number | string, T extends { id: Id }>(
  saved: T[],
  defaults: T[],
  knownIds?: Id[],
): T[] {
  const known = new Set(knownIds ?? []);
  const byId = new Map(saved.map((e) => [e.id, e]));
  const merged: T[] = [];
  for (const def of defaults) {
    const savedEntry = byId.get(def.id);
    if (savedEntry) merged.push(savedEntry);
    else if (!known.has(def.id)) merged.push(def);
  }
  for (const e of saved) {
    if (!defaults.some((d) => d.id === e.id)) merged.push(e);
  }
  return merged;
}

/** Merge a saved world against the built-in content. Returns a deep copy safe to mutate. */
export function mergeWithDefaults(saved: WorldData, known?: KnownDefaults): WorldData {
  const merged: WorldData = {
    missions: mergeCollection(saved.missions ?? [], INITIAL_MISSIONS, known?.missions),
    fights: mergeCollection(saved.fights ?? [], INITIAL_FIGHTS, known?.fights),
    quizzes: mergeCollection(saved.quizzes ?? [], INITIAL_QUIZZES, known?.quizzes),
  };
  return JSON.parse(JSON.stringify(merged));
}

/** Persist a full save, stamping it with the current built-in content ids. */
export function writeSaveData(data: Omit<SaveData, 'version' | 'knownDefaults'>): SaveData | null {
  const stamped: SaveData = {
    ...data,
    version: 2,
    knownDefaults: {
      missions: INITIAL_MISSIONS.map((m) => m.id),
      fights: INITIAL_FIGHTS.map((f) => f.id),
      quizzes: INITIAL_QUIZZES.map((q) => q.id),
    },
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(stamped));
    return stamped;
  } catch {
    return null;
  }
}

/**
 * Persist an edited world into the shared save, preserving any existing
 * stats/settings. Returns the data written (or null if storage failed, e.g.
 * quota exceeded).
 */
export function writeWorldToSave(world: WorldData): SaveData | null {
  const existing = readSaveData();
  return writeSaveData(
    existing
      ? { ...existing, world, savedAt: new Date().toLocaleString() }
      : { stats: DEFAULT_STATS, settings: INITIAL_SETTINGS, world, savedAt: new Date().toLocaleString() },
  );
}

// Debounced world autosave: editors call scheduleWorldSave on every change
// (including every drag pointermove); the actual JSON serialization +
// localStorage write runs once things go quiet. flushWorldSave forces any
// pending write out immediately (playtest handoff, beforeunload).
let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pendingWorld: WorldData | null = null;
let pendingOnSaved: ((data: SaveData | null) => void) | undefined;

export function scheduleWorldSave(
  world: WorldData,
  onSaved?: (data: SaveData | null) => void,
  delayMs = 600,
): void {
  pendingWorld = world;
  pendingOnSaved = onSaved;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushWorldSave, delayMs);
}

export function flushWorldSave(): void {
  clearTimeout(saveTimer);
  if (!pendingWorld) return;
  const data = writeWorldToSave(pendingWorld);
  pendingWorld = null;
  const cb = pendingOnSaved;
  pendingOnSaved = undefined;
  cb?.(data);
}
