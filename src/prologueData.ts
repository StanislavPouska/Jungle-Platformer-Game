/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrologueLevel } from './types';

// Step heights between adjacent platforms stay within each platform's own
// height (30px) so the toddler can always auto-climb without jumping.
export const PROLOGUE_LEVEL: PrologueLevel = {
  name: "Shere Khan's Raid",
  description: 'Shere Khan has attacked the village! As a crawling toddler, Mowgli must creep through the jungle, ducking into caves and leaf-shadows to hide from the prowling tiger.',
  startX: 60,
  levelMinX: 20,
  levelMaxX: 2340,
  platforms: [
    { id: 'sp1', x: 30, width: 220, y: 420, height: 30 },
    { id: 'sp2', x: 250, width: 180, y: 400, height: 30 },
    { id: 'sp3', x: 430, width: 190, y: 420, height: 30 },
    { id: 'sp4', x: 620, width: 170, y: 440, height: 30 },
    { id: 'sp5', x: 790, width: 200, y: 420, height: 30 },
    { id: 'sp6', x: 990, width: 180, y: 400, height: 30 },
    { id: 'sp7', x: 1170, width: 190, y: 420, height: 30 },
    { id: 'sp8', x: 1360, width: 170, y: 440, height: 30 },
    { id: 'sp9', x: 1530, width: 200, y: 420, height: 30 },
    { id: 'sp10', x: 1730, width: 180, y: 400, height: 30 },
    { id: 'sp11', x: 1910, width: 190, y: 420, height: 30 },
    { id: 'sp12', x: 2100, width: 240, y: 410, height: 30 },
  ],
  hidingSpots: [
    { id: 'hs1', x: 330, y: 400, width: 70, height: 70, kind: 'cave' },
    { id: 'hs2', x: 700, y: 440, width: 70, height: 70, kind: 'leaf_shadow' },
    { id: 'hs3', x: 1080, y: 400, width: 70, height: 70, kind: 'cave' },
    { id: 'hs4', x: 1450, y: 440, width: 70, height: 70, kind: 'leaf_shadow' },
    { id: 'hs5', x: 1820, y: 400, width: 70, height: 70, kind: 'cave' },
    { id: 'goal', x: 2200, y: 410, width: 110, height: 95, kind: 'goal_cave' },
  ],
  goalSpotId: 'goal',
  tigerStartX: 480,
  tigerSpeed: 1.8,
};
