import { notFound } from "next/navigation";
import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PreVisitSummary } from "@/components/review/PreVisitSummary";
import type { Doctor, Immunization, Patient, Referral, Visit } from "@/types/db";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReferralDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { member, clinic } = await requireMember();
  const { id } = await params;
  const admin = supabaseAdmin();

  const { data: referralRaw } = await admin
    .from("referrals")
    .select("*")
    .eq("id", id)
    .eq("clinic_id", clinic.id)
    .maybeSingle();
  if (!referralRaw) notFound();

  const referral = referralRaw as Referral;
  const currentDoctorName = normalizeDoctorName(member.full_name);
  const referredName = normalizeDoctorName(referral.referred_to_name);
  const isSent = referral.referring_doctor_id === member.id;
  const isReceived =
    referral.referred_to_doctor_id === member.id ||
    referredName === currentDoctorName ||
    referredName.includes(currentDoctorName) ||
    currentDoctorName.includes(referredName);

  if (member.role === "doctor" && !isSent && !isReceived) {
    notFound();
  }

  const [{ data: patientRaw }, { data: doctorRowsRaw }, { data: referralHistoryRaw }] =
    await Promise.all([
      admin
        .from("patients")
        .select("*")
        .eq("id", referral.patient_id)
        .eq("clinic_id", clinic.id)
        .maybeSingle(),
      admin
        .from("doctors")
        .select("id, full_name")
        .eq("clinic_id", clinic.id),
      admin
        .from("referrals")
        .select("*")
        .eq("patient_id", referral.patient_id)
        .eq("clinic_id", clinic.id)
        .order("created_at", { ascending: false }),
    ]);
  if (!patientRaw) notFound();

  const patient = patientRaw as Patient;
  const doctorRows = (doctorRowsRaw || []) as Array<Pick<Doctor, "id" | "full_name">>;
  const referralHistory = (referralHistoryRaw || []) as Referral[];
  const doctorById = new Map(doctorRows.map((doctor) => [doctor.id, doctor.full_name]));
  const direction = isSent ? "sent" : "received";
  const returnHref =
    direction === "sent"
      ? "/dashboard?section=sentReferrals"
      : "/dashboard?section=receivedReferrals";

  const visitQuery = referral.visit_id
    ? admin
        .from("visits")
        .select("*")
        .eq("id", referral.visit_id)
        .eq("patient_id", patient.id)
        .eq("clinic_id", clinic.id)
        .maybeSingle()
    : admin
        .from("visits")
        .select("*")
        .eq("patient_id", patient.id)
        .eq("clinic_id", clinic.id)
        .order("visit_date", { ascending: false })
        .limit(1)
        .maybeSingle();
  const [{ data: visitRaw }, { data: immunizationRows }] = await Promise.all([
    visitQuery,
    admin
      .from("immunizations")
      .select("*")
      .eq("patient_id", patient.id)
      .eq("clinic_id", clinic.id)
      .order("date_given", { ascending: false })
      .limit(6),
  ]);
  const visit = visitRaw as Visit | null;
  const openVisitHref = visit
    ? `/emr/${patient.id}/visits/${visit.id}/previsit?section=${
        direction === "sent" ? "sentReferrals" : "receivedReferrals"
      }`
    : null;

  return (
    <div className="space-y-5">
      <Link
        href={returnHref}
        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-ink-500 dark:hover:text-ink-100"
      >
        <svg viewBox="0 0 20 20" className="h-3 w-3">
          <path
            d="M12 4l-6 6 6 6"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to dashboard
      </Link>

      <section className="card p-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-black text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {initials(patient.full_name)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-ink-100">
              {patient.full_name}
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-ink-500">
              EMR {patient.emr_number} ·{" "}
              {patient.age != null ? `${patient.age}${patient.sex || ""}` : "Age not recorded"}
            </p>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">
              Current referral
            </h2>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-ink-500">
              Sent on {formatDate(referral.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {openVisitHref ? (
              <Link href={openVisitHref} className="btn-secondary">
                Open Visit
              </Link>
            ) : null}
            <Link
              href={`/emr/${patient.id}?source=referral&section=${
                direction === "sent" ? "sentReferrals" : "receivedReferrals"
              }`}
              className="btn-teal"
            >
              Open EMR
            </Link>
          </div>
        </div>

        <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={direction === "sent" ? "To" : "From"} value={direction === "sent" ? referral.referred_to_name : doctorById.get(referral.referring_doctor_id) || "Clinic doctor"} />
          <Detail label="Specialty" value={referral.referred_to_specialty || "-"} />
          <Detail label="Status" value={referral.status} />
          <Detail label="Reason" value={referral.reason || "-"} wide />
          <Detail label="Notes" value={referral.notes || "-"} wide />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-ink-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">
            Referral history
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-500">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">To</th>
                <th className="px-5 py-3">Specialty</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {referralHistory.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-0 dark:border-ink-800"
                >
                  <td className="px-5 py-3 text-slate-500 dark:text-ink-500">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-5 py-3 font-medium text-slate-900 dark:text-ink-100">
                    {row.referred_to_name}
                  </td>
                  <td className="px-5 py-3 text-slate-600 dark:text-ink-400">
                    {row.referred_to_specialty}
                  </td>
                  <td className="px-5 py-3 capitalize text-slate-600 dark:text-ink-400">
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {visit ? (
        <PreVisitSummary
          visitId={visit.id}
          initialSummary={visit.pre_visit_summary}
          initialGeneratedAt={visit.pre_visit_summary_generated_at}
          immunizations={(immunizationRows || []) as Immunization[]}
        />
      ) : (
        <section className="card border-dashed p-5 text-sm font-medium text-slate-500 dark:text-ink-500">
          No pre-visit brief is available for this referral yet.
        </section>
      )}
    </div>
  );
}

function Detail({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2 lg:col-span-3" : ""}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
        {label}
      </div>
      <div className="mt-1 rounded-xl bg-slate-50 px-3 py-2 font-medium text-slate-800 dark:bg-ink-900 dark:text-ink-200">
        {value}
      </div>
    </div>
  );
}

function normalizeDoctorName(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/\bdr\.?\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
