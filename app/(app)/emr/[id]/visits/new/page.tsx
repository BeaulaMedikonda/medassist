import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireMember } from "@/lib/auth";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import type { Patient, Visit } from "@/types/db";
import { NewVisitClient } from "./NewVisitClient";

export const dynamic = "force-dynamic";

export default async function NewVisitPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; vid?: string; source?: string; section?: string }>;
}) {
  const { member, clinic } = await requireMember();
  const supabase = await supabaseServer();
  const admin = supabaseAdmin();
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const dashboardBackSection = normalizeDashboardSection(resolvedSearchParams.section);
  const isReferralSource = resolvedSearchParams.source === "referral";
  const backHref = dashboardBackSection
    ? `/emr/${id}${isReferralSource ? "?source=referral&" : "?"}section=${dashboardBackSection}`
    : `/emr/${id}`;
  const db = member.role === "doctor" ? admin : supabase;

  const { data: patient } = await db
    .from("patients")
    .select("*")
    .eq("id", id)
    .eq("clinic_id", clinic.id)
    .maybeSingle();
  if (!patient) notFound();
  const backLabel = dashboardBackSection
    ? dashboardSectionLabel(dashboardBackSection)
    : (patient as Patient).full_name;

  const doctorScope =
    member.role === "doctor"
      ? await getDoctorAssignedScope(supabase, member.id, clinic.id)
      : null;
  if (doctorScope && !doctorScope.patientIds.has(id)) {
    notFound();
  }

  // Resume an existing visit if vid is provided (doctor's queue path).
  let existingVisit: Visit | null = null;
  if (resolvedSearchParams.vid) {
    const { data: v } = await db
      .from("visits")
      .select("*")
      .eq("id", resolvedSearchParams.vid)
      .eq("clinic_id", clinic.id)
      .maybeSingle();
    existingVisit = (v as Visit | null) || null;
    if (existingVisit && doctorScope && !doctorScope.visitIds.has(existingVisit.id)) {
      notFound();
    }
  }

  // For prescription diff context, find the previous visit (excluding the one we're resuming).
  let prevQuery = db
    .from("visits")
    .select("*")
    .eq("patient_id", id)
    .eq("clinic_id", clinic.id)
    .order("visit_date", { ascending: false })
    .limit(1);
  if (doctorScope) {
    prevQuery = prevQuery.in("id", Array.from(doctorScope.visitIds));
  }
  if (existingVisit) {
    prevQuery = prevQuery.lt("visit_date", existingVisit.visit_date);
  }
  const { data: prev } = await prevQuery.maybeSingle();
  const previousVisit = (prev as Visit | null) || null;

  return (
    <div>
      <Link
        href={backHref}
        className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900"
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
        Back to {backLabel}
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">
        {existingVisit ? "Continue visit" : "New visit"}
      </h1>
      <p className="text-sm text-slate-500">
        EMR {(patient as Patient).emr_number} · {(patient as Patient).full_name}
      </p>

      <div className="mt-6">
        <NewVisitClient
          patient={patient as Patient}
          previousVisit={previousVisit}
          existingVisit={existingVisit}
          initialMode={resolvedSearchParams.mode === "manual" ? "manual" : "record"}
          currentUserId={member.id}
          clinicId={clinic.id}
        />
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
