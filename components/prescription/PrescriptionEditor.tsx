"use client";

import { useMemo } from "react";
import type { Medicine, Prescription } from "@/types/db";
import { cn } from "@/lib/utils";

const FREQ_OPTIONS = ["OD", "BD", "TDS", "QID", "HS", "SOS", "AC", "PC"];
const ROUTE_OPTIONS = ["PO", "IV", "IM", "SC", "Topical", "Inhalation", "Eye", "Ear"];

export function PrescriptionEditor({
  prescription,
  aiPrescription,
  onChange,
}: {
  prescription: Prescription;
  aiPrescription: Prescription | null;
  onChange: (p: Prescription) => void;
}) {
  const meds = prescription.medicines || [];

  const aiMap = useMemo(() => {
    const m = new Map<number, Medicine>();
    aiPrescription?.medicines?.forEach((med, i) => m.set(i, med));
    return m;
  }, [aiPrescription]);

  function update(index: number, patch: Partial<Medicine>) {
    const next = [...meds];
    next[index] = { ...next[index], ...patch };
    onChange({ ...prescription, medicines: next });
  }

  function add() {
    onChange({
      ...prescription,
      medicines: [
        ...meds,
        {
          name: "",
          dose: null,
          frequency: null,
          duration: null,
          route: "PO",
          instructions: null,
          status: "new",
        },
      ],
    });
  }

  function remove(index: number) {
    const next = [...meds];
    const m = next[index];
    if (m.status === "continued" || m.status === "modified") {
      next[index] = { ...m, status: "stopped" };
    } else {
      next.splice(index, 1);
    }
    onChange({ ...prescription, medicines: next });
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= meds.length) return;
    const next = [...meds];
    const [a] = next.splice(index, 1);
    next.splice(j, 0, a);
    onChange({ ...prescription, medicines: next });
  }

  const activeCount = meds.filter((m) => m.status !== "stopped").length;
  const stoppedCount = meds.filter((m) => m.status === "stopped").length;
  const newCount = meds.filter((m) => m.status === "new").length;
  const modifiedCount = meds.filter((m) => m.status === "modified").length;

  return (
    <div className="space-y-3">
      {meds.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-ink-800 dark:text-ink-300">
            {activeCount} active
          </span>
          {newCount > 0 ? (
            <span className="rounded-full bg-accent-100 px-2 py-0.5 font-medium text-accent-800">
              + {newCount} new
            </span>
          ) : null}
          {modifiedCount > 0 ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-800">
              {modifiedCount} modified
            </span>
          ) : null}
          {stoppedCount > 0 ? (
            <span className="rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-700">
              {stoppedCount} stopped
            </span>
          ) : null}
        </div>
      ) : null}

      {meds.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-ink-800 dark:bg-ink-900/40">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-ink-800 dark:text-ink-500">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <p className="text-sm text-slate-500 dark:text-ink-500">No medicines yet. Add the first below.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {meds.map((m, i) => (
            <MedicineCard
              key={i}
              index={i + 1}
              medicine={m}
              aiMedicine={aiMap.get(i)}
              onChange={(patch) => update(i, patch)}
              onRemove={() => remove(i)}
              onMoveUp={() => move(i, -1)}
              onMoveDown={() => move(i, 1)}
              canMoveUp={i > 0}
              canMoveDown={i < meds.length - 1}
            />
          ))}
        </ul>
      )}

      <button onClick={add} className="btn-secondary w-full">
        <svg viewBox="0 0 20 20" className="h-4 w-4">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Add medicine
      </button>
    </div>
  );
}

function MedicineCard({
  index,
  medicine,
  aiMedicine,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  index: number;
  medicine: Medicine;
  aiMedicine?: Medicine;
  onChange: (patch: Partial<Medicine>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const tone = toneFor(medicine.status);
  return (
    <li
      className={cn(
        "rounded-xl border bg-white transition",
        tone.container,
        medicine.status === "stopped" && "opacity-75",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-ink-800">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-600 dark:bg-ink-800 dark:text-ink-400">
            {index}
          </span>
          <span className={cn(tone.badge)}>{labelFor(medicine.status)}</span>
          {medicine.status === "modified" && aiMedicine ? (
            <span className="text-[11px] text-amber-700">
              prev: {[aiMedicine.dose, aiMedicine.frequency, aiMedicine.duration].filter(Boolean).join(" · ") || "—"}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-0.5">
          <IconBtn label="Move up" onClick={onMoveUp} disabled={!canMoveUp}>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
              <path d="M5 12l5-6 5 6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBtn>
          <IconBtn label="Move down" onClick={onMoveDown} disabled={!canMoveDown}>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
              <path d="M5 8l5 6 5-6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconBtn>
          <IconBtn label="Remove" onClick={onRemove}>
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </IconBtn>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-2 p-3">
        <input
          className={cn(
            "input-base col-span-12 sm:col-span-6 font-semibold",
            medicine.status === "stopped" && "line-through",
          )}
          value={medicine.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Tab. Crocin 500mg"
        />
        <input
          className="input-base col-span-6 sm:col-span-2"
          value={medicine.dose || ""}
          onChange={(e) => markModified(onChange, medicine, { dose: e.target.value || null })}
          placeholder="Dose"
        />
        <select
          className="input-base col-span-6 sm:col-span-2"
          value={medicine.frequency || ""}
          onChange={(e) => markModified(onChange, medicine, { frequency: e.target.value || null })}
        >
          <option value="">Freq</option>
          {FREQ_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <input
          className="input-base col-span-6 sm:col-span-2"
          value={medicine.duration || ""}
          onChange={(e) => markModified(onChange, medicine, { duration: e.target.value || null })}
          placeholder="Duration"
        />
        <select
          className="input-base col-span-6 sm:col-span-2"
          value={medicine.route || "PO"}
          onChange={(e) => markModified(onChange, medicine, { route: e.target.value || null })}
        >
          {ROUTE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <input
          className="input-base col-span-12 sm:col-span-10"
          value={medicine.instructions || ""}
          onChange={(e) => onChange({ instructions: e.target.value || null })}
          placeholder="Instructions (e.g. after food)"
        />
      </div>
    </li>
  );
}

function markModified(
  onChange: (patch: Partial<Medicine>) => void,
  current: Medicine,
  patch: Partial<Medicine>,
) {
  let next: Partial<Medicine> = patch;
  if (current.status === "continued") {
    next = { ...patch, status: "modified" };
  }
  onChange(next);
}

function IconBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 dark:text-ink-500 dark:hover:bg-ink-800 dark:hover:text-ink-100"
    >
      {children}
    </button>
  );
}

function toneFor(status: Medicine["status"]) {
  switch (status) {
    case "new":
      return {
        container:
          "border-accent-200 ring-1 ring-accent-100 dark:border-accent-800 dark:ring-accent-900/30",
        badge: "badge-new",
      };
    case "modified":
      return {
        container:
          "border-amber-200 ring-1 ring-amber-100 dark:border-amber-800 dark:ring-amber-900/30",
        badge: "badge-modified",
      };
    case "stopped":
      return {
        container:
          "border-rose-200 ring-1 ring-rose-100 dark:border-rose-800 dark:ring-rose-900/30",
        badge: "badge-stopped",
      };
    case "continued":
    default:
      return {
        container: "border-slate-200 dark:border-ink-800",
        badge: "badge-continued",
      };
  }
}
function labelFor(status: Medicine["status"]) {
  switch (status) {
    case "new":
      return "+ New";
    case "modified":
      return "Modified";
    case "stopped":
      return "Stopped";
    case "continued":
    default:
      return "Continued";
  }
}
