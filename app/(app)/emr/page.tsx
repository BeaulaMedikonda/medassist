import { unstable_noStore as noStore } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import { EmrListClient } from "./EmrListClient";
import type { LoincCodeDetail, Patient, Prescription } from "@/types/db";
 
export const dynamic = "force-dynamic";
 
export type PatientFilter = "all" | "today" | "visited" | "chronic";
 
export type LatestVisit = {
  visit_id: string;
  visit_date: string;
  diagnosis: string | null;
  status: string;
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature_f: number | null;
  spo2: number | null;
  weight_kg: number | null;
  chief_complaints: string | null;
  investigations_ordered: string | null;
  prescription: Prescription | null;
  advice: string | null;
  follow_up_date: string | null;
  follow_up_notes: string | null;
};
 
export type PatientSummary = {
  visit_id: string;
  visit_date: string;
  status: string;
  summary: string;
  generated_at: string | null;
};
 
export type PatientVisitItem = {
  visit_id: string;
  visit_date: string;
  status: string;
  diagnosis: string | null;
  chief_complaints: string | null;
  investigations_ordered: string | null;
  loinc_code_details: LoincCodeDetail[];
  has_vitals: boolean;
};
 
export default async function EmrListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  noStore();
 
  const [authContext, supabase, resolvedSearchParams] = await Promise.all([
    requireMember(),
    supabaseServer(),
    searchParams,
  ]);
  const { member, clinic } = authContext;
  const q = (resolvedSearchParams.q || "").trim();
 
  const filter: PatientFilter =
    resolvedSearchParams.filter === "today" ||
    resolvedSearchParams.filter === "visited" ||
    resolvedSearchParams.filter === "chronic"
      ? resolvedSearchParams.filter
      : "all";
 
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
 
  const [referralDoctorsResult, doctorScope] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, full_name")
      .eq("clinic_id", clinic.id)
      .eq("role", "doctor")
      .order("full_name"),
    member.role === "doctor"
      ? getDoctorAssignedScope(supabase, member.id, clinic.id)
      : Promise.resolve(null),
  ]);
  const referralDoctorsRaw = referralDoctorsResult.data;
  const referralDoctors =
    referralDoctorsRaw && referralDoctorsRaw.length > 0
      ? (referralDoctorsRaw as Array<{ id: string; full_name: string }>)
      : [{ id: member.id, full_name: member.full_name }];
  const scopedPatientIds = doctorScope ? Array.from(doctorScope.patientIds) : null;
 
  if (scopedPatientIds && scopedPatientIds.length === 0) {
    return (
      <EmrListClient
        clinicId={clinic.id}
        currentUserId={member.id}
        clinicName={clinic.name}
        initialQuery={q}
        initialFilter={filter}
        patients={[]}
        latestVisit={{}}
        latestVitalsVisit={{}}
        patientVisits={{}}
        patientSummaries={{}}
        referralDoctors={referralDoctors}
        error={null}
        counts={{
          all: 0,
          today: 0,
          visited: 0,
          chronic: 0,
        }}
      />
    );
  }
 
  let patientQuery = supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinic.id)
    .order("last_visit_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(150);
 
  if (scopedPatientIds) {
    patientQuery = patientQuery.in("id", scopedPatientIds);
  }
 
  if (q) {
    let searchFields = ["full_name", "first_name", "last_name"];

    if (isPhoneLikeQuery(q)) {
      searchFields = ["phone"];
    } else if (isEmailLikeQuery(q)) {
      searchFields = ["email"];
    } else if (isEmrLikeQuery(q)) {
      searchFields = ["emr_number"];
    }

    patientQuery = patientQuery.or(searchFields.map((field) => `${field}.ilike.%${q}%`).join(","));
  }
 
  if (filter === "today") {
    patientQuery = patientQuery.gte("last_visit_at", todayStart.toISOString());
  } else if (filter === "visited") {
    patientQuery = patientQuery.not("last_visit_at", "is", null);
  } else if (filter === "chronic") {
    patientQuery = patientQuery
      .not("chronic_conditions", "is", null)
      .neq("chronic_conditions", "");
  }
 
  let allCountQuery = supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinic.id);
  let todayCountQuery = supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinic.id)
    .gte("last_visit_at", todayStart.toISOString());
  let visitedCountQuery = supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinic.id)
    .not("last_visit_at", "is", null);
  let chronicCountQuery = supabase
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinic.id)
    .not("chronic_conditions", "is", null)
    .neq("chronic_conditions", "");
 
  if (scopedPatientIds) {
    allCountQuery = allCountQuery.in("id", scopedPatientIds);
    todayCountQuery = todayCountQuery.in("id", scopedPatientIds);
    visitedCountQuery = visitedCountQuery.in("id", scopedPatientIds);
    chronicCountQuery = chronicCountQuery.in("id", scopedPatientIds);
  }
 
  const [patientResult, allCount, todayCount, visitedCount, chronicCount] = await Promise.all([
    patientQuery,
    allCountQuery,
    todayCountQuery,
    visitedCountQuery,
    chronicCountQuery,
  ]);
  const { data: patients, error } = patientResult;
 
  const patientIds = (patients || []).map((p) => (p as Patient).id);
  const latestVisit: Record<string, LatestVisit> = {};
  const latestVitalsVisit: Record<string, LatestVisit> = {};
  const patientVisits: Record<string, PatientVisitItem[]> = {};
  const patientSummaries: Record<string, PatientSummary[]> = {};
 
  if (patientIds.length > 0) {
    let latestVisitQuery = supabase
      .from("visits")
      .select("id, patient_id, confirmed_diagnosis, provisional_diagnosis, visit_date, status, bp_systolic, bp_diastolic, pulse, temperature_f, spo2, weight_kg, chief_complaints, investigations_ordered, loinc_code_details, prescription, advice, follow_up_date, follow_up_notes")
      .in("patient_id", patientIds)
      .order("visit_date", { ascending: false });
 
    let summaryQuery = supabase
      .from("visits")
      .select("id, patient_id, visit_date, status, pre_visit_summary, pre_visit_summary_generated_at")
      .in("patient_id", patientIds)
      .not("pre_visit_summary", "is", null)
      .order("visit_date", { ascending: false });
 
    const [{ data: visits }, { data: summaryVisits }] = await Promise.all([
      latestVisitQuery,
      summaryQuery,
    ]);
 
    if (visits) {
      for (const v of visits as Array<{
        id: string;
        patient_id: string;
        confirmed_diagnosis: string | null;
        provisional_diagnosis: string | null;
        visit_date: string;
        status: string;
        bp_systolic: number | null;
        bp_diastolic: number | null;
        pulse: number | null;
        temperature_f: number | null;
        spo2: number | null;
        weight_kg: number | null;
        chief_complaints: string | null;
        investigations_ordered: string | null;
        prescription: Prescription | null;
        advice: string | null;
        follow_up_date: string | null;
        follow_up_notes: string | null;
      }>) {
        const mapped: LatestVisit = {
          visit_id: v.id,
          visit_date: v.visit_date,
          diagnosis: v.confirmed_diagnosis || v.provisional_diagnosis || null,
          status: v.status,
          bp_systolic: v.bp_systolic,
          bp_diastolic: v.bp_diastolic,
          pulse: v.pulse,
          temperature_f: v.temperature_f,
          spo2: v.spo2,
          weight_kg: v.weight_kg,
          chief_complaints: v.chief_complaints,
          investigations_ordered: v.investigations_ordered,
          prescription: v.prescription,
          advice: v.advice,
          follow_up_date: v.follow_up_date,
          follow_up_notes: v.follow_up_notes,
        };
 
        if (!latestVisit[v.patient_id]) {
          latestVisit[v.patient_id] = mapped;
        }
 
        if (!latestVitalsVisit[v.patient_id] && hasVitals(v)) {
          latestVitalsVisit[v.patient_id] = mapped;
        }

        const loincCodeDetails =
          (v as typeof v & { loinc_code_details?: LoincCodeDetail[] | null })
            .loinc_code_details || [];
        patientVisits[v.patient_id] = patientVisits[v.patient_id] || [];
        patientVisits[v.patient_id].push({
          visit_id: v.id,
          visit_date: v.visit_date,
          status: v.status,
          diagnosis: v.confirmed_diagnosis || v.provisional_diagnosis || null,
          chief_complaints: v.chief_complaints,
          investigations_ordered: v.investigations_ordered,
          loinc_code_details: loincCodeDetails,
          has_vitals: hasVitals(v),
        });
      }
    }
 
    if (summaryVisits) {
      for (const v of summaryVisits as Array<{
        id: string;
        patient_id: string;
        visit_date: string;
        status: string;
        pre_visit_summary: string | null;
        pre_visit_summary_generated_at: string | null;
      }>) {
        const summary = v.pre_visit_summary?.trim();
        if (!summary) continue;
 
        patientSummaries[v.patient_id] = patientSummaries[v.patient_id] || [];
        patientSummaries[v.patient_id].push({
          visit_id: v.id,
          visit_date: v.visit_date,
          status: v.status,
          summary,
          generated_at: v.pre_visit_summary_generated_at,
        });
      }
    }
  }
 
  return (
    <EmrListClient
      clinicId={clinic.id}
      currentUserId={member.id}
      clinicName={clinic.name}
      initialQuery={q}
      initialFilter={filter}
      patients={(patients || []) as Patient[]}
      latestVisit={latestVisit}
      latestVitalsVisit={latestVitalsVisit}
      patientVisits={patientVisits}
      patientSummaries={patientSummaries}
      referralDoctors={referralDoctors}
      error={error?.message || null}
      counts={{
        all: allCount.count ?? 0,
        today: todayCount.count ?? 0,
        visited: visitedCount.count ?? 0,
        chronic: chronicCount.count ?? 0,
      }}
    />
  );
}
 
function hasVitals(visit: {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  temperature_f: number | null;
  spo2: number | null;
  weight_kg: number | null;
}) {
  return (
    visit.bp_systolic != null ||
    visit.bp_diastolic != null ||
    visit.pulse != null ||
    visit.temperature_f != null ||
    visit.spo2 != null ||
    visit.weight_kg != null
  );
}

function isPhoneLikeQuery(rawQuery: string) {
  return /^[+\d\s()-]+$/.test(rawQuery.trim());
}

function isEmailLikeQuery(rawQuery: string) {
  return rawQuery.includes("@");
}

function isEmrLikeQuery(rawQuery: string) {
  const query = rawQuery.trim().toLowerCase();
  return query.includes("emr") || query.includes("hd-") || query.includes("clinic") || /-\d/.test(query);
}
 
 
