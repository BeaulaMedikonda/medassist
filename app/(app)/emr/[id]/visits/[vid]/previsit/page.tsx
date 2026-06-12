import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/auth";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import { PreVisitSummary } from "@/components/review/PreVisitSummary";
import type { Immunization, Patient, Visit } from "@/types/db";

export const dynamic = "force-dynamic";

export default async function PreVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; vid: string }>;
  searchParams?: Promise<{ section?: string }>;
}) {
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const { member, clinic } = await requireMember();
  const { id, vid } = await params;
  const resolvedSearchParams = await searchParams;
  const backSection = normalizeDashboardSection(resolvedSearchParams?.section);
  const backHref = backSection ? `/dashboard?section=${backSection}` : "/dashboard";
  const backLabel = backSection ? dashboardSectionLabel(backSection) : "Back to dashboard";
  const db = member.role === "doctor" ? admin : supabase;

  const { data: patient } = await db
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("clinic_id", clinic.id)
    .maybeSingle();
  if (!patient) notFound();

  const { data: visit } = await db
    .from("visits")
    .select("*")
    .eq("id", vid)
    .eq("patient_id", id)
    .eq("clinic_id", clinic.id)
    .maybeSingle();
  if (!visit) notFound();

  const doctorScope =
    member.role === "doctor"
      ? await getDoctorAssignedScope(supabase, member.id, clinic.id)
      : null;
  if (doctorScope && !doctorScope.visitIds.has(vid)) {
    notFound();
  }

  const { data: immunizationRows } = await db
    .from("immunizations")
    .select("*")
    .eq("patient_id", id)
    .eq("clinic_id", clinic.id)
    .order("date_given", { ascending: false })
    .limit(6);

  const p = patient as Patient;
  const v = visit as Visit;
  const startHref =
    v.status === "awaiting_review"
      ? `/emr/${p.id}/visits/${v.id}/review`
      : v.status === "completed"
        ? `/emr/${p.id}`
        : `/emr/${p.id}/visits/new?vid=${v.id}&mode=record${
            backSection ? `&section=${backSection}` : ""
          }`;
  const startLabel =
    v.status === "awaiting_review"
      ? "Review"
      : v.status === "completed"
        ? "View EMR"
        : "Start Conversation";

  return (
    <div className="space-y-5">
      <Link
        href={backHref}
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
        {backLabel}
      </Link>

      <section className="card p-5">
        <div className="flex min-w-0 items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-sm font-black text-brand-700 dark:bg-brand-900/30 dark:text-brand-300">
            {initials(p.full_name)}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-ink-100">
              {p.full_name}
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-ink-500">
              EMR {p.emr_number} · {p.age != null ? `${p.age}${p.sex || ""}` : "Age not recorded"}
            </p>
          </div>
        </div>
      </section>

      <PreVisitSummary
        visitId={v.id}
        initialSummary={v.pre_visit_summary}
        initialGeneratedAt={v.pre_visit_summary_generated_at}
        immunizations={(immunizationRows || []) as Immunization[]}
      />

      <div className="flex justify-end">
        <Link href={startHref} className="btn-teal">
          {startLabel}
        </Link>
      </div>
    </div>
  );
}

type DashboardBackSection =
  | "todayIntake"
  | "completedPatients"
  | "sentReferrals"
  | "receivedReferrals";

function normalizeDashboardSection(value: string | null | undefined): DashboardBackSection | null {
  if (
    value === "todayIntake" ||
    value === "completedPatients" ||
    value === "sentReferrals" ||
    value === "receivedReferrals"
  ) {
    return value;
  }

  return null;
}

function dashboardSectionLabel(section: DashboardBackSection) {
  const labels: Record<DashboardBackSection, string> = {
    todayIntake: "Today's Queue",
    completedPatients: "Completed Patients",
    sentReferrals: "Sent Referrals",
    receivedReferrals: "Referral Received",
  };

  return labels[section];
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
