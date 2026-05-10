"use client";

import { cn } from "@/lib/utils";
import type { FieldAssumption } from "@/types/db";

export function EditableField({
  label,
  value,
  aiValue,
  multiline,
  placeholder,
  onChange,
  compact = false,
  assumption = null,
}: {
  label: string;
  value: string;
  aiValue?: string | null;
  multiline?: boolean;
  placeholder?: string;
  onChange: (v: string) => void;
  compact?: boolean;
  /**
   * Per-field marker from the AI extraction:
   *   "assumed" → yellow highlight (the doctor must verify)
   *   "stated"  → green highlight (quoted from the conversation)
   *   null      → neutral
   * Once the doctor edits the value (so it differs from aiValue), the marker
   * fades to neutral — the AI's claim no longer applies to the new text.
   */
  assumption?: FieldAssumption;
}) {
  const dirty = aiValue != null && value !== aiValue;
  const showAi = aiValue != null && aiValue.length > 0;

  // Once edited, the marker no longer reflects the current value — drop it.
  const tone: FieldAssumption = dirty ? null : assumption;

  const wrapTone =
    tone === "assumed"
      ? "rounded-lg ring-1 ring-amber-300 bg-amber-50/60 dark:ring-amber-700 dark:bg-amber-950/30"
      : tone === "stated"
        ? "rounded-lg ring-1 ring-emerald-300 bg-emerald-50/40 dark:ring-emerald-800 dark:bg-emerald-950/25"
        : "";

  const padTone = tone ? "p-2" : "";

  return (
    <div className={cn("group", compact && "")}>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-ink-400">
          {label}
        </label>
        <div className="flex items-center gap-2 opacity-90 transition group-focus-within:opacity-100">
          {tone === "assumed" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
              <Dot className="text-amber-500 dark:text-amber-300" />
              Verify
            </span>
          ) : tone === "stated" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
              <Dot className="text-emerald-500 dark:text-emerald-300" />
              Captured
            </span>
          ) : null}
          {dirty ? (
            <button
              type="button"
              onClick={() => onChange(aiValue || "")}
              className="text-[11px] font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              Revert
            </button>
          ) : null}
        </div>
      </div>
      <div className={cn("transition-colors", wrapTone, padTone)}>
        {multiline ? (
          <textarea
            className={cn("input-flush min-h-[68px] resize-y leading-relaxed")}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        ) : (
          <input
            className="input-flush"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        )}
        {showAi && tone === "assumed" ? (
          <p className="mt-1 px-1 text-[11px] text-amber-700 dark:text-amber-300">
            Inferred from context — please review before saving.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Dot({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" className={cn("h-1.5 w-1.5", className)}>
      <circle cx="4" cy="4" r="3" fill="currentColor" />
    </svg>
  );
}
