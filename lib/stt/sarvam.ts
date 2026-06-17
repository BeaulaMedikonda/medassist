// lib/stt/sarvam.ts
import { serverEnv } from "@/lib/env";
import type { SpeakerTurn } from "@/types/db";
 
// Sarvam STT/STT-Translate integration.
// Short audio: REST API (< 30 seconds).
// Long audio: Batch API /job/v1.
//
// Important:
// - REST API rejects long audio with 400/422 and message "Audio duration exceeds...30 seconds".
// - Batch API supports long audio and diarization.
 
const STT_BASE = "https://api.sarvam.ai/speech-to-text";
const STTT_BASE = "https://api.sarvam.ai/speech-to-text-translate";
const LOG = "[sarvam]";
 
export interface SarvamResult {
  transcript: string;
  language_code: string | null;
  turns: SpeakerTurn[];
  raw: unknown;
}
 
export async function transcribeWithSarvam(
  audio: Buffer,
  filename: string,
  contentType: string,
): Promise<SarvamResult> {
  console.log("USING SARVAM PIPELINE");
 
  if (!serverEnv.sarvamApiKey) {
    throw new Error("SARVAM_API_KEY is not configured");
  }
 
  const safeName = filename.replace(/[^A-Za-z0-9._-]/g, "_") || "audio.webm";
 
  // REST is quick for short audio, but it does not reliably return diarized
  // speaker turns. When diarization is enabled, use Batch even for short clips.
  if (!serverEnv.sarvamEnableDiarization) {
    const restResult = await tryRestTranscription(audio, safeName, contentType);
    if (restResult) return restResult;
  }
 
  // Long audio and diarized audio use Batch.
  const init = await initJob();
  console.log(`${LOG} init ok job_id=${init.job_id}`);
 
  await uploadAudio(init.job_id, safeName, audio, contentType);
  console.log(`${LOG} uploaded ${safeName} (${audio.byteLength} bytes)`);
 
  await startJob(init.job_id);
  console.log(`${LOG} job started`);
 
  const outputFiles = await pollJob(init.job_id);
  console.log(
    `${LOG} job complete, output files: ${outputFiles.length ? outputFiles.join(", ") : "none returned"}`,
  );
 
  const result = await downloadResult(init.job_id, outputFiles);
  const parsed = parseSarvamResponse(result);
 
  const hasKnownShape = hasTranscriptShape(result);
  if (!hasKnownShape && parsed.transcript.length === 0 && parsed.turns.length === 0) {
    const keys = Object.keys(result);
    const preview = JSON.stringify(result).slice(0, 600);
    throw new Error(
      `Sarvam returned a response but parsing extracted nothing. ` +
        `Top-level keys: ${JSON.stringify(keys)}. Preview: ${preview}`,
    );
  }
 
  console.log(
    `${LOG} parsed: transcript=${parsed.transcript.length} chars, turns=${parsed.turns.length}, lang=${parsed.language_code}`,
  );
 
  return parsed;
}
 
function getRestBase(): string {
  return serverEnv.sarvamSttMode === "translate" ? STTT_BASE : STT_BASE;
}
 
function getBatchBase(): string {
  return `${serverEnv.sarvamSttMode === "translate" ? STTT_BASE : STT_BASE}/job/v1`;
}
 
async function tryRestTranscription(
  audio: Buffer,
  filename: string,
  contentType: string,
): Promise<SarvamResult | null> {
  const form = new FormData();
  const bytes = new Uint8Array(audio);
 
  form.append(
    "file",
    new Blob([bytes], { type: contentType || "application/octet-stream" }),
    filename,
  );
 
  form.append("model", serverEnv.sarvamSttModel);
  form.append("mode", serverEnv.sarvamSttMode);
  form.append("language_code", "unknown");
 
  const res = await fetch(getRestBase(), {
    method: "POST",
    headers: {
      "api-subscription-key": serverEnv.sarvamApiKey,
    },
    body: form,
  });
 
  const text = await res.text();
 
  if (!res.ok) {
    const lowerText = text.toLowerCase();
 
    const shouldFallbackToBatch =
      res.status === 400 ||
      res.status === 422 ||
      lowerText.includes("audio duration exceeds") ||
      lowerText.includes("maximum limit of 30 seconds") ||
      lowerText.includes("batch api") ||
      lowerText.includes("longer audio");
 
    if (shouldFallbackToBatch) {
      console.log(
        `${LOG} REST rejected ${filename}; falling back to batch: ${text.slice(0, 200)}`,
      );
      return null;
    }
 
    throw new Error(`Sarvam REST ${res.status}: ${text.slice(0, 500)}`);
  }
 
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Sarvam REST returned non-JSON: ${text.slice(0, 200)}`);
  }
 
  const parsed = parseSarvamResponse(json);
  console.log(
    `${LOG} REST parsed: transcript=${parsed.transcript.length} chars, turns=${parsed.turns.length}, lang=${parsed.language_code}`,
  );
 
  return parsed;
}
 
interface InitResponse {
  job_id: string;
}
 
async function initJob(): Promise<InitResponse> {
  const body = {
    job_parameters: {
      model: serverEnv.sarvamSttModel,
      mode: serverEnv.sarvamSttMode,
      with_diarization: serverEnv.sarvamEnableDiarization,
      ...(serverEnv.sarvamEnableDiarization && serverEnv.sarvamNumSpeakers
        ? { num_speakers: serverEnv.sarvamNumSpeakers }
        : {}),
    },
  };
 
  const res = await fetch(getBatchBase(), {
    method: "POST",
    headers: {
      "api-subscription-key": serverEnv.sarvamApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
 
  const text = await res.text();
 
  if (!res.ok) {
    throw new Error(`Sarvam batch init ${res.status}: ${text.slice(0, 500)}`);
  }
 
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Sarvam batch init returned non-JSON: ${text.slice(0, 200)}`);
  }
 
  const job_id = stringValue(json.job_id) || stringValue(json.jobId);
 
  if (!job_id) {
    throw new Error(`Sarvam batch init missing job_id: ${text.slice(0, 500)}`);
  }
 
  return { job_id };
}
 
async function uploadAudio(
  jobId: string,
  filename: string,
  audio: Buffer,
  contentType: string,
) {
  const res = await fetch(`${getBatchBase()}/upload-files`, {
    method: "POST",
    headers: {
      "api-subscription-key": serverEnv.sarvamApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job_id: jobId,
      files: [filename],
    }),
  });
 
  const text = await res.text();
 
  if (!res.ok) {
    throw new Error(`Sarvam upload url ${res.status}: ${text.slice(0, 500)}`);
  }
 
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Sarvam upload url returned non-JSON: ${text.slice(0, 200)}`);
  }
 
  const uploadUrl = extractUrlForFile(json.upload_urls, filename);
 
  if (!uploadUrl) {
    throw new Error(`Sarvam upload url missing: ${text.slice(0, 500)}`);
  }
 
  const ab = bufferToArrayBuffer(audio);
 
  const putRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": contentType || "application/octet-stream",
    },
    body: ab,
  });
 
  if (!putRes.ok) {
    const err = await putRes.text().catch(() => "");
    throw new Error(`Sarvam audio upload ${putRes.status}: ${err.slice(0, 500)}`);
  }
}
 
async function startJob(jobId: string) {
  const res = await fetch(`${getBatchBase()}/${jobId}/start`, {
    method: "POST",
    headers: {
      "api-subscription-key": serverEnv.sarvamApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
 
  const text = await res.text();
 
  if (!res.ok) {
    throw new Error(`Sarvam start ${res.status}: ${text.slice(0, 500)}`);
  }
}
 
async function pollJob(jobId: string): Promise<string[]> {
  const startedAt = Date.now();
  let lastState = "";
  let lastBody = "";
 
  while (true) {
    if (Date.now() - startedAt > serverEnv.sarvamJobTimeoutMs) {
      throw new Error(
        `Sarvam job timed out after ${Math.round(
          serverEnv.sarvamJobTimeoutMs / 1000,
        )}s. Last state: ${lastState}. Last response: ${lastBody.slice(0, 500)}`,
      );
    }
 
    const res = await fetch(`${getBatchBase()}/${jobId}/status`, {
      headers: {
        "api-subscription-key": serverEnv.sarvamApiKey,
      },
    });
 
    const text = await res.text();
    lastBody = text;
 
    if (!res.ok) {
      throw new Error(`Sarvam status ${res.status}: ${text.slice(0, 500)}`);
    }
 
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Sarvam status returned non-JSON: ${text.slice(0, 200)}`);
    }
 
    const state =
      stringValue(json.job_state) ||
      stringValue(json.state) ||
      stringValue(json.status) ||
      "";
 
    lastState = state;
    const norm = normalizeState(state);
    const outputFiles = collectOutputFilenames(json);
 
    console.log(
      `${LOG} batch status: ${state || "unknown"}; output files: ${
        outputFiles.length ? outputFiles.join(", ") : "none"
      }`,
    );
 
    if (norm === "completed" || norm === "partiallycompleted") {
      return outputFiles;
    }
 
    if (norm === "failed" || norm === "error" || norm === "cancelled" || norm === "canceled") {
      throw new Error(`Sarvam job failed: ${text.slice(0, 500)}`);
    }
 
    await sleep(serverEnv.sarvamPollIntervalMs);
  }
}
 
async function downloadResult(
  jobId: string,
  outputFiles: string[],
): Promise<Record<string, unknown>> {
  const files = outputFiles.length > 0 ? outputFiles : ["0.json", "output.json", "transcript.json"];
 
  const res = await fetch(`${getBatchBase()}/download-files`, {
    method: "POST",
    headers: {
      "api-subscription-key": serverEnv.sarvamApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      job_id: jobId,
      files,
    }),
  });
 
  const text = await res.text();
 
  if (!res.ok) {
    throw new Error(`Sarvam download url ${res.status}: ${text.slice(0, 500)}`);
  }
 
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Sarvam download url returned non-JSON: ${text.slice(0, 200)}`);
  }
 
  const urls = extractAllUrls(json.download_urls);
 
  if (urls.length === 0) {
    throw new Error(`Sarvam download url missing: ${text.slice(0, 500)}`);
  }
 
  const results: Record<string, unknown>[] = [];
  const textParts: string[] = [];
 
  for (const url of urls) {
    const fileRes = await fetch(url);
    if (!fileRes.ok) {
      console.warn(`${LOG} output download failed ${fileRes.status} for ${trimUrl(url)}`);
      continue;
    }
 
    const fileText = await fileRes.text();
    if (!fileText.trim()) continue;
 
    try {
      results.push(JSON.parse(fileText));
    } catch {
      textParts.push(fileText);
    }
  }
 
  if (results.length === 1) return results[0];
 
  if (results.length > 1) {
    const withTranscript = results.find(hasTranscriptShape);
    const withDia = results.find((r) => "diarized_transcript" in r || "diarization" in r);
 
    if (withTranscript && withDia && withTranscript !== withDia) {
      return { ...withTranscript, ...withDia };
    }
 
    return withTranscript || results[0];
  }
 
  if (textParts.length > 0) {
    return {
      transcript: textParts.join("\n"),
      language_code: null,
    };
  }
 
  throw new Error("Sarvam output file could not be downloaded");
}
 
function extractUrlForFile(value: unknown, filename: string): string | null {
  if (!value) return null;
 
  if (typeof value === "string") return value;
 
  if (Array.isArray(value)) {
    for (const item of value) {
      const url = extractUrlForFile(item, filename);
      if (url) return url;
    }
    return null;
  }
 
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
 
    const exact = obj[filename];
    if (typeof exact === "string") return exact;
 
    for (const key of ["url", "upload_url", "uploadUrl", "signed_url", "signedUrl"]) {
      if (typeof obj[key] === "string") return obj[key] as string;
    }
 
    for (const item of Object.values(obj)) {
      const url = extractUrlForFile(item, filename);
      if (url) return url;
    }
  }
 
  return null;
}
 
function extractAllUrls(value: unknown): string[] {
  const urls: string[] = [];
 
  function walk(v: unknown) {
    if (!v) return;
 
    if (typeof v === "string") {
      if (v.startsWith("http://") || v.startsWith("https://")) urls.push(v);
      return;
    }
 
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
 
    if (typeof v === "object") {
      Object.values(v as Record<string, unknown>).forEach(walk);
    }
  }
 
  walk(value);
  return [...new Set(urls)];
}
 
function collectOutputFilenames(json: Record<string, unknown>): string[] {
  const names = new Set<string>();
 
  function walk(v: unknown) {
    if (!v) return;
 
    if (Array.isArray(v)) {
      v.forEach(walk);
      return;
    }
 
    if (typeof v !== "object") return;
 
    const obj = v as Record<string, unknown>;
 
    const fileName = stringValue(obj.file_name) || stringValue(obj.filename) || stringValue(obj.name);
    if (fileName && /\.(json|txt)$/i.test(fileName)) names.add(fileName);
 
    for (const value of Object.values(obj)) walk(value);
  }
 
  walk(json.job_details);
  walk(json.outputs);
  walk(json.output_files);
  walk(json.files);
 
  return [...names];
}
 
function hasTranscriptShape(input: Record<string, unknown>): boolean {
  if ("transcript" in input || "text" in input || "diarized_transcript" in input) return true;
 
  for (const key of ["output", "result", "data", "response"]) {
    const inner = input[key];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      if (hasTranscriptShape(inner as Record<string, unknown>)) return true;
    }
  }
 
  return false;
}
 
function parseSarvamResponse(input: Record<string, unknown>): SarvamResult {
  const wrappers = ["output", "result", "data", "response"];
  let json: Record<string, unknown> = input;
 
  for (const k of wrappers) {
    const inner = input[k];
    if (inner && typeof inner === "object" && !Array.isArray(inner)) {
      const innerObj = inner as Record<string, unknown>;
      if (hasTranscriptShape(innerObj)) {
        json = innerObj;
        break;
      }
    }
  }
 
  const transcript =
    stringValue(json.transcript) ||
    stringValue(json.text) ||
    stringValue(json.translated_text) ||
    collectTranscriptFromSegments(json);
 
  const language_code =
    stringValue(json.language_code) ||
    stringValue(json.detected_language) ||
    stringValue(json.language) ||
    null;
 
  const turns = extractTurns(json);
 
  return { transcript, language_code, turns, raw: json };
}
 
function extractTurns(json: Record<string, unknown>): SpeakerTurn[] {
  const allEntries: Array<Record<string, unknown>> = [];
 
  function addArray(value: unknown) {
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          allEntries.push(item as Record<string, unknown>);
        }
      }
    }
  }
 
  const dia =
    objectValue(json.diarized_transcript) ||
    objectValue(json.diarization) ||
    objectValue(json.speaker_diarization);
 
  if (dia) {
    addArray(dia.entries);
    addArray(dia.segments);
    addArray(dia.turns);
  }
 
  addArray(json.entries);
  addArray(json.segments);
  addArray(json.turns);
  addArray(json.chunks);
 
  const turns: SpeakerTurn[] = [];
 
  for (const e of allEntries) {
    const t =
      stringValue(e.transcript) ||
      stringValue(e.text) ||
      stringValue(e.translated_text) ||
      stringValue(e.content);
 
    const speaker =
      stringValue(e.speaker_id) ||
      stringValue(e.speaker) ||
      stringValue(e.speaker_label) ||
      "SPEAKER_UNKNOWN";
 
    const start =
      numberValue(e.start_time_seconds) ??
      numberValue(e.start_time) ??
      numberValue(e.start) ??
      0;
 
    const end =
      numberValue(e.end_time_seconds) ??
      numberValue(e.end_time) ??
      numberValue(e.end) ??
      0;
 
    if (t.length > 0) {
      turns.push({
        speaker: normalizeSpeakerId(speaker),
        text: t,
        translated_text: t,
        start: Number(start) || 0,
        end: Number(end) || 0,
      });
    }
  }
 
  return turns;
}
 
function collectTranscriptFromSegments(json: Record<string, unknown>): string {
  const turns = extractTurns(json);
  if (turns.length > 0) {
    return turns.map((t) => t.translated_text || t.text).join("\n");
  }
  return "";
}
 
function normalizeSpeakerId(s: string) {
  const m = s.match(/(\d+)/);
  if (m) return `SPEAKER_${parseInt(m[1], 10)}`;
  return s;
}
 
function normalizeState(state: string): string {
  return state.toLowerCase().replace(/[\s_-]/g, "");
}
 
function objectValue(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}
 
function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
 
function numberValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return null;
}
 
function bufferToArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}
 
function trimUrl(url: string): string {
  const idx = url.indexOf("?");
  return idx === -1 ? url : url.slice(0, idx);
}
 
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
 
export function formatTurnsForPrompt(turns: SpeakerTurn[]): string {
  if (turns.length === 0) return "(diarization unavailable — use full transcript text)";
  return turns.map((t) => `[${t.speaker}] ${t.translated_text || t.text}`).join("\n");
}
 
 
