// import { notFound } from "next/navigation";
// import Link from "next/link";
// import { supabaseServer } from "@/lib/supabase/server";
// import { requireMember } from "@/lib/auth";
// import type { Patient, Visit, VisitDoctorAssignment } from "@/types/db";
// import { ReceptionIntakeEdit } from "./ReceptionIntakeEdit";

// export const dynamic = "force-dynamic";

// export default async function IntakePage({
//   params,
// }: {
//   params: Promise<{ id: string; vid: string }>;
// }) {
//   const { member, clinic } = await requireMember();
//   const { id, vid } = await params;
//   if (member.role !== "medical_assistant" && member.role !== "admin") {
//     notFound();
//   }

//   const supabase = await supabaseServer();
//   const [
//     { data: patient },
//     { data: visit },
//     { data: doctors },
//     { data: assignments },
//   ] = await Promise.all([
//     supabase.from("patients").select("*").eq("id", id).maybeSingle(),
//     supabase.from("visits").select("*").eq("id", vid).maybeSingle(),
//     supabase
//       .from("doctors")
//       .select("id, full_name, qualification, role")
//       .eq("clinic_id", clinic.id)
//       .eq("role", "doctor")
//       .order("full_name"),
//     supabase
//       .from("visit_doctors")
//       .select("visit_id, doctor_id, role, assigned_at")
//       .eq("visit_id", vid),
//   ]);

//   if (!patient || !visit) notFound();

//   const roster = ((doctors as Array<{
//     id: string;
//     full_name: string;
//     qualification: string | null;
//   }>) || []).map((d) => ({
//     id: d.id,
//     full_name: d.full_name,
//     qualification: d.qualification,
//   }));

//   return (
//     <div>
//       <Link
//         href="/emr"
//         className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-ink-500 hover:text-slate-900 dark:text-ink-100"
//       >
//         <svg viewBox="0 0 20 20" className="h-3 w-3">
//           <path
//             d="M12 4l-6 6 6 6"
//             stroke="currentColor"
//             strokeWidth="2"
//             fill="none"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//         </svg>
//         Front desk
//       </Link>
//       <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">Update intake</h1>
//       <p className="text-sm text-slate-500 dark:text-ink-500">
//         EMR {(patient as Patient).emr_number} · {(patient as Patient).full_name}
//       </p>

//       <div className="mt-6">
//         <ReceptionIntakeEdit
//           patient={patient as Patient}
//           visit={visit as Visit}
//           doctors={roster}
//           assignments={(assignments as VisitDoctorAssignment[]) || []}
//         />
//       </div>
//     </div>
//   );
// }



import { notFound } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { requireMember } from "@/lib/auth";
import type { Patient, Visit, VisitDoctorAssignment } from "@/types/db";
import { ReceptionIntakeEdit } from "./ReceptionIntakeEdit";

export const dynamic = "force-dynamic";

export default async function IntakePage({
  params,
}: {
  params: Promise<{ id: string; vid: string }>;
}) {
  const { member, clinic } = await requireMember();
  const { id, vid } = await params;
  if (member.role !== "medical_assistant" && member.role !== "admin") {
    notFound();
  }

  const supabase = await supabaseServer();
  const [
    { data: patient },
    { data: visit },
    { data: doctors },
    { data: assignments },
  ] = await Promise.all([
    supabase.from("patients").select("*").eq("id", id).maybeSingle(),
    supabase.from("visits").select("*").eq("id", vid).maybeSingle(),
    supabase
      .from("doctors")
      .select("id, full_name, qualification, role")
      .eq("clinic_id", clinic.id)
      .eq("role", "doctor")
      .order("full_name"),
    supabase
      .from("visit_doctors")
      .select("visit_id, doctor_id, role, assigned_at")
      .eq("visit_id", vid),
  ]);

  if (!patient || !visit) notFound();

  const roster = ((doctors as Array<{
    id: string;
    full_name: string;
    qualification: string | null;
  }>) || []).map((d) => ({
    id: d.id,
    full_name: d.full_name,
    qualification: d.qualification,
  }));

  return (
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
        Front desk
      </Link>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-ink-100">Update intake</h1>
      <p className="text-sm text-slate-500 dark:text-ink-500">
        EMR {(patient as Patient).emr_number} · {(patient as Patient).full_name}
      </p>

      <div className="mt-6">
        <ReceptionIntakeEdit
          patient={patient as Patient}
          visit={visit as Visit}
          doctors={roster}
          assignments={(assignments as VisitDoctorAssignment[]) || []}
        />
      </div>
    </div>
  );
}

