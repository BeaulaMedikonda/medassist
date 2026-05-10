"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type {
  Confidence,
  FieldAssumption,
  FieldAssumptionsMap,
  Patient,
  Prescription,
  SpeakerTurn,
  Visit,
} from "@/types/db";
import { EditableField } from "@/components/review/EditableField";
import { PreVisitSummary } from "@/components/review/PreVisitSummary";
import { PrescriptionEditor } from "@/components/prescription/PrescriptionEditor";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatDate, initials, cn } from "@/lib/utils";

type EditableFields = {
  chief_complaints: string;
  history_present_illness: string;
  past_history: string;
  examination_findings: string;
  provisional_diagnosis: string;
  confirmed_diagnosis: string;
  investigations_ordered: string;
  icd_codes: string;
  advice: string;
  follow_up_date: string;
  follow_up_notes: string;
  doctor_notes: string;
  bp_systolic: string;
  bp_diastolic: string;
  pulse: string;
  temperature_f: string;
  spo2: string;
  weight_kg: string;
};

function toEditable(v: Visit): EditableFields {
  return {
    chief_complaints: v.chief_complaints || "",
    history_present_illness: v.history_present_illness || "",
    past_history: v.past_history || "",
    examination_findings: v.examination_findings || "",
    provisional_diagnosis: v.provisional_diagnosis || "",
    confirmed_diagnosis: v.confirmed_diagnosis || "",
    investigations_ordered: v.investigations_ordered || "",
    icd_codes: (v.icd_codes || []).join(", "),
    advice: v.advice || "",
    follow_up_date: v.follow_up_date || "",
    follow_up_notes: v.follow_up_notes || "",
    doctor_notes: v.doctor_notes || "",
    bp_systolic: v.bp_systolic?.toString() || "",
    bp_diastolic: v.bp_diastolic?.toString() || "",
    pulse: v.pulse?.toString() || "",
    temperature_f: v.temperature_f?.toString() || "",
    spo2: v.spo2?.toString() || "",
    weight_kg: v.weight_kg?.toString() || "",
  };
}

function pick(
  map: FieldAssumptionsMap | null | undefined,
  key: keyof FieldAssumptionsMap,
): FieldAssumption {
  return (map && map[key]) || null;
}

export function ReviewScreen({
  patient,
  visit,
  previousVisit,
}: {
  patient: Patient;
  visit: Visit;
  previousVisit: Visit | null;
}) {
  const router = useRouter();
  const { push } = useToast();

  const aiSnapshot: EditableFields = useMemo(() => toEditable(visit), [visit]);
  const aiPrescription: Prescription | null = visit.prescription
    ? { medicines: [...(visit.prescription.medicines || [])] }
    : null;
  const a = visit.field_assumptions || null;
  const hasAnyAssumption = a
    ? Object.values(a).some((v) => v === "assumed" || v === "stated")
    : false;

  const [fields, setFields] = useState<EditableFields>(toEditable(visit));
  const [prescription, setPrescription] = useState<Prescription>(
    visit.prescription || { medicines: [] },
  );
  const [doctorSpeakerId, setDoctorSpeakerId] = useState<string | null>(
    visit.doctor_speaker_id,
  );
  const [confidence] = useState<Confidence | null>(visit.doctor_id_confidence);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [reextracting, setReextracting] = useState(false);
  const [saving, setSaving] = useState(false);

  function bind<K extends keyof EditableFields>(key: K) {
    return {
      value: fields[key],
      onChange: (v: string) => setFields((f) => ({ ...f, [key]: v })),
    };
  }

  async function flipDoctorSpeaker() {
    if (!visit.transcript_speakers || visit.transcript_speakers.length === 0) {
      push({
        title: "No diarization to flip",
        description: "Edit fields manually instead.",
        variant: "info",
      });
      return;
    }
    setReextracting(true);
    try {
      const supabase = supabaseBrowser();
      const turns = visit.transcript_speakers as SpeakerTurn[];
      const distinct = Array.from(new Set(turns.map((t) => t.speaker)));
      const current = doctorSpeakerId || distinct[0];
      const next =
        distinct.find((s) => s !== current) || distinct[0] || "SPEAKER_1";

      await supabase
        .from("visits")
        .update({ doctor_speaker_id: next, doctor_id_confidence: "high" })
        .eq("id", visit.id);

      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: visit.id, doctorSpeakerHint: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "Re-extraction failed");
      }
      setDoctorSpeakerId(next);
      push({ title: "Reattributed", description: `Doctor set to ${next}`, variant: "success" });
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not flip speaker";
      push({ title: "Flip failed", description: msg, variant: "error" });
    } finally {
      setReextracting(false);
    }
  }

  async function save(opts: { goPrint: boolean }) {
    setSaving(true);
    try {
      const supabase = supabaseBrowser();
      const numOrNull = (s: string) => {
        const n = Number(s);
        return s.trim() === "" || Number.isNaN(n) ? null : n;
      };
      const codes = fields.icd_codes
        .split(/[,\s]+/)
        .map((c) => c.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from("visits")
        .update({
          chief_complaints: fields.chief_complaints || null,
          history_present_illness: fields.history_present_illness || null,
          past_history: fields.past_history || null,
          examination_findings: fields.examination_findings || null,
          provisional_diagnosis: fields.provisional_diagnosis || null,
          confirmed_diagnosis: fields.confirmed_diagnosis || null,
          investigations_ordered: fields.investigations_ordered || null,
          icd_codes: codes.length > 0 ? codes : null,
          advice: fields.advice || null,
          follow_up_date: fields.follow_up_date || null,
          follow_up_notes: fields.follow_up_notes || null,
          doctor_notes: fields.doctor_notes || null,
          bp_systolic: numOrNull(fields.bp_systolic),
          bp_diastolic: numOrNull(fields.bp_diastolic),
          pulse: numOrNull(fields.pulse),
          temperature_f: numOrNull(fields.temperature_f),
          spo2: numOrNull(fields.spo2),
          weight_kg: numOrNull(fields.weight_kg),
          prescription,
          doctor_speaker_id: doctorSpeakerId,
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", visit.id);

      if (error) throw error;

      push({ title: "Visit saved", variant: "success" });
      if (opts.goPrint) {
        window.open(`/emr/${patient.id}/visits/${visit.id}/print`, "_blank");
      }
      router.replace(`/emr/${patient.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save";
      push({ title: "Save failed", description: msg, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  const lowConfidence = confidence === "low";
  const distinctSpeakers = Array.from(
    new Set((visit.transcript_speakers as SpeakerTurn[] | null | undefined)?.map((t) => t.speaker) || []),
  );

  return (
    <div className="-mt-6 pb-32">
      <PatientHeader patient={patient} visit={visit} fields={fields} />

      <div className="space-y-6 pt-6">
        <PreVisitSummary
          visitId={visit.id}
          initialSummary={visit.pre_visit_summary}
          initialGeneratedAt={visit.pre_visit_summary_generated_at}
        />

        {visit.transcript_speakers && distinctSpeakers.length > 1 ? (
          <SpeakerBanner
            confidence={confidence}
            doctorSpeakerId={doctorSpeakerId}
            distinctSpeakers={distinctSpeakers}
            doctorName={patient.full_name}
            reextracting={reextracting}
            onFlip={flipDoctorSpeaker}
          />
        ) : null}

        {hasAnyAssumption ? <AssumptionLegend /> : null}

        {lowConfidence ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l10 18H2L12 3zM12 10v5M12 18v.5" />
            </svg>
            <div>
              <div className="font-semibold">Please verify all fields</div>
              <div className="text-[13px] text-amber-800 dark:text-amber-300">
                The recording was harder than usual to interpret. Read each field carefully before saving.
              </div>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Clinical pane */}
          <section className="space-y-4 lg:col-span-3">
            <PaneHeader title="Clinical" subtitle="Findings and diagnosis" />

            <Group title="Vitals">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <VitalInput label="BP sys" {...bind("bp_systolic")} suffix="mmHg" />
                <VitalInput label="BP dia" {...bind("bp_diastolic")} suffix="mmHg" />
                <VitalInput label="Pulse" {...bind("pulse")} suffix="bpm" />
                <VitalInput label="Temp" {...bind("temperature_f")} suffix="°F" />
                <VitalInput label="SpO₂" {...bind("spo2")} suffix="%" />
                <VitalInput label="Weight" {...bind("weight_kg")} suffix="kg" />
              </div>
            </Group>

            <Group title="Subjective">
              <EditableField
                label="Chief complaints"
                multiline
                placeholder="e.g. fever × 3 days, body ache"
                {...bind("chief_complaints")}
                aiValue={aiSnapshot.chief_complaints}
                assumption={pick(a, "chief_complaints")}
              />
              <EditableField
                label="History of present illness"
                multiline
                {...bind("history_present_illness")}
                aiValue={aiSnapshot.history_present_illness}
                assumption={pick(a, "history_present_illness")}
              />
              <EditableField
                label="Past history"
                multiline
                {...bind("past_history")}
                aiValue={aiSnapshot.past_history}
              />
            </Group>

            <Group title="Objective & Assessment">
              <EditableField
                label="Examination findings"
                multiline
                {...bind("examination_findings")}
                aiValue={aiSnapshot.examination_findings}
                assumption={pick(a, "examination_findings")}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <EditableField
                  label="Provisional diagnosis"
                  {...bind("provisional_diagnosis")}
                  aiValue={aiSnapshot.provisional_diagnosis}
                  assumption={pick(a, "provisional_diagnosis")}
                />
                <EditableField
                  label="Confirmed diagnosis"
                  {...bind("confirmed_diagnosis")}
                  aiValue={aiSnapshot.confirmed_diagnosis}
                  assumption={pick(a, "confirmed_diagnosis")}
                />
              </div>
              <div>
                <EditableField
                  label="ICD-10 codes"
                  placeholder="e.g. J02.9, I10"
                  {...bind("icd_codes")}
                  aiValue={aiSnapshot.icd_codes}
                  assumption={pick(a, "icd_codes")}
                />
                <IcdChips value={fields.icd_codes} />
              </div>
              <EditableField
                label="Investigations ordered"
                multiline
                {...bind("investigations_ordered")}
                aiValue={aiSnapshot.investigations_ordered}
                assumption={pick(a, "investigations_ordered")}
              />
            </Group>
          </section>

          {/* Prescription + Plan pane */}
          <section className="space-y-4 lg:col-span-2">
            <PaneHeader
              title="Prescription"
              subtitle={
                previousVisit
                  ? `Diff against ${formatDate(previousVisit.visit_date)}`
                  : "First Rx for this patient"
              }
            />

            <div className="card p-4">
              <PrescriptionEditor
                prescription={prescription}
                aiPrescription={aiPrescription}
                onChange={setPrescription}
              />
            </div>

            <Group title="Plan">
              <EditableField
                label="Advice"
                multiline
                placeholder="Lifestyle, diet, hydration…"
                {...bind("advice")}
                aiValue={aiSnapshot.advice}
                assumption={pick(a, "advice")}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <EditableField
                  label="Follow-up date"
                  {...bind("follow_up_date")}
                  aiValue={aiSnapshot.follow_up_date}
                  placeholder="YYYY-MM-DD"
                />
                <EditableField
                  label="Follow-up notes"
                  {...bind("follow_up_notes")}
                  aiValue={aiSnapshot.follow_up_notes}
                  assumption={pick(a, "follow_up_notes")}
                />
              </div>
            </Group>

            <Group title="Doctor's notes" subtitle="Internal — not printed">
              <EditableField
                label="Notes"
                multiline
                placeholder="Anything not captured in the recording."
                {...bind("doctor_notes")}
                aiValue={null}
              />
            </Group>
          </section>
        </div>

        {visit.transcript_text || (visit.transcript_speakers && visit.transcript_speakers.length > 0) ? (
          <TranscriptPanel
            visit={visit}
            doctorSpeakerId={doctorSpeakerId}
            open={transcriptOpen}
            onToggle={() => setTranscriptOpen((v) => !v)}
          />
        ) : null}
      </div>

      <ActionBar
        patientId={patient.id}
        saving={saving}
        onSave={() => save({ goPrint: false })}
        onSaveAndPrint={() => save({ goPrint: true })}
      />
    </div>
  );
}

// -------- subcomponents --------

function PatientHeader({
  patient,
  visit,
  fields,
}: {
  patient: Patient;
  visit: Visit;
  fields: EditableFields;
}) {
  const vitalsChips: Array<{ k: string; v: string }> = [];
  if (fields.bp_systolic && fields.bp_diastolic) {
    vitalsChips.push({ k: "BP", v: `${fields.bp_systolic}/${fields.bp_diastolic}` });
  }
  if (fields.pulse) vitalsChips.push({ k: "P", v: `${fields.pulse}` });
  if (fields.temperature_f) vitalsChips.push({ k: "T", v: `${fields.temperature_f}°F` });
  if (fields.spo2) vitalsChips.push({ k: "SpO₂", v: `${fields.spo2}%` });
  if (fields.weight_kg) vitalsChips.push({ k: "Wt", v: `${fields.weight_kg} kg` });

  return (
    <div className="no-print sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-white/95 dark:border-ink-800 dark:bg-ink-950/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 md:top-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/emr/${patient.id}`}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 dark:text-ink-500 hover:bg-slate-100"
            aria-label="Back"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5l-5 5 5 5" />
            </svg>
          </Link>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-200 to-brand-100 text-sm font-bold text-brand-800 dark:from-brand-700 dark:to-brand-900 dark:text-brand-200">
            {initials(patient.full_name)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-lg font-bold text-slate-900 dark:text-ink-100">
                {patient.full_name}
              </h1>
              <StatusPill status={visit.status} />
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-500 dark:text-ink-500">
              <span className="font-mono">{patient.emr_number}</span>
              {patient.age != null ? <span>· {patient.age}{patient.sex || ""}</span> : null}
              {patient.phone ? <span>· {patient.phone}</span> : null}
              <span>· Visit {formatDate(visit.visit_date)}</span>
            </div>
          </div>
        </div>
        {vitalsChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
            {vitalsChips.map((c) => (
              <span
                key={c.k}
                className="inline-flex items-baseline gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-ink-800 dark:text-ink-300"
              >
                <span className="text-[10px] uppercase tracking-wide text-slate-500 dark:text-ink-500">
                  {c.k}
                </span>
                <span className="font-semibold text-slate-900 dark:text-ink-100">{c.v}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
      {patient.known_allergies ? (
        <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
            <path d="M8 1l7 13H1L8 1zm0 4v5m0 2v.5" stroke="currentColor" strokeWidth="0.6" />
          </svg>
          Allergies: {patient.known_allergies}
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ status }: { status: Visit["status"] }) {
  const styles: Record<Visit["status"], string> = {
    intake: "bg-slate-100 text-slate-700 dark:text-ink-300",
    queued: "bg-brand-50 text-brand-700",
    in_progress: "bg-amber-100 text-amber-800",
    awaiting_review: "bg-amber-100 text-amber-800",
    completed: "bg-accent-100 text-accent-800",
    cancelled: "bg-rose-100 text-rose-700",
  };
  const labels: Record<Visit["status"], string> = {
    intake: "Intake",
    queued: "Queued",
    in_progress: "In progress",
    awaiting_review: "Awaiting review",
    completed: "Completed",
    cancelled: "Cancelled",
  };
  return (
    <span className={cn("pill", styles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
      {labels[status]}
    </span>
  );
}

function SpeakerBanner({
  confidence,
  doctorSpeakerId,
  distinctSpeakers,
  doctorName,
  reextracting,
  onFlip,
}: {
  confidence: Confidence | null;
  doctorSpeakerId: string | null;
  distinctSpeakers: string[];
  doctorName: string;
  reextracting: boolean;
  onFlip: () => void;
}) {
  void confidence;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-ink-800 dark:bg-ink-900 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm">
        <div className="font-semibold text-slate-900 dark:text-ink-100">
          Identified Dr. {doctorName.split(" ")[0]} as{" "}
          <span className="font-mono">{doctorSpeakerId || "—"}</span>
        </div>
        <div className="mt-0.5 text-[12px] text-slate-500 dark:text-ink-500">
          {distinctSpeakers.length} speakers detected: {distinctSpeakers.join(", ")}
        </div>
      </div>
      <button
        onClick={onFlip}
        disabled={reextracting}
        className="btn-secondary self-start sm:self-auto"
      >
        {reextracting ? <Spinner /> : null}
        Flip doctor ↔ patient
      </button>
    </div>
  );
}

function IcdChips({ value }: { value: string }) {
  const codes = value
    .split(/[,\s]+/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (codes.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {codes.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium text-slate-700 dark:bg-ink-800 dark:text-ink-300"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function AssumptionLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-[12px] dark:border-ink-800 dark:bg-ink-900">
      <span className="font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
        Field colors
      </span>
      <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-ink-300">
        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-300 dark:bg-emerald-700" />
        Captured from the conversation
      </span>
      <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-ink-300">
        <span className="h-2.5 w-2.5 rounded-sm bg-amber-300 dark:bg-amber-700" />
        Inferred — please verify
      </span>
    </div>
  );
}

function PaneHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">{title}</h2>
      {subtitle ? <span className="text-[11px] text-slate-500 dark:text-ink-500">{subtitle}</span> : null}
    </div>
  );
}

function Group({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="text-eyebrow">{title}</div>
        {subtitle ? (
          <span className="text-[10px] text-slate-400 dark:text-ink-600">{subtitle}</span>
        ) : null}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function VitalInput({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1 rounded-md bg-slate-50 px-2 py-1.5 transition focus-within:bg-white focus-within:shadow-ring dark:bg-ink-900/70 dark:focus-within:bg-ink-900">
        <input
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-base font-semibold text-slate-900 dark:text-ink-100 placeholder:font-normal placeholder:text-slate-400 dark:text-ink-600 focus:outline-none"
          placeholder="—"
        />
        {suffix ? <span className="text-[11px] text-slate-400 dark:text-ink-600">{suffix}</span> : null}
      </div>
    </div>
  );
}

function TranscriptPanel({
  visit,
  doctorSpeakerId,
  open,
  onToggle,
}: {
  visit: Visit;
  doctorSpeakerId: string | null;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <section className="card overflow-hidden">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-ink-300">
          <svg viewBox="0 0 20 20" className="h-4 w-4 text-slate-400 dark:text-ink-600">
            <path d="M3 4h14v3H3zm0 6h14v3H3zm0 6h14v2H3z" fill="currentColor" />
          </svg>
          Transcript
          {visit.transcript_language ? (
            <span className="text-[11px] font-normal text-slate-400 dark:text-ink-600">
              source: {visit.transcript_language}
            </span>
          ) : null}
        </div>
        <svg
          viewBox="0 0 20 20"
          className={cn("h-4 w-4 text-slate-400 dark:text-ink-600 transition", open && "rotate-180")}
        >
          <path
            d="M5 7l5 6 5-6"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div className="space-y-1 border-t border-slate-100 px-4 py-4 text-sm">
          {visit.transcript_speakers && visit.transcript_speakers.length > 0 ? (
            (visit.transcript_speakers as SpeakerTurn[]).map((t, i) => (
              <div
                key={i}
                className={cn(
                  "rounded-md px-2 py-1",
                  t.speaker === doctorSpeakerId
                    ? "bg-brand-50 text-brand-900 dark:bg-brand-900/30 dark:text-brand-200"
                    : "text-slate-700 dark:text-ink-300",
                )}
              >
                <span className="mr-2 font-mono text-[11px] uppercase tracking-wide opacity-70">
                  {t.speaker === doctorSpeakerId ? "DOCTOR" : t.speaker}
                </span>
                {t.translated_text || t.text}
              </div>
            ))
          ) : (
            <p className="whitespace-pre-line text-slate-700 dark:text-ink-300">
              {visit.transcript_text}
            </p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function ActionBar({
  patientId,
  saving,
  onSave,
  onSaveAndPrint,
}: {
  patientId: string;
  saving: boolean;
  onSave: () => void;
  onSaveAndPrint: () => void;
}) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90 md:left-[260px]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 sm:px-2">
        <div className="hidden items-center gap-2 text-[11px] text-slate-500 dark:text-ink-500 sm:flex">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
          Unsaved review · saving marks the visit completed
        </div>
        <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-1 sm:flex-row sm:justify-end">
          <Link href={`/emr/${patientId}`} className="btn-ghost">
            Cancel
          </Link>
          <button
            onClick={onSave}
            disabled={saving}
            className="btn-secondary"
          >
            {saving ? <Spinner /> : null}
            Save
          </button>
          <button
            onClick={onSaveAndPrint}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? <Spinner /> : null}
            Save & print prescription
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M4 10h12M11 5l5 5-5 5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
