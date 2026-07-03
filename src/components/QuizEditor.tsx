/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChapterId, PoolQuestion, QuizDef, WorldData } from '../types';
import { Lang, UI, LANGUAGES } from '../i18n';
import { Plus, Copy, Trash2, X, HelpCircle, Layers } from 'lucide-react';
import { TextField, TextAreaField, NumberField, SelectField, makeLibraryId } from './editorFields';

// Czech choice strings aligned to a pool question's current choice count
// (missing strings as ''). Alignment happens on read; structural edits mirror
// onto `cs` where it exists, so indexes never drift.
const alignedQuestionCs = (q: PoolQuestion): { question: string; choices: string[] } => ({
  question: q.cs?.question ?? '',
  choices: q.choices.map((_, ci) => q.cs?.choices[ci] ?? ''),
});

// Quiz-library pane of the editor: define reusable riddle gates plus the
// shared background pool of questions they draw from. A gate asks
// `questionCount` random pool questions matching its mission's chapter.
interface QuizEditorProps {
  world: WorldData;
  onWorldChange: (next: WorldData) => void;
  language: Lang;
}

export default function QuizEditor({ world, onWorldChange, language }: QuizEditorProps) {
  const t = UI[language];
  const quizzes = world.quizzes;
  const pool = world.questionPool;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Which text variant the form edits — playtime picks by the menu language.
  const [textLang, setTextLang] = useState<Lang>('en');
  const quiz = quizzes.find((q) => q.id === selectedId) ?? quizzes[0] ?? null;
  const csView = textLang === 'cs';

  const update = (mutator: (q: QuizDef) => QuizDef) => {
    if (!quiz) return;
    onWorldChange({
      ...world,
      quizzes: quizzes.map((q) => (q.id === quiz.id ? mutator(q) : q)),
    });
  };

  const updatePool = (next: PoolQuestion[]) => onWorldChange({ ...world, questionPool: next });

  const updateQuestion = (id: string, mutator: (q: PoolQuestion) => PoolQuestion) =>
    updatePool(pool.map((q) => (q.id === id ? mutator(q) : q)));

  const handleNew = () => {
    const blank: QuizDef = {
      id: makeLibraryId('quiz', quizzes),
      title: t.editorNewQuizTitle,
      intro: t.editorNewQuizIntro,
      questionCount: 3,
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

  const handleAddPoolQuestion = () => {
    const blank: PoolQuestion = {
      id: makeLibraryId('question', pool),
      chapter: 'ch1',
      question: t.editorNewQuestion,
      choices: ['A', 'B'],
      correctIndex: 0,
    };
    updatePool([...pool, blank]);
  };

  const used = quiz ? usedByMissions(quiz.id) : [];

  const chapterOptions: { value: ChapterId; label: string }[] = [
    { value: 'prologue', label: t.chapterPrologueName },
    { value: 'ch1', label: t.chapter1Eyebrow },
    { value: 'ch2', label: t.chapter2Eyebrow },
    { value: 'epilogue', label: t.chapterEpilogueName },
  ];

  return (
    <div className="space-y-4" id="quiz-editor">
      <div className="flex flex-col xl:flex-row gap-4 items-start">
        {/* Quiz gate list */}
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

        {/* Quiz gate form */}
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

            {csView ? (
              <>
                <TextField label={t.editorName} value={quiz.cs?.title ?? ''} onChange={(v) => update((q) => ({ ...q, cs: { title: v, intro: q.cs?.intro ?? '' } }))} id="editor-quiz-title-cs" />
                <TextAreaField label={t.editorQuizIntro} value={quiz.cs?.intro ?? ''} onChange={(v) => update((q) => ({ ...q, cs: { title: q.cs?.title ?? '', intro: v } }))} />
              </>
            ) : (
              <>
                <TextField label={t.editorName} value={quiz.title} onChange={(v) => update((q) => ({ ...q, title: v }))} id="editor-quiz-title" />
                <TextAreaField label={t.editorQuizIntro} value={quiz.intro} onChange={(v) => update((q) => ({ ...q, intro: v }))} />
              </>
            )}

            <div className="max-w-[160px]" id="quiz-question-count">
              <NumberField label={t.editorQuestionCount} value={quiz.questionCount} step={1} onChange={(v) => update((q) => ({ ...q, questionCount: Math.max(1, Math.floor(v)) }))} />
            </div>

            {used.length > 0 && (
              <p className="text-[10px] font-mono text-gray-400" id="quiz-used-by">
                {t.editorUsedBy}: {used.map((m) => m.name).join(', ')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Shared question pool */}
      <div className="bg-[#180a2d]/80 rounded-2xl p-4 border border-purple-500/20 space-y-3" id="question-pool">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />{t.editorQuestionPool}
        </div>
        <p className="text-[10px] text-gray-400 leading-snug">{t.editorPoolHint}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {pool.map((q, qi) => {
            const cs = alignedQuestionCs(q);
            return (
              <div key={q.id} className="bg-[#0c0419]/60 rounded-xl p-3 border border-amber-900/40 space-y-2" id={`pool-question-${qi}`} data-question-id={q.id}>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    {csView ? (
                      <TextField
                        label={`${t.editorQuestionLabel} ${qi + 1}`}
                        value={cs.question}
                        onChange={(v) => updateQuestion(q.id, (qq) => ({ ...qq, cs: { ...alignedQuestionCs(qq), question: v } }))}
                        id={`pool-q-${qi}-text-cs`}
                      />
                    ) : (
                      <TextField
                        label={`${t.editorQuestionLabel} ${qi + 1}`}
                        value={q.question}
                        onChange={(v) => updateQuestion(q.id, (qq) => ({ ...qq, question: v }))}
                        id={`pool-q-${qi}-text`}
                      />
                    )}
                  </div>
                  <div className="w-[130px] shrink-0">
                    <SelectField
                      label={t.editorQuestionChapter}
                      value={q.chapter}
                      onChange={(v) => updateQuestion(q.id, (qq) => ({ ...qq, chapter: v as ChapterId }))}
                      options={chapterOptions}
                      id={`pool-q-${qi}-chapter`}
                    />
                  </div>
                  {!csView && (
                    <button
                      onClick={() => updatePool(pool.filter((x) => x.id !== q.id))}
                      disabled={pool.length <= 1}
                      className="p-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 cursor-pointer disabled:opacity-40"
                      title={t.editorDeleteItem}
                      id={`pool-q-${qi}-delete`}
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
                        name={`pool-${q.id}-correct`}
                        checked={q.correctIndex === ci}
                        onChange={() => updateQuestion(q.id, (qq) => ({ ...qq, correctIndex: ci }))}
                        disabled={csView}
                        className="accent-amber-400 w-3.5 h-3.5 cursor-pointer disabled:cursor-default"
                        title={t.editorCorrectPick}
                        id={`pool-q-${qi}-correct-${ci}`}
                      />
                      {csView ? (
                        <input
                          value={cs.choices[ci]}
                          onChange={(e) =>
                            updateQuestion(q.id, (qq) => {
                              const next = alignedQuestionCs(qq);
                              return { ...qq, cs: { ...next, choices: next.choices.map((c, j) => (j === ci ? e.target.value : c)) } };
                            })
                          }
                          className="flex-1 bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                          placeholder={choice || `${t.editorChoiceLabel} ${ci + 1}`}
                          id={`pool-q-${qi}-choice-${ci}-cs`}
                        />
                      ) : (
                        <input
                          value={choice}
                          onChange={(e) =>
                            updateQuestion(q.id, (qq) => ({
                              ...qq,
                              choices: qq.choices.map((c, j) => (j === ci ? e.target.value : c)),
                            }))
                          }
                          className="flex-1 bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                          placeholder={`${t.editorChoiceLabel} ${ci + 1}`}
                          id={`pool-q-${qi}-choice-${ci}`}
                        />
                      )}
                      {!csView && (
                        <button
                          onClick={() =>
                            updateQuestion(q.id, (qq) => ({
                              ...qq,
                              choices: qq.choices.filter((_, j) => j !== ci),
                              correctIndex: Math.min(qq.correctIndex - (ci < qq.correctIndex ? 1 : 0), qq.choices.length - 2),
                              cs: qq.cs ? { ...qq.cs, choices: qq.cs.choices.filter((_, j) => j !== ci) } : qq.cs,
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
                      updateQuestion(q.id, (qq) => ({
                        ...qq,
                        choices: [...qq.choices, ''],
                        cs: qq.cs ? { ...qq.cs, choices: [...qq.cs.choices, ''] } : qq.cs,
                      }))
                    }
                    className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 cursor-pointer"
                    id={`pool-q-${qi}-add-choice`}
                  >
                    <Plus className="w-3 h-3" />{t.editorAddChoice}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {!csView && (
          <button
            onClick={handleAddPoolQuestion}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700/40 text-amber-200 text-[11px] cursor-pointer"
            id="pool-add-question"
          >
            <Plus className="w-3.5 h-3.5" />{t.editorAddQuestion}
          </button>
        )}
      </div>
    </div>
  );
}
