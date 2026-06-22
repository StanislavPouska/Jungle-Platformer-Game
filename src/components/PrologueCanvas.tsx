/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { PrologueLevel, StepPlatform, HidingSpot } from '../types';
import { audioSynth } from '../audio';
import { Landmark, RotateCcw, Play } from 'lucide-react';
import { Lang, UI } from '../i18n';

const CRAWL_SPEED = 2.3;
const CLIMB_SPEED = 3; // px/frame the toddler (and tiger) ease toward the ground height
const ENTER_RADIUS = 46; // how close to a hiding spot's center counts as "at it"
const TIGER_W = 130;
const TIGER_H = 68;
const PLAYER_W = 26;
const PLAYER_H = 18;
const APPROACH_SPEED = 3.2;
const LEAVE_SPEED = 2.6;
const HUNT_START_DELAY_MS = 2200; // Mowgli gets a brief head start before the tiger begins hunting

const getGroundYAt = (platforms: StepPlatform[], x: number): number => {
  for (const p of platforms) {
    if (x >= p.x && x < p.x + p.width) return p.y;
  }
  if (x < platforms[0].x) return platforms[0].y;
  return platforms[platforms.length - 1].y;
};

// Scans the level so the camera knows the full vertical extent of ground,
// hiding spots, and the tiger's reach — otherwise the bottom of the ground
// fill (and Mowgli himself when not hidden) can sit below the canvas.
const computeVerticalBounds = (level: PrologueLevel) => {
  let minY = Infinity;
  let maxY = -Infinity;
  level.platforms.forEach((p) => {
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y + p.height + 60);
  });
  level.hidingSpots.forEach((spot) => {
    minY = Math.min(minY, spot.y - spot.height - 20);
    maxY = Math.max(maxY, spot.y + 10);
  });
  minY -= TIGER_H + 40; // headroom for the tiger's head/ears when it's on a high step
  return { minY, maxY };
};

interface PrologueCanvasProps {
  prologue: PrologueLevel;
  language: Lang;
  onComplete: () => void;
  paused: boolean;
  onTogglePause: () => void;
}

export default function PrologueCanvas({
  prologue,
  language,
  onComplete,
  paused,
  onTogglePause,
}: PrologueCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const t = UI[language];

  const [controlsPrompt, setControlsPrompt] = useState(true);
  const [caught, setCaught] = useState(false);
  const [escaped, setEscaped] = useState(false);
  const [deaths, setDeaths] = useState(0);

  const stateRef = useRef({
    player: {
      x: prologue.startX,
      y: getGroundYAt(prologue.platforms, prologue.startX),
      vx: 0,
      facing: 'right' as 'left' | 'right',
      hidden: false,
      hidingSpotId: null as string | null,
      animTimer: 0,
      animFrame: 0,
    },
    tiger: {
      x: prologue.tigerStartX,
      y: getGroundYAt(prologue.platforms, prologue.tigerStartX),
      dir: 1 as 1 | -1,
      huntDelayRemaining: HUNT_START_DELAY_MS,
    },
    sequence: {
      active: false,
      phase: 'wolves' as 'wolves' | 'approach' | 'sniff' | 'leaving' | 'done',
      timer: 0,
      wolfPairsShown: 0,
    },
    keys: {} as { [key: string]: boolean },
    cameraX: 0,
    cameraY: 0,
    worldMinY: computeVerticalBounds(prologue).minY,
    worldMaxY: computeVerticalBounds(prologue).maxY,
    frameId: 0,
    deathTimer: 0,
    levelLength: prologue.levelMaxX + 200,
  });

  // Reset on mount/replay
  useEffect(() => {
    const s = stateRef.current;
    s.player.x = prologue.startX;
    s.player.y = getGroundYAt(prologue.platforms, prologue.startX);
    s.player.hidden = false;
    s.player.hidingSpotId = null;
    s.tiger.x = prologue.tigerStartX;
    s.tiger.y = getGroundYAt(prologue.platforms, prologue.tigerStartX);
    s.tiger.dir = 1;
    s.tiger.huntDelayRemaining = HUNT_START_DELAY_MS;
    s.sequence.active = false;
    s.sequence.phase = 'wolves';
    s.sequence.timer = 0;
    s.sequence.wolfPairsShown = 0;
    s.cameraX = 0;
    s.cameraY = 0;
    const verticalBounds = computeVerticalBounds(prologue);
    s.worldMinY = verticalBounds.minY;
    s.worldMaxY = verticalBounds.maxY;
    s.deathTimer = 0;
    setCaught(false);
    setEscaped(false);
    audioSynth.startJungleMusic();
  }, [prologue]);

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
    let wasUpPressed = false;
    let wasDownPressed = false;

    const loop = (timestamp: number) => {
      if (paused || escaped) return;

      const s = stateRef.current;
      const dt = timestamp - lastStamp;
      lastStamp = timestamp;

      if (s.deathTimer > 0) {
        s.deathTimer += dt;
        if (s.deathTimer > 900) {
          s.deathTimer = 0;
          s.player.x = prologue.startX;
          s.player.y = getGroundYAt(prologue.platforms, prologue.startX);
          s.player.hidden = false;
          s.player.hidingSpotId = null;
          setCaught(false);
        }
        drawScene(ctx, canvas, s);
        s.frameId = requestAnimationFrame(loop);
        return;
      }

      const p = s.player;
      const upPressed = !!(s.keys['arrowup'] || s.keys['w']);
      const downPressed = !!(s.keys['arrowdown'] || s.keys['s']);

      if (!p.hidden) {
        let moveDir = 0;
        if (s.keys['a'] || s.keys['arrowleft']) { moveDir = -1; p.facing = 'left'; }
        else if (s.keys['d'] || s.keys['arrowright']) { moveDir = 1; p.facing = 'right'; }
        p.vx = moveDir * CRAWL_SPEED;
        p.x += p.vx;
        if (p.x < prologue.levelMinX + 14) p.x = prologue.levelMinX + 14;
        if (p.x > prologue.levelMaxX - 14) p.x = prologue.levelMaxX - 14;

        const targetY = getGroundYAt(prologue.platforms, p.x);
        p.y += Math.max(-CLIMB_SPEED, Math.min(CLIMB_SPEED, targetY - p.y));

        if (moveDir !== 0) {
          p.animTimer += 1;
          if (p.animTimer > 7) { p.animTimer = 0; p.animFrame = (p.animFrame + 1) % 4; }
        }

        // Enter a hiding spot on Up (edge-triggered)
        if (upPressed && !wasUpPressed) {
          const center = p.x + PLAYER_W / 2;
          const spot = prologue.hidingSpots.find((hs) => Math.abs((hs.x + hs.width / 2) - center) < ENTER_RADIUS);
          if (spot) {
            p.hidden = true;
            p.hidingSpotId = spot.id;
            p.x = spot.x + spot.width / 2 - PLAYER_W / 2;
            audioSynth.playJump();
            if (spot.id === prologue.goalSpotId && !s.sequence.active && s.sequence.phase !== 'done') {
              s.sequence.active = true;
              s.sequence.phase = 'wolves';
              s.sequence.timer = 0;
              s.sequence.wolfPairsShown = 0;
            }
          }
        }
      } else {
        // Hidden: leave on Down, unless this is the goal cave (no backing out of the ending)
        const isGoal = p.hidingSpotId === prologue.goalSpotId;
        if (downPressed && !wasDownPressed && !isGoal) {
          p.hidden = false;
          p.hidingSpotId = null;
        }
      }
      wasUpPressed = upPressed;
      wasDownPressed = downPressed;

      // Tiger AI
      const goalSpot = prologue.hidingSpots.find((hs) => hs.id === prologue.goalSpotId)!;
      if (s.sequence.active) {
        const seq = s.sequence;
        if (seq.phase === 'wolves') {
          seq.timer += dt;
          if (seq.timer >= 1000) {
            seq.timer = 0;
            seq.wolfPairsShown += 1;
            if (seq.wolfPairsShown >= 3) {
              seq.phase = 'approach';
              seq.timer = 0;
            }
          }
        } else if (seq.phase === 'approach') {
          seq.timer += dt;
          const dir = s.tiger.x < goalSpot.x ? 1 : -1;
          s.tiger.dir = dir as 1 | -1;
          s.tiger.x += dir * APPROACH_SPEED;
          if (Math.abs(s.tiger.x - goalSpot.x) < 50 || seq.timer > 6500) {
            seq.phase = 'sniff';
            seq.timer = 0;
          }
        } else if (seq.phase === 'sniff') {
          seq.timer += dt;
          if (seq.timer >= 3000) {
            seq.phase = 'leaving';
            s.tiger.dir = 1;
          }
        } else if (seq.phase === 'leaving') {
          s.tiger.x += LEAVE_SPEED;
          if (s.tiger.x > prologue.levelMaxX + 220) {
            seq.phase = 'done';
            setEscaped(true);
          }
        }
        s.tiger.y += Math.max(-CLIMB_SPEED, Math.min(CLIMB_SPEED, getGroundYAt(prologue.platforms, s.tiger.x) - s.tiger.y));
      } else if (s.tiger.huntDelayRemaining > 0) {
        s.tiger.huntDelayRemaining -= dt;
      } else {
        s.tiger.x += s.tiger.dir * prologue.tigerSpeed;
        if (s.tiger.x < prologue.levelMinX) { s.tiger.x = prologue.levelMinX; s.tiger.dir = 1; }
        if (s.tiger.x > prologue.levelMaxX) { s.tiger.x = prologue.levelMaxX; s.tiger.dir = -1; }
        s.tiger.y += Math.max(-CLIMB_SPEED, Math.min(CLIMB_SPEED, getGroundYAt(prologue.platforms, s.tiger.x) - s.tiger.y));
      }

      // Collision: caught if not hidden and overlapping a tiger that's actively hunting
      // (the brief head-start window and the very start of the level are safe)
      if (!p.hidden && s.deathTimer === 0 && s.tiger.huntDelayRemaining <= 0) {
        const tigerLeft = s.tiger.x - TIGER_W / 2;
        const tigerRight = s.tiger.x + TIGER_W / 2;
        const tigerTop = s.tiger.y - TIGER_H;
        const tigerBottom = s.tiger.y + 6;
        const overlapH = p.x + PLAYER_W > tigerLeft && p.x < tigerRight;
        const overlapV = p.y + PLAYER_H > tigerTop && p.y < tigerBottom;
        if (overlapH && overlapV) {
          s.deathTimer = 1;
          audioSynth.playDeathSound();
          setCaught(true);
          setDeaths((d) => d + 1);
        }
      }

      // Camera
      const optimalCamX = p.x - canvas.width / 2.5;
      const maxScroll = Math.max(0, s.levelLength - canvas.width);
      s.cameraX = Math.max(0, Math.min(maxScroll, optimalCamX));

      const optimalCamY = p.y - canvas.height / 2.2;
      const minScrollY = Math.min(0, s.worldMinY - 60);
      const maxScrollY = Math.max(0, s.worldMaxY + 60 - canvas.height);
      s.cameraY = Math.max(minScrollY, Math.min(maxScrollY, optimalCamY));

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
  }, [prologue, paused, escaped]);

  const drawEyes = (ctx: CanvasRenderingContext2D, cx: number, cy: number, frameId: number, phase: number, glow: string) => {
    const blinkCycle = Math.sin(frameId / 18 + phase);
    const openness = blinkCycle > -0.75 ? 1 : 0.12;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(cx - 7, cy, 4, 3 * openness, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 7, cy, 4, 3 * openness, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(cx - 7, cy, 1.4 * openness, 0, Math.PI * 2);
    ctx.arc(cx + 7, cy, 1.4 * openness, 0, Math.PI * 2);
    ctx.fill();
  };

  // A pointed almond/cat-eye outline (sharp corners left & right) instead of
  // a round ellipse, so wolf eyes read as predatory and distinct from Mowgli's.
  const tracePointedEye = (ctx: CanvasRenderingContext2D, cx: number, cy: number, halfWidth: number, halfHeight: number) => {
    ctx.beginPath();
    ctx.moveTo(cx - halfWidth, cy);
    ctx.quadraticCurveTo(cx, cy - halfHeight, cx + halfWidth, cy);
    ctx.quadraticCurveTo(cx, cy + halfHeight, cx - halfWidth, cy);
    ctx.closePath();
  };

  const drawWolfEyes = (ctx: CanvasRenderingContext2D, cx: number, cy: number, frameId: number, phase: number, glow: string) => {
    const blinkCycle = Math.sin(frameId / 18 + phase);
    const openness = blinkCycle > -0.75 ? 1 : 0.12;

    ctx.fillStyle = glow;
    tracePointedEye(ctx, cx - 8, cy, 5.5, 2.6 * openness);
    ctx.fill();
    tracePointedEye(ctx, cx + 8, cy, 5.5, 2.6 * openness);
    ctx.fill();

    if (openness > 0.3) {
      ctx.fillStyle = '#000';
      ctx.fillRect(cx - 8.6, cy - 1.6 * openness, 1.2, 3.2 * openness);
      ctx.fillRect(cx + 7.4, cy - 1.6 * openness, 1.2, 3.2 * openness);
    }
  };

  const drawScene = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, s: typeof stateRef.current) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Smoky fire-lit sky to suggest the village under attack
    const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#1a0a08');
    sky.addColorStop(0.45, '#3a120f');
    sky.addColorStop(1, '#142013');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Distant glow (burning village) parallax
    for (let i = 0; i < 4; i++) {
      const gx = (i * 420 - s.cameraX * 0.15) % (canvas.width + 300);
      const glow = ctx.createRadialGradient(gx, canvas.height - 60, 5, gx, canvas.height - 60, 90);
      glow.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
      glow.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(gx - 90, canvas.height - 150, 180, 150);
    }

    ctx.save();
    ctx.translate(-s.cameraX, -s.cameraY);

    // Ground step platforms
    prologue.platforms.forEach((plat) => {
      ctx.fillStyle = '#3f2a18';
      ctx.fillRect(plat.x, plat.y, plat.width, plat.height + 60);
      ctx.fillStyle = '#1f5132';
      ctx.fillRect(plat.x, plat.y, plat.width, 8);
    });

    // Hiding spots
    prologue.hidingSpots.forEach((spot) => {
      drawHidingSpot(ctx, spot, s);
    });

    // Tiger
    drawTiger(ctx, s);

    // Toddler Mowgli (hidden inside a spot just shows blinking eyes, drawn within drawHidingSpot)
    if (!s.player.hidden && s.deathTimer === 0) {
      drawToddler(ctx, s.player);
    }

    ctx.restore();

    // HUD tips
    if (controlsPrompt) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(15, 12, 230, 60);
      ctx.strokeStyle = '#92400e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(15, 12, 230, 60);
      ctx.font = '11px monospace';
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'left';
      ctx.fillText(t.prologueHudMove, 24, 28);
      ctx.fillText(t.prologueHudHide, 24, 44);
      ctx.fillText(t.prologueHudLeave, 24, 60);
    }
  };

  const drawHidingSpot = (ctx: CanvasRenderingContext2D, spot: HidingSpot, s: typeof stateRef.current) => {
    const cx = spot.x + spot.width / 2;
    const cy = spot.y - spot.height / 2 + 14;

    if (spot.kind === 'leaf_shadow') {
      // Tree trunk + big leaf casting shadow
      ctx.fillStyle = '#3f2a18';
      ctx.fillRect(spot.x + spot.width - 10, spot.y - spot.height, 10, spot.height + 10);
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.ellipse(spot.x + spot.width / 2, spot.y - spot.height + 8, spot.width / 1.5, 22, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(2, 10, 6, 0.82)';
      ctx.beginPath();
      ctx.ellipse(cx, spot.y - spot.height / 2 + 18, spot.width / 2, spot.height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Cave or goal cave mouth carved into a rock outcrop
      ctx.fillStyle = '#4b4036';
      ctx.beginPath();
      ctx.roundRect(spot.x - 6, spot.y - spot.height, spot.width + 12, spot.height + 10, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(2, 4, 4, 0.92)';
      ctx.beginPath();
      ctx.ellipse(cx, spot.y - spot.height / 2 + 14, spot.width / 2.2, spot.height / 2, 0, 0, Math.PI);
      ctx.fill();

      if (spot.kind === 'goal_cave') {
        // Bones and a skull in front of the entrance
        ctx.strokeStyle = '#e7e5e4';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(spot.x - 4, spot.y + 18);
        ctx.lineTo(spot.x + 22, spot.y + 14);
        ctx.moveTo(spot.x + spot.width - 10, spot.y + 18);
        ctx.lineTo(spot.x + spot.width + 14, spot.y + 12);
        ctx.stroke();

        const skullX = cx + 6;
        const skullY = spot.y + 22;
        ctx.fillStyle = '#f5f5f4';
        ctx.beginPath();
        ctx.arc(skullX, skullY, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(skullX - 3.5, skullY - 1, 2.2, 3, 0, 0, Math.PI * 2);
        ctx.ellipse(skullX + 3.5, skullY - 1, 2.2, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(skullX - 3, skullY + 5, 6, 3);
      }
    }

    // Occupant: player eyes if they're hiding here, plus wolf eyes during the ending sequence
    if (s.player.hidden && s.player.hidingSpotId === spot.id) {
      drawEyes(ctx, cx, cy + 4, s.frameId ?? 0, 0, '#fde68a');
    }
    if (spot.id === prologue.goalSpotId && s.sequence.wolfPairsShown > 0) {
      const offsets = [[-16, 10], [18, 14], [0, -6]];
      for (let i = 0; i < s.sequence.wolfPairsShown; i++) {
        const [ox, oy] = offsets[i];
        drawWolfEyes(ctx, cx + ox, cy + oy, (s.frameId ?? 0) + i * 11, i * 1.7, '#d9f99d');
      }
    }
  };

  const drawToddler = (ctx: CanvasRenderingContext2D, p: typeof stateRef.current.player) => {
    ctx.save();
    ctx.translate(p.x + PLAYER_W / 2, p.y - PLAYER_H / 2);
    if (p.facing === 'left') ctx.scale(-1, 1);

    const bob = Math.sin((p.animFrame * Math.PI) / 2) * 1.4;

    // Back legs (bent, low crawl posture)
    ctx.strokeStyle = '#c2410c';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.lineTo(-11, 9 + bob);
    ctx.moveTo(-4, 5);
    ctx.lineTo(-6, 10 - bob);
    ctx.stroke();

    // Front arms reaching forward
    ctx.beginPath();
    ctx.moveTo(6, 2);
    ctx.lineTo(11, 8 - bob);
    ctx.moveTo(9, 1);
    ctx.lineTo(14, 7 + bob);
    ctx.stroke();

    // Body (low oval torso)
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.ellipse(0, -1, 11, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Loincloth
    ctx.fillStyle = '#f97316';
    ctx.fillRect(-4, 1, 8, 4);

    // Head
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.arc(11, -6, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(11, -9, 4.2, Math.PI, 0);
    ctx.fill();

    ctx.restore();
  };

  const drawTiger = (ctx: CanvasRenderingContext2D, s: typeof stateRef.current) => {
    const tiger = s.tiger;
    const sniffing = s.sequence.active && s.sequence.phase === 'sniff';
    const wiggle = sniffing ? Math.sin((s.frameId ?? 0) / 4) * 3 : 0;

    ctx.save();
    ctx.translate(tiger.x + wiggle, tiger.y);
    if (tiger.dir < 0) ctx.scale(-1, 1);

    // Tail
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-TIGER_W / 2 + 8, -TIGER_H / 2);
    ctx.quadraticCurveTo(-TIGER_W / 2 - 22, -TIGER_H / 2 - 18, -TIGER_W / 2 - 10, -TIGER_H - 4);
    ctx.stroke();

    // Body
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.ellipse(0, -TIGER_H / 2 + 6, TIGER_W / 2, TIGER_H / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Stripes
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 5;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 14, -TIGER_H + 4);
      ctx.lineTo(i * 14 - 8, -8);
      ctx.stroke();
    }

    // Legs
    ctx.fillStyle = '#1c1917';
    ctx.fillRect(-TIGER_W / 2 + 12, -4, 12, 14);
    ctx.fillRect(TIGER_W / 2 - 24, -4, 12, 14);

    // Head
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(TIGER_W / 2 - 6, -TIGER_H / 2 - 6, 22, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.beginPath();
    ctx.moveTo(TIGER_W / 2 - 22, -TIGER_H / 2 - 22);
    ctx.lineTo(TIGER_W / 2 - 14, -TIGER_H / 2 - 34);
    ctx.lineTo(TIGER_W / 2 - 6, -TIGER_H / 2 - 22);
    ctx.moveTo(TIGER_W / 2 + 6, -TIGER_H / 2 - 22);
    ctx.lineTo(TIGER_W / 2 + 10, -TIGER_H / 2 - 34);
    ctx.lineTo(TIGER_W / 2 + 16, -TIGER_H / 2 - 22);
    ctx.fill();

    // Stripes on face + glowing eyes
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(TIGER_W / 2 - 16, -TIGER_H / 2 - 14);
    ctx.lineTo(TIGER_W / 2 - 10, -TIGER_H / 2 - 4);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.ellipse(TIGER_W / 2 - 2, -TIGER_H / 2 - 8, 4, 3, 0, 0, Math.PI * 2);
    ctx.ellipse(TIGER_W / 2 + 10, -TIGER_H / 2 - 8, 4, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(TIGER_W / 2 - 2, -TIGER_H / 2 - 8, 1.3, 0, Math.PI * 2);
    ctx.arc(TIGER_W / 2 + 10, -TIGER_H / 2 - 8, 1.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  return (
    <div className="flex flex-col items-center bg-slate-950/80 border-4 border-slate-900 rounded-3xl p-4 shadow-inner relative overflow-hidden" id="prologue-box">
      <div className="w-full flex justify-between items-center mb-2 px-1 text-gray-300 font-mono text-xs select-none">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-orange-400" />
          <span className="text-orange-300 font-bold uppercase tracking-wider">{t.prologueStage}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-rose-300 font-semibold">{deaths > 0 ? `x${deaths}` : ''}</span>
          <button
            onClick={onTogglePause}
            className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-md border border-slate-700 cursor-pointer"
            id="btn-prologue-pause"
          >
            {paused ? t.resume : t.pause}
          </button>
        </div>
      </div>

      <div className="w-full relative bg-slate-900 border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          className="w-full block h-[420px] bg-slate-900 cursor-crosshair"
          id="prologue-canvas"
        />

        <button
          onClick={() => setControlsPrompt(!controlsPrompt)}
          className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg border border-slate-800 transition-colors text-[10px] uppercase tracking-wider cursor-pointer"
          id="btn-prologue-toggle-tips"
        >
          {controlsPrompt ? t.hideTips : t.showKeys}
        </button>

        {caught && (
          <div className="absolute inset-0 bg-rose-950/85 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-sm z-10" id="screen-prologue-caught">
            <h2 className="text-xl font-black text-rose-300 uppercase tracking-widest font-sans">{t.prologueCaught}</h2>
            <p className="text-sm text-gray-200 max-w-sm mt-2 font-mono">{t.prologueCaughtHint}</p>
          </div>
        )}

        {escaped && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-sm z-10" id="screen-prologue-escaped">
            <div className="animate-bounce mb-3 bg-emerald-500/20 p-3 rounded-full border border-emerald-500/50">
              <RotateCcw className="w-10 h-10 text-emerald-300" />
            </div>
            <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest font-sans">{t.prologueEscapedTitle}</h2>
            <p className="text-sm text-gray-300 max-w-sm mt-2 mb-6 font-mono font-medium">{t.prologueEscapedBody}</p>
            <button
              onClick={onComplete}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl border border-emerald-500 shadow-md cursor-pointer"
              id="btn-prologue-continue"
            >
              <Play className="w-4 h-4" />
              <span>{t.prologueContinue}</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-full mt-4 flex items-center justify-between gap-6 px-1 select-none" id="prologue-touch-controls">
        <div className="flex gap-2">
          <button
            onMouseDown={() => { stateRef.current.keys['a'] = true; }}
            onMouseUp={() => { stateRef.current.keys['a'] = false; }}
            onMouseLeave={() => { stateRef.current.keys['a'] = false; }}
            onTouchStart={() => { stateRef.current.keys['a'] = true; }}
            onTouchEnd={() => { stateRef.current.keys['a'] = false; }}
            className="w-14 h-14 bg-slate-800/80 hover:bg-slate-700 text-gray-200 hover:text-white rounded-2xl flex items-center justify-center text-xl font-black border-2 border-slate-700/80 active:scale-95 transition-transform touch-none select-none"
            id="prologue-touch-left"
          >
            ◀
          </button>
          <button
            onMouseDown={() => { stateRef.current.keys['d'] = true; }}
            onMouseUp={() => { stateRef.current.keys['d'] = false; }}
            onMouseLeave={() => { stateRef.current.keys['d'] = false; }}
            onTouchStart={() => { stateRef.current.keys['d'] = true; }}
            onTouchEnd={() => { stateRef.current.keys['d'] = false; }}
            className="w-14 h-14 bg-slate-800/80 hover:bg-slate-700 text-gray-200 hover:text-white rounded-2xl flex items-center justify-center text-xl font-black border-2 border-slate-700/80 active:scale-95 transition-transform touch-none"
            id="prologue-touch-right"
          >
            ▶
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onMouseDown={() => { stateRef.current.keys['arrowdown'] = true; }}
            onMouseUp={() => { stateRef.current.keys['arrowdown'] = false; }}
            onMouseLeave={() => { stateRef.current.keys['arrowdown'] = false; }}
            onTouchStart={() => { stateRef.current.keys['arrowdown'] = true; }}
            onTouchEnd={() => { stateRef.current.keys['arrowdown'] = false; }}
            className="w-14 h-14 bg-slate-800/80 hover:bg-slate-700 text-gray-300 hover:text-white rounded-2xl flex items-center justify-center text-2xl font-black border-2 border-slate-700/80 active:scale-95 transition-transform touch-none"
            id="prologue-touch-down"
          >
            ▼
          </button>
          <button
            onMouseDown={() => { stateRef.current.keys['arrowup'] = true; }}
            onMouseUp={() => { stateRef.current.keys['arrowup'] = false; }}
            onMouseLeave={() => { stateRef.current.keys['arrowup'] = false; }}
            onTouchStart={() => { stateRef.current.keys['arrowup'] = true; }}
            onTouchEnd={() => { stateRef.current.keys['arrowup'] = false; }}
            className="px-8 h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl flex items-center justify-center text-2xl font-black border-2 border-amber-500 active:scale-95 transition-transform shadow-lg touch-none"
            id="prologue-touch-up"
          >
            ▲
          </button>
        </div>
      </div>
    </div>
  );
}
