"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { TextInput, SelectInput } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import type { Patient } from "@/types/db";

export function DoctorQuickIntakeForm({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [searching, setSearching] = useState(false);
  const [pickedPatient, setPickedPatient] = useState<Patient | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    age: "",
    sex: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    if (pickedPatient) return;
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const supabase = supabaseBrowser();
        const term = searchTerm.trim();
        const { data } = await supabase
          .from("patients")
          .select("*")
          .or(`full_name.ilike.%${term}%,phone.ilike.%${term}%,emr_number.ilike.%${term}%`)
          .order("last_visit_at", { ascending: false, nullsFirst: false })
          .limit(8);
        if (!cancelled) setSearchResults((data || []) as Patient[]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [searchTerm, pickedPatient]);

  async function generateEmrNumber(): Promise<string> {
    const res = await fetch("/api/emr-number", { method: "POST" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Could not generate EMR number");
    }
    const j = (await res.json()) as { emr_number: string };
    return j.emr_number;
  }

  async function startVisit(mode: "record" | "manual") {
    setBusy(true);
    try {
      const supabase = supabaseBrowser();

      let patientId = pickedPatient?.id || null;
      if (!patientId) {
        if (!form.full_name.trim()) throw new Error("Patient name is required");
        const emr_number = await generateEmrNumber();
        const { data, error } = await supabase
          .from("patients")
          .insert({
            doctor_id: currentUserId,
            emr_number,
            full_name: form.full_name.trim(),
            age: form.age ? parseInt(form.age, 10) : null,
            sex: form.sex && ["M", "F", "O"].includes(form.sex) ? form.sex : null,
            phone: form.phone.trim() || null,
            email: form.email.trim() || null,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message || "Could not create patient");
        patientId = (data as { id: string }).id;
      }

      // Create the visit. Recording mode → in_progress immediately so it
      // shows up under "in consultation" on dashboards. Manual → queued.
      const { data: visit, error: visitErr } = await supabase
        .from("visits")
        .insert({
          patient_id: patientId,
          doctor_id: currentUserId,
          created_by: currentUserId,
          visit_date: new Date().toISOString(),
          status: mode === "record" ? "in_progress" : "queued",
        })
        .select("id")
        .single();
      if (visitErr || !visit) throw new Error(visitErr?.message || "Could not create visit");

      const visitId = (visit as { id: string }).id;

      // Auto-assign self as attending
      await supabase.from("visit_doctors").insert({
        visit_id: visitId,
        doctor_id: currentUserId,
        role: "attending",
      });

      router.replace(`/emr/${patientId}/visits/new?vid=${visitId}&mode=${mode}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not start visit";
      push({ title: "Failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
          Patient
        </h2>
        {pickedPatient ? (
          <div className="rounded-xl border border-brand-200 bg-brand-50/40 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900 dark:text-ink-100">
                  {pickedPatient.full_name}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-ink-500">
                  {pickedPatient.emr_number}
                  {pickedPatient.age != null
                    ? ` · ${pickedPatient.age}${pickedPatient.sex || ""}`
                    : ""}
                  {pickedPatient.phone ? ` · ${pickedPatient.phone}` : ""}
                </div>
                {pickedPatient.known_allergies ? (
                  <p className="mt-1 text-[11px] text-rose-700">
                    Allergies: {pickedPatient.known_allergies}
                  </p>
                ) : null}
              </div>
              <button
                onClick={() => {
                  setPickedPatient(null);
                  setSearchTerm("");
                }}
                className="text-[11px] font-medium text-brand-700 hover:underline"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative">
              <TextInput
                label="Search existing"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Name, phone, or EMR number"
                hint="If new patient, fill the fields below."
              />
              {searchResults.length > 0 ? (
                <ul className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-soft dark:border-ink-700 dark:bg-ink-900">
                  {searchResults.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => {
                          setPickedPatient(p);
                          setSearchResults([]);
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-ink-800"
                      >
                        <span>
                          <span className="font-medium text-slate-900 dark:text-ink-100">
                            {p.full_name}
                          </span>
                          <span className="ml-2 text-[11px] text-slate-500 dark:text-ink-500">
                            {p.emr_number}
                            {p.age != null ? ` · ${p.age}${p.sex || ""}` : ""}
                          </span>
                        </span>
                        {p.phone ? (
                          <span className="text-[11px] text-slate-400 dark:text-ink-600">{p.phone}</span>
                        ) : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {searching ? (
                <span className="absolute right-3 top-9 text-[11px] text-slate-400 dark:text-ink-600">
                  searching…
                </span>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <TextInput
                label="Full name"
                required
                value={form.full_name}
                onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="Patient's full name"
              />
              <TextInput
                label="Age"
                type="number"
                min={0}
                max={130}
                value={form.age}
                onChange={(e) => setForm((f) => ({ ...f, age: e.target.value }))}
              />
              <SelectInput
                label="Gender"
                value={form.sex}
                onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))}
              >
                <option value="">—</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other</option>
              </SelectInput>
              <TextInput
                label="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
              <TextInput
                label="Email (optional)"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          onClick={() => startVisit("manual")}
          disabled={busy}
          className="btn-secondary"
        >
          {busy ? <Spinner /> : null}
          Open blank visit
        </button>
        <button
          onClick={() => startVisit("record")}
          disabled={busy}
          className="btn-primary"
        >
          {busy ? <Spinner /> : null}
          <svg viewBox="0 0 20 20" className="h-4 w-4">
            <path
              d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm-5 7a5 5 0 0010 0h2a7 7 0 11-14 0h2zm4 7v-2.07a7 7 0 002 0V17h-2z"
              fill="currentColor"
            />
          </svg>
          Save & start recording
        </button>
      </div>
    </div>
  );
}
