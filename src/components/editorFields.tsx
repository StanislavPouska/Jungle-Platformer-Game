/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';

// Shared form widgets for the editor panes. Module scope on purpose: defining
// these inside an editor component would give them a fresh component identity
// every render, so React would remount them on each keystroke and the inputs
// would drop keyboard focus mid-typing.

export function NumberField({ label, value, onChange, step = 10 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  // Draft holds the raw text while the field is being edited so partial input
  // (like a momentarily emptied field) isn't coerced to 0.
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{label}</span>
      <input
        type="number"
        value={draft ?? String(value)}
        step={step}
        onChange={(e) => {
          setDraft(e.target.value);
          const v = Number(e.target.value);
          if (e.target.value !== '' && Number.isFinite(v)) onChange(v);
        }}
        onBlur={() => setDraft(null)}
        className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white focus:border-fuchsia-500 outline-none"
      />
    </label>
  );
}

export function TextField({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id?: string }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500"
        id={id}
      />
    </label>
  );
}

export function TextAreaField({ label, value, onChange, rows = 2, id }: { label: string; value: string; onChange: (v: string) => void; rows?: number; id?: string }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500 resize-none"
        id={id}
      />
    </label>
  );
}

export function SelectField({ label, value, onChange, options, id }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; id?: string }) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-mono uppercase tracking-wide text-gray-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0c0419] border border-purple-900/50 rounded-md px-2 py-1 text-xs text-white outline-none focus:border-fuchsia-500"
        id={id}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/** 'fight-3' / 'quiz-7' style ids, unique within the given collection. */
export function makeLibraryId(prefix: string, existing: { id: string }[]): string {
  const ids = new Set(existing.map((e) => e.id));
  let n = 1;
  let id = `${prefix}-${n}`;
  while (ids.has(id)) id = `${prefix}-${++n}`;
  return id;
}
