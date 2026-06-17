import type { Medicine, Prescription, Visit } from "@/types/db";
import { formatDate, formatDateTime } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-7 rounded-2xl border border-[rgba(14,165,164,0.12)] bg-gradient-to-br from-teal-50/80 to-white p-6 shadow-sm">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
        {eyebrow}
      </p>
      <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-1.5 max-w-2xl text-sm font-medium text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function InfoCard({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05),0_8px_24px_-12px_rgba(15,23,42,0.10)]"
      style={accent ? { borderTopColor: accent, borderTopWidth: 3 } : undefined}
    >
      <div className="border-b border-slate-100 px-5 py-3.5">
        <h2 className="text-[13px] font-extrabold text-slate-700">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function DetailGrid({
  items,
}: {
  items: Array<[string, string | number | null | undefined]>;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            {label}
          </div>
          <div className="mt-0.5 text-[13px] font-bold text-slate-900">{value || "—"}</div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  label,
  description = "Records will appear here once added by clinic staff.",
}: {
  label: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>
      </span>
      <div>
        <p className="text-sm font-bold text-slate-600">No {label} yet</p>
        <p className="mt-0.5 text-[12px] font-medium text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── Vital metric definitions ────────────────────────────────────────────────

type VitalConfig = {
  key: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  format: (v: number) => string;
  range?: { low: number; high: number };
};

const VITALS_CONFIG: VitalConfig[] = [
  {
    key: "bp",
    label: "Blood Pressure",
    color: "#dc2626",
    bg: "bg-rose-50",
    border: "border-rose-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21C12 21 4 13.5 4 8.5a8 8 0 0116 0C20 13.5 12 21 12 21z" />
      </svg>
    ),
    format: () => "",
  },
  {
    key: "pulse",
    label: "Pulse",
    color: "#f97316",
    bg: "bg-orange-50",
    border: "border-orange-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12h4l2-5 4 10 2-5 2 3 2-3h4" />
      </svg>
    ),
    format: (v) => `${v} bpm`,
    range: { low: 60, high: 100 },
  },
  {
    key: "temperature_f",
    label: "Temperature",
    color: "#d97706",
    bg: "bg-amber-50",
    border: "border-amber-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
      </svg>
    ),
    format: (v) => `${v} °F`,
    range: { low: 97, high: 99 },
  },
  {
    key: "spo2",
    label: "SpO2",
    color: "#0ea5e9",
    bg: "bg-sky-50",
    border: "border-sky-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3C7 3 3 7 3 12s4 9 9 9 9-4 9-9" />
        <path d="M16 3l-3 5 3 5-3 5" />
      </svg>
    ),
    format: (v) => `${v}%`,
    range: { low: 95, high: 100 },
  },
  {
    key: "weight_kg",
    label: "Weight",
    color: "#7c3aed",
    bg: "bg-violet-50",
    border: "border-violet-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 3h12l2 7H4L6 3zM4 10h16l-2 11H6L4 10z" />
        <path d="M12 3v7" />
      </svg>
    ),
    format: (v) => `${v} kg`,
  },
  {
    key: "height_cm",
    label: "Height",
    color: "#475569",
    bg: "bg-slate-50",
    border: "border-slate-100",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v18M9 6l3-3 3 3M9 18l3 3 3-3" />
      </svg>
    ),
    format: (v) => `${v} cm`,
  },
];

function vitalStatus(config: VitalConfig, value: number): "normal" | "warning" | "none" {
  if (!config.range) return "none";
  if (value < config.range.low || value > config.range.high) return "warning";
  return "normal";
}

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Underweight", color: "text-sky-600", bg: "bg-sky-50" };
  if (bmi < 25) return { label: "Normal", color: "text-emerald-600", bg: "bg-emerald-50" };
  if (bmi < 30) return { label: "Overweight", color: "text-amber-600", bg: "bg-amber-50" };
  return { label: "Obese", color: "text-rose-600", bg: "bg-rose-50" };
}

export function VitalsGrid({
  visit,
}: {
  visit: Pick<
    Visit,
    | "bp_systolic"
    | "bp_diastolic"
    | "pulse"
    | "temperature_f"
    | "spo2"
    | "weight_kg"
    | "height_cm"
    | "visit_date"
  > | null;
}) {
  if (!visit) return null;

  const heightM = visit.height_cm ? visit.height_cm / 100 : null;
  const bmi = heightM && visit.weight_kg ? visit.weight_kg / (heightM * heightM) : null;
  const bmiInfo = bmi ? bmiCategory(bmi) : null;

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {/* BP — special paired tile */}
      {(visit.bp_systolic || visit.bp_diastolic) ? (
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-rose-100 bg-rose-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-rose-600">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 21C12 21 4 13.5 4 8.5a8 8 0 0116 0C20 13.5 12 21 12 21z" />
            </svg>
            <span className="text-[10px] font-extrabold uppercase tracking-wider">Blood Pressure</span>
          </div>
          <div className="text-[18px] font-extrabold text-slate-900">
            {visit.bp_systolic ?? "—"}<span className="text-sm font-semibold text-slate-400">/</span>{visit.bp_diastolic ?? "—"}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold text-slate-400">mmHg · sys/dia</div>
        </div>
      ) : null}

      {/* Other vitals */}
      {VITALS_CONFIG.filter((c) => c.key !== "bp").map((config) => {
        const raw = visit[config.key as keyof typeof visit] as number | null | undefined;
        if (raw == null) return null;
        const status = vitalStatus(config, raw);
        return (
          <div
            key={config.key}
            className={`rounded-xl border p-3 ${config.bg} ${config.border}`}
          >
            <div
              className="mb-1.5 flex items-center gap-1.5"
              style={{ color: config.color }}
            >
              {config.icon}
              <span className="text-[10px] font-extrabold uppercase tracking-wider">{config.label}</span>
            </div>
            <div className="text-[18px] font-extrabold text-slate-900">{config.format(raw)}</div>
            {status === "warning" && (
              <div className="mt-0.5 text-[10px] font-bold text-amber-600">Out of range</div>
            )}
            {status === "normal" && (
              <div className="mt-0.5 text-[10px] font-bold text-emerald-600">Normal</div>
            )}
          </div>
        );
      })}

      {/* BMI tile */}
      {bmi && bmiInfo ? (
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-teal-600">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" /><path d="M12 8v4l2 2" />
            </svg>
            <span className="text-[10px] font-extrabold uppercase tracking-wider">BMI</span>
          </div>
          <div className="text-[18px] font-extrabold text-slate-900">{bmi.toFixed(1)}</div>
          <div className={`mt-0.5 text-[10px] font-bold ${bmiInfo.color}`}>{bmiInfo.label}</div>
        </div>
      ) : null}
    </div>
  );
}

export function VisitSummaryCard({ visit }: { visit: Visit }) {
  const medicines = ((visit.prescription as Prescription | null)?.medicines || []) as Medicine[];
  const clinicalItems = [
    ["Chief Concern", visit.chief_complaints],
    ["Diagnosis", visit.confirmed_diagnosis || visit.provisional_diagnosis],
    ["Doctor Advice", visit.advice],
    ["Tests / Investigations", visit.investigations_ordered],
  ].filter(([, value]) => Boolean(value));

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[14px] font-extrabold text-slate-900">
            Visit on {formatDate(visit.visit_date)}
          </h2>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {patientVisitStatus(visit.status)}
          </p>
        </div>
        {visit.follow_up_date ? (
          <div className="w-fit rounded-xl bg-teal-50 px-3 py-1.5 text-[11px] font-extrabold text-[#0c8a89]">
            Follow-up {formatDate(visit.follow_up_date)}
          </div>
        ) : null}
      </div>

      <div className="p-5">
        {clinicalItems.length > 0 ? (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {clinicalItems.map(([label, value]) => (
              <VisitField key={label || ""} label={label || ""} value={value || null} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3 text-[13px] font-semibold text-slate-500">
            Your clinic has completed this visit. The clinical summary will appear here once shared.
          </div>
        )}

        {medicines.length > 0 ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Prescription
            </div>
            <div className="mt-2.5 space-y-1.5">
              {medicines.map((medicine, index) => (
                <div key={`${medicine.name}-${index}`} className="text-[13px] font-semibold text-slate-800">
                  {medicine.name}
                  {medicine.dose ? ` · ${medicine.dose}` : ""}
                  {medicine.frequency ? ` · ${medicine.frequency}` : ""}
                  {medicine.duration ? ` · ${medicine.duration}` : ""}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function patientVisitStatus(status: Visit["status"]) {
  const labels: Record<Visit["status"], string> = {
    intake: "Clinic is preparing your visit",
    queued: "Waiting for doctor review",
    in_progress: "Consultation in progress",
    awaiting_review: "Clinic is reviewing",
    completed: "Visit completed",
    cancelled: "Visit cancelled",
  };
  return labels[status] || status;
}

function VisitField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-0.5 text-[13px] font-semibold text-slate-900">{value || "—"}</div>
    </div>
  );
}
