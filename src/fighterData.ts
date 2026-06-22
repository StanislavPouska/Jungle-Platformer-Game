/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FightConfig } from './types';

// The Epilogue: grown Mowgli with a torch faces Shere Khan in front of the
// village fence. Mowgli keeps the canonical 100 HP / 20 dmg; Shere Khan is
// the tunable opponent — equal HP, equal damage, with a 20% chance to parry.
export const EPILOGUE_FIGHT: FightConfig = {
  name: 'The Final Reckoning',
  description: "Years later, a grown Mowgli returns to the village with fire in hand. Shere Khan stalks in for one last duel before the watching villagers. End it.",
  background: 'village',
  player: {
    sprite: 'mowgli_torch',
    maxHp: 100,
    damage: 20,
    parryChance: 0, // the player's parry is manual (Down key), not probabilistic
  },
  opponent: {
    sprite: 'shere_khan',
    maxHp: 100,
    damage: 20,
    parryChance: 0.2,
  },
  restartOnLose: true,
};
