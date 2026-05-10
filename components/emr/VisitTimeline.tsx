"use client";

import Link from "next/link";
import { useState } from "react";
import type { Visit, Medicine } from "@/types/db";
import { formatDate, formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/ui/Empty";

export function VisitTimeline({
  visits,
  patientId,
}: {
  visits: Visit[];
  patientId: string;
}) {
  if (visits.length === 0) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="h-6 w-6">
            <path
              d="M4 4h16v4H4zm0 6h16v10H4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            />
            <path d="M8 14h8M8 17h5" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        }
        title="No visits yet"
        description="Start by recording or manually entering today's consultation."
        action={
          <div className="flex gap-2">
            <Link
              href={`/emr/${patientId}/visits/new?mode=manual`}
              className="btn-secondary"
            >
              Manual entry
            </Link>
            <Link
              href={`/emr/${patientId}/visits/new?mode=record`}
              className="btn-primary"
            >
              Start recording
            </Link>
          </div>
        }
      />
    );
  }
  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-6 dark:border-ink-800">
      {visits.map((v) => (
        <VisitItem key={v.id} visit={v} patientId={patientId} />
      ))}
    </ol>
  );
}

function VisitItem({ visit, patientId }: { visit: Visit; patientId: string }) {
  const [open, setOpen] = useState(false);
  const dx = visit.confirmed_diagnosis || visit.provisional_diagnosis;
  const meds = (visit.prescription?.medicines || []) as Medicine[];
  const activeMeds = meds.filter((m) => m.status !== "stopped");
  const isCompleted = visit.status === "completed";
  const openHref = isCompleted
    ? `/emr/${patientId}/visits/${visit.id}/view`
    : `/emr/${patientId}/visits/${visit.id}/review`;

  return (
    <li className="relative">
      <span className="absolute -left-[33px] top-3 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-brand-500 ring-2 ring-brand-100 dark:border-ink-950 dark:bg-brand-400 dark:ring-brand-900/60" />
      <div className="rounded-2xl border border-slate-200 bg-white shadow-soft dark:border-ink-800 dark:bg-ink-900 dark:shadow-none">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-ink-500">
              <span>{formatDateTime(visit.visit_date)}</span>
              {visit.transcript_text ? (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700 ring-1 ring-brand-200/60 dark:bg-brand-900/40 dark:text-brand-300 dark:ring-brand-800/60">
                  AI scribe
                </span>
              ) : null}
            </div>
            <div className="mt-1 line-clamp-1 text-sm font-semibold text-slate-900 dark:text-ink-100">
              {dx || visit.chief_complaints || "Visit"}
            </div>
            {activeMeds.length > 0 ? (
              <div className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-ink-500">
                Rx: {activeMeds.map((m) => m.name).join(", ")}
              </div>
            ) : null}
          </div>
          <svg
            viewBox="0 0 20 20"
            className={`h-4 w-4 shrink-0 text-slate-400 dark:text-ink-600 transition ${open ? "rotate-180" : ""}`}
          >
            <path
              d="M5 7l5 6 5-6"
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {open ? (
          <div className="space-y-3 border-t border-slate-100 px-5 py-4 text-sm dark:border-ink-800">
            <Detail label="Chief complaints" value={visit.chief_complaints} />
            <Detail label="Examination" value={visit.examination_findings} />
            <Detail label="Diagnosis" value={dx} />
            <Detail label="Investigations" value={visit.investigations_ordered} />
            {meds.length > 0 ? (
              <div>
                <div className="label">Prescription</div>
                <ul className="mt-1 space-y-1">
                  {meds.map((m, i) => (
                    <li
                      key={i}
                      className={`rounded-lg border px-2 py-1.5 text-xs ${
                        m.status === "stopped"
                          ? "border-rose-100 bg-rose-50 text-rose-700 line-through dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300"
                          : "border-slate-100 bg-slate-50 text-slate-700 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-300"
                      }`}
                    >
                      <span className="font-semibold">{m.name}</span>{" "}
                      {[m.dose, m.frequency, m.duration, m.instructions]
                        .filter(Boolean)
                        .join(" · ")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <Detail label="Advice" value={visit.advice} />
            {visit.follow_up_date ? (
              <Detail
                label="Follow-up"
                value={`${formatDate(visit.follow_up_date)}${
                  visit.follow_up_notes ? " — " + visit.follow_up_notes : ""
                }`}
              />
            ) : null}

            <div className="flex flex-wrap gap-2 pt-2">
              <Link href={openHref} className="btn-secondary">
                {isCompleted ? "Open" : "Continue"}
              </Link>
              {isCompleted ? (
                <Link
                  href={`/emr/${patientId}/visits/${visit.id}/review?edit=1`}
                  className="btn-ghost"
                >
                  Edit
                </Link>
              ) : null}
              <Link
                href={`/emr/${patientId}/visits/${visit.id}/print`}
                className="btn-primary"
                target="_blank"
              >
                Print prescription
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <div className="label">{label}</div>
      <div className="text-sm text-slate-700 dark:text-ink-300">{value}</div>
    </div>
  );
}
