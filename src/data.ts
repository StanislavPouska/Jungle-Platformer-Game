/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Level } from './types';

export const INITIAL_LEVELS: Level[] = [
  {
    id: 1,
    name: 'Canopy Crossing',
    description: 'Jump across ancient moss logs and bounce on helpful Green Toads to cross the jungle sky!',
    startX: 100,
    startY: 350,
    endX: 1900,
    endY: 250,
    platforms: [
      // Starting platform
      { id: 'l1-p1', x: 50, y: 400, width: 250, height: 40, type: 'moss_log' },
      // Jump step 1
      { id: 'l1-p2', x: 400, y: 320, width: 180, height: 35, type: 'canopy_leaves' },
      // Slabs underneath (safety nets)
      { id: 'l1-p3', x: 250, y: 520, width: 500, height: 40, type: 'moss_log' },
      // Mid platform
      { id: 'l1-p4', x: 670, y: 250, width: 150, height: 35, type: 'canopy_leaves' },
      // Big main segment
      { id: 'l1-p5', x: 900, y: 420, width: 350, height: 40, type: 'moss_log' },
      // Toad pad supports
      { id: 'l1-p6', x: 1350, y: 450, width: 200, height: 40, type: 'jungle_brick' },
      // Za žábou
      { id: 'l1-p7', x: 1200, y: 300, width: 220, height: 35, type: 'canopy_leaves' },
       // high branch
      { id: 'l1-p7', x: 1420, y: 200, width: 220, height: 35, type: 'canopy_leaves' },
      // Goal Platform
      { id: 'l1-p8', x: 1750, y: 320, width: 250, height: 40, type: 'moss_log' }
    ],
    toads: [
      // Easy jump toad
      { id: 'l1-t1', x: 1050, y: 400, width: 44, height: 24, springForce: 15, color: '#4ade80', isSquished: false, squishTimer: 0 },
      // Ultra springboard toad to reach high branch
      { id: 'l1-t2', x: 1430, y: 430, width: 44, height: 24, springForce: 21, color: '#22c55e', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l1-c1', x: 180, y: 320, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l1-c2', x: 490, y: 230, type: 'banana', collected: false, bobOffset: 120 },
      { id: 'l1-c3', x: 740, y: 170, type: 'mango', collected: false, bobOffset: 240 },
      { id: 'l1-c4', x: 980, y: 330, type: 'banana', collected: false, bobOffset: 60 },
      { id: 'l1-c5', x: 1520, y: 120, type: 'star', collected: false, bobOffset: 180 },
      { id: 'l1-c6', x: 1850, y: 240, type: 'banana', collected: false, bobOffset: 300 }
    ]
  },
  {
    id: 2,
    name: 'Mystic Swamplands',
    description: 'Avoid the deep muddy marsh bottom! Timely jumps onto moving vine-bridges and toxic red bouncy Toads are required.',
    startX: 100,
    startY: 300,
    endX: 2150,
    endY: 280,
    platforms: [
      // Safe start
      { id: 'l2-p1', x: 50, y: 380, width: 200, height: 40, type: 'moss_log' },
      // Hanging branch steps
      { id: 'l2-p2', x: 380, y: 280, width: 140, height: 30, type: 'canopy_leaves' },
      // Moving platform 1
      { id: 'l2-p3', x: 600, y: 340, width: 150, height: 30, type: 'vine_bridge', moving: true, startX: 600, startY: 340, range: 220, speed: 2 },
      // Central ruin pillar
      { id: 'l2-p4', x: 950, y: 420, width: 160, height: 180, type: 'jungle_brick' },
      // High branch steps
      { id: 'l2-p5', x: 1000, y: 220, width: 140, height: 30, type: 'canopy_leaves' },
      // Moving platform 2
      { id: 'l2-p6', x: 1250, y: 280, width: 150, height: 30, type: 'vine_bridge', moving: true, startX: 1250, startY: 200, range: 180, speed: 1.5 },
      // Bouncy platform base
      { id: 'l2-p7', x: 1550, y: 460, width: 220, height: 40, type: 'moss_log' },
      // high branch step
      { id: 'l2-p8', x: 1800, y: 220, width: 160, height: 30, type: 'canopy_leaves' },
      // Exit shrine
      { id: 'l2-p9', x: 2050, y: 360, width: 220, height: 40, type: 'jungle_brick' }
    ],
    toads: [
      // Giant red toad that squishes and fires you incredibly high (elasticity 24!)
      { id: 'l2-t1', x: 1010, y: 400, width: 44, height: 24, springForce: 24, color: '#ef4444', isSquished: false, squishTimer: 0 },
      // Normal bouncing yellow toad
      { id: 'l2-t2', x: 1620, y: 440, width: 44, height: 24, springForce: 18, color: '#eab308', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l2-c1', x: 450, y: 200, type: 'banana', collected: false, bobOffset: 120 },
      { id: 'l2-c2', x: 680, y: 150, type: 'mango', collected: false, bobOffset: 40 },
      { id: 'l2-c3', x: 1070, y: 140, type: 'star', collected: false, bobOffset: 90 },
      { id: 'l2-c4', x: 1320, y: 110, type: 'banana', collected: false, bobOffset: 250 },
      { id: 'l2-c5', x: 1640, y: 320, type: 'banana', collected: false, bobOffset: 150 },
      { id: 'l2-c6', x: 1880, y: 140, type: 'mango', collected: false, bobOffset: 310 }
    ]
  },
  {
    id: 3,
    name: 'Ancient Jungle Ruins',
    description: 'The ultimate temple trial! Use horizontal moving platforms and consecutive high-momentum Toad jumps to safely reach the ancient altar.',
    startX: 100,
    startY: 320,
    endX: 2450,
    endY: 220,
    platforms: [
      // Starting platform
      { id: 'l3-p1', x: 50, y: 410, width: 180, height: 40, type: 'jungle_brick' },
      // Horizontal moving vine step
      { id: 'l3-p2', x: 300, y: 320, width: 160, height: 30, type: 'vine_bridge', moving: true, startX: 300, startY: 320, range: 250, speed: 2.5 },
      // Intermediate step
      { id: 'l3-p3', x: 740, y: 410, width: 150, height: 40, type: 'jungle_brick' },
      // Vertical moving step
      { id: 'l3-p4', x: 980, y: 240, width: 150, height: 30, type: 'canopy_leaves', moving: true, startX: 980, startY: 150, range: 180, speed: 1.8 },
      // High solid archway
      { id: 'l3-p5', x: 1220, y: 190, width: 280, height: 40, type: 'jungle_brick' },
      // Intermediate bottom platform
      { id: 'l3-p6', x: 1300, y: 500, width: 180, height: 40, type: 'jungle_brick' },
      // Moving Platform 3
      { id: 'l3-p7', x: 1600, y: 400, width: 150, height: 30, type: 'vine_bridge', moving: true, startX: 1600, startY: 400, range: 200, speed: 3 },
      // High ruin step
      { id: 'l3-p8', x: 1880, y: 280, width: 160, height: 35, type: 'canopy_leaves' },
      // Altar base
      { id: 'l3-p9', x: 2120, y: 480, width: 140, height: 40, type: 'jungle_brick' },
      // final altar platform
      { id: 'l3-p10', x: 2350, y: 320, width: 250, height: 40, type: 'jungle_brick' }
    ],
    toads: [
      // High launched toad on intermediate step 
      { id: 'l3-t1', x: 790, y: 390, width: 44, height: 24, springForce: 23, color: '#a855f7', isSquished: false, squishTimer: 0 },
      // Purple Toad 2 on ground shrine
      { id: 'l3-t2', x: 1360, y: 480, width: 44, height: 24, springForce: 25, color: '#c084fc', isSquished: false, squishTimer: 0 },
      // Toad 3 for the final high jump on altar base
      { id: 'l3-t3', x: 2170, y: 460, width: 44, height: 24, springForce: 26, color: '#f43f5e', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l3-c1', x: 150, y: 320, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l3-c2', x: 500, y: 150, type: 'mango', collected: false, bobOffset: 120 },
      { id: 'l3-c3', x: 810, y: 220, type: 'banana', collected: false, bobOffset: 240 },
      { id: 'l3-c4', x: 1100, y: 70, type: 'star', collected: false, bobOffset: 60 },
      { id: 'l3-c5', x: 1350, y: 110, type: 'banana', collected: false, bobOffset: 180 },
      { id: 'l3-c6', x: 1700, y: 280, type: 'mango', collected: false, bobOffset: 300 },
      { id: 'l3-c7', x: 1960, y: 180, type: 'star', collected: false, bobOffset: 90 },
      { id: 'l3-c8', x: 2420, y: 240, type: 'banana', collected: false, bobOffset: 150 }
    ]
  },
  {
    id: 4,
    name: 'Clockwork Rapids',
    description: 'A sprint through rushing ruins. Reach the safety gate in 10 seconds while time-bonuses from bananas and stars keep you alive.',
    startX: 100,
    startY: 360,
    endX: 2250,
    endY: 260,
    timeLimit: 10,
    collectibleBonusSeconds: 2,
    platforms: [
      { id: 'l4-p1', x: 50, y: 410, width: 220, height: 40, type: 'moss_log' },
      { id: 'l4-p2', x: 320, y: 320, width: 150, height: 30, type: 'canopy_leaves' },
      { id: 'l4-p3', x: 520, y: 280, width: 190, height: 35, type: 'vine_bridge', moving: true, startX: 520, startY: 280, range: 190, speed: 2.4 },
      { id: 'l4-p4', x: 780, y: 360, width: 160, height: 35, type: 'canopy_leaves' },
      { id: 'l4-p5', x: 980, y: 420, width: 260, height: 40, type: 'moss_log' },
      { id: 'l4-p6', x: 1300, y: 300, width: 140, height: 30, type: 'vine_bridge', moving: true, startX: 1300, startY: 300, range: 170, speed: 1.8 },
      { id: 'l4-p7', x: 1520, y: 240, width: 180, height: 35, type: 'canopy_leaves' },
      { id: 'l4-p8', x: 1750, y: 380, width: 220, height: 40, type: 'jungle_brick' },
      { id: 'l4-p9', x: 1980, y: 320, width: 170, height: 35, type: 'canopy_leaves' },
      { id: 'l4-p10', x: 2140, y: 280, width: 160, height: 35, type: 'canopy_leaves' }
    ],
    toads: [
      { id: 'l4-t1', x: 640, y: 260, width: 44, height: 24, springForce: 19, color: '#38bdf8', isSquished: false, squishTimer: 0 },
      { id: 'l4-t2', x: 1470, y: 220, width: 44, height: 24, springForce: 22, color: '#f97316', isSquished: false, squishTimer: 0 },
      { id: 'l4-t3', x: 2060, y: 300, width: 44, height: 24, springForce: 21, color: '#7c3aed', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l4-c1', x: 180, y: 330, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l4-c2', x: 420, y: 230, type: 'banana', collected: false, bobOffset: 140 },
      { id: 'l4-c3', x: 860, y: 330, type: 'mango', collected: false, bobOffset: 85 },
      { id: 'l4-c4', x: 1180, y: 260, type: 'banana', collected: false, bobOffset: 220 },
      { id: 'l4-c5', x: 1710, y: 200, type: 'star', collected: false, bobOffset: 50 },
      { id: 'l4-c6', x: 1960, y: 260, type: 'banana', collected: false, bobOffset: 310 }
    ]
  }
];

export const INITIAL_SETTINGS = {
  gravity: 0.6,
  movementSpeed: 4.8,
  jumpForce: 12,
  toadBoingForce: 20,
  doubleJumpEnabled: true,
  soundVolume: 0.6,
  musicVolume: 0.3
};
