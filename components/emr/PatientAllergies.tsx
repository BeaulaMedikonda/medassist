// import { notFound } from "next/navigation";
// import Link from "next/link";
// import { supabaseServer } from "@/lib/supabase/server";
// import type { Patient, Visit } from "@/types/db";
// import { formatDate, initials } from "@/lib/utils";
// import { VisitTimeline } from "@/components/emr/VisitTimeline";
// import { PatientHeader } from "./PatientHeader";

// export const dynamic = "force-dynamic";

// export default async function PatientPage({
//   params,
// }: {
//   params: Promise<{ id: string }>;
// }) {
//   const supabase = await supabaseServer();
//   const { id } = await params;

//   const { data: patient } = await supabase
//     .from("patients")
//     .select("*")
//     .eq("id", id)
//     .maybeSingle();

//   if (!patient) notFound();

//   const { data: visits } = await supabase
//     .from("visits")
//     .select("*")
//     .eq("patient_id", id)
//     .order("visit_date", { ascending: false });

//   const p = patient as Patient;
//   const v = (visits || []) as Visit[];

//   return (
//     <div className="pb-24">
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
//         All patients
//       </Link>

//       <header className="card overflow-hidden p-6 sm:p-8">
//         <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
//           <div className="flex items-start gap-4">
//             <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-200 to-brand-100 text-base font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
//               {initials(p.full_name)}
//             </div>
//             <div className="min-w-0">
//               <h1 className="truncate text-2xl font-bold text-slate-900 dark:text-ink-100">
//                 {p.full_name}
//               </h1>
//               <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-600 dark:text-ink-400">
//                 <span className="font-mono text-xs">{p.emr_number}</span>
//                 {p.age != null ? (
//                   <span>
//                     {p.age} y · {p.sex || "—"}
//                   </span>
//                 ) : null}
//                 {p.phone ? <span>📞 {p.phone}</span> : null}
//                 {p.blood_group ? <span>🩸 {p.blood_group}</span> : null}
//               </div>
//               <div className="mt-3 flex flex-wrap gap-2">
//                 {p.known_allergies ? (
//                   <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-900/30 dark:text-rose-200 dark:ring-rose-800/60">
//                     <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor"><circle cx="6" cy="6" r="3" /></svg>
//                     Allergies: {p.known_allergies}
//                   </span>
//                 ) : null}
//                 {p.chronic_conditions ? (
//                   <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-200 dark:ring-amber-800/60">
//                     <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="currentColor"><circle cx="6" cy="6" r="3" /></svg>
//                     Conditions: {p.chronic_conditions}
//                   </span>
//                 ) : null}
//               </div>
//             </div>
//           </div>

//           <div className="flex flex-col items-end gap-2">
//             <span className="text-[11px] uppercase tracking-wide text-slate-400 dark:text-ink-600">
//               First visit
//             </span>
//             <span className="text-sm font-medium text-slate-700 dark:text-ink-300">
//               {formatDate(p.created_at)}
//             </span>
//           </div>
//         </div>
//       </header>

//       <section className="mt-8">
//         <div className="mb-3 flex items-end justify-between">
//           <div>
//             <h2 className="text-lg font-semibold text-slate-900 dark:text-ink-100">
//               Visits ({v.length})
//             </h2>
//             <p className="text-sm text-slate-500 dark:text-ink-500">
//               Most recent first. Tap any visit to view details.
//             </p>
//           </div>
//           <Link
//             href={`/emr/${p.id}/visits/new?mode=record`}
//             className="btn-secondary hidden sm:inline-flex"
//           >
//             <svg viewBox="0 0 20 20" className="h-4 w-4">
//               <path
//                 d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm-5 7a5 5 0 0010 0h2a7 7 0 11-14 0h2z"
//                 fill="currentColor"
//               />
//             </svg>
//             Start recording
//           </Link>
//         </div>

//         <VisitTimeline visits={v} patientId={p.id} />
//       </section>

//       {/* Mobile FAB */}
//       <Link
//         href={`/emr/${p.id}/visits/new?mode=record`}
//         className="fixed bottom-6 right-6 flex h-14 items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 sm:hidden"
//       >
//         <svg viewBox="0 0 20 20" className="h-5 w-5">
//           <path
//             d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3zm-5 7a5 5 0 0010 0h2a7 7 0 11-14 0h2z"
//             fill="currentColor"
//           />
//         </svg>
//         New visit
//       </Link>
//     </div>
//   );
// }


import { useState, useTransition } from "react";
import type { PatientAllergy } from "@/types/db";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatDate } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { TextInput, TextArea, SelectInput } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

// ─── severity helpers ─────────────────────────────────────────────────────────

const SEV_STYLES: Record<
  NonNullable<PatientAllergy["severity"]> | "unknown",
  string
> = {
  severe:
    "bg-rose-50 text-rose-700 ring-1 ring-rose-200/60 dark:bg-rose-900/30 dark:text-rose-300 dark:ring-rose-800/60",
  moderate:
    "bg-amber-50 text-amber-700 ring-1 ring-amber-200/60 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-800/60",
  mild: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/60",
  unknown:
    "bg-slate-100 text-slate-500 ring-1 ring-slate-200/60 dark:bg-ink-800 dark:text-ink-400 dark:ring-ink-700",
};

function SeverityBadge({ value }: { value: PatientAllergy["severity"] }) {
  const key = (value ?? "unknown") as keyof typeof SEV_STYLES;
  const label = value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : "Unknown";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${SEV_STYLES[key]}`}
    >
      {label}
    </span>
  );
}

// ─── form state ───────────────────────────────────────────────────────────────

type FormState = {
  allergen: string;
  reaction: string;
  severity: PatientAllergy["severity"] | "";
};

const EMPTY: FormState = { allergen: "", reaction: "", severity: "" };

function fromRow(row: PatientAllergy): FormState {
  return {
    allergen: row.allergen,
    reaction: row.reaction ?? "",
    severity: row.severity ?? "",
  };
}

// ─── component ────────────────────────────────────────────────────────────────

export function PatientAllergies({
  patientId,
  initialAllergies,
  readOnly = false,
}: {
  patientId: string;
  initialAllergies: PatientAllergy[];
  readOnly?: boolean;
}) {
  const { push: toast } = useToast();
  const supabase = supabaseBrowser();

  const [allergies, setAllergies] =
    useState<PatientAllergy[]>(initialAllergies);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PatientAllergy | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formError, setFormError] = useState("");
  const [isPending, startTransition] = useTransition();

  // delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PatientAllergy | null>(
    null,
  );
  const [isDeleting, startDelete] = useTransition();

  // ── helpers ──────────────────────────────────────────────────────────────

  function openAdd() {
    setEditing(null);
    setForm(EMPTY);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(row: PatientAllergy) {
    setEditing(row);
    setForm(fromRow(row));
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  function setField<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    if (key === "allergen") setFormError("");
  }

  // ── save (insert / update) ────────────────────────────────────────────────

  function handleSave() {
    if (!form.allergen.trim()) {
      setFormError("Allergen name is required.");
      return;
    }

    const payload = {
      allergen: form.allergen.trim(),
      reaction: form.reaction.trim() || null,
      severity: (form.severity as PatientAllergy["severity"]) || null,
    };

    startTransition(async () => {
      if (editing) {
        const { data, error } = await supabase
          .from("patient_allergies")
          .update(payload)
          .eq("id", editing.id)
          .select()
          .single();

        if (error) {
          toast({ title: "Update failed", description: error.message, variant: "error" });
          return;
        }
        setAllergies((prev) =>
          prev.map((a) => (a.id === editing.id ? (data as PatientAllergy) : a)),
        );
        toast({ title: "Allergy updated", variant: "success" });
      } else {
        const { data, error } = await supabase
          .from("patient_allergies")
          .insert({ ...payload, patient_id: patientId })
          .select()
          .single();

        if (error) {
          toast({ title: "Could not add allergy", description: error.message, variant: "error" });
          return;
        }
        setAllergies((prev) => [data as PatientAllergy, ...prev]);
        toast({ title: "Allergy added", variant: "success" });
      }
      closeModal();
    });
  }

  // ── delete ────────────────────────────────────────────────────────────────

  function handleDelete() {
    if (!deleteTarget) return;
    startDelete(async () => {
      const { error } = await supabase
        .from("patient_allergies")
        .delete()
        .eq("id", deleteTarget.id);

      if (error) {
        toast({ title: "Delete failed", description: error.message, variant: "error" });
        return;
      }
      setAllergies((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      toast({ title: "Allergy removed", variant: "success" });
      setDeleteTarget(null);
    });
  }

  // ── stats ─────────────────────────────────────────────────────────────────

  const severeCount = allergies.filter((a) => a.severity === "severe").length;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Section header ── */}
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-ink-100">
            Allergies
            {allergies.length > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400 dark:text-ink-500">
                ({allergies.length})
              </span>
            )}
          </h2>
          {severeCount > 0 && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
              ⚠ {severeCount} severe {severeCount === 1 ? "allergy" : "allergies"} on record
            </p>
          )}
        </div>
        {!readOnly && (
          <button onClick={openAdd} className="btn-secondary btn-sm">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M10 4a1 1 0 011 1v4h4a1 1 0 110 2h-4v4a1 1 0 11-2 0v-4H5a1 1 0 110-2h4V5a1 1 0 011-1z" />
            </svg>
            Add allergy
          </button>
        )}
      </div>

      {/* ── Table / empty state ── */}
      {allergies.length === 0 ? (
        <div className="card-flat flex flex-col items-center gap-2 py-8 text-center">
          <svg
            viewBox="0 0 40 40"
            className="h-8 w-8 text-slate-300 dark:text-ink-700"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <circle cx="20" cy="20" r="16" />
            <path d="M14 20h12M20 14v12" strokeLinecap="round" />
          </svg>
          <p className="text-sm text-slate-500 dark:text-ink-500">
            No allergies recorded yet.
          </p>
          {!readOnly && (
            <button onClick={openAdd} className="btn-light btn-sm mt-1">
              Record first allergy
            </button>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 dark:border-ink-800 dark:bg-ink-900/60">
                <th className="label-sm px-4 py-3 text-left font-semibold">Allergen</th>
                <th className="label-sm px-4 py-3 text-left font-semibold">Reaction / symptoms</th>
                <th className="label-sm px-4 py-3 text-left font-semibold">Severity</th>
                <th className="label-sm px-4 py-3 text-left font-semibold">Recorded</th>
                {!readOnly && (
                  <th className="px-4 py-3" aria-label="Actions" />
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
              {allergies.map((a) => (
                <tr
                  key={a.id}
                  className="group transition-colors hover:bg-slate-50/60 dark:hover:bg-ink-900/40"
                >
                  <td className="px-4 py-3 font-medium text-slate-900 dark:text-ink-100">
                    {a.allergen}
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-ink-400">
                    {a.reaction ?? (
                      <span className="text-slate-300 dark:text-ink-700">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge value={a.severity} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400 dark:text-ink-500">
                    {formatDate(a.recorded_at)}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={() => openEdit(a)}
                          aria-label={`Edit ${a.allergen}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-ink-800 dark:hover:text-ink-200"
                        >
                          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-8.793 8.793a1 1 0 01-.379.242l-3 1a1 1 0 01-1.278-1.278l1-3a1 1 0 01.242-.379l8.38-8.386z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeleteTarget(a)}
                          aria-label={`Delete ${a.allergen}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/30 dark:hover:text-rose-400"
                        >
                          <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zm-1 6a1 1 0 112 0v5a1 1 0 11-2 0V8zm4 0a1 1 0 112 0v5a1 1 0 11-2 0V8z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {modalOpen && (
        <Modal
          title={editing ? "Edit allergy" : "Add allergy"}
          onClose={closeModal}
          maxWidth="md"
        >
          <div className="flex flex-col gap-4">
            <TextInput
              label="Allergen"
              required
              placeholder="e.g. Penicillin, Peanuts, Latex, Sulfa drugs"
              value={form.allergen}
              onChange={(e) => setField("allergen", e.target.value)}
              autoFocus
            />
            {formError && (
              <p className="text-xs font-medium text-rose-600">{formError}</p>
            )}

            <TextArea
              label="Reaction / symptoms"
              placeholder="e.g. Urticaria, anaphylaxis, rash, angioedema…"
              value={form.reaction}
              onChange={(e) => setField("reaction", e.target.value)}
              className="min-h-[80px]"
            />

            <SelectInput
              label="Severity"
              value={form.severity ?? ""}
              onChange={(e) =>
                setField(
                  "severity",
                  e.target.value as FormState["severity"],
                )
              }
            >
              <option value="">— Select severity —</option>
              <option value="mild">Mild</option>
              <option value="moderate">Moderate</option>
              <option value="severe">Severe</option>
            </SelectInput>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={closeModal} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="btn-primary"
              >
                {isPending
                  ? "Saving…"
                  : editing
                    ? "Save changes"
                    : "Add allergy"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Delete confirmation modal ── */}
      {deleteTarget && (
        <Modal
          title="Delete allergy"
          onClose={() => setDeleteTarget(null)}
          maxWidth="sm"
        >
          <p className="text-sm text-slate-600 dark:text-ink-400">
            Remove{" "}
            <span className="font-semibold text-slate-900 dark:text-ink-100">
              {deleteTarget.allergen}
            </span>{" "}
            from this patient's allergy record? This cannot be undone.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="btn-danger"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}


