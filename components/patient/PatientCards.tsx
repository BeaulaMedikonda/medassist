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
    <div className="mb-6">
      <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
        {eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
        {title}
      </h1>
      <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
        {description}
      </p>
    </div>
  );
}

export function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-base font-extrabold text-slate-950">{title}</h2>
      {children}
    </section>
  );
}

export function DetailGrid({
  items,
}: {
  items: Array<[string, string | number | null | undefined]>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            {label}
          </div>
          <div className="mt-1 text-sm font-bold text-slate-900">{value || "-"}</div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">
      No {label} available yet.
    </div>
  );
}

export function VitalsGrid({ visit }: { visit: Pick<Visit, "bp_systolic" | "bp_diastolic" | "pulse" | "temperature_f" | "spo2" | "weight_kg" | "height_cm" | "visit_date"> | null }) {
  const heightM = visit?.height_cm ? visit.height_cm / 100 : null;
  const bmi = heightM && visit?.weight_kg ? visit.weight_kg / (heightM * heightM) : null;

  return (
    <DetailGrid
      items={[
        ["Recorded", visit ? formatDateTime(visit.visit_date) : null],
        ["BP", visit?.bp_systolic && visit?.bp_diastolic ? `${visit.bp_systolic}/${visit.bp_diastolic} mmHg` : null],
        ["Pulse", visit?.pulse ? `${visit.pulse} bpm` : null],
        ["Temperature", visit?.temperature_f ? `${visit.temperature_f} F` : null],
        ["SpO2", visit?.spo2 ? `${visit.spo2}%` : null],
        ["Weight", visit?.weight_kg ? `${visit.weight_kg} kg` : null],
        ["Height", visit?.height_cm ? `${visit.height_cm} cm` : null],
        ["BMI", bmi ? bmi.toFixed(1) : null],
      ]}
    />
  );
}

export function VisitSummaryCard({ visit }: { visit: Visit }) {
  const medicines = ((visit.prescription as Prescription | null)?.medicines || []) as Medicine[];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-extrabold text-slate-950">
            Visit on {formatDate(visit.visit_date)}
          </h2>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {visit.status}
          </p>
        </div>
        {visit.follow_up_date ? (
          <div className="rounded-xl bg-teal-50 px-3 py-2 text-xs font-extrabold text-[#0c8a89]">
            Follow-up {formatDate(visit.follow_up_date)}
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <VisitField label="Chief Complaint" value={visit.chief_complaints} />
        <VisitField label="Diagnosis" value={visit.confirmed_diagnosis || visit.provisional_diagnosis} />
        <VisitField label="Advice" value={visit.advice} />
        <VisitField label="Investigations" value={visit.investigations_ordered} />
      </div>

      {medicines.length > 0 ? (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
            Prescription
          </div>
          <div className="mt-3 space-y-2">
            {medicines.map((medicine, index) => (
              <div key={`${medicine.name}-${index}`} className="text-sm font-semibold text-slate-800">
                {medicine.name}
                {medicine.dose ? ` - ${medicine.dose}` : ""}
                {medicine.frequency ? ` - ${medicine.frequency}` : ""}
                {medicine.duration ? ` - ${medicine.duration}` : ""}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function VisitField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value || "-"}</div>
    </div>
  );
}
