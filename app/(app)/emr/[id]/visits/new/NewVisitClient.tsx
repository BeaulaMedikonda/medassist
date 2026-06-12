//app/(app)/emr/[id]/visits/new/NewVisitClient.tsx
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

type VisitMode = "manual" | "record" | "upload";

const MAX_UPLOAD_MB = 100;
const ACCEPTED_AUDIO_EXTENSIONS = ["mp3", "wav", "m4a", "mp4", "webm", "ogg"];
const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
  "audio/webm",
  "audio/ogg",
];

export function NewVisitClient({
  patient,
  previousVisit,
  existingVisit,
  initialMode,
  currentUserId,
  clinicId,
}: {
  patient: Patient;
  previousVisit: Visit | null;
  existingVisit: Visit | null;
  initialMode: "manual" | "record";
  currentUserId: string;
  clinicId: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [mode, setMode] = useState<VisitMode>(initialMode);
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
        doctor_id: currentUserId,
        created_by: currentUserId,
        clinic_id: clinicId,
        visit_date: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message || "Could not create visit");
    const visitId = (data as { id: string }).id;

    // Auto-assign self as attending so it shows on the doctor's queue.
    await supabase.from("visit_doctors").insert({
      visit_id: visitId,
      doctor_id: currentUserId,
      role: "attending",
    });
    return visitId;
  }

  async function processAudio({
    blob,
    mimeType,
    filename,
    failureTitle,
  }: {
    blob: Blob;
    mimeType: string;
    filename?: string;
    failureTitle: string;
  }) {
    setBusy("uploading");
    setErrorMsg(null);
    try {
      const supabase = supabaseBrowser();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const visitId = await ensureVisit();

      const ext = audioExtension(mimeType, filename);
      const path = `${user.id}/${visitId}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("visit-audio")
        .upload(path, blob, {
          contentType: mimeType || "audio/webm",
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

      setBusy("done");
      push({ title: "Ready for review", variant: "success" });
      router.replace(`/emr/${patient.id}/visits/${visitId}/review${window.location.hash}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setBusy("error");
      setErrorMsg(msg);
      push({ title: failureTitle, description: msg, variant: "error" });
    }
  }

  async function handleRecorderComplete(result: RecorderResult) {
    await processAudio({
      blob: result.blob,
      mimeType: result.mimeType,
      failureTitle: "Recording flow failed",
    });
  }

  async function handleAudioUpload(file: File) {
    if (!isAcceptedAudio(file)) {
      setBusy("error");
      setErrorMsg("Please upload an MP3, WAV, M4A, WEBM, or OGG audio file.");
      return;
    }

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setBusy("error");
      setErrorMsg(`Audio file must be ${MAX_UPLOAD_MB} MB or smaller.`);
      return;
    }

    await processAudio({
      blob: file,
      mimeType: file.type || mimeTypeFromName(file.name),
      filename: file.name,
      failureTitle: "Audio upload failed",
    });
  }

  return (
    <div>
      <div className="mb-6 inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1 dark:border-ink-800 dark:bg-ink-900">
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
          onClick={() => setMode("upload")}
          disabled={busy != null}
          className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition ${
            mode === "upload"
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-50 dark:text-ink-400 dark:hover:bg-ink-800"
          }`}
        >
          Upload audio
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
      ) : mode === "upload" ? (
        <AudioUploadPanel
          busy={busy}
          errorMsg={errorMsg}
          onUpload={handleAudioUpload}
          onCancel={() => router.back()}
        />
      ) : (
        <ManualEntry
          patient={patient}
          previousVisit={previousVisit}
          existingVisit={existingVisit}
          currentUserId={currentUserId}
          clinicId={clinicId}
        />
      )}
    </div>
  );
}

function AudioUploadPanel({
  busy,
  errorMsg,
  onUpload,
  onCancel,
}: {
  busy: ExternalState | null;
  errorMsg: string | null;
  onUpload: (file: File) => void;
  onCancel: () => void;
}) {
  const isBusy =
    busy === "uploading" || busy === "transcribing" || busy === "extracting";
  const statusText =
    busy === "uploading"
      ? "Uploading audio..."
      : busy === "transcribing"
        ? "Transcribing..."
        : busy === "extracting"
          ? "Drafting EMR fields..."
          : null;

  return (
    <div className="card flex flex-col items-center gap-5 p-8 text-center sm:p-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 ring-1 ring-brand-100">
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        >
          <path d="M12 16V4" />
          <path d="M7 9l5-5 5 5" />
          <path d="M5 20h14" />
        </svg>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-ink-100">
          Upload consultation audio
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-ink-500">
          Use an existing MP3, WAV, M4A, WEBM, or OGG recording. It will be saved
          to the same Supabase audio bucket and processed like a live recording.
        </p>
      </div>

      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/20 transition hover:bg-brand-700 ${
          isBusy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        <input
          type="file"
          accept=".mp3,.wav,.m4a,.mp4,.webm,.ogg,audio/*"
          className="sr-only"
          disabled={isBusy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onUpload(file);
          }}
        />
        Choose audio file
      </label>

      {statusText ? (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-ink-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
          {statusText}
        </div>
      ) : null}

      {busy === "error" && errorMsg ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {errorMsg}
        </p>
      ) : null}

      <button type="button" onClick={onCancel} disabled={isBusy} className="btn-ghost">
        Cancel
      </button>
    </div>
  );
}

function ManualEntry({
  patient,
  previousVisit,
  existingVisit,
  currentUserId,
  clinicId,
}: {
  patient: Patient;
  previousVisit: Visit | null;
  existingVisit: Visit | null;
  currentUserId: string;
  clinicId: string;
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
            doctor_id: currentUserId,
            created_by: currentUserId,
            clinic_id: clinicId,
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
          doctor_id: currentUserId,
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

function audioExtension(mimeType: string, filename?: string) {
  const fromName = filename?.split(".").pop()?.toLowerCase();
  if (fromName && ACCEPTED_AUDIO_EXTENSIONS.includes(fromName)) {
    return fromName === "mp4" ? "m4a" : fromName;
  }
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  return "webm";
}

function mimeTypeFromName(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "wav") return "audio/wav";
  if (ext === "m4a" || ext === "mp4") return "audio/mp4";
  if (ext === "ogg") return "audio/ogg";
  return "audio/webm";
}

function isAcceptedAudio(file: File) {
  if (file.type && ACCEPTED_AUDIO_TYPES.includes(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return !!ext && ACCEPTED_AUDIO_EXTENSIONS.includes(ext);
}
