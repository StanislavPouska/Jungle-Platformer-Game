/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  isGrounded: boolean;
  isCrouching: boolean;
  facing: 'left' | 'right';
  animFrame: number;
  animTimer: number;
  state: 'idle' | 'running' | 'jumping' | 'falling' | 'wallclimbing';
  doubleJumpAvailable: boolean;
  coyoteTime: number; // For responsive jumping just off a ledge
  jumpBuffer: number;  // Registers early jump input
}

export interface Platform {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'moss_log' | 'jungle_brick' | 'vine_bridge' | 'canopy_leaves';
  moving?: boolean;
  startX?: number;
  startY?: number;
  range?: number;
  speed?: number;
}

export interface Toad {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  springForce: number;
  color: string;
  isSquished: boolean;
  squishTimer: number;
}

export interface Collectible {
  id: string;
  x: number;
  y: number;
  type: 'banana' | 'mango' | 'star';
  collected: boolean;
  bobOffset: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'leaf' | 'sparkle' | 'dust' | 'splash';
}

export interface PuzzleQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
}

export interface PuzzleGate {
  triggerX: number; // invisible wall x-position blocking progress until solved
  title: string;
  intro: string;
  questions: PuzzleQuestion[];
}

export interface Level {
  id: number;
  name: string;
  description: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  platforms: Platform[];
  toads: Toad[];
  collectibles: Collectible[];
  timeLimit?: number; // seconds for timed levels
  collectibleBonusSeconds?: number; // default extra seconds per collectible on timed levels
  puzzle?: PuzzleGate;
}

export interface GameSettings {
  gravity: number;
  movementSpeed: number;
  jumpForce: number;
  toadBoingForce: number;
  doubleJumpEnabled: boolean;
  soundVolume: number;
  musicVolume: number;
}

export interface GameStats {
  score: number;
  bananasCollected: number;
  deaths: number;
  timeElapsed: number;
  currentLevel: number;
  gameState: 'start_screen' | 'playing' | 'paused' | 'level_completed' | 'game_over' | 'victory_screen';
}
