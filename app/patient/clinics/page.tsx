import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type ClinicChoice = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
};

function patientLoginHref(clinic: ClinicChoice) {
  const params = new URLSearchParams({
    clinic: clinic.id,
    clinicName: clinic.name,
  });
  return `/patient/login?${params.toString()}`;
}

export default async function PatientClinicSelectionPage() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("clinics")
    .select("id, name, address, phone, city, state")
    .order("name", { ascending: true });

  const clinics = ((data || []) as ClinicChoice[]).filter((clinic) =>
    clinic.name?.trim(),
  );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f6faf9] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_48%_42%_at_18%_16%,rgba(20,184,166,0.16),transparent_62%),radial-gradient(ellipse_42%_44%_at_84%_10%,rgba(37,99,235,0.13),transparent_64%),linear-gradient(135deg,#f8fbff_0%,#eefaf7_50%,#e0f2fe_100%)]" />
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "linear-gradient(#0f172a 1px, transparent 1px), linear-gradient(90deg, #0f172a 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      <section className="relative w-full max-w-5xl overflow-hidden rounded-[30px] border border-white/70 bg-white/82 p-6 shadow-[0_30px_90px_-45px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <PatientBrand />
            <p className="mt-8 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#0ea5a4]">
              Choose your clinic
            </p>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">
              Select clinic for Patient Portal
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600">
              Pick the clinic where you registered. After selection, you can sign in with your patient email or mobile login.
            </p>
          </div>

          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-sm font-extrabold text-slate-600 shadow-sm transition hover:border-teal-200 hover:text-[#0c8a89]"
          >
            Back to staff login
          </Link>
        </div>

        {error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
            Could not load clinics. {error.message}
          </div>
        ) : clinics.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-8 text-center shadow-sm backdrop-blur">
            <h2 className="text-xl font-extrabold text-slate-950">
              No clinics available yet
            </h2>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Create a clinic from Admin setup first, then patients can choose it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clinics.map((clinic) => {
              const location = [clinic.city, clinic.state].filter(Boolean).join(", ");

              return (
                <Link
                  key={clinic.id}
                  href={patientLoginHref(clinic)}
                  className="group rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#0ea5a4] hover:bg-[#ecfdfc] hover:shadow-[0_18px_40px_-30px_rgba(14,165,164,0.8)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-sm font-extrabold text-white shadow-[0_18px_34px_-22px_rgba(14,165,164,0.9)]">
                      {clinic.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-950">
                        {clinic.name}
                      </h2>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-[#0c8a89]">
                        Patient access enabled
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 text-sm font-semibold text-slate-600">
                    <InfoLine label="Address" value={clinic.address || location || "Address not added"} />
                    <InfoLine label="Phone" value={clinic.phone || "Phone not added"} />
                  </div>

                  <div className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#0f8f83] to-[#0ea5a4] text-sm font-extrabold text-white shadow-[0_16px_30px_-18px_rgba(14,165,164,0.85)] transition group-hover:from-[#0c7f76] group-hover:to-[#0d9895]">
                    Continue to login
                    <span className="ml-2" aria-hidden="true">
                      -&gt;
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 line-clamp-2 text-slate-700">{value}</div>
    </div>
  );
}

function PatientBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#22c7bd] to-[#0a9ea6] text-white shadow-[0_18px_34px_-20px_rgba(14,165,164,0.9)]">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        >
          <path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1116 0Z" />
          <path d="M9 10h6" />
          <path d="M12 7v6" />
        </svg>
      </div>
      <div>
        <div className="text-xl font-extrabold tracking-tight text-slate-950">
          MedAssist
        </div>
        <div className="text-sm text-slate-500">Patient health portal</div>
      </div>
    </div>
  );
}
