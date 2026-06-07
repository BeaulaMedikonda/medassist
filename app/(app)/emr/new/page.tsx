import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import type { Doctor } from "@/types/db";
import { DoctorQuickIntakeForm } from "./DoctorQuickIntakeForm";
import { IntakeFormClient } from "../intake/Intakeformclient";

export const dynamic = "force-dynamic";

export default async function NewEmrPage() {
  const { member, clinic } = await requireMember();
  const supabase = await supabaseServer();

  // Roster of doctors in the clinic for the assignment dropdown.
  const { data: roster } = await supabase
    .from("doctors")
    .select("id, full_name, qualification, role")
    .eq("clinic_id", clinic.id)
    .eq("role", "doctor")
    .order("full_name");

  const doctors = ((roster as Array<Pick<Doctor, "id" | "full_name" | "qualification" | "role">>) || [])
    .map((d) => ({
      id: d.id,
      full_name: d.full_name,
      qualification: d.qualification,
    }));

  return (
    <>
      {member.role === "medical_assistant" ? (
        <IntakeFormClient
          clinicId={clinic.id}
          doctors={doctors}
        />
      ) : (
        <div>
          <Link
            href="/emr"
            className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-ink-500 hover:text-slate-900 dark:text-ink-100"
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
            Home
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">New EMR</h1>
          <p className="text-sm text-slate-500 dark:text-ink-500">
            Quick capture, then start the consultation.
          </p>
          <div className="mt-6">
          <DoctorQuickIntakeForm currentUserId={member.id} />
          </div>
        </div>
      )}
    </>
  );
}
