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
  PoolQuestion,
  QuizDef,
  TriggerPlacement,
  WorldData,
} from './types';
import { INITIAL_MISSIONS, INITIAL_FIGHTS, INITIAL_QUIZZES, INITIAL_QUESTIONS, INITIAL_SPRITES, INITIAL_SETTINGS } from './data';
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
  questions?: string[];
  sprites?: string[];
}

export interface SaveData {
  version: 6;
  stats: GameStats;
  settings: GameSettings;
  world: WorldData;
  savedAt: string;
  knownDefaults?: KnownDefaults;
}

/**
 * One-time stamp of the bundled default art onto sprites that still have no
 * frames. Empty-frames sprites all rendered as procedural canvas art — the
 * bundled PNGs are the new default look for exactly those. Runs only during
 * migration, so frames a user deletes in the editor afterwards stay deleted.
 */
function stampDefaultFrames(world: WorldData): WorldData {
  const sprites = (world.sprites ?? []).map((s) => {
    if (s.frames.length > 0) return s;
    const def = INITIAL_SPRITES.find((d) => d.id === s.id);
    return def && def.frames.length > 0
      ? { ...s, frames: [...def.frames], frameDuration: def.frameDuration }
      : s;
  });
  return { ...world, sprites };
}

// --- v5 legacy shape (character art bundled, but block/prop art not yet) ------

interface SaveDataV5 {
  version: 5;
  stats: GameStats;
  settings: GameSettings;
  world: WorldData;
  savedAt: string;
  knownDefaults?: KnownDefaults;
}

/** Stamp the bundled block/prop textures onto still-procedural sprites. */
function migrateV5(v5: SaveDataV5): SaveData {
  return { ...v5, version: 6, world: stampDefaultFrames(v5.world) };
}

// --- v4 legacy shape (sprite library existed, but no bundled default art) -----

interface SaveDataV4 {
  version: 4;
  stats: GameStats;
  settings: GameSettings;
  world: WorldData;
  savedAt: string;
  knownDefaults?: KnownDefaults;
}

/** Stamp the bundled character art onto still-procedural sprites. */
function migrateV4(v4: SaveDataV4): SaveDataV5 {
  return { ...v4, version: 5, world: stampDefaultFrames(v4.world) };
}

// --- v3 legacy shape (no sprite library yet) ----------------------------------

interface SaveDataV3 {
  version: 3;
  stats: GameStats;
  settings: GameSettings;
  world: Omit<WorldData, 'sprites'>;
  savedAt: string;
  knownDefaults?: KnownDefaults;
}

/** Add the sprite library: pre-sprite saves simply get the built-in set. */
function migrateV3(v3: SaveDataV3): SaveDataV4 {
  return {
    ...v3,
    version: 4,
    world: { ...v3.world, sprites: JSON.parse(JSON.stringify(INITIAL_SPRITES)) },
    knownDefaults: v3.knownDefaults
      ? { ...v3.knownDefaults, sprites: INITIAL_SPRITES.map((s) => s.id) }
      : undefined,
  };
}

// --- v2 legacy shape (quizzes still owned their questions, no question pool) --

interface LegacyQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
}

interface QuizDefV2 {
  id: string;
  title: string;
  intro: string;
  questions: LegacyQuestion[];
  cs?: { title: string; intro: string; questions: { question: string; choices: string[] }[] };
}

interface SaveDataV2 {
  version: 2;
  stats: GameStats;
  settings: GameSettings;
  world: Omit<WorldData, 'quizzes' | 'questionPool' | 'sprites'> & { quizzes: QuizDefV2[] };
  savedAt: string;
  knownDefaults?: KnownDefaults;
}

/**
 * Carve every quiz's embedded questions out into the shared question pool.
 * All pre-pool questions belong to the chapter-2 riddle content, so they are
 * flagged 'ch2'. Migrated ids follow the `<quizId>-q<n>` scheme — identical to
 * the ids the built-in pool uses — so later merges never duplicate them.
 */
function migrateV2(v2: SaveDataV2): SaveDataV3 {
  const pool: PoolQuestion[] = [];
  const quizzes: QuizDef[] = (v2.world.quizzes ?? []).map((q) => {
    (q.questions ?? []).forEach((qq, i) => {
      const cs = q.cs?.questions?.[i];
      pool.push({
        id: `${q.id}-q${i + 1}`,
        chapter: 'ch2',
        question: qq.question,
        choices: qq.choices,
        correctIndex: qq.correctIndex,
        ...(cs && (cs.question || cs.choices.some(Boolean))
          ? { cs: { question: cs.question ?? '', choices: qq.choices.map((_, ci) => cs.choices[ci] ?? '') } }
          : {}),
      });
    });
    return {
      id: q.id,
      title: q.title,
      intro: q.intro,
      questionCount: Math.max(1, (q.questions ?? []).length),
      ...(q.cs ? { cs: { title: q.cs.title, intro: q.cs.intro } } : {}),
    };
  });
  return {
    version: 3,
    stats: v2.stats,
    settings: v2.settings,
    world: { ...v2.world, quizzes, questionPool: pool },
    savedAt: v2.savedAt,
    knownDefaults: v2.knownDefaults
      ? {
          ...v2.knownDefaults,
          // The save "knows" exactly the default questions its migration
          // produced — deleted-quiz defaults stay recoverable via the merge.
          questions: pool
            .filter((p) => INITIAL_QUESTIONS.some((d) => d.id === p.id))
            .map((p) => p.id),
        }
      : undefined,
  };
}

// --- v1 legacy shape (levels-only saves written before the mission refactor) --

interface LegacyPuzzle {
  triggerX: number;
  title: string;
  intro: string;
  questions: LegacyQuestion[];
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
function migrateV1(v1: SaveDataV1): SaveDataV3 {
  const quizzes: QuizDef[] = JSON.parse(JSON.stringify(INITIAL_QUIZZES));
  const questionPool: PoolQuestion[] = JSON.parse(JSON.stringify(INITIAL_QUESTIONS));
  const fights = JSON.parse(JSON.stringify(INITIAL_FIGHTS)) as WorldData['fights'];
  const missions: Mission[] = [JSON.parse(JSON.stringify(INITIAL_MISSIONS[0]))];

  // Does this embedded puzzle carry exactly the default riddle content? Then
  // it can reuse the built-in gate + pool questions instead of new entries.
  const matchesDefault = (puzzle: LegacyPuzzle): boolean => {
    const def = INITIAL_QUIZZES.find((q) => q.id === 'bandar-riddle');
    const defQuestions = INITIAL_QUESTIONS.filter((q) => q.id.startsWith('bandar-riddle-'));
    return (
      !!def &&
      def.title === puzzle.title &&
      def.intro === puzzle.intro &&
      JSON.stringify(defQuestions.map((q) => ({ question: q.question, choices: q.choices, correctIndex: q.correctIndex }))) ===
        JSON.stringify(puzzle.questions)
    );
  };

  for (const lvl of v1.levels ?? []) {
    const { puzzle, ...rest } = lvl;
    const triggers: TriggerPlacement[] = [];
    if (puzzle) {
      let quizId = 'bandar-riddle';
      if (!matchesDefault(puzzle)) {
        // Carve the embedded puzzle out: a gate asking all of its questions,
        // plus its questions in the pool (pre-pool content is chapter 2's).
        quizId = `quiz-l${lvl.id}`;
        quizzes.push({
          id: quizId,
          title: puzzle.title,
          intro: puzzle.intro,
          questionCount: Math.max(1, puzzle.questions.length),
        });
        puzzle.questions.forEach((qq, i) => {
          questionPool.push({ id: `${quizId}-q${i + 1}`, chapter: 'ch2', ...qq });
        });
      }
      triggers.push({ id: `m${lvl.id}-tr1`, kind: 'quiz', refId: quizId, triggerX: puzzle.triggerX });
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
    version: 3,
    // The prologue now occupies mission index 0, shifting every level down one.
    stats: { ...v1.stats, currentLevel: (v1.stats?.currentLevel ?? 0) + 1 },
    settings: v1.settings,
    world: { missions, fights, quizzes, questionPool },
    savedAt: v1.savedAt,
    knownDefaults: v1.knownDefaultIds
      ? {
          missions: [0, ...v1.knownDefaultIds],
          fights: INITIAL_FIGHTS.map((f) => f.id),
          quizzes: INITIAL_QUIZZES.map((q) => q.id),
          questions: INITIAL_QUESTIONS.map((q) => q.id),
        }
      : undefined,
  };
}

export function readSaveData(): SaveData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveData | SaveDataV5 | SaveDataV4 | SaveDataV3 | SaveDataV2 | SaveDataV1;
    if ('version' in parsed && parsed.version === 6 && parsed.world) return parsed;
    if ('version' in parsed && parsed.version === 5 && parsed.world) return migrateV5(parsed);
    if ('version' in parsed && parsed.version === 4 && parsed.world) return migrateV5(migrateV4(parsed));
    if ('version' in parsed && parsed.version === 3 && parsed.world) return migrateV5(migrateV4(migrateV3(parsed)));
    if ('version' in parsed && parsed.version === 2 && parsed.world) return migrateV5(migrateV4(migrateV3(migrateV2(parsed))));
    if ('levels' in parsed && Array.isArray(parsed.levels)) return migrateV5(migrateV4(migrateV3(migrateV1(parsed))));
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
    // Saves written before quizzes/questions carried their own Czech text lack
    // `cs`. Backfill the built-in translation, but only while the English
    // content is still pristine — an English-edited entry would otherwise pair
    // user text with an unrelated default translation.
    quizzes: mergeCollection(saved.quizzes ?? [], INITIAL_QUIZZES, known?.quizzes).map((q) => {
      if (q.cs) return q;
      const def = INITIAL_QUIZZES.find((d) => d.id === q.id);
      const pristine = def && def.title === q.title && def.intro === q.intro;
      return pristine && def.cs ? { ...q, cs: def.cs } : q;
    }),
    questionPool: mergeCollection(saved.questionPool ?? [], INITIAL_QUESTIONS, known?.questions).map((q) => {
      if (q.cs) return q;
      const def = INITIAL_QUESTIONS.find((d) => d.id === q.id);
      const pristine =
        def &&
        def.question === q.question &&
        def.correctIndex === q.correctIndex &&
        JSON.stringify(def.choices) === JSON.stringify(q.choices);
      return pristine && def.cs ? { ...q, cs: def.cs } : q;
    }),
    sprites: mergeCollection(saved.sprites ?? [], INITIAL_SPRITES, known?.sprites),
  };
  return JSON.parse(JSON.stringify(merged));
}

/** Persist a full save, stamping it with the current built-in content ids. */
export function writeSaveData(data: Omit<SaveData, 'version' | 'knownDefaults'>): SaveData | null {
  const stamped: SaveData = {
    ...data,
    version: 6,
    knownDefaults: {
      missions: INITIAL_MISSIONS.map((m) => m.id),
      fights: INITIAL_FIGHTS.map((f) => f.id),
      quizzes: INITIAL_QUIZZES.map((q) => q.id),
      questions: INITIAL_QUESTIONS.map((q) => q.id),
      sprites: INITIAL_SPRITES.map((s) => s.id),
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
