/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { FightConfig, FighterSpriteId } from '../types';
import { audioSynth } from '../audio';
import { Landmark, Swords, Play } from 'lucide-react';
import { Lang, UI } from '../i18n';

// --- Arena geometry (fixed single screen, no scroll). Mowgli ~1/3 of the
// 420px canvas height. ---
const GROUND_Y = 366;
const MOVE_SPEED = 2.7;
const AI_SPEED = 2.2;
const FLEE_SPEED = 3.6;
const REACH = 138;      // max center-to-center distance for a hit to land
const MIN_SEP = 66;     // fighters cannot overlap closer than this
const ARENA_MARGIN = 44;

// Attack state-machine durations (ms). The windup is the telegraph "stance"
// that widens the defender's parry window before the strike extends.
const WINDUP_MS = 200;
const STRIKE_MS = 130;
const RECOVER_MS = 220;
const HURT_FLASH_MS = 170;
const LOSE_BUBBLE_MS = 15000;

type AttackPhase = 'none' | 'windup' | 'strike' | 'recover';
type FightPhase = 'intro' | 'fighting' | 'player_win' | 'player_lose';

interface FighterState {
  x: number;
  hp: number;
  maxHp: number;
  damage: number;
  parryChance: number;
  sprite: FighterSpriteId;
  facing: 1 | -1;
  attackPhase: AttackPhase;
  attackTimer: number;
  struck: boolean;
  parrying: boolean;
  hurtFlash: number;
  blockFlash: number;
  aiCd: number;
}

interface FireParticle {
  x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number;
}

interface PrologueCanvasProps {
  fight: FightConfig;
  language: Lang;
  onComplete: () => void;
  paused: boolean;
  onTogglePause: () => void;
}

const makeFighter = (sprite: FighterSpriteId, maxHp: number, damage: number, parryChance: number, x: number, facing: 1 | -1): FighterState => ({
  x, hp: maxHp, maxHp, damage, parryChance, sprite, facing,
  attackPhase: 'none', attackTimer: 0, struck: false, parrying: false,
  hurtFlash: 0, blockFlash: 0, aiCd: 900,
});

export default function FighterCanvas({
  fight,
  language,
  onComplete,
  paused,
  onTogglePause,
}: PrologueCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const t = UI[language];

  const [controlsPrompt, setControlsPrompt] = useState(true);
  const [won, setWon] = useState(false);

  const nameFor = (sprite: FighterSpriteId) => (sprite === 'shere_khan' ? t.fighterShereKhan : t.fighterMowgli);

  const stateRef = useRef({
    player: makeFighter(fight.player.sprite, fight.player.maxHp, fight.player.damage, fight.player.parryChance, -60, 1),
    opponent: makeFighter(fight.opponent.sprite, fight.opponent.maxHp, fight.opponent.damage, fight.opponent.parryChance, 2000, -1),
    phase: 'intro' as FightPhase,
    loseTimer: 0,
    particles: [] as FireParticle[],
    keys: {} as { [key: string]: boolean },
    tick: 0,
    frameId: 0,
  });

  const resetFight = (canvasWidth: number) => {
    const s = stateRef.current;
    s.player = makeFighter(fight.player.sprite, fight.player.maxHp, fight.player.damage, fight.player.parryChance, -60, 1);
    s.opponent = makeFighter(fight.opponent.sprite, fight.opponent.maxHp, fight.opponent.damage, fight.opponent.parryChance, canvasWidth + 60, -1);
    s.phase = 'intro';
    s.loseTimer = 0;
    s.particles = [];
    s.keys = {};
    setWon(false);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resetFight(canvas.clientWidth || 800);
    audioSynth.startJungleMusic();
  }, [fight]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === ' ') e.preventDefault();
      stateRef.current.keys[e.key.toLowerCase()] = true;
      stateRef.current.keys[e.key] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      stateRef.current.keys[e.key.toLowerCase()] = false;
      stateRef.current.keys[e.key] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = 420;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastStamp = performance.now();
    let wasAttackPressed = false;

    const loop = (timestamp: number) => {
      if (paused || won) return;
      const s = stateRef.current;
      const dt = Math.min(48, timestamp - lastStamp);
      lastStamp = timestamp;
      s.tick += 1;

      const p = s.player;
      const o = s.opponent;
      const W = canvas.width;

      // Always face toward the other fighter
      p.facing = p.x <= o.x ? 1 : -1;
      o.facing = o.x < p.x ? 1 : -1;

      if (s.phase === 'intro') {
        const pTarget = W * 0.34;
        const oTarget = W * 0.66;
        p.x += Math.sign(pTarget - p.x) * Math.min(MOVE_SPEED, Math.abs(pTarget - p.x));
        o.x += Math.sign(oTarget - o.x) * Math.min(AI_SPEED, Math.abs(oTarget - o.x));
        if (Math.abs(p.x - pTarget) < 3 && Math.abs(o.x - oTarget) < 3) {
          s.phase = 'fighting';
        }
      } else if (s.phase === 'fighting') {
        // --- Player input ---
        const leftHeld = !!(s.keys['a'] || s.keys['arrowleft']);
        const rightHeld = !!(s.keys['d'] || s.keys['arrowright']);
        const attackHeld = !!(s.keys['arrowup'] || s.keys['w'] || s.keys[' ']);
        const parryHeld = !!(s.keys['arrowdown'] || s.keys['s']);

        p.parrying = parryHeld && p.attackPhase === 'none';
        if (attackHeld && !wasAttackPressed && p.attackPhase === 'none') {
          p.attackPhase = 'windup';
          p.attackTimer = 0;
          p.parrying = false;
          audioSynth.playJump();
        }
        wasAttackPressed = attackHeld;

        if (p.attackPhase === 'none' || p.attackPhase === 'windup') {
          let vx = 0;
          if (leftHeld) vx -= 1;
          if (rightHeld) vx += 1;
          p.x += vx * MOVE_SPEED;
        }

        // --- Opponent AI ---
        o.parrying = false;
        const dist = Math.abs(p.x - o.x);
        if (o.attackPhase === 'none') {
          o.aiCd -= dt;
          if (dist > REACH * 0.82) {
            o.x += Math.sign(p.x - o.x) * AI_SPEED;
          } else if (o.aiCd <= 0) {
            o.attackPhase = 'windup';
            o.attackTimer = 0;
            audioSynth.playJump();
            o.aiCd = 850 + Math.random() * 700;
          }
        }

        advanceAttack(p, o, true, dt, s);
        advanceAttack(o, p, false, dt, s);

        // Separation + arena clamps
        if (Math.abs(p.x - o.x) < MIN_SEP) {
          if (p.x <= o.x) { p.x = o.x - MIN_SEP; } else { p.x = o.x + MIN_SEP; }
        }
        p.x = Math.max(ARENA_MARGIN, Math.min(W - ARENA_MARGIN, p.x));
        o.x = Math.max(ARENA_MARGIN, Math.min(W - ARENA_MARGIN, o.x));

        // KO checks
        if (o.hp <= 0) {
          s.phase = 'player_win';
          o.attackPhase = 'none';
          audioSynth.playDeathSound();
        } else if (p.hp <= 0) {
          s.phase = 'player_lose';
          p.attackPhase = 'none';
          s.loseTimer = 0;
          audioSynth.playDeathSound();
        }
      } else if (s.phase === 'player_win') {
        // Shere Khan flees right with his tail on fire
        o.facing = 1;
        o.x += FLEE_SPEED;
        spawnTailFire(s, o);
        if (o.x > W + 90) {
          audioSynth.playLevelSuccess();
          setWon(true);
        }
      } else if (s.phase === 'player_lose') {
        // Mowgli retreats into the gate; speech bubble for 15s, then restart
        p.facing = -1;
        if (p.x > 46) p.x -= FLEE_SPEED;
        s.loseTimer += dt;
        if (s.loseTimer >= LOSE_BUBBLE_MS) {
          resetFight(W);
        }
      }

      // Decay flashes
      [p, o].forEach((f) => {
        if (f.hurtFlash > 0) f.hurtFlash = Math.max(0, f.hurtFlash - dt);
        if (f.blockFlash > 0) f.blockFlash = Math.max(0, f.blockFlash - dt);
      });

      // Update fire particles
      s.particles = s.particles.filter((part) => {
        part.life += dt;
        part.x += part.vx;
        part.y += part.vy;
        part.vy -= 0.05;
        return part.life < part.maxLife;
      });

      drawScene(ctx, canvas, s);
      s.frameId = requestAnimationFrame(loop);
    };

    stateRef.current.frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [fight, paused, won]);

  // Advance an attacker's state machine; resolve a single hit on strike entry.
  const advanceAttack = (self: FighterState, other: FighterState, selfIsPlayer: boolean, dt: number, s: typeof stateRef.current) => {
    if (self.attackPhase === 'windup') {
      self.attackTimer += dt;
      if (self.attackTimer >= WINDUP_MS) { self.attackPhase = 'strike'; self.attackTimer = 0; self.struck = false; }
    } else if (self.attackPhase === 'strike') {
      if (!self.struck) {
        self.struck = true;
        if (Math.abs(self.x - other.x) <= REACH) {
          const blocked = selfIsPlayer ? Math.random() < other.parryChance : other.parrying;
          const dmg = self.damage * (blocked ? 0.2 : 1);
          other.hp = Math.max(0, other.hp - dmg);
          other.hurtFlash = HURT_FLASH_MS;
          if (blocked) { other.blockFlash = HURT_FLASH_MS; audioSynth.playWrongAnswer(); }
          else { audioSynth.playToadBoing(); }
        }
      }
      self.attackTimer += dt;
      if (self.attackTimer >= STRIKE_MS) { self.attackPhase = 'recover'; self.attackTimer = 0; }
    } else if (self.attackPhase === 'recover') {
      self.attackTimer += dt;
      if (self.attackTimer >= RECOVER_MS) { self.attackPhase = 'none'; self.attackTimer = 0; }
    }
  };

  const spawnTailFire = (s: typeof stateRef.current, o: FighterState) => {
    const tailX = o.x - 78 * o.facing;
    const tailY = GROUND_Y - 58;
    for (let i = 0; i < 2; i++) {
      s.particles.push({
        x: tailX + (Math.random() - 0.5) * 8,
        y: tailY + (Math.random() - 0.5) * 8,
        vx: -o.facing * (0.4 + Math.random()),
        vy: -0.6 - Math.random() * 0.8,
        life: 0,
        maxLife: 320 + Math.random() * 200,
        size: 4 + Math.random() * 5,
      });
    }
  };

  // Forward-extension amount for the attacking limb: negative during windup
  // (pull-back telegraph), ramps to +1 on strike, eases back on recover.
  const extensionOf = (f: FighterState) => {
    if (f.attackPhase === 'windup') return -0.4 * (f.attackTimer / WINDUP_MS);
    if (f.attackPhase === 'strike') return Math.min(1, f.attackTimer / (STRIKE_MS * 0.4));
    if (f.attackPhase === 'recover') return Math.max(0, 1 - f.attackTimer / RECOVER_MS);
    return 0;
  };

  const drawScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, s: typeof stateRef.current) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawVillageBackground(ctx, canvas, s.tick);

    // Ground
    ctx.fillStyle = '#3b2a1a';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.fillStyle = '#574027';
    ctx.fillRect(0, GROUND_Y, canvas.width, 6);

    // Fighters (draw the rear one first by x for slight depth)
    const order = s.player.x <= s.opponent.x ? [s.player, s.opponent] : [s.opponent, s.player];
    order.forEach((f) => drawFighter(ctx, f, s));

    // Fire particles (tail on fire)
    s.particles.forEach((part) => {
      const lifeFrac = 1 - part.life / part.maxLife;
      ctx.fillStyle = `rgba(${250}, ${120 + Math.floor(lifeFrac * 100)}, ${30}, ${lifeFrac})`;
      ctx.beginPath();
      ctx.arc(part.x, part.y, part.size * lifeFrac, 0, Math.PI * 2);
      ctx.fill();
    });

    drawHud(ctx, canvas, s);

    // Lose speech bubble over Mowgli's head
    if (s.phase === 'player_lose') {
      drawSpeechBubble(ctx, s.player.x, GROUND_Y - 150, t.fighterLoseBubble);
    }
  };

  const drawVillageBackground = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, tick: number) => {
    // Dusk sky
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
    sky.addColorStop(0, '#2a1a3a');
    sky.addColorStop(0.55, '#6d3b2e');
    sky.addColorStop(1, '#b9603a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, GROUND_Y);

    // House roof tops peeking above the fence
    ctx.fillStyle = '#5b3a24';
    for (let i = 0; i < Math.ceil(canvas.width / 150) + 1; i++) {
      const hx = i * 150 + 30;
      ctx.beginPath();
      ctx.moveTo(hx - 46, GROUND_Y - 150);
      ctx.lineTo(hx, GROUND_Y - 196);
      ctx.lineTo(hx + 46, GROUND_Y - 150);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#7a4a2d';
      ctx.fillRect(hx - 5, GROUND_Y - 188, 10, 14); // roof ridge cap
      ctx.fillStyle = '#5b3a24';
    }

    // Branch fence (woven vertical branches) with a gate gap on the left
    const fenceTop = GROUND_Y - 150;
    const gateLeft = 24;
    const gateRight = 110;
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 7;
    for (let bx = 8; bx < canvas.width; bx += 16) {
      if (bx > gateLeft - 8 && bx < gateRight) continue; // open gate gap
      ctx.beginPath();
      ctx.moveTo(bx, fenceTop + Math.sin(bx) * 3);
      ctx.lineTo(bx + Math.sin(bx * 0.5) * 4, GROUND_Y);
      ctx.stroke();
    }
    // Horizontal lashings
    ctx.strokeStyle = '#553718';
    ctx.lineWidth = 5;
    [fenceTop + 24, fenceTop + 78, fenceTop + 128].forEach((ly) => {
      ctx.beginPath();
      ctx.moveTo(gateRight, ly);
      ctx.lineTo(canvas.width, ly);
      ctx.stroke();
    });
    // Gate posts
    ctx.strokeStyle = '#7a5328';
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(gateLeft, fenceTop - 6); ctx.lineTo(gateLeft, GROUND_Y);
    ctx.moveTo(gateRight, fenceTop - 6); ctx.lineTo(gateRight, GROUND_Y);
    ctx.stroke();

    // Villager heads peeking over the fence
    for (let i = 0; i < Math.ceil(canvas.width / 95); i++) {
      const vx = gateRight + 40 + i * 95;
      if (vx > canvas.width - 10) break;
      const bob = Math.sin(tick / 30 + i) * 2;
      ctx.fillStyle = ['#caa472', '#b78a5a', '#d8b888'][i % 3];
      ctx.beginPath();
      ctx.arc(vx, fenceTop - 6 + bob, 11, 0, Math.PI * 2);
      ctx.fill();
      // hair
      ctx.fillStyle = '#23170d';
      ctx.beginPath();
      ctx.arc(vx, fenceTop - 10 + bob, 11, Math.PI, 0);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#1a1208';
      ctx.fillRect(vx - 5, fenceTop - 7 + bob, 2, 2);
      ctx.fillRect(vx + 3, fenceTop - 7 + bob, 2, 2);
    }
  };

  const drawFighter = (ctx: CanvasRenderingContext2D, f: FighterState, s: typeof stateRef.current) => {
    if (f.sprite === 'shere_khan') drawShereKhan(ctx, f, s);
    else drawMowgliMan(ctx, f, s);
  };

  const drawMowgliMan = (ctx: CanvasRenderingContext2D, f: FighterState, s: typeof stateRef.current) => {
    const ext = extensionOf(f);
    const lean = f.attackPhase === 'windup' ? -4 * (f.attackTimer / WINDUP_MS) : 0;
    const flash = f.hurtFlash > 0 && Math.floor(s.tick / 2) % 2 === 0;

    ctx.save();
    ctx.translate(f.x, GROUND_Y);
    ctx.scale(f.facing, 1);
    ctx.translate(lean, 0);

    const skin = flash ? '#fca5a5' : '#b45a2b';
    const skinDark = flash ? '#f87171' : '#9c4a22';

    // Legs (slight fighting stance)
    ctx.strokeStyle = skinDark;
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -52); ctx.lineTo(-16, 0);
    ctx.moveTo(6, -52); ctx.lineTo(16, -2);
    ctx.stroke();

    // Loincloth
    ctx.fillStyle = '#e0561b';
    ctx.beginPath();
    ctx.roundRect(-12, -62, 24, 16, 3);
    ctx.fill();

    // Torso
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.roundRect(-12, -116, 24, 58, 8);
    ctx.fill();
    // chest shading
    ctx.fillStyle = skinDark;
    ctx.fillRect(-12, -86, 24, 3);

    // Back arm
    ctx.strokeStyle = skinDark;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-8, -108); ctx.lineTo(-20, -84);
    ctx.stroke();

    // Front (torch) arm — extends forward on strike
    const handX = 10 + 64 * Math.max(0, ext) + 22 * Math.min(0, ext);
    const handY = -100 + 6 * Math.max(0, ext);
    ctx.strokeStyle = skin;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(8, -108);
    ctx.lineTo(handX, handY);
    ctx.stroke();

    // Torch (stick + flame) held at the hand, pointing forward
    ctx.strokeStyle = '#5b3413';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(handX, handY);
    ctx.lineTo(handX + 30, handY - 4);
    ctx.stroke();
    const flick = Math.sin(s.tick / 3) * 3;
    const fx = handX + 34;
    const fy = handY - 6;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(fx, fy + 8);
    ctx.quadraticCurveTo(fx + 6, fy - 6 + flick, fx + 2, fy - 18 + flick);
    ctx.quadraticCurveTo(fx - 4, fy - 6, fx - 6, fy + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(fx, fy + 6);
    ctx.quadraticCurveTo(fx + 3, fy - 3 + flick, fx + 1, fy - 11 + flick);
    ctx.quadraticCurveTo(fx - 2, fy - 3, fx - 3, fy + 6);
    ctx.closePath();
    ctx.fill();

    // Head
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(2, -126, 11, 0, Math.PI * 2);
    ctx.fill();
    // Wild black hair
    ctx.fillStyle = '#160d07';
    ctx.beginPath();
    ctx.arc(2, -129, 12, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-10, -130, 4, 8);
    ctx.fillRect(8, -130, 4, 7);
    // Eye
    ctx.fillStyle = '#0f0a06';
    ctx.fillRect(6, -128, 3, 3);

    ctx.restore();
  };

  const drawShereKhan = (ctx: CanvasRenderingContext2D, f: FighterState, s: typeof stateRef.current) => {
    const ext = extensionOf(f);
    const rear = f.attackPhase === 'windup' ? -6 * (f.attackTimer / WINDUP_MS) : (f.attackPhase === 'strike' ? -10 : 0);
    const flash = f.hurtFlash > 0 && Math.floor(s.tick / 2) % 2 === 0;
    const body = flash ? '#fdba74' : '#ea7317';
    const dark = '#1c1917';

    ctx.save();
    ctx.translate(f.x, GROUND_Y);
    ctx.scale(f.facing, 1);
    ctx.translate(0, rear);

    // Tail (curls up behind)
    ctx.strokeStyle = body;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-66, -54);
    ctx.quadraticCurveTo(-104, -70, -92, -116);
    ctx.stroke();

    // Hind + front legs
    ctx.fillStyle = dark;
    ctx.fillRect(-58, -22, 14, 22);
    ctx.fillRect(40, -22, 14, 22);
    // Extending front paw on strike
    const pawX = 54 + 70 * Math.max(0, ext) + 26 * Math.min(0, ext);
    ctx.strokeStyle = body;
    ctx.lineWidth = 13;
    ctx.beginPath();
    ctx.moveTo(46, -40);
    ctx.lineTo(pawX, -34 + 10 * Math.max(0, ext));
    ctx.stroke();
    // Claws on the extended paw
    if (ext > 0.2) {
      ctx.strokeStyle = '#f5f5f4';
      ctx.lineWidth = 2.5;
      for (let c = -1; c <= 1; c++) {
        ctx.beginPath();
        ctx.moveTo(pawX + 4, -34 + 10 * ext + c * 4);
        ctx.lineTo(pawX + 12, -38 + 10 * ext + c * 4);
        ctx.stroke();
      }
    }

    // Body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(-8, -58, 60, 34, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stripes
    ctx.strokeStyle = dark;
    ctx.lineWidth = 5;
    for (let i = -2; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 18 - 6, -88);
      ctx.lineTo(i * 18 - 14, -38);
      ctx.stroke();
    }

    // Head (toward facing / front)
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(54, -78, 26, 0, Math.PI * 2);
    ctx.fill();
    // Ears
    ctx.beginPath();
    ctx.moveTo(38, -96); ctx.lineTo(44, -112); ctx.lineTo(54, -98);
    ctx.moveTo(56, -98); ctx.lineTo(66, -112); ctx.lineTo(72, -96);
    ctx.fill();
    // Muzzle
    ctx.fillStyle = '#fde9d2';
    ctx.beginPath();
    ctx.ellipse(66, -70, 13, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    // Face stripes
    ctx.strokeStyle = dark;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(50, -94); ctx.lineTo(54, -82);
    ctx.moveTo(60, -94); ctx.lineTo(62, -82);
    ctx.stroke();
    // Eyes (angry, glowing)
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(50, -82, 5, 3.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(64, -82, 5, 3.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark;
    ctx.fillRect(49, -84, 2, 4);
    ctx.fillRect(63, -84, 2, 4);

    ctx.restore();
  };

  const drawHud = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, s: typeof stateRef.current) => {
    const barW = Math.min(260, canvas.width / 2 - 40);
    drawHealthBar(ctx, 20, 16, barW, nameFor(s.player.sprite), s.player.hp, s.player.maxHp, false);
    drawHealthBar(ctx, canvas.width - 20 - barW, 16, barW, nameFor(s.opponent.sprite), s.opponent.hp, s.opponent.maxHp, true);

    if (controlsPrompt && s.phase !== 'player_win') {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
      ctx.fillRect(canvas.width / 2 - 118, 64, 236, 58);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(canvas.width / 2 - 118, 64, 236, 58);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText(t.fighterHudMove, canvas.width / 2, 80);
      ctx.fillText(t.fighterHudAttack, canvas.width / 2, 96);
      ctx.fillText(t.fighterHudParry, canvas.width / 2, 112);
    }
  };

  const drawHealthBar = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, name: string, hp: number, maxHp: number, rightAlign: boolean) => {
    const frac = Math.max(0, hp / maxHp);
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, w, 16);
    ctx.fillStyle = frac > 0.5 ? '#22c55e' : frac > 0.25 ? '#f59e0b' : '#ef4444';
    const fillW = w * frac;
    ctx.fillRect(rightAlign ? x + w - fillW : x, y, fillW, 16);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, 16);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = rightAlign ? 'right' : 'left';
    ctx.fillText(`${name}  ${Math.ceil(hp)} HP`, rightAlign ? x + w : x, y + 30);
  };

  const drawSpeechBubble = (ctx: CanvasRenderingContext2D, cx: number, cy: number, text: string) => {
    ctx.font = '13px sans-serif';
    const padding = 12;
    const textW = ctx.measureText(text).width;
    const bw = textW + padding * 2;
    const bh = 34;
    const bx = Math.max(8, Math.min(cx - bw / 2, ctx.canvas.width - bw - 8));
    const by = cy - bh;
    ctx.fillStyle = 'rgba(248, 250, 252, 0.96)';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 8);
    ctx.fill();
    ctx.stroke();
    // tail
    ctx.beginPath();
    ctx.moveTo(cx - 6, by + bh);
    ctx.lineTo(cx + 6, by + bh);
    ctx.lineTo(cx, by + bh + 12);
    ctx.closePath();
    ctx.fillStyle = 'rgba(248, 250, 252, 0.96)';
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText(text, bx + bw / 2, by + bh / 2 + 4);
  };

  const press = (key: string, down: boolean) => { stateRef.current.keys[key] = down; };

  return (
    <div className="flex flex-col items-center bg-slate-950/80 border-4 border-slate-900 rounded-3xl p-4 shadow-inner relative overflow-hidden" id="fighter-box">
      <div className="w-full flex justify-between items-center mb-2 px-1 text-gray-300 font-mono text-xs select-none">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-amber-400" />
          <span className="text-amber-300 font-bold uppercase tracking-wider">{t.epilogueStage}</span>
        </div>
        <button
          onClick={onTogglePause}
          className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-md border border-slate-700 cursor-pointer"
          id="btn-fighter-pause"
        >
          {paused ? t.resume : t.pause}
        </button>
      </div>

      <div className="w-full relative bg-slate-900 border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          className="w-full block h-[420px] bg-slate-900 cursor-crosshair"
          id="fighter-canvas"
        />

        <button
          onClick={() => setControlsPrompt(!controlsPrompt)}
          className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg border border-slate-800 transition-colors text-[10px] uppercase tracking-wider cursor-pointer"
          id="btn-fighter-toggle-tips"
        >
          {controlsPrompt ? t.hideTips : t.showKeys}
        </button>

        {won && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-sm z-10" id="screen-fighter-win">
            <div className="animate-bounce mb-3 bg-amber-500/20 p-3 rounded-full border border-amber-500/50">
              <Swords className="w-10 h-10 text-amber-300" />
            </div>
            <h2 className="text-2xl font-black text-amber-400 uppercase tracking-widest font-sans">{t.fighterWinTitle}</h2>
            <p className="text-sm text-gray-300 max-w-sm mt-2 mb-6 font-mono font-medium">{t.fighterWinBody}</p>
            <button
              onClick={onComplete}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl border border-amber-500 shadow-md cursor-pointer"
              id="btn-fighter-finish"
            >
              <Play className="w-4 h-4" />
              <span>{t.fighterFinish}</span>
            </button>
          </div>
        )}
      </div>

      {/* Touch controls */}
      <div className="w-full mt-4 flex items-center justify-between gap-6 px-1 select-none" id="fighter-touch-controls">
        <div className="flex gap-2">
          <button
            onMouseDown={() => press('a', true)} onMouseUp={() => press('a', false)} onMouseLeave={() => press('a', false)}
            onTouchStart={() => press('a', true)} onTouchEnd={() => press('a', false)}
            className="w-14 h-14 bg-slate-800/80 hover:bg-slate-700 text-gray-200 rounded-2xl flex items-center justify-center text-xl font-black border-2 border-slate-700/80 active:scale-95 transition-transform touch-none select-none"
            id="fighter-touch-left"
          >◀</button>
          <button
            onMouseDown={() => press('d', true)} onMouseUp={() => press('d', false)} onMouseLeave={() => press('d', false)}
            onTouchStart={() => press('d', true)} onTouchEnd={() => press('d', false)}
            className="w-14 h-14 bg-slate-800/80 hover:bg-slate-700 text-gray-200 rounded-2xl flex items-center justify-center text-xl font-black border-2 border-slate-700/80 active:scale-95 transition-transform touch-none"
            id="fighter-touch-right"
          >▶</button>
        </div>
        <div className="flex gap-2">
          <button
            onMouseDown={() => press('arrowdown', true)} onMouseUp={() => press('arrowdown', false)} onMouseLeave={() => press('arrowdown', false)}
            onTouchStart={() => press('arrowdown', true)} onTouchEnd={() => press('arrowdown', false)}
            className="w-14 h-14 bg-sky-800/80 hover:bg-sky-700 text-white rounded-2xl flex items-center justify-center text-sm font-black border-2 border-sky-600/80 active:scale-95 transition-transform touch-none"
            id="fighter-touch-parry"
          >PARRY</button>
          <button
            onMouseDown={() => press('arrowup', true)} onMouseUp={() => press('arrowup', false)} onMouseLeave={() => press('arrowup', false)}
            onTouchStart={() => press('arrowup', true)} onTouchEnd={() => press('arrowup', false)}
            className="px-8 h-14 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl flex items-center justify-center text-sm font-black border-2 border-rose-500 active:scale-95 transition-transform shadow-lg touch-none uppercase"
            id="fighter-touch-attack"
          >Attack</button>
        </div>
      </div>
    </div>
  );
}
