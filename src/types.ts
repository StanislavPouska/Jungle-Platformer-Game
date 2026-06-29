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

// Background art for a level. Presets reference the layered SVG sets already
// shipped in /public/assets; a per-level custom image (data URL) overrides them.
export type LevelBackgroundId = 'jungle' | 'night_raid';

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
  background?: LevelBackgroundId;   // preset art set (defaults to 'jungle')
  backgroundImage?: string;         // optional custom image (data URL) — overrides the preset
}

// --- Prologue: a stealth/crawling intro stage with its own simplified
// movement model (no gravity or jumping — the toddler Mowgli auto-climbs
// small steps between ground segments and hides from a patrolling tiger).

export interface StepPlatform {
  id: string;
  x: number;
  width: number;
  y: number; // ground surface the player/tiger walk on
  height: number; // visual thickness; also the max climbable step delta
}

export interface HidingSpot {
  id: string;
  x: number;
  y: number; // matches the surface y of the platform it sits on
  width: number;
  height: number;
  kind: 'cave' | 'leaf_shadow' | 'goal_cave';
}

export interface PrologueLevel {
  name: string;
  description: string;
  startX: number;
  levelMinX: number;
  levelMaxX: number;
  platforms: StepPlatform[];
  hidingSpots: HidingSpot[];
  goalSpotId: string;
  tigerStartX: number;
  tigerSpeed: number;
}

// --- Fighter minigame: a config-driven 1v1 arena fight. A level (or a
// standalone stage like the Epilogue) supplies the opponent's visuals,
// HP, damage, and parry chance; Mowgli's stats default to 100 HP / 20 dmg.

export type FighterSpriteId = 'mowgli_torch' | 'shere_khan';
export type FightBackgroundId = 'village';

export interface FighterConfig {
  sprite: FighterSpriteId;
  maxHp: number;
  damage: number;       // HP removed per landed hit
  parryChance: number;  // 0..1 probability of auto-parrying an incoming hit (AI/opponent)
}

export interface FightConfig {
  name: string;
  description: string;
  background: FightBackgroundId;
  player: FighterConfig;   // Mowgli — defaults 100 HP / 20 dmg
  opponent: FighterConfig; // input: visuals + HP + damage + parry chance
  restartOnLose: boolean;  // Epilogue: retreat + speech bubble, then restart the fight
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
