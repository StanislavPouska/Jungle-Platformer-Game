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

/**
 * Read an image file, downscale it to at most `maxW` wide, and return a data
 * URL small enough for the localStorage save. Preserves transparency when the
 * source has any — JPEG would flatten it to solid black. Samples every 16th
 * pixel's alpha to decide.
 */
export function downscaleImage(file: File, maxW: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * ratio);
        const h = Math.round(img.height * ratio);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const cx = c.getContext('2d');
        if (!cx) return reject(new Error('no 2d context'));
        cx.drawImage(img, 0, 0, w, h);
        let hasAlpha = false;
        try {
          const px = cx.getImageData(0, 0, w, h).data;
          for (let i = 3; i < px.length; i += 64) {
            if (px[i] < 255) { hasAlpha = true; break; }
          }
        } catch { /* unreadable pixels — fall back to JPEG */ }
        resolve(hasAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
