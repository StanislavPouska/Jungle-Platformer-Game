/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TriggerPlacement, FightDef, QuizDef } from '../types';
import { Lang, UI, getQuizText, getFightText } from '../i18n';
import FighterCanvas from './FighterCanvas';
import ChapterCard from './ChapterCard';

// The three overlays a trigger gate can raise over a running mission: the
// quiz modal, an optional chapter title card, and the fight arena. Shared by
// the platformer and stealth canvases so gates behave identically in both.
// Render inside a `relative` container; every overlay fills it.
interface GateOverlaysProps {
  trigger: TriggerPlacement | null;
  stage: 'card' | 'run';
  quiz: QuizDef | null;   // resolved library object when trigger.kind === 'quiz'
  fight: FightDef | null; // resolved library object when trigger.kind === 'fight'
  answers: number[];
  feedback: 'idle' | 'wrong';
  onChoice: (questionIdx: number, choiceIdx: number) => void;
  onSubmit: () => void;
  onCardBegin: () => void;
  onFightWin: () => void;
  onFightLose: () => void;
  language: Lang;
  paused: boolean;
  onTogglePause: () => void;
}

export default function GateOverlays({
  trigger,
  stage,
  quiz,
  fight,
  answers,
  feedback,
  onChoice,
  onSubmit,
  onCardBegin,
  onFightWin,
  onFightLose,
  language,
  paused,
  onTogglePause,
}: GateOverlaysProps) {
  const t = UI[language];
  if (!trigger) return null;

  if (trigger.kind === 'quiz' && quiz) {
    const quizText = getQuizText(quiz, language);
    return (
      <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center p-5 text-center select-none backdrop-blur-sm z-30 overflow-y-auto" id="puzzle-gate-modal">
        <div className="w-full max-w-md space-y-4 my-auto py-2">
          <h2 className="text-lg font-black text-amber-300 uppercase tracking-wide font-sans">{quizText.title}</h2>
          <p className="text-xs text-gray-300 leading-relaxed">{quizText.intro}</p>

          <div className="space-y-3 text-left">
            {quizText.questions.map((q, qIdx) => (
              <div key={qIdx} className="bg-[#1d0735]/80 border border-amber-500/25 rounded-xl p-3" id={`puzzle-q-${qIdx}`}>
                <p className="text-xs font-bold text-white mb-2">{qIdx + 1}. {q.question}</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {q.choices.map((choice, cIdx) => (
                    <button
                      key={cIdx}
                      onClick={() => onChoice(qIdx, cIdx)}
                      className={`text-left text-[11px] px-3 py-1.5 rounded-lg border cursor-pointer transition-all ${
                        answers[qIdx] === cIdx
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

          {feedback === 'wrong' && (
            <p className="text-xs font-bold text-rose-400" id="puzzle-feedback-wrong">
              {t.wrongFeedback}
            </p>
          )}

          <button
            onClick={onSubmit}
            disabled={answers.some((a) => a === -1)}
            className={`w-full font-bold text-sm px-6 py-2.5 rounded-xl border cursor-pointer ${
              answers.some((a) => a === -1)
                ? 'bg-slate-800 text-gray-500 border-slate-700 cursor-not-allowed'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-lg'
            }`}
            id="btn-puzzle-submit"
          >
            {t.answerRiddle}
          </button>
        </div>
      </div>
    );
  }

  if (trigger.kind === 'fight' && fight) {
    // Chapter title card first (when the placement carries one), then the duel.
    if (stage === 'card' && trigger.chapterCard) {
      return (
        <div className="absolute inset-0 z-30 bg-gradient-to-b from-[#0e0722] via-[#140a2d] to-[#04010a] overflow-hidden" id="mission-chapter-card">
          <ChapterCard chapterId={trigger.chapterCard} language={language} onBegin={onCardBegin} fullScreen={false} />
        </div>
      );
    }
    return (
      <div className="absolute inset-0 z-30 bg-slate-950 overflow-y-auto" id="mission-fight-overlay">
        <FighterCanvas
          fight={fight}
          language={language}
          label={getFightText(fight, language).name}
          onComplete={onFightWin}
          onLose={onFightLose}
          paused={paused}
          onTogglePause={onTogglePause}
        />
      </div>
    );
  }

  return null;
}
