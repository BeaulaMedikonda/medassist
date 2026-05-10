"use client";

import { useMemo, useRef } from "react";
import { isoLocalDate, parseLocalDate, cn } from "@/lib/utils";

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function startOfWeek(d: Date): Date {
  // Monday-anchored week (Indian clinic norm).
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = out.getDay(); // 0 Sun … 6 Sat
  const diff = (dow + 6) % 7; // Mon=0, Sun=6
  out.setDate(out.getDate() - diff);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  out.setDate(out.getDate() + n);
  return out;
}

export function WeekStrip({
  isoDate,
  appointmentCounts = {},
  onSelect,
}: {
  isoDate: string;
  appointmentCounts?: Record<string, number>;
  onSelect: (iso: string) => void;
}) {
  const datePickerRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(() => parseLocalDate(isoDate), [isoDate]);
  const weekStart = useMemo(() => startOfWeek(selected), [selected]);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayIso = isoLocalDate(today);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const monthLabel = `${MONTH[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  const sameMonth = days[0].getMonth() === days[6].getMonth();
  const monthRange = sameMonth
    ? monthLabel
    : `${MONTH[days[0].getMonth()]} – ${MONTH[days[6].getMonth()]} ${days[6].getFullYear()}`;

  function jumpWeek(deltaWeeks: number) {
    const next = addDays(selected, deltaWeeks * 7);
    onSelect(isoLocalDate(next));
  }

  function jumpDay(d: Date) {
    onSelect(isoLocalDate(d));
  }

  function openPicker() {
    const el = datePickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      el.showPicker();
    } else {
      el.click();
    }
  }

  return (
    <div className="card overflow-hidden">
      {/* Top row: month label, week nav, calendar jump */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-ink-100">
            {monthRange}
          </span>
          {isoDate !== todayIso ? (
            <button
              onClick={() => onSelect(todayIso)}
              className="text-[11px] font-medium text-brand-700 hover:underline dark:text-brand-300"
            >
              Today
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => jumpWeek(-1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-ink-400 dark:hover:bg-ink-800"
            aria-label="Previous week"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => jumpWeek(1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-ink-400 dark:hover:bg-ink-800"
            aria-label="Next week"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-ink-800" />
          <button
            onClick={openPicker}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-ink-400 dark:hover:bg-ink-800"
            aria-label="Pick a date"
            title="Jump to date"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M8 3v4M16 3v4M3 10h18" />
            </svg>
          </button>
          <input
            ref={datePickerRef}
            type="date"
            value={isoDate}
            onChange={(e) => {
              if (e.target.value) onSelect(e.target.value);
            }}
            className="absolute h-0 w-0 opacity-0"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Day chips — horizontal-scrollable on small screens */}
      <div className="flex gap-2 overflow-x-auto p-3 scrollbar-thin">
        {days.map((d) => {
          const iso = isoLocalDate(d);
          const isSelected = iso === isoDate;
          const isToday = iso === todayIso;
          const count = appointmentCounts[iso] ?? 0;
          return (
            <button
              key={iso}
              onClick={() => jumpDay(d)}
              className={cn(
                "group flex min-w-[68px] flex-1 flex-col items-center rounded-xl border px-2 py-2 transition",
                isSelected
                  ? "border-brand-600 bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-glow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50/40 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-brand-700/50 dark:hover:bg-brand-900/20",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wide",
                  isSelected
                    ? "text-white/80"
                    : "text-slate-500 dark:text-ink-500",
                )}
              >
                {WEEKDAY[d.getDay()]}
              </span>
              <span
                className={cn(
                  "mt-0.5 text-lg font-bold leading-tight",
                  isSelected
                    ? "text-white"
                    : "text-slate-900 dark:text-ink-100",
                )}
              >
                {d.getDate()}
              </span>
              <span
                className={cn(
                  "mt-1 flex h-4 items-center justify-center text-[10px] font-semibold",
                  count > 0
                    ? isSelected
                      ? "text-white/90"
                      : "text-brand-700 dark:text-brand-300"
                    : isSelected
                      ? "text-white/50"
                      : "text-slate-400 dark:text-ink-600",
                )}
              >
                {count > 0 ? `${count} appt${count === 1 ? "" : "s"}` : isToday ? "Today" : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
