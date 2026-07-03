/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ChapterId, PoolQuestion } from './types';

/**
 * Draw the questions a quiz gate asks: `count` random questions from the
 * shared pool, restricted to the story chapter the gate's mission belongs to.
 * Returns fewer when the chapter's pool is smaller than `count`, and an empty
 * array when no question matches — callers treat that as an auto-cleared gate
 * so a thin pool can never soft-lock a mission.
 */
export function pickQuizQuestions(
  pool: PoolQuestion[],
  chapter: ChapterId,
  count: number,
): PoolQuestion[] {
  const eligible = pool.filter((q) => q.chapter === chapter);
  for (let i = eligible.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
  }
  return eligible.slice(0, Math.max(1, Math.floor(count)));
}
