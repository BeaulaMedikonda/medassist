import { requirePatient } from "@/lib/auth-patient";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PatientPortalShell } from "@/components/patient/PatientPortalShell";
import { EmptyState, PageHeader } from "@/components/patient/PatientCards";
import { formatDate } from "@/lib/utils";
import type { Immunization } from "@/types/db";

export const dynamic = "force-dynamic";

const statusStyle: Record<Immunization["status"], { badge: string; label: string }> = {
  completed: { badge: "border-emerald-200 bg-emerald-50 text-emerald-700", label: "Completed" },
  scheduled: { badge: "border-sky-200 bg-sky-50 text-sky-700", label: "Scheduled" },
  declined: { badge: "border-slate-200 bg-slate-100 text-slate-500", label: "Declined" },
  contraindicated: { badge: "border-rose-200 bg-rose-50 text-rose-700", label: "Contraindicated" },
};

export default async function PatientImmunizationsPage() {
  const { patient, clinic } = await requirePatient();
  const admin = supabaseAdmin();

  const { data } = await admin
    .from("immunizations")
    .select("id, vaccine_name, date_given, dose, cvx_code, status, next_due_date, notes, created_at")
    .eq("patient_id", patient.id)
    .order("date_given", { ascending: false });

  const immunizations = (data || []) as Immunization[];

  const upcoming = immunizations.filter(
    (i) =>
      i.status === "scheduled" ||
      (i.next_due_date && new Date(i.next_due_date) > new Date() && i.status === "completed"),
  );
  const history = immunizations.filter(
    (i) =>
      i.status === "completed" ||
      i.status === "declined" ||
      i.status === "contraindicated",
  );

  return (
    <PatientPortalShell patient={patient} clinic={clinic}>
      <PageHeader
        eyebrow="Immunizations"
        title="My Vaccinations"
        description="Your vaccination history recorded by the clinic."
      />

      {immunizations.length === 0 ? (
        <EmptyState label="vaccination records" />
      ) : (
        <div className="space-y-8">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-sky-600">
                Upcoming / Scheduled
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((imm) => (
                  <ImmunizationCard key={imm.id} imm={imm} />
                ))}
              </div>
            </section>
          )}

          {history.length > 0 && (
            <section>
              <h2 className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
                Vaccination History
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {history.map((imm) => (
                  <ImmunizationCard key={imm.id} imm={imm} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PatientPortalShell>
  );
}

function ImmunizationCard({ imm }: { imm: Immunization }) {
  const style = statusStyle[imm.status] ?? statusStyle.completed;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-extrabold text-slate-950">{imm.vaccine_name}</h3>
          {imm.cvx_code && (
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">CVX {imm.cvx_code}</p>
          )}
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold ${style.badge}`}
        >
          {style.label}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <Row label="Date given" value={formatDate(imm.date_given)} />
        {imm.dose && <Row label="Dose" value={imm.dose} />}
        {imm.next_due_date && (
          <Row
            label="Next due"
            value={formatDate(imm.next_due_date)}
            highlight={new Date(imm.next_due_date) > new Date()}
          />
        )}
        {imm.notes && (
          <div className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-500">
            {imm.notes}
          </div>
        )}
      </div>
    </article>
  );
}

function Row({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className={`font-bold ${highlight ? "text-sky-600" : "text-slate-800"}`}>{value}</span>
    </div>
  );
}
