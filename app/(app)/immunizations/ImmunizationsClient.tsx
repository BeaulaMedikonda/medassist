"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ClientPagination, getClientPageItems } from "@/components/ui/ClientPagination";
import type { Immunization, Patient } from "@/types/db";
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

function formatDateInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const emptyForm: FormState = {
  patient_id: "",
  vaccine_name: "",
  cvx_code: "",
  date_given: formatDateInput(new Date()),
  dose: "",
  next_due_date: "",
  status: "completed",
  notes: "",
};

type RecordView = "latest" | "history";

const statusConfig: Record<
  Immunization["status"],
  { label: string; badge: string; dot: string }
> = {
  completed: {
    label: "Completed",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  scheduled: {
    label: "Scheduled",
    badge: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  declined: {
    label: "Declined",
    badge: "border-slate-200 bg-slate-50 text-slate-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300",
    dot: "bg-slate-400",
  },
  contraindicated: {
    label: "Contraindicated",
    badge: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-400",
    dot: "bg-rose-500",
  },
};

const statIconColors = {
  teal: "text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-950/40",
  emerald: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40",
  amber: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40",
  slate: "text-slate-500 bg-slate-100 dark:text-ink-400 dark:bg-ink-800",
};

export function ImmunizationsClient({
  patients,
  initialRecords,
  initialError,
  initialPatientId,
  initialVisitId,
  returnTo,
}: {
  patients: Patient[];
  initialRecords: Immunization[];
  initialError: string | null;
  initialPatientId?: string;
  initialVisitId?: string;
  returnTo?: string;
}) {
  const router = useRouter();
  const initialPatient = patients.find((p) => p.id === initialPatientId);
  const patientOptions = initialPatient ? [initialPatient] : patients;

  const [records, setRecords] = useState(initialRecords);
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    patient_id: initialPatient?.id || patients[0]?.id || "",
  });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Immunization["status"] | "all">("all");
  const [recordView, setRecordView] = useState<RecordView>(() => {
    const key = formatDateInput(new Date());
    const todayCount = initialRecords.filter((r) => r.date_given?.slice(0, 10) === key).length;
    return todayCount === 0 && initialRecords.length > 0 ? "history" : "latest";
  });
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [showForm, setShowForm] = useState(false);

  const currentForm = { ...emptyForm, ...form };

  const patientById = useMemo(
    () => Object.fromEntries(patients.map((p) => [p.id, p])),
    [patients]
  );

  const todayKey = useMemo(() => formatDateInput(new Date()), []);
  const todayRecords = useMemo(
    () => records.filter((r) => r.date_given?.slice(0, 10) === todayKey),
    [records, todayKey]
  );
  const historyRecords = useMemo(
    () => records.filter((r) => r.date_given?.slice(0, 10) !== todayKey),
    [records, todayKey]
  );

  const dueSoon = useMemo(() => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 86_400_000);
    return records.filter((r) => {
      if (!r.next_due_date) return false;
      const d = new Date(r.next_due_date);
      return d >= now && d <= in30;
    }).length;
  }, [records]);

  const filteredRecords = useMemo(() => {
    const source = recordView === "latest" ? todayRecords : historyRecords;
    const q = query.trim().toLowerCase();
    return source.filter((r) => {
      const patient = patientById[r.patient_id];
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [patient?.full_name, patient?.emr_number, r.vaccine_name, r.cvx_code, r.status]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [historyRecords, patientById, query, recordView, statusFilter, todayRecords]);

  const pageData = getClientPageItems(filteredRecords, page, 20);

  useEffect(() => {
    setPage(1);
  }, [query, recordView, statusFilter]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveRecord() {
    setError("");
    if (!currentForm.patient_id || !currentForm.vaccine_name.trim() || !currentForm.date_given) {
      setError("Choose a patient, vaccine name, and date given.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/immunizations/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: currentForm.patient_id,
        visitId: initialVisitId || null,
        vaccineName: currentForm.vaccine_name,
        cvxCode: currentForm.cvx_code,
        dateGiven: currentForm.date_given,
        dose: currentForm.dose,
        nextDueDate: currentForm.next_due_date,
        status: currentForm.status,
        notes: currentForm.notes,
      }),
    });
    const result = (await res.json().catch(() => ({}))) as {
      error?: string;
      immunization?: Immunization;
    };
    setSaving(false);
    if (!res.ok || !result.immunization) {
      setError(result.error || "Could not save immunization.");
      return;
    }
    setRecords((prev) => [result.immunization as Immunization, ...prev]);
    setForm({ ...emptyForm, patient_id: currentForm.patient_id });
    setShowForm(false);
    setRecordView("latest");
    if (returnTo) {
      const nextUrl = new URL(returnTo, window.location.origin);
      const summary = [currentForm.vaccine_name.trim(), currentForm.status, currentForm.date_given]
        .filter(Boolean)
        .join(" - ");
      nextUrl.searchParams.set("immunizationSummary", summary);
      router.replace(`${nextUrl.pathname}${nextUrl.search}`);
    }
  }

  return (
    <section className="space-y-5">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href={returnTo || "/dashboard"}
            className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-600 dark:text-teal-400"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 3L5 8l5 5" />
            </svg>
            {returnTo ? "Back to EMR" : "Back to dashboard"}
          </Link>
          <h1 className="mt-2 text-[28px] font-extrabold tracking-tight text-slate-950 dark:text-ink-50">
            Immunization Registry
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500 dark:text-ink-400">
            Track vaccination history with CVX codes and follow-up dates
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setError(""); setShowForm(true); }}
          disabled={patients.length === 0}
          className="btn-primary shrink-0 disabled:opacity-60"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3v10M3 8h10" />
          </svg>
          Add Record
        </button>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Records" value={records.length} color="teal" icon={<ShieldIcon />} />
        <StatCard label="Today" value={todayRecords.length} color={todayRecords.length > 0 ? "emerald" : "slate"} icon={<CalendarIcon />} />
        <StatCard label="Due in 30 days" value={dueSoon} color={dueSoon > 0 ? "amber" : "slate"} icon={<ClockIcon />} />
      </div>

      {/* ── Table card ────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-ink-800 dark:bg-ink-900">
            <TabBtn active={recordView === "latest"} onClick={() => setRecordView("latest")} count={todayRecords.length}>
              Today
            </TabBtn>
            <TabBtn active={recordView === "history"} onClick={() => setRecordView("history")} count={historyRecords.length}>
              History
            </TabBtn>
          </div>
          <div className="relative flex-1 sm:max-w-[300px]">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="6.5" cy="6.5" r="4" />
              <path d="M10 10l3 3" />
            </svg>
            <input
              className="input-base pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search patient, vaccine, CVX…"
            />
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex gap-2 overflow-x-auto border-b border-slate-100 px-5 py-2.5 dark:border-ink-800/60">
          {(["all", "completed", "scheduled", "declined", "contraindicated"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 rounded-full border px-3 py-1 text-[11px] font-bold transition ${
                statusFilter === s
                  ? "border-teal-500 bg-teal-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
              }`}
            >
              {s === "all" ? "All statuses" : statusConfig[s].label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-ink-800">
                <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-ink-500">Patient</th>
                <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-ink-500">Vaccine</th>
                <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-ink-500">Date Given</th>
                <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-ink-500">Next Due</th>
                <th className="px-5 py-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-ink-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-ink-800/60">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      title={
                        query || statusFilter !== "all"
                          ? "No matching records"
                          : recordView === "latest"
                          ? "No vaccinations today"
                          : "No history yet"
                      }
                      description={
                        query || statusFilter !== "all"
                          ? "Try clearing your search or filter."
                          : recordView === "latest"
                          ? "Click Add Record to log today's vaccinations."
                          : "Vaccination records will appear here after they are saved."
                      }
                    />
                  </td>
                </tr>
              ) : (
                pageData.pageItems.map((record) => {
                  const patient = patientById[record.patient_id];
                  const cfg = statusConfig[record.status];
                  const initials = (patient?.full_name || "?")
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase();
                  return (
                    <tr
                      key={record.id}
                      className="group bg-white transition-colors hover:bg-slate-50/80 dark:bg-ink-900 dark:hover:bg-ink-800/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-[11px] font-extrabold text-white shadow-sm">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-ink-50">
                              {patient?.full_name || "Unknown patient"}
                            </div>
                            {patient?.emr_number ? (
                              <div className="text-[11px] font-medium text-slate-400 dark:text-ink-500">
                                {patient.emr_number}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-slate-800 dark:text-ink-100">{record.vaccine_name}</div>
                        <div className="text-[11px] text-slate-400 dark:text-ink-500">
                          {[record.cvx_code ? `CVX ${record.cvx_code}` : null, record.dose]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-700 dark:text-ink-200">
                        {formatDate(record.date_given)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-700 dark:text-ink-200">
                        {record.next_due_date ? formatDate(record.next_due_date) : "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold ${cfg.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
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
          pageSize={20}
          totalItems={filteredRecords.length}
          onPageChange={setPage}
          label="records"
        />
      </div>

      {/* ── Slide-over backdrop ────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          showForm ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setShowForm(false)}
      />

      {/* ── Slide-over panel ───────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add vaccine record"
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out dark:bg-ink-950 ${
          showForm ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-ink-800">
          <div>
            <h2 className="text-[16px] font-extrabold text-slate-900 dark:text-ink-50">
              Add Vaccine Record
            </h2>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-ink-400">
              Log a new immunization event
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="rounded-xl border border-slate-200 p-2 text-slate-400 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-ink-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
            aria-label="Close panel"
          >
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error ? (
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400">
              {error}
            </div>
          ) : null}

          <div className="space-y-4">
            <FormField label="Patient">
              <select
                className="input-base"
                value={currentForm.patient_id}
                onChange={(e) => update("patient_id", e.target.value)}
              >
                {patientOptions.length === 0 ? (
                  <option value="">No patients found</option>
                ) : null}
                {patientOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name}
                    {p.emr_number ? ` (${p.emr_number})` : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Vaccine name">
                <input
                  className="input-base"
                  value={currentForm.vaccine_name}
                  onChange={(e) => update("vaccine_name", e.target.value)}
                  placeholder="e.g. Tdap"
                />
              </FormField>
              <FormField label="CVX code">
                <input
                  className="input-base"
                  value={currentForm.cvx_code}
                  onChange={(e) => update("cvx_code", e.target.value)}
                  placeholder="e.g. 115"
                />
              </FormField>
              <FormField label="Date given">
                <input
                  className="input-base"
                  type="date"
                  value={currentForm.date_given}
                  onChange={(e) => update("date_given", e.target.value)}
                />
              </FormField>
              <FormField label="Next due">
                <input
                  className="input-base"
                  type="date"
                  value={currentForm.next_due_date}
                  onChange={(e) => update("next_due_date", e.target.value)}
                />
              </FormField>
              <FormField label="Dose">
                <input
                  className="input-base col-span-2"
                  value={currentForm.dose}
                  onChange={(e) => update("dose", e.target.value)}
                  placeholder="0.5 mL"
                />
              </FormField>
            </div>

            <FormField label="Status">
              <select
                className="input-base"
                value={currentForm.status}
                onChange={(e) => update("status", e.target.value as Immunization["status"])}
              >
                <option value="completed">Completed</option>
                <option value="scheduled">Scheduled</option>
                <option value="declined">Declined</option>
                <option value="contraindicated">Contraindicated</option>
              </select>
            </FormField>

            <FormField label="Notes">
              <textarea
                className="input-base min-h-[100px] resize-y"
                value={currentForm.notes}
                onChange={(e) => update("notes", e.target.value)}
                placeholder="Reaction, counseling, source document…"
              />
            </FormField>
          </div>
        </div>

        {/* Panel footer */}
        <div className="border-t border-slate-200 px-6 py-4 dark:border-ink-800">
          <button
            type="button"
            onClick={() => void saveRecord()}
            disabled={saving || patients.length === 0}
            className="btn-primary w-full disabled:opacity-60"
          >
            {saving ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                </svg>
                Saving…
              </>
            ) : (
              "Save immunization"
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  color: keyof typeof statIconColors;
}) {
  return (
    <div className="card flex items-center gap-3 px-4 py-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${statIconColors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[22px] font-extrabold leading-none text-slate-900 dark:text-ink-50">
          {value}
        </div>
        <div className="mt-0.5 truncate text-xs font-semibold text-slate-500 dark:text-ink-400">
          {label}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-extrabold transition ${
        active
          ? "bg-white text-teal-700 shadow-sm dark:bg-ink-800 dark:text-teal-400"
          : "text-slate-500 hover:text-slate-700 dark:text-ink-400 dark:hover:text-ink-200"
      }`}
    >
      {children}
      <span
        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
          active
            ? "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
            : "bg-slate-200 text-slate-600 dark:bg-ink-700 dark:text-ink-300"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-ink-800 dark:text-ink-500">
        <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2l7 4v6c0 4.97-3.5 9.57-7 11C5.5 21.57 5 16.97 5 12V6l7-4z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      </div>
      <p className="mt-4 font-bold text-slate-700 dark:text-ink-200">{title}</p>
      <p className="mt-1 max-w-[260px] text-center text-sm text-slate-500 dark:text-ink-400">
        {description}
      </p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-400 dark:text-ink-400">
        {label}
      </span>
      {children}
    </label>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function ShieldIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l7 4v6c0 4.97-3.5 9.57-7 11C5.5 21.57 5 16.97 5 12V6l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" />
      <rect x="9" y="14" width="6" height="4" rx="1" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
