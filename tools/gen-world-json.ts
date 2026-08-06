/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// One-time seed: emit public/world.json from the compiled-in defaults so the
// game (and the editor) have a real file to read/write. After this, the file
// on disk is the single source of truth for level design; data.ts is only the
// fallback the game uses when the file is missing entirely.
//
// Run with:  npx tsx tools/gen-world-json.ts [--force]

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  INITIAL_MISSIONS,
  INITIAL_FIGHTS,
  INITIAL_QUIZZES,
  INITIAL_QUESTIONS,
  INITIAL_SPRITES,
} from '../src/data';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '..', 'public', 'world.json');

if (existsSync(out) && !process.argv.includes('--force')) {
  console.log(`world.json already exists at ${out} (pass --force to overwrite)`);
  process.exit(0);
}

const world = {
  missions: INITIAL_MISSIONS,
  fights: INITIAL_FIGHTS,
  quizzes: INITIAL_QUIZZES,
  questionPool: INITIAL_QUESTIONS,
  sprites: INITIAL_SPRITES,
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(world, null, 2), 'utf-8');
console.log(`Wrote ${out} (${world.missions.length} missions, ${world.sprites.length} sprites)`);
