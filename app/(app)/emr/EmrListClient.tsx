"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { Patient } from "@/types/db";
import { EmptyState } from "@/components/ui/Empty";
import { initials, relativeTime, formatDate, cn } from "@/lib/utils";
import type { PatientFilter, LatestVisit } from "./page";

const FILTER_TABS: Array<{
  key: PatientFilter;
  label: string;
  hint: string;
}> = [
  { key: "all", label: "All patients", hint: "Everyone in the directory" },
  { key: "today", label: "Today", hint: "Visited today" },
  { key: "visited", label: "Visited", hint: "Has at least one visit" },
  { key: "chronic", label: "Chronic", hint: "Has chronic conditions noted" },
];

export function EmrListClient({
  initialQuery,
  initialFilter,
  patients,
  latestVisit,
  error,
  counts,
}: {
  initialQuery: string;
  initialFilter: PatientFilter;
  patients: Patient[];
  latestVisit: Record<string, LatestVisit>;
  error: string | null;
  counts: { all: number; today: number; visited: number; chronic: number };
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (initialFilter !== "all") params.set("filter", initialFilter);
      const qs = params.toString();
      start(() => router.replace(qs ? `/emr?${qs}` : "/emr"));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function setFilter(f: PatientFilter) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (f !== "all") params.set("filter", f);
    const qs = params.toString();
    router.replace(qs ? `/emr?${qs}` : "/emr");
  }

  return (
    <div>
      {/* Search */}
      <div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-card dark:border-ink-800 dark:bg-ink-900">
        <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 text-slate-400 dark:text-ink-600">
          <path
            d="M9 2a7 7 0 105.3 11.7l3.5 3.5 1.4-1.4-3.5-3.5A7 7 0 009 2zm0 2a5 5 0 110 10A5 5 0 019 4z"
            fill="currentColor"
          />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, phone, or EMR number"
          className="w-full bg-transparent py-1 text-sm placeholder:text-slate-400 dark:text-ink-600"
        />
        {pending ? (
          <span className="text-[11px] text-slate-400 dark:text-ink-600">searching…</span>
        ) : null}
      </div>

      {/* Segmented filter buttons */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTER_TABS.map((t) => {
          const active = initialFilter === t.key;
          const count = counts[t.key];
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              title={t.hint}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition",
                active
                  ? "border-brand-600 bg-brand-600 text-white shadow-soft hover:bg-brand-700"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-ink-800 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-ink-700 dark:hover:bg-ink-800",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold",
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-400",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="card border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Could not load patients: {error}
        </div>
      ) : patients.length === 0 ? (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" className="h-6 w-6">
              <path
                d="M12 12a4 4 0 100-8 4 4 0 000 8zm-7 9a7 7 0 0114 0H5z"
                fill="currentColor"
              />
            </svg>
          }
          title={initialQuery ? "No matches" : "No patients in this view"}
          description={
            initialQuery
              ? "Try a different name, phone, or EMR number."
              : "Switch tabs or create a new patient."
          }
          action={
            !initialQuery ? (
              <Link href="/emr/new" className="btn-primary">
                Create new patient
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {patients.map((p) => (
            <PatientCard
              key={p.id}
              patient={p}
              latest={latestVisit[p.id]}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function PatientCard({
  patient: p,
  latest,
}: {
  patient: Patient;
  latest?: LatestVisit;
}) {
  return (
    <li>
      <div className="card flex h-full flex-col p-4 transition hover:border-slate-300 hover:shadow-elevated">
        <Link
          href={`/emr/${p.id}`}
          className="flex items-start gap-3"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-200 to-brand-100 text-sm font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
            {initials(p.full_name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-ink-100">
                {p.full_name}
              </h3>
              {p.last_visit_at ? (
                <span className="shrink-0 text-[11px] font-medium text-slate-400 dark:text-ink-600">
                  {relativeTime(p.last_visit_at)}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-ink-800 dark:text-ink-500">
                  New
                </span>
              )}
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-500 dark:text-ink-500">
              <span className="font-mono">{p.emr_number}</span>
              {p.age != null ? (
                <span>· {p.age}{p.sex || ""}</span>
              ) : null}
              {p.phone ? <span>· {p.phone}</span> : null}
            </div>
          </div>
        </Link>

        {p.chronic_conditions ? (
          <div className="mt-3 inline-flex w-fit items-center gap-1 rounded-md bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
              <path d="M3 8a5 5 0 1110 0A5 5 0 013 8zm5-3a1 1 0 00-1 1v2H5a1 1 0 100 2h2v2a1 1 0 102 0V10h2a1 1 0 100-2H9V6a1 1 0 00-1-1z" />
            </svg>
            <span className="truncate">{p.chronic_conditions}</span>
          </div>
        ) : null}

        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs dark:border-ink-800">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
              Last visit
            </span>
            <span className="text-slate-700 dark:text-ink-300">
              {latest ? formatDate(latest.visit_date) : "No visits yet"}
            </span>
          </div>
          {latest?.diagnosis ? (
            <p className="line-clamp-1 text-slate-600 dark:text-ink-400">
              <span className="font-medium text-slate-700 dark:text-ink-300">Dx:</span>{" "}
              {latest.diagnosis}
            </p>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-2 pt-2">
          <Link
            href={`/emr/${p.id}`}
            className="btn-secondary btn-sm flex-1"
          >
            Patient profile
          </Link>
          {latest ? (
            <Link
              href={`/emr/${p.id}/visits/${latest.visit_id}/review`}
              className="btn-light btn-sm flex-1"
            >
              View latest EMR
              <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M5 10h10M11 5l5 5-5 5" />
              </svg>
            </Link>
          ) : (
            <Link
              href={`/emr/new?patient=${p.id}`}
              className="btn-light btn-sm flex-1"
            >
              Start first visit
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
