// import { unstable_noStore as noStore } from "next/cache";
// import { requireMember } from "@/lib/auth";
// import { supabaseServer } from "@/lib/supabase/server";
// import { supabaseAdmin } from "@/lib/supabase/admin";
// import { getDoctorAssignedScope } from "@/lib/doctor-access";
// import { MaDashboard } from "./MaDashboard";
// import { DoctorDashboard } from "./DoctorDashboard";
// import { AdminDashboard } from "./AdminDashboard";
// import type { Doctor, Patient, Visit, Appointment, Referral } from "@/types/db";

// export const dynamic = "force-dynamic";

// export default async function DashboardPage() {
//   noStore();
//   const { member, clinic } = await requireMember();
//   const sb = await supabaseServer();

//   // Today range (UTC-anchored is fine; clinic stats are coarse).
//   const dayStart = new Date();
//   dayStart.setHours(0, 0, 0, 0);
//   const dayEnd = new Date(dayStart);
//   dayEnd.setDate(dayEnd.getDate() + 1);
//   const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);

//   // ---- Today's clinic visits (broad fetch, then partition in JS) ----
//   const { data: todayVisitsRaw } = await sb
//     .from("visits")
//     .select("*")
//     .eq("clinic_id", clinic.id)
//     .gte("visit_date", dayStart.toISOString())
//     .lt("visit_date", dayEnd.toISOString())
//     .order("visit_date", { ascending: false });
//   const todayVisits = (todayVisitsRaw || []) as Visit[];

//   // Awaiting-review visits across any date (drafts can stack up)
//   const { data: awaitingRaw } = await sb
//     .from("visits")
//     .select("*")
//     .eq("clinic_id", clinic.id)
//     .eq("status", "awaiting_review")
//     .order("updated_at", { ascending: false })
//     .limit(50);
//   const awaitingVisits = (awaitingRaw || []) as Visit[];

//   // Hydrate patients for today + awaiting visits
//   const patientIds = Array.from(
//     new Set([...todayVisits, ...awaitingVisits].map((v) => v.patient_id)),
//   );
//   const { data: patientsRaw } =
//     patientIds.length > 0
//       ? await sb.from("patients").select("*").in("id", patientIds)
//       : { data: [] as Patient[] };
//   const patientById = new Map<string, Patient>();
//   for (const p of (patientsRaw || []) as Patient[]) patientById.set(p.id, p);

//   // Visit-doctor assignments for today + awaiting (used by MA & Doctor dashboards)
//   const visitIds = Array.from(
//     new Set([...todayVisits, ...awaitingVisits].map((v) => v.id)),
//   );
//   const { data: assignmentsRaw } =
//     visitIds.length > 0
//       ? await sb
//           .from("visit_doctors")
//           .select("visit_id, doctor_id, role")
//           .in("visit_id", visitIds)
//       : { data: [] as Array<{ visit_id: string; doctor_id: string; role: string }> };
//   const assignments = (assignmentsRaw || []) as Array<{
//     visit_id: string;
//     doctor_id: string;
//     role: string;
//   }>;

//   // Roster for the clinic (used by all roles)
//   const { data: rosterRaw } = await sb
//     .from("doctors")
//     .select("id, full_name, qualification, role")
//     .eq("clinic_id", clinic.id)
//     .order("full_name");
//   const roster = (rosterRaw || []) as Array<
//     Pick<Doctor, "id" | "full_name" | "qualification" | "role">
//   >;
//   const doctorById = new Map(roster.map((r) => [r.id, r]));
//   const doctorRoster = roster.filter((r) => r.role === "doctor");

//   // Today's appointments (for all roles' calendar widgets)
//   const { data: apptsRaw } = await sb
//     .from("appointments")
//     .select("*")
//     .eq("clinic_id", clinic.id)
//     .gte("scheduled_at", dayStart.toISOString())
//     .lt("scheduled_at", dayEnd.toISOString())
//     .order("scheduled_at");
//   const todayAppointments = (apptsRaw || []) as Appointment[];

//   const trendsStart = new Date(dayStart);
//   trendsStart.setDate(trendsStart.getDate() - 30);
//   const { data: vitalTrendVisitsRaw } = await sb
//     .from("visits")
//     .select(
//       "id, patient_id, visit_date, bp_systolic, bp_diastolic, pulse, temperature_f, spo2, weight_kg",
//     )
//     .eq("clinic_id", clinic.id)
//     .gte("visit_date", trendsStart.toISOString())
//     .order("visit_date", { ascending: true });
//   const vitalTrendVisits = (vitalTrendVisitsRaw || []) as Array<
//     Pick<
//       Visit,
//       | "id"
//       | "patient_id"
//       | "visit_date"
//       | "bp_systolic"
//       | "bp_diastolic"
//       | "pulse"
//       | "temperature_f"
//       | "spo2"
//       | "weight_kg"
//     >
//   >;

//   const activePainMapVisits = todayVisits.filter((visit) =>
//     ["queued", "intake", "in_progress"].includes(visit.status),
//   );
//   const activePainMapVisitIds = activePainMapVisits.map((visit) => visit.id);
//   const { data: recordedPainMapsRaw } =
//     activePainMapVisitIds.length > 0
//       ? await sb
//           .from("graphic_pain_maps")
//           .select("visit_id")
//           .eq("clinic_id", clinic.id)
//           .in("visit_id", activePainMapVisitIds)
//       : { data: [] as Array<{ visit_id: string | null }> };
//   const recordedPainMapVisitIds = new Set(
//     (recordedPainMapsRaw || [])
//       .map((record) => record.visit_id)
//       .filter((visitId): visitId is string => Boolean(visitId)),
//   );
//   const painMapVisits = activePainMapVisits.filter(
//     (visit) => !recordedPainMapVisitIds.has(visit.id),
//   );

//   const vitalTrendPatientIds = Array.from(
//     new Set(
//       [...vitalTrendVisits, ...painMapVisits].map((visit) => visit.patient_id),
//     ),
//   ).filter((id) => !patientById.has(id));
//   if (vitalTrendPatientIds.length > 0) {
//     const { data: trendPatientsRaw } = await sb
//       .from("patients")
//       .select("*")
//       .in("id", vitalTrendPatientIds);
//     for (const p of (trendPatientsRaw || []) as Patient[]) patientById.set(p.id, p);
//   }

//   if (member.role === "medical_assistant") {
//     return (
//       <MaDashboard
//         member={member}
//         clinic={clinic}
//         todayVisits={todayVisits}
//         awaitingVisits={awaitingVisits}
//         patientById={Object.fromEntries(patientById)}
//         assignments={assignments}
//         doctorRoster={doctorRoster}
//         currentUserId={member.id}
//         vitalTrendVisits={vitalTrendVisits}
//         painMapVisits={painMapVisits}
//       />
//     );
//   }

//   if (member.role === "doctor") {
//     const myVisitIds = new Set(
//       assignments.filter((a) => a.doctor_id === member.id).map((a) => a.visit_id),
//     );
//     const isMine = (visit: Visit) =>
//       visit.doctor_id === member.id || myVisitIds.has(visit.id);
//     const myToday = todayVisits.filter(isMine);
//     const myAwaiting = awaitingVisits.filter(
//       (v) => myVisitIds.has(v.id) || v.doctor_id === member.id,
//     );
//     const doctorScope = await getDoctorAssignedScope(sb, member.id, clinic.id);
//     const scopedPatientIds = Array.from(doctorScope.patientIds);

//     let summaryPatientsQuery = sb
//       .from("patients")
//       .select("id, full_name, emr_number, age, sex, phone, blood_group, known_allergies, chronic_conditions")
//       .eq("clinic_id", clinic.id)
//       .order("full_name")
//       .limit(300);

//     if (scopedPatientIds.length > 0) {
//       summaryPatientsQuery = summaryPatientsQuery.in("id", scopedPatientIds);
//     }

//     const { data: summaryPatientsRaw } =
//       scopedPatientIds.length > 0 || doctorScope.visitIds.size === 0
//         ? await summaryPatientsQuery
//         : { data: [] };

//     const summaryPatientIds = ((summaryPatientsRaw || []) as Patient[]).map((patient) => patient.id);
//     const { data: patientSummariesRaw } =
//       summaryPatientIds.length > 0
//         ? await sb
//             .from("visits")
//             .select("id, patient_id, visit_date, status, pre_visit_summary, pre_visit_summary_generated_at")
//             .eq("clinic_id", clinic.id)
//             .in("patient_id", summaryPatientIds)
//             .not("pre_visit_summary", "is", null)
//             .order("visit_date", { ascending: false })
//         : { data: [] };

//     const admin = supabaseAdmin();
//     const { data: clinicReferralsRaw } = await admin
//       .from("referrals")
//       .select("*")
//       .eq("clinic_id", clinic.id)
//       .order("created_at", { ascending: false })
//       .limit(100);
//     const clinicReferrals = (clinicReferralsRaw || []) as Referral[];
//     const currentDoctorName = normalizeDoctorName(member.full_name);
//     const sentReferrals = clinicReferrals
//       .filter((referral) => referral.referring_doctor_id === member.id)
//       .slice(0, 50);
//     const receivedReferrals = clinicReferrals
//       .filter((referral) => {
//         const referredName = normalizeDoctorName(referral.referred_to_name);
//         return (
//           referral.referred_to_doctor_id === member.id ||
//           referredName === currentDoctorName ||
//           referredName.includes(currentDoctorName) ||
//           currentDoctorName.includes(referredName)
//         );
//       })
//       .slice(0, 20);
//     const referralPatientIds = Array.from(
//       new Set(
//         [...sentReferrals, ...receivedReferrals].map((referral) => referral.patient_id),
//       ),
//     ).filter((patientId) => !patientById.has(patientId));

//     if (referralPatientIds.length > 0) {
//       const { data: referralPatientsRaw } = await admin
//         .from("patients")
//         .select("*")
//         .in("id", referralPatientIds);

//       for (const patient of (referralPatientsRaw || []) as Patient[]) {
//         patientById.set(patient.id, patient);
//       }
//     }

//     return (
//       <DoctorDashboard
//         member={member}
//         clinic={clinic}
//         myToday={myToday}
//         myAwaiting={myAwaiting}
//         clinicToday={myToday}
//         clinicAwaiting={myAwaiting}
//         patientById={Object.fromEntries(patientById)}
//         summaryPatients={(summaryPatientsRaw || []) as Patient[]}
//         patientSummaries={(patientSummariesRaw || []) as Array<{
//           id: string;
//           patient_id: string;
//           visit_date: string;
//           status: string;
//           pre_visit_summary: string | null;
//           pre_visit_summary_generated_at: string | null;
//         }>}
//         receivedReferrals={receivedReferrals}
//         sentReferrals={sentReferrals}
//         doctorRoster={doctorRoster.map((doctor) => ({
//           id: doctor.id,
//           full_name: doctor.full_name,
//         }))}
//       />
//     );
//   }

//   // Admin
//   // Counts
//   const { count: totalPatients } = await sb
//     .from("patients")
//     .select("*", { count: "exact", head: true })
//     .eq("clinic_id", clinic.id);
//   const { data: monthlyDraftsRaw } = await sb
//     .from("visits")
//     .select("id, status, audio_url")
//     .gte("visit_date", monthStart.toISOString())
//     .not("audio_url", "is", null);

//   return (
//     <AdminDashboard
//       member={member}
//       clinic={clinic}
//       todayVisits={todayVisits}
//       awaitingVisits={awaitingVisits}
//       patientById={Object.fromEntries(patientById)}
//       assignments={assignments}
//       doctorById={Object.fromEntries(doctorById)}
//       roster={roster}
//       todayAppointments={todayAppointments}
//       totalPatients={totalPatients || 0}
//       monthlyDrafts={(monthlyDraftsRaw || []).length}
//     />
//   );
// }

// function normalizeDoctorName(value: string | null | undefined) {
//   return (value || "")
//     .toLowerCase()
//     .replace(/\bdr\.?\b/g, "")
//     .replace(/[^a-z0-9]/g, "")
//     .trim();
// }
import { unstable_noStore as noStore } from "next/cache";
import { requireMember } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getDoctorAssignedScope } from "@/lib/doctor-access";
import { MaDashboard } from "./MaDashboard";
import { DoctorDashboard } from "./DoctorDashboard";
import { AdminDashboard } from "./AdminDashboard";
import type { Doctor, Patient, Visit, Appointment, Referral } from "@/types/db";
  
export const dynamic = "force-dynamic";

const ACTIVE_QUEUE_STATUSES = ["intake", "queued", "in_progress", "awaiting_review"];
 
export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tool?: string; patientId?: string; visitId?: string; returnTo?: string; section?: string }>;
}) {
  noStore();
  const params = await searchParams;
  const { member, clinic } = await requireMember();
  const sb = await supabaseServer();
 
  // Today range (UTC-anchored is fine; clinic stats are coarse).
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const monthStart = new Date(dayStart.getFullYear(), dayStart.getMonth(), 1);
 
  // ---- Today's clinic visits (broad fetch, then partition in JS) ----
  const { data: todayVisitsRaw } = await sb
    .from("visits")
    .select("*")
    .eq("clinic_id", clinic.id)
    .gte("visit_date", dayStart.toISOString())
    .lt("visit_date", dayEnd.toISOString())
    .order("visit_date", { ascending: false });
  const todayVisits = (todayVisitsRaw || []) as Visit[];

  // Older unfinished visits stay in the current queue until completed/cancelled.
  const { data: olderActiveRaw } = await sb
    .from("visits")
    .select("*")
    .eq("clinic_id", clinic.id)
    .lt("visit_date", dayStart.toISOString())
    .in("status", ACTIVE_QUEUE_STATUSES)
    .order("updated_at", { ascending: false })
    .limit(200);
  const olderActiveVisits = (olderActiveRaw || []) as Visit[];

  const currentQueueVisits = [...todayVisits, ...olderActiveVisits].filter(
    (visit, index, visits) => visits.findIndex((item) => item.id === visit.id) === index,
  );
 
  // Hydrate patients for today's completed/reviewed visits plus current queue visits.
  const patientIds = Array.from(
    new Set([...todayVisits, ...currentQueueVisits].map((v) => v.patient_id)),
  );
  const { data: patientsRaw } =
    patientIds.length > 0
      ? await sb.from("patients").select("*").in("id", patientIds)
      : { data: [] as Patient[] };
  const patientById = new Map<string, Patient>();
  for (const p of (patientsRaw || []) as Patient[]) patientById.set(p.id, p);
 
  // Visit-doctor assignments for today + current queue (used by MA & Doctor dashboards)
  const visitIds = Array.from(
    new Set([...todayVisits, ...currentQueueVisits].map((v) => v.id)),
  );
  const { data: assignmentsRaw } =
    visitIds.length > 0
      ? await sb
          .from("visit_doctors")
          .select("visit_id, doctor_id, role")
          .in("visit_id", visitIds)
      : { data: [] as Array<{ visit_id: string; doctor_id: string; role: string }> };
  const assignments = (assignmentsRaw || []) as Array<{
    visit_id: string;
    doctor_id: string;
    role: string;
  }>;
 
  // Roster for the clinic (used by all roles)
  const { data: rosterRaw } = await sb
    .from("doctors")
    .select("id, full_name, qualification, role")
    .eq("clinic_id", clinic.id)
    .order("full_name");
  const roster = (rosterRaw || []) as Array<
    Pick<Doctor, "id" | "full_name" | "qualification" | "role">
  >;
  const doctorById = new Map(roster.map((r) => [r.id, r]));
  const doctorRoster = roster.filter((r) => r.role === "doctor");
 
  // Today's appointments (for all roles' calendar widgets)
  const { data: apptsRaw } = await sb
    .from("appointments")
    .select("*")
    .eq("clinic_id", clinic.id)
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString())
    .order("scheduled_at");
  const todayAppointments = (apptsRaw || []) as Appointment[];
 
  const trendsStart = new Date(dayStart);
  trendsStart.setDate(trendsStart.getDate() - 30);
  const { data: vitalTrendVisitsRaw } = await sb
    .from("visits")
    .select(
      "id, patient_id, visit_date, bp_systolic, bp_diastolic, pulse, temperature_f, spo2, weight_kg",
    )
    .eq("clinic_id", clinic.id)
    .gte("visit_date", trendsStart.toISOString())
    .order("visit_date", { ascending: true });
  const vitalTrendVisits = (vitalTrendVisitsRaw || []) as Array<
    Pick<
      Visit,
      | "id"
      | "patient_id"
      | "visit_date"
      | "bp_systolic"
      | "bp_diastolic"
      | "pulse"
      | "temperature_f"
      | "spo2"
      | "weight_kg"
    >
  >;
 
  const vitalTrendPatientIds = Array.from(
    new Set(vitalTrendVisits.map((v) => v.patient_id)),
  ).filter((id) => !patientById.has(id));
  if (vitalTrendPatientIds.length > 0) {
    const { data: trendPatientsRaw } = await sb
      .from("patients")
      .select("*")
      .in("id", vitalTrendPatientIds);
    for (const p of (trendPatientsRaw || []) as Patient[]) patientById.set(p.id, p);
  }
 
  // Portal requests: unassigned intake submissions for this clinic
  const admin = supabaseAdmin();
  const { data: portalRequestsRaw, count: portalRequestCount } = await admin
    .from("patient_portal_intake_submissions")
    .select("created_at", { count: "exact" })
    .eq("clinic_id", clinic.id)
    .eq("status", "submitted")
    .order("created_at", { ascending: true })
    .limit(1);
  const portalCount = portalRequestCount || 0;
  const oldestPortalRequest = (portalRequestsRaw as Array<{ created_at: string }> | null)?.[0]?.created_at;
  const hasOldPortalRequest = oldestPortalRequest
    ? Date.now() - new Date(oldestPortalRequest).getTime() > 30 * 60 * 1000
    : false;
  if (member.role === "medical_assistant") {
    return (
      <MaDashboard
        member={member}
        clinic={clinic}
        todayVisits={currentQueueVisits}
        awaitingVisits={[]}
        patientById={Object.fromEntries(patientById)}
        assignments={assignments}
        doctorRoster={doctorRoster}
        currentUserId={member.id}
        vitalTrendVisits={vitalTrendVisits}
        portalRequestCount={portalCount}
        hasOldPortalRequest={hasOldPortalRequest}
        initialPainMapPatientId={params?.tool === "pain-map" ? params?.patientId || "" : ""}
        initialPainMapVisitId={params?.tool === "pain-map" ? params?.visitId || "" : ""}
        initialPainMapOpen={params?.tool === "pain-map"}
        initialPainMapReturnTo={params?.tool === "pain-map" ? params?.returnTo || "" : ""}
      />
    );
  }
 
  if (member.role === "doctor") {
    const myVisitIds = new Set(
      assignments.filter((a) => a.doctor_id === member.id).map((a) => a.visit_id),
    );
    const isMine = (visit: Visit) =>
      visit.doctor_id === member.id || myVisitIds.has(visit.id);
    const myToday = todayVisits.filter(isMine);
    const myQueue = currentQueueVisits.filter(isMine);
    const doctorScope = await getDoctorAssignedScope(sb, member.id, clinic.id);
    const scopedPatientIds = Array.from(doctorScope.patientIds);
 
    let summaryPatientsQuery = sb
      .from("patients")
      .select("id, full_name, emr_number, age, sex, phone, blood_group, known_allergies, chronic_conditions")
      .eq("clinic_id", clinic.id)
      .order("full_name")
      .limit(300);
 
    if (scopedPatientIds.length > 0) {
      summaryPatientsQuery = summaryPatientsQuery.in("id", scopedPatientIds);
    }
 
    const { data: summaryPatientsRaw } =
      scopedPatientIds.length > 0 || doctorScope.visitIds.size === 0
        ? await summaryPatientsQuery
        : { data: [] };
 
    const summaryPatientIds = ((summaryPatientsRaw || []) as Patient[]).map((patient) => patient.id);
    const { data: patientSummariesRaw } =
      summaryPatientIds.length > 0
        ? await sb
            .from("visits")
            .select("id, patient_id, visit_date, status, pre_visit_summary, pre_visit_summary_generated_at")
            .eq("clinic_id", clinic.id)
            .in("patient_id", summaryPatientIds)
            .not("pre_visit_summary", "is", null)
            .order("visit_date", { ascending: false })
        : { data: [] };
 
    const { data: clinicReferralsRaw } = await admin
      .from("referrals")
      .select("*")
      .eq("clinic_id", clinic.id)
      .order("created_at", { ascending: false })
      .limit(100);
    const clinicReferrals = (clinicReferralsRaw || []) as Referral[];
    const currentDoctorName = normalizeDoctorName(member.full_name);
    const sentReferrals = clinicReferrals
      .filter((referral) => referral.referring_doctor_id === member.id)
      .slice(0, 50);
    const receivedReferrals = clinicReferrals
      .filter((referral) => {
        const referredName = normalizeDoctorName(referral.referred_to_name);
        return (
          referral.referred_to_doctor_id === member.id ||
          referredName === currentDoctorName ||
          referredName.includes(currentDoctorName) ||
          currentDoctorName.includes(referredName)
        );
      })
      .slice(0, 20);
    const referralPatientIds = Array.from(
      new Set(
        [...sentReferrals, ...receivedReferrals].map((referral) => referral.patient_id),
      ),
    ).filter((patientId) => !patientById.has(patientId));
 
    if (referralPatientIds.length > 0) {
      const { data: referralPatientsRaw } = await admin
        .from("patients")
        .select("*")
        .in("id", referralPatientIds);
 
      for (const patient of (referralPatientsRaw || []) as Patient[]) {
        patientById.set(patient.id, patient);
      }
    }
 
    return (
      <DoctorDashboard
        member={member}
        clinic={clinic}
        myToday={myToday}
        myQueue={myQueue}
        patientById={Object.fromEntries(patientById)}
        summaryPatients={(summaryPatientsRaw || []) as Patient[]}
        patientSummaries={(patientSummariesRaw || []) as Array<{
          id: string;
          patient_id: string;
          visit_date: string;
          status: string;
          pre_visit_summary: string | null;
          pre_visit_summary_generated_at: string | null;
        }>}
        receivedReferrals={receivedReferrals}
        sentReferrals={sentReferrals}
        initialSection={normalizeDoctorDashboardSection(params?.section)}
        doctorRoster={doctorRoster.map((doctor) => ({
          id: doctor.id,
          full_name: doctor.full_name,
        }))}
      />
    );
  }
 
  // Admin
  // Counts (portalCount/hasOldPortalRequest already computed above)
  const { count: totalPatients } = await sb
    .from("patients")
    .select("*", { count: "exact", head: true })
    .eq("clinic_id", clinic.id);
  const { data: monthlyDraftsRaw } = await sb
    .from("visits")
    .select("id, status, audio_url")
    .gte("visit_date", monthStart.toISOString())
    .not("audio_url", "is", null);
 
  return (
    <AdminDashboard
      member={member}
      clinic={clinic}
      todayVisits={todayVisits}
      currentQueueVisits={currentQueueVisits}
      patientById={Object.fromEntries(patientById)}
      assignments={assignments}
      doctorById={Object.fromEntries(doctorById)}
      roster={roster}
      todayAppointments={todayAppointments}
      totalPatients={totalPatients || 0}
      monthlyDrafts={(monthlyDraftsRaw || []).length}
      portalRequestCount={portalCount}
      hasOldPortalRequest={hasOldPortalRequest}
    />
  );
}
 
function normalizeDoctorName(value: string | null | undefined) {
  return (value || "")
    .toLowerCase()
    .replace(/\bdr\.?\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function normalizeDoctorDashboardSection(value: string | null | undefined) {
  if (
    value === "todayIntake" ||
    value === "completedPatients" ||
    value === "sentReferrals" ||
    value === "receivedReferrals" ||
    value === "sendReferral"
  ) {
    return value;
  }

  return null;
}
  
  
