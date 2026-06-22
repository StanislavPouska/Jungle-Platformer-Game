/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Player, Platform, Toad, Collectible, Particle, Level, GameSettings, GameStats } from '../types';
import { audioSynth } from '../audio';
import { Play, RotateCcw, Volume2, Landmark, Trophy, PlayCircle } from 'lucide-react';
import { Lang, UI, getLevelText, getPuzzleText } from '../i18n';

// Scans a level's platforms/toads/collectibles to find the vertical extent
// of playable content, so the camera knows how far it may safely scroll.
const computeVerticalBounds = (level: Level) => {
  let minY = Math.min(level.startY, level.endY);
  let maxY = Math.max(level.startY, level.endY);
  level.platforms.forEach((plat) => {
    const topRange = plat.moving ? (plat.startY ?? plat.y) - (plat.range ?? 0) : plat.y;
    const bottomRange = plat.moving ? (plat.startY ?? plat.y) + (plat.range ?? 0) : plat.y;
    minY = Math.min(minY, topRange);
    maxY = Math.max(maxY, bottomRange + plat.height);
  });
  level.toads.forEach((toad) => {
    minY = Math.min(minY, toad.y);
    maxY = Math.max(maxY, toad.y + toad.height);
  });
  level.collectibles.forEach((col) => {
    minY = Math.min(minY, col.y);
    maxY = Math.max(maxY, col.y);
  });
  return { minY, maxY };
};

interface GameCanvasProps {
  level: Level;
  settings: GameSettings;
  stats: GameStats;
  onStatsChange: (newStats: GameStats | ((prev: GameStats) => GameStats)) => void;
  onNextLevel: () => void;
  onRestartLevel: () => void;
  paused: boolean;
  onTogglePause: () => void;
  language: Lang;
}

export default function GameCanvas({
  level,
  settings,
  stats,
  onStatsChange,
  onNextLevel,
  onRestartLevel,
  paused,
  onTogglePause,
  language,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const t = UI[language];
  const levelText = getLevelText(level, language);
  const puzzleText = level.puzzle ? getPuzzleText(level.puzzle, language) : null;

  // Game state controls
  const [controlsPrompt, setControlsPrompt] = useState(true);

  // Puzzle gate (quiz wall) UI state
  const [showPuzzle, setShowPuzzle] = useState(false);
  const [puzzleAnswers, setPuzzleAnswers] = useState<number[]>([]);
  const [puzzleFeedback, setPuzzleFeedback] = useState<'idle' | 'wrong'>('idle');
  const puzzleOpenedRef = useRef(false);

  // References for mutable frame-loop states (prevents React re-render lag)
  const stateRef = useRef({
    player: {
      x: level.startX,
      y: level.startY,
      vx: 0,
      vy: 0,
      width: 28,
      height: 48,
      isGrounded: false,
      isCrouching: false,
      facing: 'right' as 'left' | 'right',
      animFrame: 0,
      animTimer: 0,
      state: 'idle' as 'idle' | 'running' | 'jumping' | 'falling' | 'wallclimbing',
      doubleJumpAvailable: true,
      coyoteTime: 0,
      jumpBuffer: 0,
    } as Player,
    platforms: JSON.parse(JSON.stringify(level.platforms)) as Platform[],
    toads: JSON.parse(JSON.stringify(level.toads)) as Toad[],
    collectibles: JSON.parse(JSON.stringify(level.collectibles)) as Collectible[],
    particles: [] as Particle[],
    cameraX: 0,
    cameraY: 0,
    worldMinY: computeVerticalBounds(level).minY,
    worldMaxY: computeVerticalBounds(level).maxY,
    keys: {} as { [key: string]: boolean },
    frameId: 0,
    lastTime: 0,
    levelLength: level.endX + 350,
    timeRemaining: level.timeLimit ?? 0,
    timeExpired: false,
    deathTimer: 0,
    victoryTimer: 0,
    isMuted: false,
    groundedPlatformId: null as string | null,
    puzzleSolved: false,
    puzzleHit: false,
  });

  // Keep volumes synced with audioSynth
  useEffect(() => {
    audioSynth.setVolumes(settings.soundVolume, settings.musicVolume);
  }, [settings.soundVolume, settings.musicVolume]);

  // Restart ambient music loop on level load/change
  useEffect(() => {
    if (stats.gameState !== 'playing') return;

    // Reset level states inside the ref
    const s = stateRef.current;
    s.player.x = level.startX;
    s.player.y = level.startY;
    s.player.vx = 0;
    s.player.vy = 0;
    s.player.isGrounded = false;
    s.player.doubleJumpAvailable = settings.doubleJumpEnabled;
    s.player.coyoteTime = 0;
    s.player.jumpBuffer = 0;
    s.player.isCrouching = false;
    s.player.height = 48;
    s.platforms = JSON.parse(JSON.stringify(level.platforms));
    s.toads = JSON.parse(JSON.stringify(level.toads));
    s.collectibles = JSON.parse(JSON.stringify(level.collectibles));
    s.particles = [];
    s.cameraX = 0;
    s.cameraY = 0;
    const verticalBounds = computeVerticalBounds(level);
    s.worldMinY = verticalBounds.minY;
    s.worldMaxY = verticalBounds.maxY;
    s.keys = {};
    s.timeRemaining = level.timeLimit ?? 0;
    s.timeExpired = false;
    s.deathTimer = 0;
    s.victoryTimer = 0;
    s.groundedPlatformId = null;
    s.puzzleSolved = false;
    s.puzzleHit = false;
    puzzleOpenedRef.current = false;
    setShowPuzzle(false);
    setPuzzleFeedback('idle');
    setPuzzleAnswers(level.puzzle ? new Array(level.puzzle.questions.length).fill(-1) : []);

    // Start background music loop
    audioSynth.startJungleMusic();

    return () => {
      // Cleanup
    };
  }, [level, settings.doubleJumpEnabled, stats.currentLevel, stats.gameState]);

  // Main Loop Setup
  useEffect(() => {
    // Canvas context
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Setup input listeners inside the loop context
    const handleKeyDown = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const key = e.key.toLowerCase();
      
      // Stop space bar scrolling page
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
      }

      s.keys[key] = true;
      s.keys[e.key] = true; // Support raw key case (e.g. "ArrowLeft")

      if (key === 'w' || e.key === ' ' || e.key === 'ArrowUp') {
        s.player.jumpBuffer = 8; // Buffer next 8 frames for late responsiveness
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const s = stateRef.current;
      const key = e.key.toLowerCase();
      s.keys[key] = false;
      s.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Dynamic initial canvas sizes (with safety resize handler)
    const resizeCanvas = () => {
      if (canvas) {
        // High DPI sharpness support
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = 420; // Fixed gaming box coordinate space
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Frame runner
    let lastStamp = performance.now();
    
    // Spawn simple fall leaves into screen
    const spawnPeriodicLeaves = () => {
      const s = stateRef.current;
      if (s.particles.length < 40 && Math.random() < 0.08) {
        s.particles.push({
          x: s.cameraX + Math.random() * canvas.width + 100,
          y: s.cameraY - 10,
          vx: -0.5 - Math.random() * 1.5,
          vy: 0.5 + Math.random() * 1.5,
          size: 4 + Math.random() * 6,
          color: `rgba(${34 + Math.floor(Math.random() * 50)}, ${140 + Math.floor(Math.random() * 80)}, 34, ${0.4 + Math.random() * 0.5})`,
          life: 0,
          maxLife: 300 + Math.random() * 200,
          type: 'leaf'
        });
      }
    };

    const loop = (timestamp: number) => {
      if (paused) {
        // Render pause message
        ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#10b981';
        ctx.textAlign = 'center';
        ctx.fillText(t.canvasGamePaused, canvas.width / 2, canvas.height / 2 - 10);
        ctx.font = '14px monospace';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(t.canvasPausedHint, canvas.width / 2, canvas.height / 2 + 25);
        return;
      }

      if (showPuzzle) {
        // Freeze the frame behind the quiz modal — no physics/timer ticking
        // while the riddle gate is open.
        return;
      }

      const s = stateRef.current;
      const dt = timestamp - lastStamp;
      lastStamp = timestamp;

      // Handle periodic game rules
      spawnPeriodicLeaves();

      if (level.timeLimit !== undefined && !s.timeExpired) {
        s.timeRemaining = Math.max(0, s.timeRemaining - dt * 0.001);
        if (s.timeRemaining <= 0) {
          s.timeExpired = true;
          audioSynth.playDeathSound();
          onStatsChange((prev: GameStats) => ({
            ...prev,
            gameState: 'game_over',
            score: Math.max(0, prev.score - 50)
          }));
        }
      }

      if (s.timeExpired) {
        drawGame(ctx, canvas, s);
        s.frameId = requestAnimationFrame(loop);
        return;
      }

      // PHYSICS UPDATES
      updatePhysics(s, settings);

      // COLLISION SYSTEMS
      resolveCollisions(s);

      // RIDDLE GATE: open the quiz overlay the first time the player bumps
      // into an unsolved puzzle wall
      if (s.puzzleHit && !puzzleOpenedRef.current) {
        puzzleOpenedRef.current = true;
        setShowPuzzle(true);
      }

      // AUDIO TRIGGER SAFETY
      // (Resume context if active input or clicks occur)
      if (s.keys[' '] || s.keys['a'] || s.keys['d'] || s.keys['w'] || s.keys['s']) {
        audioSynth.startJungleMusic();
      }

      // PAINT / RENDER CYCLE
      drawGame(ctx, canvas, s);

      s.frameId = requestAnimationFrame(loop);
    };

    stateRef.current.frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(stateRef.current.frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [level, paused, settings, showPuzzle, language]);

  // Core Physics state engine mimicking standard 2D Pygame physics
  const updatePhysics = (s: any, env: GameSettings) => {
    const p: Player = s.player;
    
    // Check if player is dead (fallen into swamp/abyss)
    if (p.y > 550) {
      if (s.deathTimer === 0) {
        s.deathTimer = 1;
        audioSynth.playDeathSound();
        spawnSplashes(s, p.x, 500);

        // Deduct statistics safely
        onStatsChange((prev: GameStats) => ({
          ...prev,
          deaths: prev.deaths + 1,
          score: Math.max(0, prev.score - 20)
        }));
      } else {
        s.deathTimer += 1;
        if (s.deathTimer > 40) {
          // Reset positioning to start point
          p.x = level.startX;
          p.y = level.startY;
          p.vx = 0;
          p.vy = 0;
          p.isGrounded = false;
          s.deathTimer = 0;
          s.cameraX = 0;
        }
      }
      return;
    }

    // Check if level goal reached
    const distToGoal = Math.abs(p.x - level.endX);
    if (distToGoal < 45 && Math.abs(p.y - level.endY) < 70) {
      if (s.victoryTimer === 0) {
        s.victoryTimer = 1;
        audioSynth.playLevelSuccess();
        spawnSparkles(s, level.endX, level.endY, 30);
        
        onStatsChange((prev: GameStats) => ({
          ...prev,
          score: prev.score + 150 + prev.bananasCollected * 10,
          gameState: 'level_completed'
        }));
      }
      return;
    }

    // Horizontal controls
    let moveDir = 0;
    if (s.keys['a'] || s.keys['arrowleft']) {
      moveDir = -1;
      p.facing = 'left';
    } else if (s.keys['d'] || s.keys['arrowright']) {
      moveDir = 1;
      p.facing = 'right';
    }

    // Applying speed (Jogging)
    const currentMaxSpeed = env.movementSpeed;
    if (moveDir !== 0) {
      p.vx += moveDir * 0.45;
      // Clamp speed
      if (p.vx > currentMaxSpeed) p.vx = currentMaxSpeed;
      if (p.vx < -currentMaxSpeed) p.vx = -currentMaxSpeed;
      
      p.state = p.isGrounded ? 'running' : p.vy < 0 ? 'jumping' : 'falling';
      
      // Double swing timer for character sprits
      p.animTimer += 1;
      if (p.animTimer > 6) {
        p.animFrame = (p.animFrame + 1) % 4;
        p.animTimer = 0;

        // Emit light jogging dust
        if (p.isGrounded && Math.random() < 0.4) {
          s.particles.push({
            x: p.x + p.width / 2 - (moveDir * 10),
            y: p.y + p.height,
            vx: -moveDir * 0.6 + (Math.random() - 0.5) * 0.5,
            vy: -0.2 - Math.random() * 0.5,
            size: 2 + Math.random() * 25 / 10,
            color: 'rgba(212, 163, 115, 0.4)',
            life: 0,
            maxLife: 20 + Math.random() * 15,
            type: 'dust'
          });
        }
      }
    } else {
      // Natural jungle slide deceleration
      p.vx *= 0.82;
      if (Math.abs(p.vx) < 0.15) p.vx = 0;
      p.state = p.isGrounded ? 'idle' : p.vy < 0 ? 'jumping' : 'falling';
    }

    // Crouching
    if (s.keys['s'] || s.keys['arrowdown']) {
      if (!p.isCrouching) {
        p.isCrouching = true;
        p.height = 30; // shrink bounding box
        p.y += 18;     // adjust Y so player doesn't hover
      }
    } else {
      if (p.isCrouching) {
        p.isCrouching = false;
        p.height = 48; // restore normal size
        p.y -= 18;
      }
    }

    // Apply gravity
    p.vy += env.gravity;
    // Terminal falling velocity clamp (Pygame standard)
    if (p.vy > 13) p.vy = 13;

    // Coyote Time countdown
    if (p.isGrounded) {
      p.coyoteTime = 8; // Number of frames you can still jump after leaving ground
    } else {
      p.coyoteTime = Math.max(0, p.coyoteTime - 1);
    }

    // Jump buffer decrements
    p.jumpBuffer = Math.max(0, p.jumpBuffer - 1);

    // Jump Logic
    if (p.jumpBuffer > 0) {
      if (p.isGrounded || p.coyoteTime > 0) {
        // Trigger normal jump
        p.vy = -env.jumpForce;
        p.isGrounded = false;
        p.coyoteTime = 0;
        p.jumpBuffer = 0;
        audioSynth.playJump();
        spawnDustKick(s, p.x + p.width / 2, p.y + p.height);
      } else if (env.doubleJumpEnabled && p.doubleJumpAvailable) {
        // Trigger magical jungle slide/double jump
        p.vy = -(env.jumpForce * 0.85);
        p.doubleJumpAvailable = false;
        p.jumpBuffer = 0;
        audioSynth.playJump();
        spawnSparkles(s, p.x + p.width / 2, p.y + p.height / 2, 8);
      }
    }

    // Apply velocities to coordinates
    p.x += p.vx;
    p.y += p.vy;

    // Horiz limits
    if (p.x < 10) {
      p.x = 10;
      p.vx = 0;
    }
    if (p.x > s.levelLength - 100) {
      p.x = s.levelLength - 100;
      p.vx = 0;
    }

    // Riddle Gate: invisible wall blocks progress until the quiz is solved
    if (level.puzzle && !s.puzzleSolved && p.x + p.width > level.puzzle.triggerX) {
      p.x = level.puzzle.triggerX - p.width;
      if (p.vx > 0) p.vx = 0;
      s.puzzleHit = true;
    }

    // Moving Platform horizontal & vertical updates
    s.platforms.forEach((plat: Platform) => {
      if (plat.moving && plat.startX !== undefined && plat.startY !== undefined && plat.range !== undefined && plat.speed !== undefined) {
        if (!s.platTimers) s.platTimers = {};
        if (!s.platTimers[plat.id]) s.platTimers[plat.id] = 0;
        
        s.platTimers[plat.id] += plat.speed * 0.015;
        const offset = Math.sin(s.platTimers[plat.id]) * plat.range;

        const oldX = plat.x;
        const oldY = plat.y;

        if (plat.type === 'vine_bridge') {
          // Horizontal moving
          plat.x = plat.startX + offset;
        } else {
          // Vertical moving
          plat.y = plat.startY + offset;
        }

        const dx = plat.x - oldX;
        const dy = plat.y - oldY;

        // Sticky riding check:
        // True if player was grounded on this specific platform in the last collision step, or fits the bounding box safely
        const isRiding = (p.isGrounded && s.groundedPlatformId === plat.id) ||
                         (p.isGrounded && p.y + p.height >= oldY - 4 && p.y + p.height <= oldY + 14 && p.x + p.width > Math.min(oldX, plat.x) && p.x < Math.max(oldX + plat.width, plat.x + plat.width));

        if (isRiding) {
          p.x += dx;
          p.y += dy;
        }
      }
    });

    // Update Toads (Springing squish animations)
    s.toads.forEach((toad: Toad) => {
      if (toad.isSquished) {
        toad.squishTimer += 1;
        if (toad.squishTimer > 15) {
          toad.isSquished = false;
          toad.squishTimer = 0;
        }
      }
    });

    // Bobbing Collectibles
    s.collectibles.forEach((col: Collectible) => {
      col.bobOffset += 3;
    });

    // Particle state updates
    s.particles = s.particles.filter((part: Particle) => {
      part.life += 1;
      part.x += part.vx;
      part.y += part.vy;
      
      // Sway swaying leaves
      if (part.type === 'leaf') {
        part.vx += Math.sin(part.life / 10) * 0.04;
      }
      return part.life < part.maxLife;
    });
  };

  // Rect collision resolver standard to retro platformers
  const resolveCollisions = (s: any) => {
    const p: Player = s.player;
    if (s.deathTimer > 0) return;

    let onGroundThisFrame = false;
    let currentGroundedPlatId: string | null = null;

    // Check platform collisions
    s.platforms.forEach((plat: Platform) => {
      // Direct collision filters (Check bounding overlap)
      const collidesHoriz = p.x + p.width > plat.x && p.x < plat.x + plat.width;
      const collidesVert = p.y + p.height >= plat.y && p.y + p.height <= plat.y + 16;

      if (collidesHoriz && collidesVert && p.vy >= 0) {
        // Safe land
        p.y = plat.y - p.height;
        p.vy = 0;
        onGroundThisFrame = true;
        currentGroundedPlatId = plat.id;
        p.doubleJumpAvailable = settings.doubleJumpEnabled; // restore double jump
      }
    });

    // Check Toads springing collisions
    s.toads.forEach((toad: Toad) => {
      const collidesHoriz = p.x + p.width >= toad.x - 4 && p.x <= toad.x + toad.width + 4;
      const collidesVert = p.y + p.height >= toad.y && p.y + p.height <= toad.y + 16;

      if (collidesHoriz && collidesVert && p.vy >= 0) {
        // Spring launcher activate!
        toad.isSquished = true;
        toad.squishTimer = 0;
        
        // Propel Mowgli high! Holding space bar doubles the fun/strength
        const dynamicBoingMultiplier = (s.keys[' '] || s.keys['w'] || s.keys['arrowup']) ? 1.25 : 0.95;
        p.vy = -(toad.springForce * dynamicBoingMultiplier);
        p.isGrounded = false;
        p.doubleJumpAvailable = settings.doubleJumpEnabled;

        audioSynth.playToadBoing();
        
        // Spawn energetic dust/star sparkles under toad
        spawnSparkles(s, toad.x + toad.width/2, toad.y, 14);

        // Score increase for toad tricks
        onStatsChange((prev: GameStats) => ({
          ...prev,
          score: prev.score + 10
        }));
      }
    });

    // Collectibles collisions
    s.collectibles.forEach((col: Collectible) => {
      if (col.collected) return;

      const halfW = 12;
      const collides = Math.abs(p.x + p.width / 2 - col.x) < 22 && 
                       Math.abs(p.y + p.height / 2 - col.y) < 28;

      if (collides) {
        col.collected = true;
        audioSynth.playBananaChime();
        spawnSparkles(s, col.x, col.y, 6);

        let bonusXP = 15;
        if (col.type === 'mango') bonusXP = 30;
        if (col.type === 'star') bonusXP = 100;

        if (level.timeLimit !== undefined) {
          const timeBonusBase = level.collectibleBonusSeconds ?? 2;
          const timeBonus = col.type === 'banana' ? timeBonusBase : col.type === 'mango' ? timeBonusBase * 2 : timeBonusBase * 3;
          s.timeRemaining += timeBonus;
          bonusXP += 5; // extra reward for timed level collection
        }

        onStatsChange((prev: GameStats) => ({
          ...prev,
          bananasCollected: prev.bananasCollected + 1,
          score: prev.score + bonusXP
        }));
      }
    });

    p.isGrounded = onGroundThisFrame;
    s.groundedPlatformId = currentGroundedPlatId;
  };

  // Particle Emitters
  const spawnDustKick = (s: any, targetX: number, targetY: number) => {
    for (let i = 0; i < 6; i++) {
      s.particles.push({
        x: targetX,
        y: targetY - 2,
        vx: (Math.random() - 0.5) * 2,
        vy: -0.4 - Math.random() * 0.6,
        size: 3 + Math.random() * 4,
        color: 'rgba(215, 179, 137, 0.45)',
        life: 0,
        maxLife: 20 + Math.random() * 10,
        type: 'dust'
      });
    }
  };

  const spawnSparkles = (s: any, targetX: number, targetY: number, count = 8) => {
    const rainbowColors = ['#fde047', '#facc15', '#67e8f9', '#ff007f', '#a855f7'];
    for (let i = 0; i < count; i++) {
      const randColor = rainbowColors[Math.floor(Math.random() * rainbowColors.length)];
      s.particles.push({
        x: targetX,
        y: targetY,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 - 1,
        size: 2 + Math.random() * 3,
        color: randColor,
        life: 0,
        maxLife: 30 + Math.random() * 20,
        type: 'sparkle'
      });
    }
  };

  const spawnSplashes = (s: any, targetX: number, targetY: number) => {
    for (let i = 0; i < 15; i++) {
      s.particles.push({
        x: targetX,
        y: targetY,
        vx: (Math.random() - 0.5) * 3,
        vy: -2 - Math.random() * 4,
        size: 3 + Math.random() * 4,
        color: 'rgba(34, 197, 94, 0.7)', // Swampy muck splash
        life: 0,
        maxLife: 35 + Math.random() * 15,
        type: 'splash'
      });
    }
  };

  // Precise vector geometries representation for Retro aesthetics
  const drawGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, s: any) => {
    const p: Player = s.player;

    // 1. Calculate camera position centering player
    const optimalCamX = p.x - canvas.width / 2.5;
    const maxScroll = s.levelLength - canvas.width;
    s.cameraX = Math.max(0, Math.min(maxScroll, optimalCamX));

    // Vertical follow: keep the player roughly centered, but never scroll
    // past the level's actual playable vertical extent (so platforms near
    // the bottom of tall levels stay on-screen instead of being clipped).
    const optimalCamY = p.y - canvas.height / 2.2;
    const minScrollY = Math.min(0, s.worldMinY - 80);
    const maxScrollY = Math.max(0, s.worldMaxY + 80 - canvas.height);
    s.cameraY = Math.max(minScrollY, Math.min(maxScrollY, optimalCamY));

    // Clear background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 2. Parallax Backdrop 
    // Sunset orange Sky
    const gradientSky = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradientSky.addColorStop(0, '#101726'); // dark night twilight
    gradientSky.addColorStop(0.5, '#1e1b4b'); // deep purple
    gradientSky.addColorStop(1, '#115e59'); // warm jungle mist
    ctx.fillStyle = gradientSky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Parallax Far Mountains/Sillhouettes (scroll speed: 0.1)
    ctx.fillStyle = '#064e3b';
    ctx.globalAlpha = 0.2;
    for (let i = 0; i < 6; i++) {
      const xPos = (i * 350 - (s.cameraX * 0.12)) % (canvas.width + 400);
      drawJungleCanopyHill(ctx, xPos, canvas.height - 80, 240, 110);
    }

    // Midground Jungle Ruins & Giant Stems (scroll speed: 0.45)
    ctx.fillStyle = '#0f2922';
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 5; i++) {
      const xPos = (i * 500 - (s.cameraX * 0.35)) % (canvas.width + 500);
      // Trunk pillar
      ctx.fillRect(xPos + 50, 0, 60, canvas.height);
      // Leaves branch
      drawJungleCanopyHill(ctx, xPos + 80, 120, 190, 80);
    }
    ctx.globalAlpha = 1.0;

    // Draw Swamp / Mud Base under the stage
    ctx.fillStyle = 'rgba(6, 78, 59, 0.9)';
    ctx.fillRect(0, canvas.height - 35, canvas.width, 35);
    
    // Draw poison green bubbles rising from the bog mud
    ctx.fillStyle = 'rgba(74, 222, 128, 0.45)';
    for (let b = 0; b < 10; b++) {
      const bX = (b * 160 - s.cameraX * 0.8) % canvas.width;
      const bY = canvas.height - 35 - Math.abs(Math.sin((s.frameId + b * 20) / 15) * 12);
      ctx.beginPath();
      ctx.arc(bX, bY, 3 + (b % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    // Translate coordinates so everything slides with camera
    ctx.save();
    ctx.translate(-s.cameraX, -s.cameraY);

    // 3. Draw Platforms
    s.platforms.forEach((plat: Platform) => {
      // Platform moss pattern textures
      if (plat.type === 'moss_log') {
        // Brown Wood core
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 6);
        ctx.fill();

        // Lush Green moss cap
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.width, 10, [6, 6, 0, 0]);
        ctx.fill();

        // Wood texture details
        ctx.strokeStyle = '#451a03';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(plat.x + 15, plat.y + 22);
        ctx.lineTo(plat.x + plat.width - 20, plat.y + 22);
        ctx.moveTo(plat.x + 30, plat.y + 30);
        ctx.lineTo(plat.x + plat.width - 50, plat.y + 30);
        ctx.stroke();

      } else if (plat.type === 'canopy_leaves') {
        // Soft green leave bundle path
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 12);
        ctx.fill();

        // Leaf outline arcs
        ctx.strokeStyle = '#14532d';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#22c55e';
        // Add highlighted concentric leaf design
        ctx.beginPath();
        ctx.ellipse(plat.x + plat.width / 2, plat.y + plat.height / 2, plat.width / 2.3, plat.height / 3, 0, 0, Math.PI * 2);
        ctx.fill();

      } else if (plat.type === 'vine_bridge') {
        // Rustic rope bridge
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(plat.x, plat.y + 12);
        ctx.quadraticCurveTo(plat.x + plat.width/2, plat.y + 25, plat.x + plat.width, plat.y + 12);
        ctx.stroke();

        // Planks
        ctx.fillStyle = '#653110';
        const plankW = 14;
        const spacing = 22;
        const count = Math.floor(plat.width / spacing);
        for (let i = 0; i < count; i++) {
          const px = plat.x + i * spacing + 4;
          // compute drop on parabola
          const t = i / count;
          const py = plat.y + 12 + 13 * (4 * t * (1 - t));
          ctx.fillRect(px, py, plankW, 8);
        }
      } else {
        // Ancient shrine/brick block
        ctx.fillStyle = '#475569';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // Brick seams
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.width, plat.height);
        
        ctx.beginPath();
        for (let bx = 30; bx < plat.width; bx += 30) {
          ctx.moveTo(plat.x + bx, plat.y);
          ctx.lineTo(plat.x + bx, plat.y + plat.height);
        }
        ctx.stroke();

        // Green moss creepers
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(plat.x + 5, plat.y, 15, 6);
        ctx.fillRect(plat.x + plat.width - 25, plat.y, 20, 4);
      }
    });

    // 4. Draw Toads!
    s.toads.forEach((toad: Toad) => {
      ctx.save();
      // Squish animation scale
      let scaleY = 1.0;
      let scaleX = 1.0;
      let offsetY = 0;

      if (toad.isSquished) {
        // Sine scale curve
        const t = toad.squishTimer / 15;
        scaleY = 0.5 + 0.5 * Math.sin(t * Math.PI);
        scaleX = 1.4 - 0.4 * Math.sin(t * Math.PI);
        offsetY = toad.height * (1 - scaleY);
      }

      ctx.translate(toad.x + toad.width/2, toad.y + toad.height);
      ctx.scale(scaleX, scaleY);

      // Main toad body
      ctx.fillStyle = toad.color;
      ctx.beginPath();
      ctx.arc(0, -8, 20, Math.PI, 0); // Toad shell
      ctx.fill();

      // Flat leg base
      ctx.fillStyle = adjustBrightness(toad.color, -20);
      ctx.fillRect(-22, -4, 44, 4);

      // Cheeky white or gold poison spots
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-8, -14, 3.5, 0, Math.PI * 2);
      ctx.arc(8, -12, 4.5, 0, Math.PI * 2);
      ctx.arc(0, -18, 3, 0, Math.PI * 2);
      ctx.fill();

      // Cute big yellow popping springy eyes
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(-11, -20, 5, 0, Math.PI * 2);
      ctx.arc(11, -20, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Slit pupils
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-12, -22, 2, 4);
      ctx.fillRect(10, -22, 2, 4);

      // Toad grin mouth
      ctx.strokeStyle = '#1e1b4b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, -8, 6, 0.1, Math.PI - 0.1);
      ctx.stroke();

      ctx.restore();
    });

    // 5. Draw Collectibles (Bananas/Mangoes)
    s.collectibles.forEach((col: Collectible) => {
      if (col.collected) return;

      const bobY = col.y + Math.sin((s.frameId + col.bobOffset) / 10) * 3.5;

      if (col.type === 'banana') {
        ctx.fillStyle = '#facc15'; // yellow banana
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        // Moon shape arc
        ctx.arc(col.x, bobY, 12, 0.1, Math.PI - 0.1);
        ctx.quadraticCurveTo(col.x, bobY - 2, col.x - 10, bobY - 1);
        ctx.fill();
        ctx.stroke();

        // Crown tag
        ctx.fillStyle = '#451a03';
        ctx.fillRect(col.x + 8, bobY + 1, 3, 2.5);

      } else if (col.type === 'mango') {
        const mangoGradient = ctx.createRadialGradient(col.x - 3, bobY - 3, 2, col.x, bobY, 11);
        mangoGradient.addColorStop(0, '#fca5a5');
        mangoGradient.addColorStop(0.4, '#f59e0b');
        mangoGradient.addColorStop(1, '#dc2626');

        ctx.fillStyle = mangoGradient;
        ctx.beginPath();
        ctx.ellipse(col.x, bobY, 9, 13, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();

        // Mango green stem
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(col.x - 1, bobY - 15, 2.5, 4);

      } else {
        // Golden Star
        drawStarShape(ctx, col.x, bobY, 5, 12, 5);
      }
    });

    // 6. Draw Safety Portal Gate at levelEndX
    const pulseScale = 1.0 + Math.sin(s.frameId / 8) * 0.08;
    const portalX = level.endX;
    const portalY = level.endY;

    // Draw glowing back circle aura (Vibrant fuchsia energy)
    const outerAura = ctx.createRadialGradient(portalX, portalY, 5, portalX, portalY, 55 * pulseScale);
    outerAura.addColorStop(0, 'rgba(236, 72, 153, 0.45)');
    outerAura.addColorStop(0.6, 'rgba(168, 85, 247, 0.25)');
    outerAura.addColorStop(1, 'rgba(217, 70, 239, 0.0)');
    ctx.fillStyle = outerAura;
    ctx.beginPath();
    ctx.arc(portalX, portalY, 55 * pulseScale, 0, Math.PI * 2);
    ctx.fill();

    // Ancient stone portal frame
    ctx.strokeStyle = '#a21caf';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(portalX, portalY, 40, 0, Math.PI, true);
    ctx.stroke();
    ctx.fillStyle = '#701a75';
    ctx.fillRect(portalX - 44, portalY, 8, 45);
    ctx.fillRect(portalX + 36, portalY, 8, 45);

    // Spiraling portal center effect
    const rotSpeed = s.frameId * 0.05;
    ctx.save();
    ctx.translate(portalX, portalY);
    ctx.rotate(rotSpeed);
    
    // Portal energy spiral lines Drawing
    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 3;
    for (let r = 0; r < 4; r++) {
      ctx.beginPath();
      ctx.arc(0, 0, 32 - r * 6, 0, Math.PI, false);
      ctx.stroke();
    }
    ctx.restore();

    // Small label reading SAFETY
    ctx.fillStyle = '#f472b6';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(t.canvasSafetyGate, portalX, portalY - 48);

    // 7. Draw MOWGLI character!
    if (s.deathTimer === 0) {
      drawMowgli(ctx, p);
    }

    // 8. Draw active particles
    s.particles.forEach((part: Particle) => {
      ctx.fillStyle = part.color;
      if (part.type === 'leaf') {
        // Draw leaf diamond outline
        ctx.save();
        ctx.translate(part.x, part.y);
        ctx.rotate(part.life / 20);
        ctx.beginPath();
        ctx.ellipse(0, 0, part.size, part.size / 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (part.type === 'sparkle') {
        // Sparkle star points representation
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (part.type === 'dust') {
        // Puffy cloud dust
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Splash droplet droplets
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.size, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore(); // Restore camera translation

    // 9. Display active status text or warning
    if (controlsPrompt) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(15, 12, 195, 45);
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(15, 12, 195, 45);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#2dd4bf';
      ctx.textAlign = 'left';
      ctx.fillText(t.canvasTipMove, 24, 28);
      ctx.fillText(t.canvasTipJump, 24, 44);
    }

    if (level.timeLimit !== undefined) {
      const timeColor = s.timeRemaining <= 4 ? '#fb7185' : '#f8fafc';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
      ctx.fillRect(canvas.width - 150, 12, 138, 34);
      ctx.strokeStyle = '#0f766e';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(canvas.width - 150, 12, 138, 34);
      ctx.font = 'bold 16px monospace';
      ctx.fillStyle = timeColor;
      ctx.textAlign = 'right';
      const timeText = `${t.canvasTime} ${Math.max(0, Math.ceil(s.timeRemaining))}s`;
      ctx.fillText(timeText, canvas.width - 18, 36);
    }
  };

  const drawJungleCanopyHill = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number, h: number) => {
    ctx.beginPath();
    ctx.moveTo(x - r, y + h);
    ctx.ellipse(x, y + h, r, h, 0, Math.PI, 0);
    ctx.lineTo(x + r, y + h);
    ctx.fill();
  };

  // Human-colored character Mowgli styled vector drawing loop
  const drawMowgli = (ctx: CanvasRenderingContext2D, p: Player) => {
    ctx.save();
    
    // Translation to character origin
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

    // Face left flip support
    if (p.facing === 'left') {
      ctx.scale(-1, 1);
    }

    // Determine motion sway offsets
    const runFrame = p.animFrame;
    const isRunning = p.state === 'running';
    const isJumping = p.state === 'jumping';
    const isFalling = p.state === 'falling';

    let legOffset1 = 0;
    let legOffset2 = 0;
    let armOffset = 0;
    let headBob = 0;

    if (isRunning) {
      const swing = Math.sin((p.animFrame * Math.PI) / 2);
      legOffset1 = swing * 11;
      legOffset2 = -swing * 11;
      armOffset = -swing * 9;
      headBob = Math.abs(swing) * 2.5;
    } else if (isJumping || isFalling) {
      legOffset1 = 8;
      legOffset2 = -8;
      armOffset = 12;
    }

    // A. Mowgli's Athletic Legs
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#c2410c'; // Skin / mud tone brown-orange leg highlight
    ctx.lineCap = 'round';

    // Leg 1 (Front Leg)
    ctx.beginPath();
    ctx.moveTo(-5, 8);
    ctx.lineTo(-7 + legOffset1, 22);
    ctx.stroke();

    // Leg 2 (Back Leg)
    ctx.beginPath();
    ctx.moveTo(3, 8);
    ctx.lineTo(5 + legOffset2, 22);
    ctx.stroke();

    // B. Signature Orange Jungle Loincloth (Mowgli loinwrap)
    ctx.fillStyle = '#f97316'; // Vivid orange loincloth wrap
    ctx.beginPath();
    ctx.roundRect(-9, -2, 18, 12, 3);
    ctx.fill();
    // Wrap design lines
    ctx.fillStyle = '#ea580c';
    ctx.fillRect(-9, 5, 18, 2);

    // C. Mowgli's Athletic Torso
    ctx.fillStyle = '#c2410c'; // Sunkissed deep tan skin
    ctx.beginPath();
    ctx.roundRect(-6, -18, 12, 17, 4);
    ctx.fill();

    // Neck
    ctx.fillStyle = '#bc3f0b';
    ctx.fillRect(-2.5, -20, 5, 4);

    // D. Athletic Arms
    ctx.strokeStyle = '#bc3f0b';
    ctx.lineWidth = 3.5;
    
    // Arm (Leaping pose)
    ctx.beginPath();
    ctx.moveTo(-4, -15);
    ctx.lineTo(-10 + armOffset, -8);
    ctx.stroke();

    // E. Sunkissed Head & Messy Wild Jungle Hair
    const headY = -25 - headBob;
    
    // Face skull
    ctx.fillStyle = '#c2410c';
    ctx.beginPath();
    ctx.arc(0, headY, 7.5, 0, Math.PI * 2);
    ctx.fill();

    // Wild Black hair (Mowgli's signature messy wild look)
    ctx.fillStyle = '#0f172a'; // Off black wild hair
    
    // Hair cap
    ctx.beginPath();
    ctx.arc(0, headY - 1, 8.5, Math.PI, 0); // Upper cap
    ctx.fill();

    // Wild spiky hair strands around skull
    ctx.beginPath();
    ctx.moveTo(-8.5, headY - 1);
    ctx.lineTo(-12, headY);
    ctx.lineTo(-8, headY + 3);
    
    ctx.lineTo(-5, headY + 6); // locks on side
    ctx.lineTo(-2, headY + 8);
    
    ctx.lineTo(0, headY - 3);
    ctx.lineTo(4, headY - 6);
    
    ctx.lineTo(8.5, headY - 1);
    ctx.lineTo(11, headY + 3);
    ctx.lineTo(7, headY + 5);
    ctx.fill();

    // Messy bangs on forehead
    ctx.beginPath();
    ctx.moveTo(-8, headY - 3);
    ctx.quadraticCurveTo(-2, headY - 6, 2, headY - 3);
    ctx.lineTo(0, headY + 1);
    ctx.fill();

    // F. Cute shining eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(3, headY - 1, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(4, headY - 1, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawStarShape = (ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    let step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  // Quick brightness helper for procedural colors
  const adjustBrightness = (hex: string, percent: number) => {
    let R = parseInt(hex.substring(1, 3), 16);
    let G = parseInt(hex.substring(3, 5), 16);
    let B = parseInt(hex.substring(5, 7), 16);

    R = parseInt(((R * (100 + percent)) / 100).toString());
    G = parseInt(((G * (100 + percent)) / 100).toString());
    B = parseInt(((B * (100 + percent)) / 100).toString());

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    const rHex = R.toString(16).padStart(2, '0');
    const gHex = G.toString(16).padStart(2, '0');
    const bHex = B.toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  };

  // On-Screen touch control clicks
  const pressKeyboardSim = (key: string, press: boolean) => {
    const s = stateRef.current;
    s.keys[key] = press;
    if (press && (key === ' ' || key === 'w')) {
      s.player.jumpBuffer = 8;
    }
  };

  // Riddle Gate quiz interactions
  const handlePuzzleChoice = (questionIdx: number, choiceIdx: number) => {
    setPuzzleAnswers((prev) => {
      const next = [...prev];
      next[questionIdx] = choiceIdx;
      return next;
    });
    setPuzzleFeedback('idle');
  };

  const handlePuzzleSubmit = () => {
    if (!level.puzzle) return;
    const allCorrect = level.puzzle.questions.every((q, i) => puzzleAnswers[i] === q.correctIndex);
    const s = stateRef.current;

    if (allCorrect) {
      s.puzzleSolved = true;
      setShowPuzzle(false);
      setPuzzleFeedback('idle');
      audioSynth.playLevelSuccess();
      if (level.timeLimit !== undefined) {
        s.timeRemaining += 5; // reward bonus time for solving the riddle
      }
      onStatsChange((prev: GameStats) => ({ ...prev, score: prev.score + 50 }));
    } else {
      setPuzzleFeedback('wrong');
      audioSynth.playWrongAnswer();
      if (level.timeLimit !== undefined) {
        s.timeRemaining = Math.max(1, s.timeRemaining - 3); // small penalty, never zeroes the clock outright
      }
    }
  };

  return (
    <div className="flex flex-col items-center bg-slate-950/80 border-4 border-slate-900 rounded-3xl p-4 shadow-inner relative overflow-hidden" id="gamer-box">
      
      {/* Top HUD Row */}
      <div className="w-full flex justify-between items-center mb-2 px-1 text-gray-300 font-mono text-xs select-none">
        <div className="flex items-center gap-2">
          <Landmark className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-300 font-bold uppercase tracking-wider">{levelText.name}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-amber-300 font-semibold">{stats.score} XP</span>
          </span>
          <button
            onClick={onTogglePause}
            className="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-md border border-slate-700 cursor-pointer"
            id="btn-pause-toggle"
            title={t.pauseTooltip}
          >
            {paused ? t.resume : t.pause}
          </button>
        </div>
      </div>

      {/* Main retro gaming box canvas container */}
      <div className="w-full relative bg-slate-900 border-2 border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <canvas
          ref={canvasRef}
          className="w-full block h-[420px] bg-slate-900 cursor-crosshair"
          title={t.canvasTitle}
          id="jungle-platformer-canvas"
        />

        {/* Hover overlay hint controls toggler */}
        <button
          onClick={() => setControlsPrompt(!controlsPrompt)}
          className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg border border-slate-800 transition-colors text-[10px] uppercase tracking-wider cursor-pointer"
          title={t.tipsToggleTooltip}
          id="btn-toggle-tips"
        >
          {controlsPrompt ? t.hideTips : t.showKeys}
        </button>

        {/* Level completed screen */}
        {stats.gameState === 'level_completed' && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-sm z-10" id="screen-level-complete">
            <div className="animate-bounce mb-3 bg-emerald-500/20 p-3 rounded-full border border-emerald-500/50">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-black text-emerald-400 uppercase tracking-widest font-sans">{t.levelCompleteTitle}</h2>
            <p className="text-sm text-gray-300 max-w-sm mt-2 mb-6 font-mono font-medium">
              {t.levelCompleteBody}
            </p>
            <div className="flex gap-4">
              <button
                onClick={onRestartLevel}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm px-5 py-2.5 rounded-xl border border-slate-700 cursor-pointer"
                id="btn-replay-complete"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.replayStage}</span>
              </button>
              <button
                onClick={onNextLevel}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl border border-emerald-500 shadow-md cursor-pointer"
                id="btn-next-complete"
              >
                <Play className="w-4 h-4" />
                <span>{t.nextStage}</span>
              </button>
            </div>
          </div>
        )}

        {/* Game over by timeout */}
        {stats.gameState === 'game_over' && (
          <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center select-none backdrop-blur-sm z-10" id="screen-timeout-failure">
            <div className="animate-pulse mb-3 bg-rose-500/20 p-3 rounded-full border border-rose-500/40">
              <PlayCircle className="w-12 h-12 text-rose-400" />
            </div>
            <h2 className="text-2xl font-black text-rose-400 uppercase tracking-widest font-sans">{t.timesUpTitle}</h2>
            <p className="text-sm text-gray-300 max-w-sm mt-2 mb-6 font-mono font-medium">
              {t.timesUpBody}
            </p>
            <div className="flex gap-4">
              <button
                onClick={onRestartLevel}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-white font-mono text-sm px-5 py-2.5 rounded-xl border border-slate-700 cursor-pointer"
                id="btn-restart-timeout"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{t.restartStage}</span>
              </button>
            </div>
          </div>
        )}

        {/* Riddle Gate quiz overlay */}
        {showPuzzle && level.puzzle && puzzleText && (
          <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center p-5 text-center select-none backdrop-blur-sm z-20 overflow-y-auto" id="puzzle-gate-modal">
            <div className="w-full max-w-md space-y-4 my-auto py-2">
              <h2 className="text-lg font-black text-amber-300 uppercase tracking-wide font-sans">{puzzleText.title}</h2>
              <p className="text-xs text-gray-300 leading-relaxed">{puzzleText.intro}</p>

              <div className="space-y-3 text-left">
                {puzzleText.questions.map((q, qIdx) => (
                  <div key={qIdx} className="bg-[#1d0735]/80 border border-amber-500/25 rounded-xl p-3" id={`puzzle-q-${qIdx}`}>
                    <p className="text-xs font-bold text-white mb-2">{qIdx + 1}. {q.question}</p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {q.choices.map((choice, cIdx) => (
                        <button
                          key={cIdx}
                          onClick={() => handlePuzzleChoice(qIdx, cIdx)}
                          className={`text-left text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                            puzzleAnswers[qIdx] === cIdx
                              ? 'bg-amber-500/30 border-amber-400 text-amber-100 font-bold'
                              : 'bg-slate-900/60 border-slate-700 text-gray-300 hover:bg-slate-800'
                          }`}
                          id={`puzzle-q-${qIdx}-choice-${cIdx}`}
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {puzzleFeedback === 'wrong' && (
                <p className="text-xs font-bold text-rose-400" id="puzzle-feedback-wrong">
                  {t.wrongFeedback}
                </p>
              )}

              <button
                onClick={handlePuzzleSubmit}
                disabled={puzzleAnswers.some((a) => a === -1)}
                className={`w-full font-bold text-sm px-6 py-2.5 rounded-xl border cursor-pointer ${
                  puzzleAnswers.some((a) => a === -1)
                    ? 'bg-slate-800 text-gray-500 border-slate-700 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-lg'
                }`}
                id="btn-puzzle-submit"
              >
                {t.answerRiddle}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Touch UI overlay - Perfect to let review users play immediately without keyboard! */}
      <div className="w-full mt-4 flex items-center justify-between gap-6 px-1 select-none" id="touch-controls-pane">
        
        {/* Left directional touch button cluster */}
        <div className="flex gap-2">
          <button
            onMouseDown={() => pressKeyboardSim('a', true)}
            onMouseUp={() => pressKeyboardSim('a', false)}
            onMouseLeave={() => pressKeyboardSim('a', false)}
            onTouchStart={() => pressKeyboardSim('a', true)}
            onTouchEnd={() => pressKeyboardSim('a', false)}
            className="w-14 h-14 bg-slate-800/80 hover:bg-slate-700 text-gray-200 hover:text-white rounded-2xl flex items-center justify-center text-xl font-black border-2 border-slate-700/80 active:scale-95 transition-transform touch-none select-none"
            title={t.moveLeft}
            id="touch-left"
          >
            ◀
          </button>
          <button
            onMouseDown={() => pressKeyboardSim('d', true)}
            onMouseUp={() => pressKeyboardSim('d', false)}
            onMouseLeave={() => pressKeyboardSim('d', false)}
            onTouchStart={() => pressKeyboardSim('d', true)}
            onTouchEnd={() => pressKeyboardSim('d', false)}
            className="w-14 h-14 bg-slate-800/80 hover:bg-slate-700 text-gray-200 hover:text-white rounded-2xl flex items-center justify-center text-xl font-black border-2 border-slate-700/80 active:scale-95 transition-transform touch-none"
            title={t.moveRight}
            id="touch-right"
          >
            ▶
          </button>
        </div>

        {/* Action jump / crouch touch cluster */}
        <div className="flex gap-2">
          <button
            onMouseDown={() => pressKeyboardSim('s', true)}
            onMouseUp={() => pressKeyboardSim('s', false)}
            onMouseLeave={() => pressKeyboardSim('s', false)}
            onTouchStart={() => pressKeyboardSim('s', true)}
            onTouchEnd={() => pressKeyboardSim('s', false)}
            className="w-14 h-14 bg-slate-800/80 hover:bg-slate-700 text-gray-300 hover:text-white rounded-2xl flex items-center justify-center text-xs font-mono border-2 border-slate-700/80 active:scale-95 transition-transform touch-none"
            title={t.crouchDrop}
            id="touch-crouch"
          >
            {t.downLabel}
          </button>

          <button
            onMouseDown={() => pressKeyboardSim(' ', true)}
            onMouseUp={() => pressKeyboardSim(' ', false)}
            onMouseLeave={() => pressKeyboardSim(' ', false)}
            onTouchStart={() => pressKeyboardSim(' ', true)}
            onTouchEnd={() => pressKeyboardSim(' ', false)}
            className="px-8 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-sm font-black tracking-wider border-2 border-emerald-500 active:scale-95 transition-transform shadow-lg shadow-emerald-950/20 touch-none uppercase"
            title={t.springJumpTooltip}
            id="touch-jump"
          >
            {t.springJumpLabel}
          </button>
        </div>

      </div>

    </div>
  );
}
