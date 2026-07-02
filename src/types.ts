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

// The story chapter a mission belongs to — drives the title card shown when
// the player crosses into a new chapter.
export type ChapterId = 'prologue' | 'ch1' | 'ch2' | 'epilogue';

// Background art for a mission. Presets reference the layered SVG sets already
// shipped in /public/assets; a per-mission custom image (data URL) overrides them.
export type LevelBackgroundId = 'jungle' | 'night_raid';

// --- Stealth-mission building blocks: a crawling stage with its own
// simplified movement model (no gravity or jumping — the toddler Mowgli
// auto-climbs small steps between ground segments and hides from a
// patrolling tiger).

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

// --- Fight library: a config-driven 1v1 arena duel. A FightDef supplies both
// fighters' visuals, HP, damage, and parry chance; missions launch one via a
// placed trigger.

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
  restartOnLose: boolean;  // true: retreat + speech bubble, then restart the fight
                           // false: losing costs a death and restarts the mission
}

/** A fight in the shared library, referenced from missions by id. */
export interface FightDef extends FightConfig {
  id: string;
}

// --- Quiz library: a multiple-choice riddle gate. Referenced from missions by
// id; the player must answer every question correctly to pass the trigger.

export interface PuzzleQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
}

export interface QuizDef {
  id: string;
  title: string;
  intro: string;
  questions: PuzzleQuestion[];
}

// --- Missions: every campaign stage is a Mission of one of two types. Fights
// and quizzes are launched from TriggerPlacements — invisible vertical lines
// the player cannot cross until the referenced object is beaten/solved.

export type MissionType = 'platformer' | 'stealth';

export interface TriggerPlacement {
  id: string;                 // unique within the mission, e.g. 'm10-tr1'
  kind: 'fight' | 'quiz';
  refId: string;              // id into the fights/quizzes library
  triggerX: number;           // world x of the invisible wall / launch line
  chapterCard?: ChapterId;    // optionally show a chapter title card before launching
}

interface MissionBase {
  id: number;
  name: string;
  description: string;
  chapter: ChapterId;         // stored, not derived — survives reordering/insertion
  triggers: TriggerPlacement[];
  background?: LevelBackgroundId;   // preset art set (defaults per type)
  backgroundImage?: string;         // optional custom image (data URL) — overrides the preset
}

export interface PlatformerMission extends MissionBase {
  type: 'platformer';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  platforms: Platform[];
  toads: Toad[];
  collectibles: Collectible[];
  timeLimit?: number; // seconds for timed missions
  collectibleBonusSeconds?: number; // default extra seconds per collectible on timed missions
}

export interface StealthMission extends MissionBase {
  type: 'stealth';
  startX: number;
  levelMinX: number;
  levelMaxX: number;
  platforms: StepPlatform[];
  hidingSpots: HidingSpot[];
  goalSpotId: string;
  tigerStartX: number;
  tigerSpeed: number;
}

export type Mission = PlatformerMission | StealthMission;

/** Everything the editor authors and the game plays: the whole campaign. */
export interface WorldData {
  missions: Mission[];
  fights: FightDef[];
  quizzes: QuizDef[];
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
  currentLevel: number; // index into WorldData.missions (name kept for save compatibility)
  gameState: 'start_screen' | 'playing' | 'paused' | 'level_completed' | 'game_over' | 'victory_screen';
}
