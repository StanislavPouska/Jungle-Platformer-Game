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
  spriteId?: string;    // custom sprite rendering override (placed from the sprite palette)
  extendDown?: boolean; // visually extend to the bottom of the screen (grounded look);
                        // unset = the historical default: non-moving logs/bricks extend
  extendLeft?: boolean;  // visually extend to the level's left screen bound (x = 0)
  extendRight?: boolean; // visually extend to the level's right screen bound (endX + 350)
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
export type LevelBackgroundId = 'jungle' | 'night_raid' | 'deep_jungle';

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
  extendDown?: boolean;  // fill down to the bottom of the screen (default: a short 60px skirt)
  extendLeft?: boolean;  // fill to the level's left screen bound (x = 0)
  extendRight?: boolean; // fill to the level's right screen bound (levelMaxX + 200)
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
// A gate doesn't own its questions — when it opens, `questionCount` random
// questions are drawn from the shared question pool, filtered to the chapter
// of the mission the gate sits in.

/**
 * One question in the shared background pool. `chapter` restricts where it can
 * be drawn — a gate only picks questions matching its mission's story chapter.
 * `cs` holds the Czech variant (choices align by index; correctIndex is
 * shared); any empty string falls back to the English text at play time.
 */
export interface PoolQuestion {
  id: string;
  chapter: ChapterId;
  question: string;
  choices: string[];
  correctIndex: number;
  cs?: { question: string; choices: string[] };
}

/** Czech text variant of a quiz gate's framing text. */
export interface QuizTextCS {
  title: string;
  intro: string;
}

export interface QuizDef {
  id: string;
  title: string;
  intro: string;
  questionCount: number; // how many pool questions the gate asks
  cs?: QuizTextCS;       // Czech version — shown when the menu language is Czech
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

// Which sprite-library group a mission renders with. 'night' makes every
// sprite lookup prefer the darkened night variant (id `night_<baseId>`),
// falling back to the day sprite when no night variant has frames.
export type SpriteSet = 'day' | 'night';

interface MissionBase {
  id: number;
  name: string;
  description: string;
  chapter: ChapterId;         // stored, not derived — survives reordering/insertion
  triggers: TriggerPlacement[];
  background?: LevelBackgroundId;   // preset art set (defaults per type)
  backgroundImage?: string;         // optional custom image (data URL) — overrides the preset
  spriteSet?: SpriteSet;            // sprite group used for rendering (default 'day')
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

// --- Sprite library: the graphical building blocks of the game. Every entity
// the canvases draw looks its sprite up by a well-known id; a sprite with
// uploaded frames replaces the built-in procedural art (empty frames = the
// original hand-drawn canvas art). Custom block sprites are placeable in
// missions as platforms.

export type SpriteKind = 'block' | 'character';

/** Id prefix marking a sprite as the night variant of `<baseId>`. */
export const NIGHT_SPRITE_PREFIX = 'night_';

export interface SpriteDef {
  id: string;
  name: string;
  kind: SpriteKind;
  width: number;         // render / default placement size in world px
  height: number;
  frames: string[];      // uploaded images (data URLs); 2+ on a character = move animation
  frameDuration: number; // ms per animation frame
}

/** Everything the editor authors and the game plays: the whole campaign. */
export interface WorldData {
  missions: Mission[];
  fights: FightDef[];
  quizzes: QuizDef[];
  questionPool: PoolQuestion[];
  sprites: SpriteDef[];
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
