import { redirect } from "next/navigation";
import { PatientSignOutButton } from "@/components/patient/PatientSignOutButton";
import { supabaseServer } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PatientPendingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/patient/login");

  const { data: request } = await supabase
    .from("patient_portal_registration_requests")
    .select("full_name, phone, email, address, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!request) redirect("/patient/login?error=not-linked");

  return (
    <main className="min-h-screen bg-[#f7fbfa] px-4 py-10 text-slate-950 sm:px-6">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
          Patient portal
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">
          Registration Pending
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">
          Your request is saved. Clinic staff can review it and convert it into an official EMR patient record.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <PendingField label="Name" value={request.full_name} />
          <PendingField label="Phone" value={request.phone} />
          <PendingField label="Email" value={request.email} />
          <PendingField label="Status" value={request.status} />
          <PendingField label="Submitted" value={formatDateTime(request.created_at)} />
          <PendingField label="Address" value={request.address || "-"} />
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-slate-500">
            Return to login after checking this status screen.
          </p>
          <PatientSignOutButton label="Go to Patient Login" />
        </div>
      </section>
    </main>
  );
}

function PendingField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-[11px] font-extrabold uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-bold text-slate-900">{value}</div>
    </div>
  );
}
