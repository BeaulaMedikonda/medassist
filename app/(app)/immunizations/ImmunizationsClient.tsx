"use client";
 
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
import { supabaseBrowser } from "@/lib/supabase/browser";
import type { Immunization, Patient, StaffRole } from "@/types/db";
import { formatDate } from "@/lib/utils";
 
type FormState = {
  patient_id: string;
  vaccine_name: string;
  cvx_code: string;
  date_given: string;
  dose: string;
  next_due_date: string;
  status: Immunization["status"];
  notes: string;
};
 
const emptyForm: FormState = {
  patient_id: "",
  vaccine_name: "",
  cvx_code: "",
  date_given: new Date().toISOString().slice(0, 10),
  dose: "",
  next_due_date: "",
  status: "completed",
  notes: "",
};
 
const statusTone: Record<Immunization["status"], string> = {
  completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  scheduled: "border-sky-200 bg-sky-50 text-sky-700",
  declined: "border-slate-200 bg-slate-50 text-slate-600",
  contraindicated: "border-rose-200 bg-rose-50 text-rose-700",
};
 
export function ImmunizationsClient({
  clinicId,
  currentUserId,
  currentUserRole,
  patients,
  initialRecords,
  initialError,
}: {
  clinicId: string;
  currentUserId: string;
  currentUserRole: StaffRole;
  patients: Patient[];
  initialRecords: Immunization[];
  initialError: string | null;
}) {
  const [records, setRecords] = useState(initialRecords);
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    patient_id: patients[0]?.id || "",
  });
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError || "");
  const currentForm = { ...emptyForm, ...form };
 
  const patientById = useMemo(() => {
    return Object.fromEntries(patients.map((patient) => [patient.id, patient]));
  }, [patients]);
 
  const filteredRecords = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return records;
 
    return records.filter((record) => {
      const patient = patientById[record.patient_id];
      return [
        patient?.full_name,
        patient?.emr_number,
        record.vaccine_name,
        record.cvx_code,
        record.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [patientById, query, records]);
  const pageData = getClientPageItems(filteredRecords, page, 25);

  useEffect(() => {
    setPage(1);
  }, [query, filteredRecords.length]);
 
  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }
 
  async function saveRecord() {
    setError("");
 
    if (!currentForm.patient_id || !currentForm.vaccine_name.trim() || !currentForm.date_given) {
      setError("Choose a patient, vaccine name, and date given.");
      return;
    }
 
    setSaving(true);
    const payload = {
      patient_id: currentForm.patient_id,
      clinic_id: clinicId,
      vaccine_name: currentForm.vaccine_name.trim(),
      cvx_code: currentForm.cvx_code.trim() || null,
      date_given: currentForm.date_given,
      dose: currentForm.dose.trim() || null,
      next_due_date: currentForm.next_due_date || null,
      status: currentForm.status,
      notes: currentForm.notes.trim() || null,
      created_by: currentUserId,
      updated_by: currentUserId,
      created_role: currentUserRole,
    };
 
    const { data, error: insertError } = await supabaseBrowser()
      .from("immunizations")
      .insert(payload)
      .select("*")
      .single();
 
    setSaving(false);
 
    if (insertError) {
      setError(insertError.message);
      return;
    }
 
    setRecords((current) => [data as Immunization, ...current]);
    setForm({ ...emptyForm, patient_id: currentForm.patient_id });
  }
 
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/dashboard" className="text-xs font-bold text-teal-700 hover:text-teal-600">
            Back to dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 dark:text-ink-50">
            Immunization Registry
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-ink-400">
            Record patient vaccination history with CVX codes and next due dates.
          </p>
        </div>
        <div className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">
          {records.length} records
        </div>
      </div>
 
      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}
 
      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="card p-4">
          <h2 className="text-sm font-extrabold text-slate-950 dark:text-ink-50">Add vaccine record</h2>
          <div className="mt-4 grid gap-3">
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Patient</span>
              <select
                className="input-base"
                value={currentForm.patient_id}
                onChange={(event) => update("patient_id", event.target.value)}
              >
                {patients.length === 0 ? <option value="">No patients found</option> : null}
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.full_name} {patient.emr_number ? `(${patient.emr_number})` : ""}
                  </option>
                ))}
              </select>
            </label>
 
            <div className="grid gap-3 sm:grid-cols-2">
              <TextInput label="Vaccine" value={currentForm.vaccine_name} onChange={(value) => update("vaccine_name", value)} placeholder="e.g. Tdap" />
              <TextInput label="CVX" value={currentForm.cvx_code} onChange={(value) => update("cvx_code", value)} placeholder="e.g. 115" />
              <TextInput label="Date given" type="date" value={currentForm.date_given} onChange={(value) => update("date_given", value)} />
              <TextInput label="Next due" type="date" value={currentForm.next_due_date} onChange={(value) => update("next_due_date", value)} />
              <TextInput label="Dose" value={currentForm.dose} onChange={(value) => update("dose", value)} placeholder="0.5 mL" />
            </div>
 
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Status</span>
              <select
                className="input-base"
                value={currentForm.status}
                onChange={(event) => update("status", event.target.value as Immunization["status"])}
              >
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="declined">Declined</option>
                <option value="contraindicated">Contraindicated</option>
              </select>
            </label>
 
            <label className="space-y-1">
              <span className="text-xs font-bold uppercase text-slate-500">Notes</span>
              <textarea
                className="input-base min-h-[86px] resize-y"
                value={currentForm.notes}
                onChange={(event) => update("notes", event.target.value)}
                placeholder="Reaction, counseling, source document..."
              />
            </label>
 
            <button
              type="button"
              onClick={() => void saveRecord()}
              disabled={saving || patients.length === 0}
              className="btn-primary w-full disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save immunization"}
            </button>
          </div>
        </div>
 
        <div className="card overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 p-4 dark:border-ink-800 dark:bg-ink-900/70">
            <input
              className="input-base"
              value={query || ""}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search patient, vaccine, CVX, status"
            />
          </div>
 
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-ink-800">
              <thead className="bg-slate-100 text-left text-xs font-extrabold uppercase text-slate-600 dark:bg-ink-800 dark:text-ink-300">
                <tr>
                  <th className="px-4 py-3">Patient</th>
                  <th className="px-4 py-3">Vaccine</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Next due</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-ink-800">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center font-semibold text-slate-500">
                      No immunization records yet.
                    </td>
                  </tr>
                ) : (
                  pageData.pageItems.map((record) => {
                    const patient = patientById[record.patient_id];
                    return (
                      <tr key={record.id} className="bg-white hover:bg-slate-50 dark:bg-ink-900 dark:hover:bg-ink-800/70">
                        <td className="px-4 py-4 font-bold text-slate-950 dark:text-ink-50">
                          {patient?.full_name || "Unknown patient"}
                          {patient?.emr_number ? (
                            <div className="text-xs font-medium text-slate-500">{patient.emr_number}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 text-slate-800 dark:text-ink-100">
                          <div className="font-bold">{record.vaccine_name}</div>
                          <div className="text-xs text-slate-500">
                            {[record.cvx_code ? `CVX ${record.cvx_code}` : null, record.dose]
                              .filter(Boolean)
                              .join(" / ") || "-"}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-800 dark:text-ink-100">
                          {formatDate(record.date_given)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-slate-800 dark:text-ink-100">
                          {record.next_due_date ? formatDate(record.next_due_date) : "-"}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-extrabold ${statusTone[record.status]}`}>
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <ClientPagination
            page={pageData.currentPage}
            pageSize={25}
            totalItems={filteredRecords.length}
            onPageChange={setPage}
            label="records"
          />
        </div>
      </div>
    </section>
  );
}
 
function TextInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-bold uppercase text-slate-500">{label}</span>
      <input
        className="input-base"
        type={type}
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
 
 
