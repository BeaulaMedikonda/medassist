"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Patient, Visit } from "@/types/db";
import { Recorder, type RecorderResult } from "@/components/audio/Recorder";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { useToast } from "@/components/ui/Toast";

type ExternalState =
  | "uploading"
  | "transcribing"
  | "extracting"
  | "done"
  | "error"
  | "stopping";

export function NewVisitClient({
  patient,
  previousVisit,
  existingVisit,
  initialMode,
}: {
  patient: Patient;
  previousVisit: Visit | null;
  existingVisit: Visit | null;
  initialMode: "manual" | "record";
}) {
  const router = useRouter();
  const { push } = useToast();
  const [mode, setMode] = useState<"manual" | "record">(initialMode);
  const [busy, setBusy] = useState<ExternalState | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function ensureVisit(): Promise<string> {
    if (existingVisit) return existingVisit.id;
    const supabase = supabaseBrowser();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("visits")
      .insert({
        patient_id: patient.id,
        doctor_id: user.id,
        created_by: user.id,
        visit_date: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "Could not create visit");
    const visitId = (data as { id: string }).id;

    // Auto-assign self as attending so it shows on the doctor's queue.
    await supabase.from("visit_doctors").insert({
      visit_id: visitId,
      doctor_id: user.id,
      role: "attending",
    });
    return visitId;
  }

  async function handleRecorderComplete(result: RecorderResult) {
    setBusy("uploading");
    setErrorMsg(null);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const visitId = await ensureVisit();

      const ext = result.mimeType.includes("ogg")
        ? "ogg"
        : result.mimeType.includes("mp4")
          ? "m4a"
          : "webm";
      const path = `${user.id}/${visitId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("visit-audio")
        .upload(path, result.blob, {
          contentType: result.mimeType,
          upsert: true,
        });
      if (upErr) throw new Error(upErr.message);

      await supabase.from("visits").update({ audio_url: path }).eq("id", visitId);

      setBusy("transcribing");
      const tRes = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId }),
      });
      if (!tRes.ok) {
        const j = await safeJson(tRes);
        throw new Error(j?.error || `Transcription failed (${tRes.status})`);
      }

      setBusy("extracting");
      const xRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId }),
      });
      if (!xRes.ok) {
        const j = await safeJson(xRes);
        throw new Error(j?.error || `Extraction failed (${xRes.status})`);
      }

      // Best-effort: refresh pre-visit summary now that we have a recording.
      void fetch("/api/pre-visit-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, force: true }),
      });

      setBusy("done");
      push({ title: "Ready for review", variant: "success" });
      router.replace(`/emr/${patient.id}/visits/${visitId}/review`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setBusy("error");
      setErrorMsg(msg);
      push({ title: "Recording flow failed", description: msg, variant: "error" });
    }
  }

  return (
    <div>
      <div className="mb-6 inline-flex rounded-xl border border-slate-200 bg-white p-1 dark:border-ink-800 dark:bg-ink-900">
        <button
          onClick={() => setMode("record")}
          disabled={busy != null}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            mode === "record"
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-50 dark:text-ink-400 dark:hover:bg-ink-800"
          }`}
        >
          🎙 Record consultation
        </button>
        <button
          onClick={() => setMode("manual")}
          disabled={busy != null}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            mode === "manual"
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-50 dark:text-ink-400 dark:hover:bg-ink-800"
          }`}
        >
          ✍ Manual entry
        </button>
      </div>

      {mode === "record" ? (
        <div>
          {existingVisit && (existingVisit.bp_systolic || existingVisit.chief_complaints) ? (
            <div className="card mb-4 border-sky-200 bg-sky-50/40 p-4 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-900/15 dark:text-sky-200">
              <div className="font-semibold">Medical assistant note</div>
              <div className="mt-1 space-y-0.5 text-xs">
                {existingVisit.chief_complaints ? (
                  <div>
                    <span className="font-medium">CC:</span>{" "}
                    {existingVisit.chief_complaints}
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {existingVisit.bp_systolic && existingVisit.bp_diastolic ? (
                    <span>BP {existingVisit.bp_systolic}/{existingVisit.bp_diastolic}</span>
                  ) : null}
                  {existingVisit.pulse ? <span>P {existingVisit.pulse}</span> : null}
                  {existingVisit.temperature_f ? (
                    <span>T {existingVisit.temperature_f}°F</span>
                  ) : null}
                  {existingVisit.spo2 ? <span>SpO₂ {existingVisit.spo2}%</span> : null}
                </div>
              </div>
            </div>
          ) : null}
          {previousVisit ? (
            <div className="card mb-4 border-brand-100 bg-brand-50/40 p-4 text-sm text-brand-900 dark:border-brand-900/50 dark:bg-brand-900/15 dark:text-brand-200">
              <div className="font-semibold">
                Last prescription will be diffed automatically.
              </div>
              <div className="mt-1 text-xs text-brand-800/80 dark:text-brand-300/80">
                Last visit:{" "}
                {new Date(previousVisit.visit_date).toLocaleDateString("en-IN")}
                {previousVisit.confirmed_diagnosis
                  ? ` — ${previousVisit.confirmed_diagnosis}`
                  : ""}
              </div>
            </div>
          ) : null}
          <Recorder
            maxMinutes={Number(process.env.NEXT_PUBLIC_TRANSCRIPTION_MAX_MINUTES) || 25}
            externalState={busy ?? undefined}
            externalMessage={errorMsg ?? undefined}
            onComplete={handleRecorderComplete}
            onCancel={() => router.back()}
          />
          <p className="mt-4 text-center text-[11px] text-slate-400 dark:text-ink-600">
            Audio is uploaded encrypted at rest, then deleted after 30 days. You
            can edit every field before saving.
          </p>
        </div>
      ) : (
        <ManualEntry
          patient={patient}
          previousVisit={previousVisit}
          existingVisit={existingVisit}
        />
      )}
    </div>
  );
}

function ManualEntry({
  patient,
  previousVisit,
  existingVisit,
}: {
  patient: Patient;
  previousVisit: Visit | null;
  existingVisit: Visit | null;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [busy, setBusy] = useState(false);

  async function open() {
    setBusy(true);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      let visitId = existingVisit?.id || null;
      if (!visitId) {
        const previousMeds =
          previousVisit?.prescription?.medicines?.map((m) => ({
            ...m,
            status: "continued" as const,
          })) || [];

        const { data, error } = await supabase
          .from("visits")
          .insert({
            patient_id: patient.id,
            doctor_id: user.id,
            created_by: user.id,
            visit_date: new Date().toISOString(),
            prescription: previousMeds.length
              ? {
                  medicines: previousMeds,
                  previous_prescription_id: previousVisit?.id || null,
                }
              : null,
          })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message || "Could not create visit");
        visitId = (data as { id: string }).id;

        await supabase.from("visit_doctors").insert({
          visit_id: visitId,
          doctor_id: user.id,
          role: "attending",
        });
      } else if (previousVisit?.prescription?.medicines && !existingVisit?.prescription) {
        // Carry forward continued meds onto the existing visit row.
        const meds = previousVisit.prescription.medicines.map((m) => ({
          ...m,
          status: "continued" as const,
        }));
        await supabase
          .from("visits")
          .update({
            prescription: {
              medicines: meds,
              previous_prescription_id: previousVisit.id,
            },
          })
          .eq("id", visitId);
      }

      router.replace(`/emr/${patient.id}/visits/${visitId}/review`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not open visit";
      push({ title: "Failed", description: msg, variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-col items-start gap-3 p-6 text-sm">
      <p className="text-slate-600">
        Open the visit and fill all fields by hand on the review screen.
        {previousVisit && !existingVisit?.prescription
          ? " The previous prescription will be pre-loaded as 'continued' so you only edit what changed."
          : ""}
      </p>
      <button onClick={open} disabled={busy} className="btn-primary">
        Open visit for editing
      </button>
    </div>
  );
}

async function safeJson(r: Response) {
  try {
    return await r.json();
  } catch {
    return null;
  }
}
