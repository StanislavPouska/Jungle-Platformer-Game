/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// File-backed world persistence.
//
// Level design lives in a real file on disk — public/world.json — not in
// localStorage. The browser game reads it (served statically at /world.json);
// the standalone editor server reads and writes it through /api/world. This is
// the single source of truth: there is no default-vs-edited merge anymore.
// data.ts is only the compiled-in fallback used if the file can't be fetched.

import { WorldData } from './types';
import { INITIAL_MISSIONS, INITIAL_FIGHTS, INITIAL_QUIZZES, INITIAL_QUESTIONS, INITIAL_SPRITES } from './data';

/** The compiled-in fallback world (deep-copied so callers can mutate freely). */
export function defaultWorld(): WorldData {
  return JSON.parse(
    JSON.stringify({
      missions: INITIAL_MISSIONS,
      fights: INITIAL_FIGHTS,
      quizzes: INITIAL_QUIZZES,
      questionPool: INITIAL_QUESTIONS,
      sprites: INITIAL_SPRITES,
    }),
  );
}

function isValidWorld(w: unknown): w is WorldData {
  return !!w && Array.isArray((w as WorldData).missions) && (w as WorldData).missions.length > 0;
}

/**
 * Game runtime: fetch the level design from the static world.json. Falls back
 * to the compiled-in defaults if the file is missing (e.g. a bare static build
 * where the editor was never run) so the game always has something to play.
 */
export async function loadWorldForGame(): Promise<WorldData> {
  try {
    const res = await fetch(`/world.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (isValidWorld(data)) return data;
    }
  } catch {
    /* fall through to defaults */
  }
  return defaultWorld();
}

/**
 * Editor: read the current game content from the editor server (which seeds
 * the file from defaults on first run). Falls back to the static file, then
 * the compiled-in defaults.
 */
export async function loadWorldFromServer(): Promise<WorldData> {
  try {
    const res = await fetch('/api/world', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (isValidWorld(data)) return data;
    }
  } catch {
    /* server not reachable — fall back */
  }
  return loadWorldForGame();
}

export interface SaveResult {
  ok: boolean;
  savedAt?: string;
  error?: string;
}

/**
 * Editor: write edited game content permanently to disk via the editor server.
 * Returns { ok:false } if the server isn't reachable (e.g. the page was opened
 * without the editor server running) so the UI can surface it.
 */
export async function saveWorldToServer(world: WorldData): Promise<SaveResult> {
  try {
    const res = await fetch('/api/world', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(world),
    });
    if (!res.ok) {
      return { ok: false, error: `Server responded ${res.status}` };
    }
    const data = await res.json();
    return { ok: !!data.ok, savedAt: data.savedAt };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
