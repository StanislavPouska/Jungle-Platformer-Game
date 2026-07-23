/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NIGHT_SPRITE_PREFIX, Platform, SpriteDef, SpriteSet } from './types';
import { getImageFromDataUrl } from './assets';

/**
 * Whether a platformer platform visually extends down to the bottom of the
 * screen. Explicit `extendDown` wins; unset falls back to the historical
 * rule (non-moving logs and bricks look grounded, everything else floats).
 * Shared by the game renderer and the editor preview so they always agree.
 */
export function platformExtendsDown(plat: Platform): boolean {
  return plat.extendDown ?? (!plat.moving && (plat.type === 'moss_log' || plat.type === 'jungle_brick'));
}

/**
 * Look a sprite up by id, but only when it actually has uploaded frames —
 * callers fall back to their original procedural canvas art otherwise, so an
 * untouched sprite library changes nothing visually.
 *
 * With `set` 'night' the darkened night variant (id `night_<id>`) is tried
 * first; a night sprite without frames falls back to the day sprite.
 */
export function findSprite(
  sprites: SpriteDef[],
  id: string | undefined,
  set: SpriteSet = 'day',
): SpriteDef | undefined {
  if (!id) return undefined;
  if (set === 'night') {
    const night = sprites.find((sp) => sp.id === NIGHT_SPRITE_PREFIX + id);
    if (night && night.frames.length > 0) return night;
  }
  const s = sprites.find((sp) => sp.id === id);
  return s && s.frames.length > 0 ? s : undefined;
}

/**
 * The decoded image for the sprite's animation frame at `timeMs`. Pass null
 * to hold frame 0 (an idle character). Returns null while the frame is still
 * decoding so the caller can fall back to procedural art for that frame.
 */
export function spriteImage(sprite: SpriteDef, timeMs: number | null): HTMLImageElement | null {
  if (sprite.frames.length === 0) return null;
  const idx =
    timeMs === null || sprite.frames.length < 2
      ? 0
      : Math.floor(timeMs / Math.max(40, sprite.frameDuration)) % sprite.frames.length;
  return getImageFromDataUrl(sprite.frames[idx]);
}

/** Draw an image anchored bottom-center, optionally flipped horizontally. */
export function drawSpriteImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  centerX: number,
  bottomY: number,
  w: number,
  h: number,
  flip: boolean,
): void {
  ctx.save();
  ctx.translate(centerX, bottomY);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -w / 2, -h, w, h);
  ctx.restore();
}
