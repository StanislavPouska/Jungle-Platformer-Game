/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { QuizDef, WorldData } from '../types';
import { Lang, UI } from '../i18n';
import { Plus, Copy, Trash2, X, HelpCircle } from 'lucide-react';
import { TextField, TextAreaField, makeLibraryId } from './editorFields';

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
  const quiz = quizzes.find((q) => q.id === selectedId) ?? quizzes[0] ?? null;

  const update = (mutator: (q: QuizDef) => QuizDef) => {
    if (!quiz) return;
    onWorldChange({
      ...world,
      quizzes: quizzes.map((q) => (q.id === quiz.id ? mutator(q) : q)),
    });
  };

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
          <TextField label={t.editorName} value={quiz.title} onChange={(v) => update((q) => ({ ...q, title: v }))} id="editor-quiz-title" />
          <TextAreaField label={t.editorQuizIntro} value={quiz.intro} onChange={(v) => update((q) => ({ ...q, intro: v }))} />

          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300">{t.editorQuestions}</div>
          <div className="space-y-3">
            {quiz.questions.map((q, qi) => (
              <div key={qi} className="bg-[#0c0419]/60 rounded-xl p-3 border border-amber-900/40 space-y-2" id={`quiz-question-${qi}`}>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <TextField
                      label={`${t.editorQuestionLabel} ${qi + 1}`}
                      value={q.question}
                      onChange={(v) => updateQuestion(qi, (qq) => ({ ...qq, question: v }))}
                      id={`quiz-q-${qi}-text`}
                    />
                  </div>
                  <button
                    onClick={() => update((qz) => ({ ...qz, questions: qz.questions.filter((_, i) => i !== qi) }))}
                    disabled={quiz.questions.length <= 1}
                    className="p-1.5 rounded-md bg-rose-900/40 hover:bg-rose-800/50 border border-rose-700/40 text-rose-200 cursor-pointer disabled:opacity-40"
                    title={t.editorDeleteItem}
                    id={`quiz-q-${qi}-delete`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {q.choices.map((choice, ci) => (
                    <div key={ci} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`quiz-${quiz.id}-q-${qi}-correct`}
                        checked={q.correctIndex === ci}
                        onChange={() => updateQuestion(qi, (qq) => ({ ...qq, correctIndex: ci }))}
                        className="accent-amber-400 w-3.5 h-3.5 cursor-pointer"
                        title={t.editorCorrectPick}
                        id={`quiz-q-${qi}-correct-${ci}`}
                      />
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
                      <button
                        onClick={() =>
                          updateQuestion(qi, (qq) => ({
                            ...qq,
                            choices: qq.choices.filter((_, i) => i !== ci),
                            correctIndex: Math.min(qq.correctIndex - (ci < qq.correctIndex ? 1 : 0), qq.choices.length - 2),
                          }))
                        }
                        disabled={q.choices.length <= 2}
                        className="p-1 rounded-md text-rose-300 hover:text-rose-200 cursor-pointer disabled:opacity-30"
                        title={t.editorDeleteItem}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                {q.choices.length < 4 && (
                  <button
                    onClick={() => updateQuestion(qi, (qq) => ({ ...qq, choices: [...qq.choices, ''] }))}
                    className="flex items-center gap-1 text-[10px] text-amber-300 hover:text-amber-200 cursor-pointer"
                    id={`quiz-q-${qi}-add-choice`}
                  >
                    <Plus className="w-3 h-3" />{t.editorAddChoice}
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={() =>
              update((qz) => ({
                ...qz,
                questions: [...qz.questions, { question: t.editorNewQuestion, choices: ['A', 'B'], correctIndex: 0 }],
              }))
            }
            className="flex items-center justify-center gap-1.5 w-full py-1.5 rounded-md bg-amber-900/30 hover:bg-amber-800/40 border border-amber-700/40 text-amber-200 text-[11px] cursor-pointer"
            id="quiz-add-question"
          >
            <Plus className="w-3.5 h-3.5" />{t.editorAddQuestion}
          </button>

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
