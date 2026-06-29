/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LevelBackgroundId } from './types';

// Tier 1 image-asset pipeline. Assets live in /public/assets and are loaded as
// <img> elements that the canvas draws via ctx.drawImage. Any entry here can be
// swapped for a hand-painted or AI-generated PNG by replacing the file at its
// path (keep the same key) — the renderers fall back to their original
// procedural drawing whenever an asset isn't ready, so nothing breaks mid-load.
export const ASSET_PATHS: Record<string, string> = {
  // Backgrounds (jungle platformer levels)
  bgSky: '/assets/bg-sky.svg',
  bgCanopyFar: '/assets/bg-canopy-far.svg',
  bgCanopyNear: '/assets/bg-canopy-near.svg',
  // Backgrounds (Prologue — Shere Khan's night raid)
  bgPrologueSky: '/assets/bg-prologue-sky.svg',
  bgPrologueFar: '/assets/bg-prologue-far.svg',
  bgPrologueNear: '/assets/bg-prologue-near.svg',
};

// Named background presets → the three parallax layer keys in ASSET_PATHS.
// GameCanvas uses this to pick a level's backdrop, and the level editor lists
// these keys automatically. Add a row (plus matching SVGs) for a new preset.
export const LEVEL_BACKGROUNDS: Record<
  LevelBackgroundId,
  { sky: string; far: string; near: string }
> = {
  jungle: { sky: 'bgSky', far: 'bgCanopyFar', near: 'bgCanopyNear' },
  night_raid: { sky: 'bgPrologueSky', far: 'bgPrologueFar', near: 'bgPrologueNear' },
};

const cache: Record<string, HTMLImageElement> = {};
let started = false;

// Separate cache for level-editor custom backgrounds supplied as data URLs.
const dataUrlCache: Record<string, HTMLImageElement> = {};

/** Kick off loading of every asset. Safe to call repeatedly. */
export function preloadAssets(): void {
  if (started || typeof window === 'undefined') return;
  started = true;
  for (const [name, path] of Object.entries(ASSET_PATHS)) {
    const img = new Image();
    img.decoding = 'async';
    img.src = path;
    cache[name] = img;
  }
}

/** Returns the image only once it's fully decoded; otherwise null (→ fallback). */
export function getImage(name: string): HTMLImageElement | null {
  const img = cache[name];
  if (img && img.complete && img.naturalWidth > 0) return img;
  return null;
}

/**
 * Lazily decode a custom background supplied as a data URL (from the level
 * editor's image upload) and cache it by URL. Returns the image only once it's
 * fully decoded; otherwise null so the caller can fall back to a preset.
 */
export function getImageFromDataUrl(url: string): HTMLImageElement | null {
  if (!url || typeof window === 'undefined') return null;
  let img = dataUrlCache[url];
  if (!img) {
    img = new Image();
    img.decoding = 'async';
    img.src = url;
    dataUrlCache[url] = img;
    return null;
  }
  if (img.complete && img.naturalWidth > 0) return img;
  return null;
}

/**
 * Tile an image horizontally across the viewport at a parallax offset. Drawn in
 * the pre-camera (screen) space, so `scrollX` is the already-scaled parallax
 * amount. Each tile is drawn at `tileW`×`drawH` starting at `y`.
 */
export function tileParallax(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  viewW: number,
  tileW: number,
  drawH: number,
  y: number,
  scrollX: number,
): void {
  let startX = -((scrollX % tileW + tileW) % tileW);
  for (let x = startX; x < viewW; x += tileW) {
    ctx.drawImage(img, x, y, tileW, drawH);
  }
}
