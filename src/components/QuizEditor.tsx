/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QuizDef, QuizTextCS, WorldData } from '../types';
import { Lang, UI, LANGUAGES } from '../i18n';
import { Plus, Copy, Trash2, X, HelpCircle } from 'lucide-react';
import { TextField, TextAreaField, makeLibraryId } from './editorFields';

// Czech variant aligned to the quiz's current structure (same question and
// choice counts, missing strings as ''). Alignment happens on read; structural
// edits mirror onto `cs` where it exists, so indexes never drift.
const alignedCs = (qz: QuizDef): QuizTextCS => ({
  title: qz.cs?.title ?? '',
  intro: qz.cs?.intro ?? '',
  questions: qz.questions.map((q, qi) => ({
    question: qz.cs?.questions[qi]?.question ?? '',
    choices: q.choices.map((_, ci) => qz.cs?.questions[qi]?.choices[ci] ?? ''),
  })),
});

// Quiz-library pane of the editor: define reusable riddle gates that missions
// place as quiz triggers. Every question must be answered correctly to pass.
interface QuizEditorProps {
  world: WorldData;
  onWorldChange: (next: WorldData) => void;
  language: Lang;
}

export default function QuizEditor({ world, onWorldChange, language }: QuizEditorProps) {
  const t = UI[language];
  const quizzes = world.quizzes;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Which text variant the form edits — playtime picks by the menu language.
  const [textLang, setTextLang] = useState<Lang>('en');
  const quiz = quizzes.find((q) => q.id === selectedId) ?? quizzes[0] ?? null;
  const csView = textLang === 'cs';
  const cs = quiz ? alignedCs(quiz) : null;

  const update = (mutator: (q: QuizDef) => QuizDef) => {
    if (!quiz) return;
    onWorldChange({
      ...world,
      quizzes: quizzes.map((q) => (q.id === quiz.id ? mutator(q) : q)),
    });
  };

  const updateCs = (mutator: (v: QuizTextCS) => QuizTextCS) =>
    update((qz) => ({ ...qz, cs: mutator(alignedCs(qz)) }));

  const handleNew = () => {
    const blank: QuizDef = {
      id: makeLibraryId('quiz', quizzes),
      title: t.editorNewQuizTitle,
      intro: t.editorNewQuizIntro,
      questions: [{ question: t.editorNewQuestion, choices: ['A', 'B'], correctIndex: 0 }],
    };
    onWorldChange({ ...world, quizzes: [...quizzes, blank] });
    setSelectedId(blank.id);
  };

  const handleDuplicate = () => {
    if (!quiz) return;
    const clone: QuizDef = JSON.parse(JSON.stringify(quiz));
    clone.id = makeLibraryId('quiz', quizzes);
    clone.title = `${quiz.title} (copy)`;
    onWorldChange({ ...world, quizzes: [...quizzes, clone] });
    setSelectedId(clone.id);
  };

  const usedByMissions = (id: string) =>
    world.missions.filter((m) => m.triggers.some((tr) => tr.kind === 'quiz' && tr.refId === id));

  const handleDelete = () => {
    if (!quiz) return;
    const used = usedByMissions(quiz.id);
    const prompt = used.length
      ? `${t.editorCascadeConfirm1}${used.map((m) => m.name).join(', ')}${t.editorCascadeConfirm2}`
      : t.editorConfirmDeleteObject;
    if (!window.confirm(prompt)) return;
    onWorldChange({
      ...world,
      quizzes: quizzes.filter((q) => q.id !== quiz.id),
      missions: world.missions.map((m) => ({
        ...m,
        triggers: m.triggers.filter((tr) => !(tr.kind === 'quiz' && tr.refId === quiz.id)),
      })),
    });
    setSelectedId(null);
  };

  const updateQuestion = (qi: number, mutator: (q: QuizDef['questions'][number]) => QuizDef['questions'][number]) =>
    update((qz) => ({
      ...qz,
      questions: qz.questions.map((q, i) => (i === qi ? mutator(q) : q)),
    }));

  const used = quiz ? usedByMissions(quiz.id) : [];

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-start" id="quiz-editor">
      {/* Quiz list */}
      <aside className="w-full xl:w-[240px] xl:shrink-0 bg-[#180a2d]/80 rounded-2xl p-3 border border-purple-500/20 space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5" />{t.editorQuizzesHeader}
        </div>
        <div className="space-y-1.5">
          {quizzes.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedId(q.id)}
              className={`w-full text-left px-2.5 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                quiz?.id === q.id
                  ? 'border-amber-400 bg-amber-950/40 text-white ring-1 ring-amber-400'
                  : 'border-purple-900/50 bg-[#0c0419] text-gray-300 hover:bg-purple-950/40'
              }`}
              data-quiz-id={q.id}
            >
              {q.title}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button onClick={handleNew} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-emerald-700/40 hover:bg-emerald-600/50 border border-emerald-600/40 text-emerald-200 text-[10px] cursor-pointer" id="editor-new-quiz" title={t.editorNewLevel}>
            <Plus className="w-3.5 h-3.5" />{t.editorNewLevel}
          </button>
          <button onClick={handleDuplicate} disabled={!quiz} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-purple-800/40 hover:bg-purple-700/50 border border-purple-600/40 text-purple-200 text-[10px] cursor-pointer disabled:opacity-40" id="editor-duplicate-quiz" title={t.editorDuplicate}>
            <Copy className="w-3.5 h-3.5" />{t.editorDuplicate}
          </button>
          <button onClick={handleDelete} disabled={!quiz} className="flex flex-col items-center gap-0.5 py-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 text-[10px] cursor-pointer disabled:opacity-40" id="editor-delete-quiz" title={t.editorDelete}>
            <Trash2 className="w-3.5 h-3.5" />{t.editorDelete}
          </button>
        </div>
      </aside>

      {/* Quiz form */}
      {quiz && (
        <div className="flex-1 min-w-0 bg-[#180a2d]/80 rounded-2xl p-4 border border-purple-500/20 space-y-4 w-full" id="quiz-form">
          {/* Which language's text the fields below edit */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{t.editorTextLang}</span>
            <div className="flex gap-1 bg-[#0c0419] p-1 rounded-lg border border-purple-900/50">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setTextLang(l.code)}
                  className={`px-2 py-0.5 rounded-md text-sm leading-none cursor-pointer ${textLang === l.code ? 'bg-amber-600/60 ring-1 ring-amber-400' : 'hover:bg-purple-950/60 opacity-70'}`}
                  title={l.label}
                  id={`quiz-textlang-${l.code}`}
                >
                  {l.flag}
                </button>
              ))}
            </div>
          </div>
          {csView && (
            <p className="text-[10px] text-amber-200/70 leading-snug" id="quiz-cs-hint">
              {t.editorCsFallbackHint} {t.editorCsStructureHint}
            </p>
          )}

          {csView && cs ? (
            <>
              <TextField label={t.editorName} value={cs.title} onChange={(v) => updateCs((c) => ({ ...c, title: v }))} id="editor-quiz-title-cs" />
              <TextAreaField label={t.editorQuizIntro} value={cs.intro} onChange={(v) => updateCs((c) => ({ ...c, intro: v }))} />
            </>
          ) : (
            <>
              <TextField label={t.editorName} value={quiz.title} onChange={(v) => update((q) => ({ ...q, title: v }))} id="editor-quiz-title" />
              <TextAreaField label={t.editorQuizIntro} value={quiz.intro} onChange={(v) => update((q) => ({ ...q, intro: v }))} />
            </>
          )}

          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">{t.editorQuestions}</div>
          <div className="space-y-3">
            {quiz.questions.map((q, qi) => (
              <div key={qi} className="bg-[#0c0419]/60 rounded-xl p-3 border border-amber-900/40 space-y-2" id={`quiz-question-${qi}`}>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    {csView && cs ? (
                      <TextField
                        label={`${t.editorQuestionLabel} ${qi + 1}`}
                        value={cs.questions[qi].question}
                        onChange={(v) =>
                          updateCs((c) => ({
                            ...c,
                            questions: c.questions.map((cq, i) => (i === qi ? { ...cq, question: v } : cq)),
                          }))
                        }
                        id={`quiz-q-${qi}-text-cs`}
                      />
                    ) : (
                      <TextField
                        label={`${t.editorQuestionLabel} ${qi + 1}`}
                        value={q.question}
                        onChange={(v) => updateQuestion(qi, (qq) => ({ ...qq, question: v }))}
                        id={`quiz-q-${qi}-text`}
                      />
                    )}
                  </div>
                  {!csView && (
                    <button
                      onClick={() =>
                        update((qz) => ({
                          ...qz,
                          questions: qz.questions.filter((_, i) => i !== qi),
                          cs: qz.cs ? { ...qz.cs, questions: qz.cs.questions.filter((_, i) => i !== qi) } : qz.cs,
                        }))
                      }
                      disabled={quiz.questions.length <= 1}
                      className="p-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 cursor-pointer disabled:opacity-40"
                      title={t.editorDeleteItem}
                      id={`quiz-q-${qi}-delete`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  {q.choices.map((choice, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`quiz-${quiz.id}-q-${qi}-correct`}
                        checked={q.correctIndex === ci}
                        onChange={() => updateQuestion(qi, (qq) => ({ ...qq, correctIndex: ci }))}
                        disabled={csView}
                        className="accent-amber-400 w-3.5 h-3.5 cursor-pointer disabled:cursor-default"
                        title={t.editorCorrectPick}
                        id={`quiz-q-${qi}-correct-${ci}`}
                      />
                      {csView && cs ? (
                        <input
                          value={cs.questions[qi].choices[ci]}
                          onChange={(e) =>
                            updateCs((c) => ({
                              ...c,
                              questions: c.questions.map((cq, i) =>
                                i === qi ? { ...cq, choices: cq.choices.map((cc, j) => (j === ci ? e.target.value : cc)) } : cq,
                              ),
                            }))
                          }
                          className="flex-1 bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                          placeholder={choice || `${t.editorChoiceLabel} ${ci + 1}`}
                          id={`quiz-q-${qi}-choice-${ci}-cs`}
                        />
                      ) : (
                        <input
                          value={choice}
                          onChange={(e) =>
                            updateQuestion(qi, (qq) => ({
                              ...qq,
                              choices: qq.choices.map((c, i) => (i === ci ? e.target.value : c)),
                            }))
                          }
                          className="flex-1 bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                          placeholder={`${t.editorChoiceLabel} ${ci + 1}`}
                          id={`quiz-q-${qi}-choice-${ci}`}
                        />
                      )}
                      {!csView && (
                        <button
                          onClick={() =>
                            update((qz) => ({
                              ...qz,
                              questions: qz.questions.map((qq, i) =>
                                i === qi
                                  ? {
                                      ...qq,
                                      choices: qq.choices.filter((_, j) => j !== ci),
                                      correctIndex: Math.min(qq.correctIndex - (ci < qq.correctIndex ? 1 : 0), qq.choices.length - 2),
                                    }
                                  : qq,
                              ),
                              cs: qz.cs
                                ? {
                                    ...qz.cs,
                                    questions: qz.cs.questions.map((cq, i) =>
                                      i === qi ? { ...cq, choices: cq.choices.filter((_, j) => j !== ci) } : cq,
                                    ),
                                  }
                                : qz.cs,
                            }))
                          }
                          disabled={q.choices.length <= 2}
                          className="p-1 rounded-md text-rose-300 hover:text-rose-200 cursor-pointer disabled:opacity-30"
                          title={t.editorDeleteItem}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {!csView && q.choices.length < 4 && (
                  <button
                    onClick={() =>
                      update((qz) => ({
                        ...qz,
                        questions: qz.questions.map((qq, i) => (i === qi ? { ...qq, choices: [...qq.choices, ''] } : qq)),
                        cs: qz.cs
                          ? {
                              ...qz.cs,
                              questions: qz.cs.questions.map((cq, i) => (i === qi ? { ...cq, choices: [...cq.choices, ''] } : cq)),
                            }
                          : qz.cs,
                      }))
                    }
                    className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 cursor-pointer"
                    id={`quiz-q-${qi}-add-choice`}
                  >
                    <Plus className="w-3 h-3" />{t.editorAddChoice}
                  </button>
                )}
              </div>
            ))}
          </div>

          {!csView && (
            <button
              onClick={() =>
                update((qz) => ({
                  ...qz,
                  questions: [...qz.questions, { question: t.editorNewQuestion, choices: ['A', 'B'], correctIndex: 0 }],
                  cs: qz.cs
                    ? { ...qz.cs, questions: [...qz.cs.questions, { question: '', choices: ['', ''] }] }
                    : qz.cs,
                }))
              }
              className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700/40 text-amber-200 text-[11px] cursor-pointer"
              id="quiz-add-question"
            >
              <Plus className="w-3.5 h-3.5" />{t.editorAddQuestion}
            </button>
          )}

          {used.length > 0 && (
            <p className="text-[10px] font-mono text-gray-400" id="quiz-used-by">
              {t.editorUsedBy}: {used.map((m) => m.name).join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
