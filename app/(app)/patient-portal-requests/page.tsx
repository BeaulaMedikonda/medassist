// import { notFound } from "next/navigation";
// import { requireMember } from "@/lib/auth";
// import { FeatureDisabled } from "@/components/FeatureDisabled";
// import { isClinicFeatureEnabled } from "@/lib/features";
// import { supabaseAdmin } from "@/lib/supabase/admin";
// import { PortalRequestsClient } from "./PortalRequestsClient";

// export const dynamic = "force-dynamic";

// export default async function PatientPortalRequestsPage() {
//   const { member, clinic } = await requireMember();
//   if (member.role !== "medical_assistant" && member.role !== "admin") {
//     notFound();
//   }

//   if (!(await isClinicFeatureEnabled(clinic.id, "patient_portal"))) {
//     return <FeatureDisabled featureName="Patient Portal" />;
//   }

//   const supabase = supabaseAdmin();
//   const [{ data: submissions }, { data: doctors }] = await Promise.all([
//     supabase
//       .from("patient_portal_intake_submissions")
//       .select("id, clinic_id, full_name, first_name, last_name, phone, email, birthdate, age, sex, blood_group, height_cm, emergency_contact, address, city, state, postal_code, country, chief_complaint, known_allergies, chronic_conditions, abha_id, abha_address, bp_systolic, bp_diastolic, pulse, temperature_f, spo2, weight_kg, status, created_at")
//       .eq("status", "submitted")
//       .order("created_at", { ascending: true }),
//     supabase
//       .from("doctors")
//       .select("id, full_name, qualification")
//       .eq("clinic_id", clinic.id)
//       .eq("role", "doctor")
//       .order("full_name", { ascending: true }),
//   ]);
//   const visibleSubmissions = ((submissions || []) as Array<{ clinic_id: string | null }>).filter(
//     (submission) => !submission.clinic_id || submission.clinic_id === clinic.id,
//   );

//   return (
//     <div className="pb-16">
//       <div className="mb-6">
//         <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
//           Online patient portal
//         </p>
//         <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
//           Patient Portal Requests
//         </h1>
//         <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
//           Review first-time online patient details and assign the patient to a doctor. Patients do not choose doctors.
//         </p>
//       </div>

//       <PortalRequestsClient
//         submissions={visibleSubmissions as never}
//         doctors={(doctors || []) as never}
//       />
//     </div>
//   );
// }
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { FeatureDisabled } from "@/components/FeatureDisabled";
import { isClinicFeatureEnabled } from "@/lib/features";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PortalRequestsClient } from "./PortalRequestsClient";
 
export const dynamic = "force-dynamic";

type PortalHistoryRow = {
  created_patient_id: string | null;
  [key: string]: unknown;
};

type LinkedVisitRow = {
  id: string;
  patient_id: string;
  status: string;
  visit_date: string;
  completed_at: string | null;
};
 
export default async function PatientPortalRequestsPage() {
  const { member, clinic } = await requireMember();
  if (member.role !== "medical_assistant" && member.role !== "admin") {
    notFound();
  }
 
  if (!(await isClinicFeatureEnabled(clinic.id, "patient_portal"))) {
    return <FeatureDisabled featureName="Patient Portal" />;
  }
 
  const supabase = supabaseAdmin();
  const [{ data: submissions }, { data: doctors }, { data: history }] = await Promise.all([
    supabase
      .from("patient_portal_intake_submissions")
      .select("id, clinic_id, full_name, first_name, last_name, phone, email, birthdate, age, sex, blood_group, height_cm, emergency_contact, address, city, state, postal_code, country, chief_complaint, known_allergies, chronic_conditions, abha_id, abha_address, bp_systolic, bp_diastolic, pulse, temperature_f, spo2, weight_kg, pain_markers, pain_intensity, pain_type, pain_summary, status, created_at")
      .eq("status", "submitted")
      .order("created_at", { ascending: true }),
    supabase
      .from("doctors")
      .select("id, full_name, qualification")
      .eq("clinic_id", clinic.id)
      .eq("role", "doctor")
      .order("full_name", { ascending: true }),
    supabase
      .from("patient_portal_intake_submissions")
      .select("id, clinic_id, full_name, first_name, last_name, phone, email, birthdate, age, sex, blood_group, height_cm, emergency_contact, address, city, state, postal_code, country, chief_complaint, known_allergies, chronic_conditions, abha_id, abha_address, bp_systolic, bp_diastolic, pulse, temperature_f, spo2, weight_kg, pain_markers, pain_intensity, pain_type, pain_summary, status, created_at, reviewed_at, assigned_doctor_id, created_patient_id")
      .eq("status", "assigned")
      .eq("clinic_id", clinic.id)
      .order("reviewed_at", { ascending: false })
      .limit(100),
  ]);
  const visibleSubmissions = ((submissions || []) as Array<{ clinic_id: string | null }>).filter(
    (submission) => !submission.clinic_id || submission.clinic_id === clinic.id,
  );
  const historyRows = (history || []) as PortalHistoryRow[];
  const linkedPatientIds = Array.from(
    new Set(
      historyRows
        .map((row) => row.created_patient_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const { data: linkedVisits } = linkedPatientIds.length > 0
    ? await supabase
        .from("visits")
        .select("id, patient_id, status, visit_date, completed_at")
        .eq("clinic_id", clinic.id)
        .in("patient_id", linkedPatientIds)
        .order("visit_date", { ascending: false })
    : { data: [] };
  const latestVisitByPatient = new Map<string, LinkedVisitRow>();

  for (const visit of (linkedVisits || []) as LinkedVisitRow[]) {
    if (!latestVisitByPatient.has(visit.patient_id)) {
      latestVisitByPatient.set(visit.patient_id, visit);
    }
  }
  const historyWithVisit = historyRows.map((row) => {
    const linkedVisit = row.created_patient_id ? latestVisitByPatient.get(row.created_patient_id) : null;
    return {
      ...row,
      visit_id: linkedVisit?.id ?? null,
      visit_status: linkedVisit?.status ?? null,
      visit_date: linkedVisit?.visit_date ?? null,
      visit_completed_at: linkedVisit?.completed_at ?? null,
    };
  });
 
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
            Online patient portal
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
            Patient Portal Requests
          </h1>
        </div>
      </div>
 
      <PortalRequestsClient
        submissions={visibleSubmissions as never}
        doctors={(doctors || []) as never}
        historySubmissions={historyWithVisit as never}
      />
    </div>
  );
}
 
 
