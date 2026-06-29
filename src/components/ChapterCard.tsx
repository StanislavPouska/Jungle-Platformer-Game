/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Lang, UI, UIStrings } from '../i18n';

export type ChapterId = 'prologue' | 'ch1' | 'ch2' | 'epilogue';

interface ChapterMeta {
  eyebrowKey?: keyof UIStrings;
  titleKey: keyof UIStrings;
  flavorKey: keyof UIStrings;
  accent: string;   // text colour for eyebrow + title gradient hint
  glow: string;     // radial glow colour
  btn: string;      // gradient + border classes for the Begin button
}

const META: Record<ChapterId, ChapterMeta> = {
  prologue: {
    titleKey: 'chapterPrologueName', flavorKey: 'chapterFlavorPrologue',
    accent: 'from-orange-300 to-amber-500', glow: 'rgba(249,115,22,0.25)',
    btn: 'from-orange-500 to-amber-600 border-orange-400 hover:from-orange-400 hover:to-amber-500',
  },
  ch1: {
    eyebrowKey: 'chapter1Eyebrow', titleKey: 'chapter1Title', flavorKey: 'chapterFlavorCh1',
    accent: 'from-emerald-300 to-green-500', glow: 'rgba(16,185,129,0.22)',
    btn: 'from-emerald-500 to-green-600 border-emerald-400 hover:from-emerald-400 hover:to-green-500',
  },
  ch2: {
    eyebrowKey: 'chapter2Eyebrow', titleKey: 'chapter2Title', flavorKey: 'chapterFlavorCh2',
    accent: 'from-cyan-300 to-sky-500', glow: 'rgba(6,182,212,0.22)',
    btn: 'from-cyan-500 to-sky-600 border-cyan-400 hover:from-cyan-400 hover:to-sky-500',
  },
  epilogue: {
    titleKey: 'chapterEpilogueName', flavorKey: 'chapterFlavorEpilogue',
    accent: 'from-rose-300 to-red-500', glow: 'rgba(244,63,94,0.24)',
    btn: 'from-rose-500 to-red-600 border-rose-400 hover:from-rose-400 hover:to-red-500',
  },
};

interface ChapterCardProps {
  chapterId: ChapterId;
  language: Lang;
  onBegin: () => void;
}

export default function ChapterCard({ chapterId, language, onBegin }: ChapterCardProps) {
  const t = UI[language];
  const meta = META[chapterId];

  // Enter (or Space) begins the chapter, matching the on-screen button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onBegin();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onBegin]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 cursor-pointer select-none relative overflow-hidden"
      onClick={onBegin}
      id="chapter-card"
      data-chapter={chapterId}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${meta.glow}, transparent 65%)` }}
      />
      <div className="relative text-center space-y-7 animate-[fadeIn_700ms_ease-out] max-w-2xl">
        {meta.eyebrowKey && (
          <div className={`text-xs md:text-sm font-mono tracking-[0.45em] uppercase font-bold text-transparent bg-clip-text bg-gradient-to-r ${meta.accent}`}>
            {t[meta.eyebrowKey]}
          </div>
        )}
        <h1 className={`text-4xl md:text-6xl font-black font-sans tracking-tight text-transparent bg-clip-text bg-gradient-to-r ${meta.accent} drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)]`}>
          {t[meta.titleKey]}
        </h1>
        <div className="mx-auto w-24 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        <p className="text-sm md:text-base text-gray-300/90 max-w-md mx-auto leading-relaxed font-medium">
          {t[meta.flavorKey]}
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); onBegin(); }}
          className={`mt-2 inline-flex items-center gap-2 bg-gradient-to-r ${meta.btn} text-white font-bold text-sm px-8 py-3 rounded-xl border shadow-lg cursor-pointer transition-all`}
          id="btn-chapter-begin"
        >
          {t.chapterBegin}
        </button>
      </div>
    </div>
  );
}
