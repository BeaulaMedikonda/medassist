import Link from "next/link";
import { formatDateTime, initials } from "@/lib/utils";
import type { Sex, StaffRole } from "@/types/db";

export type QueueItem = {
  visit_id: string;
  patient_id: string;
  emr_number: string;
  patient_name: string;
  age: number | null;
  sex: Sex | null;
  visit_date: string;
  has_recording: boolean;
  has_extraction: boolean;
  chief_complaint: string | null;
  bp: string | null;
  pulse: number | null;
  temperature_f: number | null;
  spo2: number | null;
  assigned: Array<{ doctor_id: string; full_name: string; role: string }>;
};

export function TodayQueue({
  items,
  role,
}: {
  items: QueueItem[];
  role: StaffRole;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        {role === "medical_assistant"
          ? "No EMRs created today. Tap '+ New EMR' to start an intake."
          : "No visits assigned to you today."}
      </div>
    );
  }
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.map((it) => (
        <li key={it.visit_id}>
          <Link
            href={
              role === "medical_assistant"
                ? `/emr/${it.patient_id}/visits/${it.visit_id}/intake`
                : it.has_recording || it.has_extraction
                  ? `/emr/${it.patient_id}/visits/${it.visit_id}/review`
                  : `/emr/${it.patient_id}/visits/new?vid=${it.visit_id}&mode=record`
            }
            className="group flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft transition hover:border-brand-300 hover:bg-brand-50/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-xs font-semibold text-brand-800">
                  {initials(it.patient_name)}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900">
                    {it.patient_name}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {it.emr_number}
                    {it.age != null ? ` · ${it.age}${it.sex || ""}` : ""}
                  </div>
                </div>
              </div>
              <Status item={it} />
            </div>

            {it.bp || it.pulse || it.temperature_f || it.spo2 ? (
              <div className="flex flex-wrap gap-1">
                {it.bp ? <Pill>BP {it.bp}</Pill> : null}
                {it.pulse ? <Pill>P {it.pulse}</Pill> : null}
                {it.temperature_f ? <Pill>T {it.temperature_f}°F</Pill> : null}
                {it.spo2 ? <Pill>SpO₂ {it.spo2}%</Pill> : null}
              </div>
            ) : null}

            {it.chief_complaint ? (
              <p className="line-clamp-2 text-xs text-slate-600">
                <span className="font-medium text-slate-700">CC:</span>{" "}
                {it.chief_complaint}
              </p>
            ) : null}

            <div className="mt-1 flex items-center justify-between">
              <div className="flex flex-wrap gap-1">
                {it.assigned.length === 0 ? (
                  <span className="text-[11px] italic text-slate-400">
                    Unassigned
                  </span>
                ) : (
                  it.assigned.map((a) => (
                    <span
                      key={a.doctor_id}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700"
                      title={a.role}
                    >
                      Dr. {a.full_name.split(" ")[0]}
                      {a.role !== "attending" ? (
                        <span className="ml-1 text-slate-500">· {a.role}</span>
                      ) : null}
                    </span>
                  ))
                )}
              </div>
              <span className="text-[10px] text-slate-400">
                {formatDateTime(it.visit_date)}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Status({ item }: { item: QueueItem }) {
  if (item.has_extraction) {
    return (
      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
        Reviewed
      </span>
    );
  }
  if (item.has_recording) {
    return (
      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Audio captured
      </span>
    );
  }
  return (
    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
      Awaiting consult
    </span>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
      {children}
    </span>
  );
}
