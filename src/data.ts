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
      { id: 'l1-p9', x: 1420, y: 200, width: 220, height: 35, type: 'canopy_leaves' },
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
      { id: 'l4-p10', x: 2140, y: 280, width: 160, height: 40, type: 'jungle_brick' }
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
  },
  {
    id: 5,
    name: 'Elephant Patrol Path',
    description: 'March along the old elephant trail before the clock runs out! Grab fruit on the way to keep your time bank topped up.',
    startX: 100,
    startY: 350,
    endX: 2000,
    endY: 280,
    timeLimit: 12,
    collectibleBonusSeconds: 2,
    platforms: [
      { id: 'l5-p1', x: 50, y: 410, width: 220, height: 40, type: 'moss_log' },
      { id: 'l5-p2', x: 330, y: 340, width: 160, height: 35, type: 'canopy_leaves' },
      { id: 'l5-p3', x: 560, y: 410, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l5-p4', x: 820, y: 320, width: 150, height: 35, type: 'vine_bridge', moving: true, startX: 820, startY: 320, range: 150, speed: 2.2 },
      { id: 'l5-p5', x: 1080, y: 380, width: 200, height: 40, type: 'moss_log' },
      { id: 'l5-p6', x: 1340, y: 300, width: 150, height: 35, type: 'canopy_leaves' },
      { id: 'l5-p7', x: 1600, y: 360, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l5-p8', x: 1860, y: 280, width: 220, height: 40, type: 'moss_log' }
    ],
    toads: [
      { id: 'l5-t1', x: 650, y: 390, width: 44, height: 24, springForce: 16, color: '#a3e635', isSquished: false, squishTimer: 0 },
      { id: 'l5-t2', x: 1750, y: 340, width: 44, height: 24, springForce: 18, color: '#38bdf8', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l5-c1', x: 180, y: 330, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l5-c2', x: 400, y: 260, type: 'banana', collected: false, bobOffset: 100 },
      { id: 'l5-c3', x: 900, y: 250, type: 'mango', collected: false, bobOffset: 50 },
      { id: 'l5-c4', x: 1380, y: 220, type: 'star', collected: false, bobOffset: 150 },
      { id: 'l5-c5', x: 1650, y: 280, type: 'banana', collected: false, bobOffset: 200 },
      { id: 'l5-c6', x: 1950, y: 230, type: 'banana', collected: false, bobOffset: 80 }
    ]
  },
  {
    id: 6,
    name: "Kaa's Hypnotic Hollow",
    description: 'A swaying cave of vines and hidden coils. Keep moving before the hypnotic mist catches up with the clock!',
    startX: 100,
    startY: 320,
    endX: 2100,
    endY: 260,
    timeLimit: 14,
    collectibleBonusSeconds: 2,
    platforms: [
      { id: 'l6-p1', x: 50, y: 400, width: 200, height: 40, type: 'moss_log' },
      { id: 'l6-p2', x: 320, y: 330, width: 150, height: 30, type: 'canopy_leaves', moving: true, startX: 320, startY: 280, range: 90, speed: 1.6 },
      { id: 'l6-p3', x: 560, y: 420, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l6-p4', x: 800, y: 320, width: 150, height: 30, type: 'vine_bridge', moving: true, startX: 800, startY: 320, range: 170, speed: 2.6 },
      { id: 'l6-p5', x: 1080, y: 400, width: 200, height: 40, type: 'moss_log' },
      { id: 'l6-p6', x: 1340, y: 300, width: 150, height: 35, type: 'canopy_leaves' },
      { id: 'l6-p7', x: 1600, y: 380, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l6-p8', x: 1860, y: 300, width: 160, height: 35, type: 'canopy_leaves' },
      { id: 'l6-p9', x: 2080, y: 280, width: 220, height: 40, type: 'moss_log' }
    ],
    toads: [
      { id: 'l6-t1', x: 1700, y: 360, width: 44, height: 24, springForce: 19, color: '#14b8a6', isSquished: false, squishTimer: 0 },
      { id: 'l6-t2', x: 1950, y: 360, width: 44, height: 24, springForce: 18, color: '#22c55e', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l6-c1', x: 180, y: 340, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l6-c2', x: 420, y: 230, type: 'mango', collected: false, bobOffset: 90 },
      { id: 'l6-c3', x: 860, y: 260, type: 'banana', collected: false, bobOffset: 170 },
      { id: 'l6-c4', x: 1150, y: 230, type: 'star', collected: false, bobOffset: 40 },
      { id: 'l6-c5', x: 1420, y: 210, type: 'banana', collected: false, bobOffset: 260 },
      { id: 'l6-c6', x: 1980, y: 220, type: 'mango', collected: false, bobOffset: 120 }
    ]
  },
  {
    id: 7,
    name: 'Bandar-Log Temple Riddle',
    description: "Stone monkey idols guard the ruined temple gate. Only someone who truly knows Mowgli's story can answer the riddle and pass.",
    startX: 100,
    startY: 340,
    endX: 1950,
    endY: 280,
    timeLimit: 16,
    collectibleBonusSeconds: 2,
    platforms: [
      { id: 'l7-p1', x: 50, y: 410, width: 200, height: 40, type: 'jungle_brick' },
      { id: 'l7-p2', x: 310, y: 330, width: 150, height: 30, type: 'canopy_leaves' },
      { id: 'l7-p3', x: 560, y: 400, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l7-p4', x: 800, y: 320, width: 150, height: 30, type: 'vine_bridge', moving: true, startX: 800, startY: 320, range: 150, speed: 2.3 },
      { id: 'l7-p5', x: 1050, y: 380, width: 200, height: 40, type: 'jungle_brick' },
      { id: 'l7-p6', x: 1320, y: 300, width: 160, height: 35, type: 'canopy_leaves' },
      { id: 'l7-p7', x: 1580, y: 380, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l7-p8', x: 1830, y: 280, width: 220, height: 40, type: 'jungle_brick' }
    ],
    toads: [
      { id: 'l7-t1', x: 1450, y: 360, width: 44, height: 24, springForce: 18, color: '#f59e0b', isSquished: false, squishTimer: 0 },
      { id: 'l7-t2', x: 1700, y: 360, width: 44, height: 24, springForce: 19, color: '#fb923c', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l7-c1', x: 180, y: 330, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l7-c2', x: 420, y: 260, type: 'mango', collected: false, bobOffset: 80 },
      { id: 'l7-c3', x: 1120, y: 310, type: 'banana', collected: false, bobOffset: 150 },
      { id: 'l7-c4', x: 1380, y: 230, type: 'star', collected: false, bobOffset: 60 },
      { id: 'l7-c5', x: 1620, y: 310, type: 'banana', collected: false, bobOffset: 200 },
      { id: 'l7-c6', x: 1900, y: 230, type: 'mango', collected: false, bobOffset: 100 }
    ],
    puzzle: {
      triggerX: 1010,
      title: 'The Bandar-Log Riddle Gate',
      intro: "Ancient stone monkeys block the path forward. They will only move aside for someone who truly knows Mowgli's tale — answer all three correctly to pass!",
      questions: [
        {
          question: 'Who is the wise black panther who finds baby Mowgli and brings him to the wolf pack?',
          choices: ['Baloo', 'Bagheera', 'Kaa', 'Akela'],
          correctIndex: 1
        },
        {
          question: "Which laid-back bear teaches Mowgli about \"The Bare Necessities\"?",
          choices: ['Baloo', 'Shere Khan', 'Colonel Hathi', 'Bagheera'],
          correctIndex: 0
        },
        {
          question: 'Which tiger wants to hunt Mowgli because he fears and hates Man?',
          choices: ['Kaa', 'King Louie', 'Shere Khan', 'Akela'],
          correctIndex: 2
        }
      ]
    }
  },
  {
    id: 8,
    name: "Shere Khan's Scorched Trail",
    description: 'The dry season jungle crackles underfoot. Stay fast and light-footed — lingering here is never safe.',
    startX: 100,
    startY: 350,
    endX: 2150,
    endY: 270,
    timeLimit: 17,
    collectibleBonusSeconds: 2,
    platforms: [
      { id: 'l8-p1', x: 50, y: 410, width: 200, height: 40, type: 'moss_log' },
      { id: 'l8-p2', x: 300, y: 330, width: 150, height: 30, type: 'vine_bridge', moving: true, startX: 300, startY: 330, range: 140, speed: 2.6 },
      { id: 'l8-p3', x: 560, y: 400, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l8-p4', x: 800, y: 310, width: 150, height: 30, type: 'canopy_leaves', moving: true, startX: 800, startY: 260, range: 100, speed: 1.9 },
      { id: 'l8-p5', x: 1050, y: 390, width: 200, height: 40, type: 'jungle_brick' },
      { id: 'l8-p6', x: 1320, y: 300, width: 150, height: 35, type: 'canopy_leaves' },
      { id: 'l8-p7', x: 1580, y: 370, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l8-p8', x: 1840, y: 290, width: 160, height: 35, type: 'canopy_leaves' },
      { id: 'l8-p9', x: 2050, y: 270, width: 220, height: 40, type: 'jungle_brick' }
    ],
    toads: [
      { id: 'l8-t1', x: 1230, y: 370, width: 44, height: 24, springForce: 20, color: '#ef4444', isSquished: false, squishTimer: 0 },
      { id: 'l8-t2', x: 1740, y: 350, width: 44, height: 24, springForce: 21, color: '#f97316', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l8-c1', x: 180, y: 330, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l8-c2', x: 460, y: 260, type: 'mango', collected: false, bobOffset: 90 },
      { id: 'l8-c3', x: 900, y: 230, type: 'star', collected: false, bobOffset: 40 },
      { id: 'l8-c4', x: 1380, y: 220, type: 'banana', collected: false, bobOffset: 160 },
      { id: 'l8-c5', x: 1650, y: 290, type: 'banana', collected: false, bobOffset: 210 },
      { id: 'l8-c6', x: 1980, y: 220, type: 'mango', collected: false, bobOffset: 70 }
    ]
  },
  {
    id: 9,
    name: 'Monsoon Falls Sprint',
    description: 'Rain hammers the canopy and the rivers rise fast. Cross the swinging vine bridges before the falls catch up!',
    startX: 100,
    startY: 340,
    endX: 2200,
    endY: 260,
    timeLimit: 20,
    collectibleBonusSeconds: 3,
    platforms: [
      { id: 'l9-p1', x: 50, y: 410, width: 220, height: 40, type: 'moss_log' },
      { id: 'l9-p1b', x: 290, y: 400, width: 120, height: 35, type: 'canopy_leaves' },
      { id: 'l9-p2', x: 460, y: 320, width: 170, height: 30, type: 'vine_bridge', moving: true, startX: 460, startY: 320, range: 90, speed: 2.0 },
      { id: 'l9-p3', x: 520, y: 380, width: 230, height: 35, type: 'canopy_leaves' },
      { id: 'l9-p4', x: 770, y: 320, width: 200, height: 30, type: 'vine_bridge' },
      { id: 'l9-p5', x: 1080, y: 390, width: 200, height: 40, type: 'jungle_brick' },
      { id: 'l9-p6', x: 1340, y: 300, width: 150, height: 35, type: 'canopy_leaves' },
      { id: 'l9-p7', x: 1600, y: 370, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l9-p8', x: 1860, y: 290, width: 160, height: 35, type: 'canopy_leaves', moving: true, startX: 1860, startY: 250, range: 80, speed: 2.0 },
      { id: 'l9-p9', x: 2090, y: 260, width: 220, height: 40, type: 'moss_log' }
    ],
    toads: [
      { id: 'l9-t1', x: 1230, y: 370, width: 44, height: 24, springForce: 15, color: '#22d3ee', isSquished: false, squishTimer: 0 },
      { id: 'l9-t2', x: 1740, y: 350, width: 44, height: 24, springForce: 20, color: '#3b82f6', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l9-c1', x: 180, y: 320, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l9-c2', x: 430, y: 240, type: 'mango', collected: false, bobOffset: 70 },
      { id: 'l9-c3', x: 920, y: 230, type: 'banana', collected: false, bobOffset: 140 },
      { id: 'l9-c4', x: 1180, y: 220, type: 'star', collected: false, bobOffset: 50 },
      { id: 'l9-c5', x: 1700, y: 280, type: 'banana', collected: false, bobOffset: 190 },
      { id: 'l9-c6', x: 2020, y: 210, type: 'mango', collected: false, bobOffset: 110 }
    ]
  },
  {
    id: 10,
    name: 'Man-Village Homecoming',
    description: "The final stretch! Race through the last ruins toward the lights of the man-village before time runs out. Mowgli's journey ends here.",
    startX: 100,
    startY: 340,
    endX: 2400,
    endY: 260,
    timeLimit: 20,
    collectibleBonusSeconds: 3,
    platforms: [
      { id: 'l10-p1', x: 50, y: 410, width: 200, height: 40, type: 'moss_log' },
      { id: 'l10-p2', x: 300, y: 320, width: 150, height: 30, type: 'canopy_leaves' },
      { id: 'l10-p3', x: 550, y: 390, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l10-p4', x: 800, y: 300, width: 150, height: 30, type: 'vine_bridge', moving: true, startX: 800, startY: 300, range: 160, speed: 2.6 },
      { id: 'l10-p5', x: 1060, y: 380, width: 200, height: 40, type: 'jungle_brick' },
      { id: 'l10-p6', x: 1330, y: 290, width: 150, height: 35, type: 'canopy_leaves', moving: true, startX: 1330, startY: 250, range: 90, speed: 2.0 },
      { id: 'l10-p7', x: 1590, y: 370, width: 180, height: 40, type: 'jungle_brick' },
      { id: 'l10-p8', x: 1850, y: 290, width: 160, height: 35, type: 'canopy_leaves' },
      { id: 'l10-p9', x: 2090, y: 360, width: 200, height: 40, type: 'jungle_brick' },
      { id: 'l10-p10', x: 2330, y: 280, width: 250, height: 40, type: 'moss_log' }
    ],
    toads: [
      { id: 'l10-t1', x: 1240, y: 360, width: 44, height: 24, springForce: 21, color: '#facc15', isSquished: false, squishTimer: 0 },
      { id: 'l10-t2', x: 1760, y: 350, width: 44, height: 24, springForce: 22, color: '#4ade80', isSquished: false, squishTimer: 0 },
      { id: 'l10-t3', x: 2200, y: 340, width: 44, height: 24, springForce: 20, color: '#ec4899', isSquished: false, squishTimer: 0 }
    ],
    collectibles: [
      { id: 'l10-c1', x: 180, y: 320, type: 'banana', collected: false, bobOffset: 0 },
      { id: 'l10-c2', x: 420, y: 230, type: 'mango', collected: false, bobOffset: 80 },
      { id: 'l10-c3', x: 900, y: 220, type: 'star', collected: false, bobOffset: 150 },
      { id: 'l10-c4', x: 1180, y: 210, type: 'banana', collected: false, bobOffset: 40 },
      { id: 'l10-c5', x: 1450, y: 200, type: 'mango', collected: false, bobOffset: 220 },
      { id: 'l10-c6', x: 1700, y: 280, type: 'banana', collected: false, bobOffset: 100 },
      { id: 'l10-c7', x: 1980, y: 260, type: 'star', collected: false, bobOffset: 180 },
      { id: 'l10-c8', x: 2350, y: 230, type: 'banana', collected: false, bobOffset: 60 }
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
