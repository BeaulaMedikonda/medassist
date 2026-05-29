import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { AppointmentsClient } from "./AppointmentsClient";

export const dynamic = "force-dynamic";

type DoctorRow = {
  id: string;
  full_name: string;
  qualification: string | null;
};

type PatientRow = {
  id: string;
  full_name: string;
  emr_number: string;
  phone: string | null;
};

type AppointmentRow = {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  doctor_id: string;
  scheduled_at: string;
  duration_minutes: number;
  type: string;
  priority: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export default async function AppointmentsPage() {
  noStore();

  const { member, clinic } = await requireMember();
  if (member.role === "doctor") {
    notFound();
  }

  const supabase = await supabaseServer();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureLimit = new Date(today);
  futureLimit.setDate(futureLimit.getDate() + 45);

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, full_name, qualification")
    .eq("clinic_id", clinic.id)
    .eq("role", "doctor")
    .order("full_name", { ascending: true });

  const { data: appointments, error: appointmentsError } = await supabase
    .from("appointments")
    .select(
      "id, clinic_id, patient_id, doctor_id, scheduled_at, duration_minutes, type, priority, status, notes, created_by, created_at, updated_at",
    )
    .eq("clinic_id", clinic.id)
    .gte("scheduled_at", today.toISOString())
    .lte("scheduled_at", futureLimit.toISOString())
    .order("scheduled_at", { ascending: true });

  const { data: patientRows } = await supabase
    .from("patients")
    .select("id, full_name, emr_number, phone")
    .eq("clinic_id", clinic.id)
    .order("full_name", { ascending: true });
  const patients = (patientRows || []) as PatientRow[];

  return (
    <AppointmentsClient
      clinicId={clinic.id}
      clinicName={clinic.name}
      currentUserId={member.id}
      doctors={(doctors || []) as DoctorRow[]}
      patients={patients}
      appointments={(appointments || []) as AppointmentRow[]}
      error={appointmentsError?.message || null}
    />
  );
}
