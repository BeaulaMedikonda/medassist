"use client";

import { useState } from "react";
import Link from "next/link";
import type {
  FieldAssumption,
  FieldAssumptionsMap,
  IcdCodeDetail,
  LoincCodeDetail,
  Medicine,
  Patient,
  SpeakerTurn,
  Visit,
} from "@/types/db";
import { useToast } from "@/components/ui/Toast";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { formatDate, initials, cn } from "@/lib/utils";

export type FhirValidationSummary = {
  id: string;
  status: "passed" | "warning" | "failed";
  errors: unknown[];
  warnings: unknown[];
  validated_at: string;
  validator?: string | null;
  bundle_profile?: string | null;
};

export function ViewScreen({
  patient,
  visit,
  initialValidation = null,
}: {
  patient: Patient;
  visit: Visit;
  initialValidation?: FhirValidationSummary | null;
}) {
  const { push } = useToast();
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<FhirValidationSummary | null>(initialValidation);
  const [validationDetailsOpen, setValidationDetailsOpen] = useState(false);

    function downloadTranscript(format: "txt" | "json") {
      const speakers = visit.transcript_speakers as SpeakerTurn[] | null;
      const filename = `transcript-${visit.id}.${format}`;
      let content: string;
      if (format === "json") {
        const payload = speakers?.length
          ? { visit_id: visit.id, language: visit.transcript_language, turns: speakers }
          : { visit_id: visit.id, language: visit.transcript_language, text: visit.transcript_text };
        content = JSON.stringify(payload, null, 2);
      } else {
        content = speakers?.length
          ? speakers.map((t) => `${t.speaker === visit.doctor_speaker_id ? "DOCTOR" : t.speaker}: ${t.translated_text || t.text}`).join("\n")
          : visit.transcript_text || "";
      }
      const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    }

    async function downloadAudio() {
    if (!visit.audio_url) return;
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.storage.from("visit-audio").createSignedUrl(visit.audio_url, 60, {
      download: true,
    });
    if (error || !data?.signedUrl) { push({ title: "Audio download failed", variant: "error" }); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = `audio-${visit.id}.${visit.audio_url.split(".").pop() || "webm"}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  const a = visit.field_assumptions || null;

  async function exportBundle() {
    setExporting(true);
    try {
      const res = await fetch(`/api/fhir/visit/${visit.id}`, {
        method: "GET",
        headers: { Accept: "application/fhir+json" },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `visit-${visit.id}-fhir.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      push({ title: "Bundle downloaded", variant: "success" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not export";
      push({ title: "Export failed", description: msg, variant: "error" });
    } finally {
      setExporting(false);
    }
  }

  async function validateBundle() {
    setValidating(true);
    try {
      const res = await fetch(`/api/fhir/visit/${visit.id}/validate`, {
        method: "POST",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        validation?: FhirValidationSummary;
        result?: {
          status?: "passed" | "warning" | "failed";
          errors?: unknown[];
          warnings?: unknown[];
        };
      };
      if (!res.ok) {
        throw new Error(payload.error || `Validation failed (${res.status})`);
      }

      const status = payload.result?.status || "warning";
      const errorCount = payload.result?.errors?.length || 0;
      const warningCount = payload.result?.warnings?.length || 0;
      if (payload.validation) {
        setValidation(payload.validation);
      } else {
        setValidation({
          id: `local-${visit.id}`,
          status,
          errors: payload.result?.errors || [],
          warnings: payload.result?.warnings || [],
          validated_at: new Date().toISOString(),
        });
      }
      push({
        title:
          status === "passed"
            ? "FHIR validation passed"
            : status === "failed"
              ? "FHIR validation failed"
              : "FHIR validation completed with warnings",
        description: `${errorCount} error${errorCount === 1 ? "" : "s"}, ${warningCount} warning${warningCount === 1 ? "" : "s"}.`,
        variant: status === "failed" ? "error" : "success",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not validate FHIR";
      push({ title: "Validation failed", description: msg, variant: "error" });
    } finally {
      setValidating(false);
    }
  }

  const meds = (visit.prescription?.medicines || []) as Medicine[];
  const dx = visit.confirmed_diagnosis || visit.provisional_diagnosis;
  const dxKind = visit.confirmed_diagnosis ? "Confirmed" : "Provisional";
  const icd = visit.icd_codes || [];
  const icdDetails = visit.icd_code_details || [];

  const vitalsChips: Array<{ k: string; v: string }> = [];
  if (visit.bp_systolic && visit.bp_diastolic) {
    vitalsChips.push({ k: "BP", v: `${visit.bp_systolic}/${visit.bp_diastolic}` });
  }
  if (visit.pulse) vitalsChips.push({ k: "P", v: `${visit.pulse}` });
  if (visit.temperature_f) vitalsChips.push({ k: "T", v: `${visit.temperature_f}°F` });
  if (visit.spo2) vitalsChips.push({ k: "SpO₂", v: `${visit.spo2}%` });
  if (visit.weight_kg) vitalsChips.push({ k: "Wt", v: `${visit.weight_kg} kg` });

  return (
    <div className="-mt-6 pb-32">
      {/* Sticky header */}
      <div className="no-print sticky top-0 z-10 -mx-4 border-b border-slate-200 bg-white/95 dark:border-ink-800 dark:bg-ink-950/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 md:top-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={`/emr/${patient.id}`}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 dark:text-ink-500 hover:bg-slate-100 dark:hover:bg-ink-800"
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
                <span className="pill bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />
                  Completed
                </span>
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
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">
            <svg viewBox="0 0 16 16" className="h-3 w-3" fill="currentColor">
              <path d="M8 1l7 13H1L8 1zm0 4v5m0 2v.5" stroke="currentColor" strokeWidth="0.6" />
            </svg>
            Allergies: {patient.known_allergies}
          </div>
        ) : null}
      </div>

      <div className="space-y-6 pt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <section className="space-y-4 lg:col-span-3">
            <PaneHeader title="Clinical" subtitle="Findings and diagnosis" />

            <Group title="Vitals">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <VitalCell label="BP sys" value={visit.bp_systolic} suffix="mmHg" />
                <VitalCell label="BP dia" value={visit.bp_diastolic} suffix="mmHg" />
                <VitalCell label="Pulse" value={visit.pulse} suffix="bpm" />
                <VitalCell label="Temp" value={visit.temperature_f} suffix="°F" />
                <VitalCell label="SpO₂" value={visit.spo2} suffix="%" />
                <VitalCell label="Weight" value={visit.weight_kg} suffix="kg" />
              </div>
            </Group>

            <Group title="Subjective">
              <ReadField
                label="Chief complaints"
                value={visit.chief_complaints}
                assumption={pick(a, "chief_complaints")}
              />
              <ReadField
                label="History of present illness"
                value={visit.history_present_illness}
                assumption={pick(a, "history_present_illness")}
              />
              <ReadField label="Past history" value={visit.past_history} />
            </Group>

            <Group title="Objective & Assessment">
              <ReadField
                label="Examination findings"
                value={visit.examination_findings}
                assumption={pick(a, "examination_findings")}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReadField
                  label="Provisional diagnosis"
                  value={visit.provisional_diagnosis}
                  assumption={pick(a, "provisional_diagnosis")}
                />
                <ReadField
                  label="Confirmed diagnosis"
                  value={visit.confirmed_diagnosis}
                  assumption={pick(a, "confirmed_diagnosis")}
                />
              </div>
              {icd.length > 0 ? (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-ink-400">
                    ICD-10 codes
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {icd.map((c, i) => {
                      const name = icdDetails.find((detail) => detail.code.trim().toUpperCase() === c.trim().toUpperCase())?.name;
                      return (
                        <span
                          key={`${c}-${i}`}
                          className="inline-flex max-w-full items-center rounded-md bg-slate-100 px-2 py-0.5 text-[12px] font-medium text-slate-700 dark:bg-ink-800 dark:text-ink-300"
                        >
                          <span className="font-mono">{c}</span>
                          {name ? <span className="ml-1 truncate text-slate-500 dark:text-ink-400">- {name}</span> : null}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              <ReadField
                label="Investigations ordered"
                value={visit.investigations_ordered}
                assumption={pick(a, "investigations_ordered")}
              />
              <LoincDetails details={visit.loinc_code_details || []} />
            </Group>
          </section>

          <section className="space-y-4 lg:col-span-2">
            <PaneHeader title="Prescription" subtitle={dx ? `${dxKind} · ${dx}` : undefined} />

            <div className="card p-4">
              {meds.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-ink-500">No medicines prescribed.</p>
              ) : (
                <ul className="space-y-2">
                  {meds.map((m, i) => (
                    <li
                      key={i}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-sm",
                        m.status === "stopped"
                          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300"
                          : "border-slate-200 bg-slate-50 dark:border-ink-800 dark:bg-ink-900/60",
                      )}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className={cn(
                          "font-semibold",
                          m.status === "stopped"
                            ? "line-through"
                            : "text-slate-900 dark:text-ink-100",
                        )}>
                          {m.name}
                        </span>
                        <MedStatusBadge status={m.status} />
                      </div>
                      <div className="mt-0.5 text-[12px] text-slate-600 dark:text-ink-400">
                        {[m.dose, m.frequency, m.duration, m.route]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                      {m.instructions ? (
                        <div className="mt-0.5 text-[12px] italic text-slate-500 dark:text-ink-500">
                          {m.instructions}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <FhirValidationCard
              validation={validation}
              detailsOpen={validationDetailsOpen}
              onToggleDetails={() => setValidationDetailsOpen((open) => !open)}
            />

            <Group title="Plan">
              <ReadField
                label="Advice"
                value={visit.advice}
                assumption={pick(a, "advice")}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ReadField
                  label="Follow-up date"
                  value={visit.follow_up_date ? formatDate(visit.follow_up_date) : null}
                />
                <ReadField
                  label="Follow-up notes"
                  value={visit.follow_up_notes}
                  assumption={pick(a, "follow_up_notes")}
                />
              </div>
            </Group>

            {visit.doctor_notes ? (
              <Group title="Doctor's notes" subtitle="Internal — not printed">
                <ReadField label="Notes" value={visit.doctor_notes} />
              </Group>
            ) : null}
          </section>
        </div>

        {visit.transcript_text || (visit.transcript_speakers && (visit.transcript_speakers as SpeakerTurn[]).length > 0) ? (
          <TranscriptPanel
          visit={visit}
          open={transcriptOpen}
          onToggle={() => setTranscriptOpen((v) => !v)}
          onDownloadTxt={() => downloadTranscript("txt")}
          onDownloadJson={() => downloadTranscript("json")}
          onDownloadAudio={visit.audio_url ? downloadAudio : undefined}
/>
        ) : null}
      </div>

      <ActionBar
        patientId={patient.id}
        visitId={visit.id}
        exporting={exporting}
        validating={validating}
        onExport={exportBundle}
        onValidate={validateBundle}
      />
    </div>
  );
}

// -------- subcomponents --------

function FhirValidationCard({
  validation,
  detailsOpen,
  onToggleDetails,
}: {
  validation: FhirValidationSummary | null;
  detailsOpen: boolean;
  onToggleDetails: () => void;
}) {
  if (!validation) return null;

  const errorCount = validation.errors?.length || 0;
  const warningCount = validation.warnings?.length || 0;
  const badge =
    validation.status === "passed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
      : validation.status === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
        : "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300";
  const label =
    validation.status === "passed"
      ? "FHIR Passed"
      : validation.status === "warning"
        ? "FHIR Warning"
        : "FHIR Failed";

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-eyebrow">FHIR Validation</div>
          <div className="mt-0.5 text-[12px] text-slate-500 dark:text-ink-500">
            Last checked {formatDate(validation.validated_at)}
          </div>
        </div>
        <span className={cn("rounded-full border px-3 py-1 text-[11px] font-bold", badge)}>
          {label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-rose-50 p-3 dark:bg-rose-950/25">
          <div className="text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-300">
            Errors
          </div>
          <div className="mt-2 text-xl font-bold text-rose-700 dark:text-rose-300">
            {errorCount}
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-950/25">
          <div className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-300">
            Warnings
          </div>
          <div className="mt-2 text-xl font-bold text-amber-700 dark:text-amber-300">
            {warningCount}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onToggleDetails}
        className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-ink-800 dark:text-ink-300 dark:hover:bg-ink-900"
      >
        {detailsOpen ? "Hide validation report" : "View full validation report"}
      </button>

      {detailsOpen ? (
        <div className="mt-3 max-h-72 space-y-3 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs dark:border-ink-800 dark:bg-ink-900/60">
          <ValidationIssueList title="Errors" issues={validation.errors} tone="error" />
          <ValidationIssueList title="Warnings" issues={validation.warnings} tone="warning" />
        </div>
      ) : null}
    </div>
  );
}

function ValidationIssueList({
  title,
  issues,
  tone,
}: {
  title: string;
  issues: unknown[];
  tone: "error" | "warning";
}) {
  const color =
    tone === "error"
      ? "text-rose-700 dark:text-rose-300"
      : "text-amber-700 dark:text-amber-300";

  return (
    <div>
      <div className={cn("mb-1 font-bold uppercase tracking-wide", color)}>{title}</div>
      {issues.length === 0 ? (
        <p className="text-slate-500 dark:text-ink-500">None</p>
      ) : (
        <ul className="space-y-1.5">
          {issues.slice(0, 20).map((issue, index) => (
            <li key={index} className="rounded-md bg-white p-2 text-slate-700 dark:bg-ink-950 dark:text-ink-300">
              {formatValidationIssue(issue)}
            </li>
          ))}
          {issues.length > 20 ? (
            <li className="text-slate-500 dark:text-ink-500">
              +{issues.length - 20} more
            </li>
          ) : null}
        </ul>
      )}
    </div>
  );
}

function formatValidationIssue(issue: unknown) {
  if (!issue || typeof issue !== "object") {
    return String(issue);
  }
  const item = issue as { code?: string; message?: string; path?: string };
  return [item.code, item.message, item.path].filter(Boolean).join(" - ");
}

function pick(
  map: FieldAssumptionsMap | null | undefined,
  key: keyof FieldAssumptionsMap,
): FieldAssumption {
  return (map && map[key]) || null;
}

function PaneHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-base font-bold text-slate-900 dark:text-ink-100">{title}</h2>
      {subtitle ? (
        <span className="text-[11px] text-slate-500 dark:text-ink-500">{subtitle}</span>
      ) : null}
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

function ReadField({
  label,
  value,
  assumption = null,
}: {
  label: string;
  value: string | null | undefined;
  assumption?: FieldAssumption;
}) {
  if (!value || value.trim().length === 0) {
    return (
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-ink-400">
          {label}
        </div>
        <div className="mt-1 text-sm italic text-slate-400 dark:text-ink-600">—</div>
      </div>
    );
  }
  const tone =
    assumption === "assumed"
      ? "rounded-lg ring-1 ring-amber-300 bg-amber-50/60 p-2 dark:ring-amber-700 dark:bg-amber-950/30"
      : assumption === "stated"
        ? "rounded-lg ring-1 ring-emerald-300 bg-emerald-50/40 p-2 dark:ring-emerald-800 dark:bg-emerald-950/25"
        : "";
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-ink-400">
        {label}
      </div>
      <div className={cn("mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-ink-200", tone)}>
        {value}
      </div>
    </div>
  );
}

function VitalCell({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-ink-500">
        {label}
      </div>
      <div className="mt-0.5 flex items-baseline gap-1 rounded-md bg-slate-50 px-2 py-1.5 dark:bg-ink-900/70">
        <span className="text-base font-semibold text-slate-900 dark:text-ink-100">
          {value ?? "—"}
        </span>
        {suffix ? <span className="text-[11px] text-slate-400 dark:text-ink-600">{suffix}</span> : null}
      </div>
    </div>
  );
}

function MedStatusBadge({ status }: { status: Medicine["status"] }) {
  const styles: Record<Medicine["status"], string> = {
    new: "bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-300",
    continued: "bg-slate-100 text-slate-600 dark:bg-ink-800 dark:text-ink-400",
    modified: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    stopped: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  };
  return (
    <span className={cn(
      "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
      styles[status],
    )}>
      {status}
    </span>
  );
}

function LoincDetails({ details }: { details: LoincCodeDetail[] }) {
  if (details.length === 0) return null;

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-ink-400">
        LOINC / UCUM details
      </div>
      <div className="mt-1.5 space-y-1.5">
        {details.map((detail, index) => {
          const meta = [
            detail.loinc_code ? `LOINC ${detail.loinc_code}` : null,
            detail.loinc_name,
            detail.ucum_unit ? `UCUM ${detail.ucum_unit}` : null,
            detail.ucum_name,
          ].filter(Boolean);

          return (
            <div
              key={`${detail.test_name}-${detail.loinc_code || index}`}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-300"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-slate-900 dark:text-ink-100">{detail.test_name}</span>
              </div>
              {meta.length > 0 ? <div className="mt-1 text-[11px] text-slate-500 dark:text-ink-500">{meta.join(" / ")}</div> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TranscriptPanel({
  visit,
  open,
  onToggle,
  onDownloadTxt,
  onDownloadJson,
  onDownloadAudio,
}: {
  visit: Visit;
  open: boolean;
  onToggle: () => void;
  onDownloadTxt: () => void;
  onDownloadJson: () => void;
  onDownloadAudio?: () => void;
}) {

  const turns = (visit.transcript_speakers as SpeakerTurn[] | null) || [];
  const doctorSpeakerId = visit.doctor_speaker_id;
  return (
    <section className="card overflow-hidden">
      <div
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-ink-800/40"
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
        <div className="flex items-center gap-1">
          {open && (
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={onDownloadTxt} className="rounded px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-ink-500 dark:hover:bg-ink-800">
                ↓ TXT
              </button>
              <button onClick={onDownloadJson} className="rounded px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-ink-500 dark:hover:bg-ink-800">
                ↓ JSON
              </button>
              {onDownloadAudio && (
                <button onClick={onDownloadAudio} className="rounded px-2 py-0.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:text-ink-500 dark:hover:bg-ink-800">
                  ↓ Audio
                </button>
              )}
            </div>
          )}
          <svg
            viewBox="0 0 20 20"
            className={cn("h-4 w-4 text-slate-400 dark:text-ink-600 transition", open && "rotate-180")}
          >
            <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>      {open ? (
        <div className="space-y-1 border-t border-slate-100 px-4 py-4 text-sm dark:border-ink-800">
          {turns.length > 0 ? (
            turns.map((t, i) => (
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
  visitId,
  exporting,
  validating,
  onExport,
  onValidate,
}: {
  patientId: string;
  visitId: string;
  exporting: boolean;
  validating: boolean;
  onExport: () => void;
  onValidate: () => void;
}) {
  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-ink-800 dark:bg-ink-950/90 md:left-[310px]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 sm:px-2">
        <div className="hidden items-center gap-2 text-[11px] text-slate-500 dark:text-ink-500 sm:flex">
          <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Read-only — completed visit
        </div>
        <div className="flex flex-1 flex-col-reverse gap-2 sm:flex-1 sm:flex-row sm:justify-end">
          <Link href={`/emr/${patientId}`} className="btn-ghost">
            Back
          </Link>
          <button onClick={onExport} disabled={exporting} className="btn-secondary">
            {exporting ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 3a7 7 0 1 0 7 7" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 3v10m0 0l-4-4m4 4l4-4M4 17h12" />
              </svg>
            )}
            Export FHIR Bundle
          </button>
          <button onClick={onValidate} disabled={validating} className="btn-secondary">
            {validating ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 3a7 7 0 1 0 7 7" strokeLinecap="round" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 10.5l3 3 7-7" />
              </svg>
            )}
            Validate FHIR
          </button>
          <Link
            href={`/emr/${patientId}/visits/${visitId}/print`}
            className="btn-secondary"
            target="_blank"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 9V3h10v6M5 14h10v4H5zM4 9h12v5H4z" />
            </svg>
            Print prescription
          </Link>
          <Link
            href={`/emr/${patientId}/visits/${visitId}/review?edit=1`}
            className="btn-primary"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3l3 3-9 9H5v-3l9-9zM12 5l3 3" />
            </svg>
            Edit
          </Link>
        </div>
      </div>
    </div>
  );
}
