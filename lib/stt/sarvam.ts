//lib/stt/sarvam.ts
import { serverEnv } from "@/lib/env";
import type { SpeakerTurn } from "@/types/db";

// Sarvam Batch API for Speech-to-Text-Translate (with diarization).
// Sync `/speech-to-text-translate` does NOT support diarization — only this batch flow does.
//
// Flow:
//   1) POST /speech-to-text-translate/job/init           -> { job_id, input_storage_path, output_storage_path }
//   2) PUT  {input_storage_path}/<filename>              -> upload audio (Azure Blob via SAS URL)
//   3) POST /speech-to-text-translate/job                -> start job with parameters
//   4) GET  /speech-to-text-translate/job/{id}/status    -> poll until Completed
//   5) GET  {output_storage_path}/<filename>.json        -> download translated, diarized transcript
//
// Notes / gotchas:
// - The output container can be a SAS URL pointing at a sub-prefix below the
//   container (e.g. `https://acct.blob.core.windows.net/jobs/<id>/output?...`).
//   To list its contents we have to compute the *container-only* URL and use
//   the `prefix=` parameter. Listing the URL as-is returns nothing.
// - After the job's status flips to "completed", there can be a 1–3 second lag
//   before the JSON is actually readable. We retry the download a few times.
// - The output may be one or several JSON files (transcript / diarization /
//   metadata). We try each and merge the one that has a `transcript` field.

const BASE = "https://api.sarvam.ai/speech-to-text-translate";
const REST_BASE = "https://api.sarvam.ai/speech-to-text";
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

  const restResult = await tryRestTranscription(audio, safeName, contentType);
  if (restResult) return restResult;

  const init = await initJob();
  console.log(`${LOG} init ok job_id=${init.job_id}`);

  await uploadAudio(init.input_storage_path, safeName, audio, contentType);
  console.log(`${LOG} uploaded ${safeName} (${audio.byteLength} bytes)`);

  await startJob(init.job_id);
  console.log(`${LOG} job started`);

  await pollJob(init.job_id);
  console.log(`${LOG} job complete, fetching output`);

  const result = await downloadResult(init.output_storage_path, safeName);

  const parsed = parseSarvamResponse(result);

  // Sanity check: throw only if the response structure is unexpected (no known
  // transcript key at all). An empty transcript just means no speech was detected.
  const hasKnownShape =
    "transcript" in result || "text" in result || "diarized_transcript" in result;
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

async function tryRestTranscription(
  audio: Buffer,
  filename: string,
  contentType: string,
): Promise<SarvamResult | null> {
  const form = new FormData();
  const bytes = new Uint8Array(audio);
  form.append("file", new Blob([bytes], { type: contentType || "application/octet-stream" }), filename);
  form.append("model", serverEnv.sarvamSttModel);
  form.append("mode", serverEnv.sarvamSttMode);
  form.append("language_code", "unknown");

  const res = await fetch(REST_BASE, {
    method: "POST",
    headers: {
      "api-subscription-key": serverEnv.sarvamApiKey,
    },
    body: form,
  });
  const text = await res.text();
  if (!res.ok) {
    if (res.status === 422) {
      console.log(`${LOG} REST rejected ${filename}; falling back to batch: ${text.slice(0, 200)}`);
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
  input_storage_path: string;
  output_storage_path: string;
}

async function initJob(): Promise<InitResponse> {
  const res = await fetch(`${BASE}/job/init`, {
    method: "POST",
    headers: {
      "api-subscription-key": serverEnv.sarvamApiKey,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Sarvam init ${res.status}: ${text.slice(0, 500)}`);
  }
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Sarvam init returned non-JSON: ${text.slice(0, 200)}`);
  }
  const job_id = (json.job_id as string) || (json.jobId as string) || "";
  const input_storage_path =
    (json.input_storage_path as string) || (json.inputStoragePath as string) || "";
  const output_storage_path =
    (json.output_storage_path as string) || (json.outputStoragePath as string) || "";
  if (!job_id || !input_storage_path || !output_storage_path) {
    throw new Error(`Sarvam init missing fields: ${text.slice(0, 200)}`);
  }
  return { job_id, input_storage_path, output_storage_path };
}

async function uploadAudio(
  containerSasUrl: string,
  filename: string,
  audio: Buffer,
  contentType: string,
) {
  const target = appendPathToSas(containerSasUrl, filename);
  const ab = new ArrayBuffer(audio.byteLength);
  new Uint8Array(ab).set(audio);

  const res = await fetch(target, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": contentType || "application/octet-stream",
    },
    body: ab,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sarvam audio upload ${res.status}: ${text.slice(0, 300)}`);
  }
}

async function startJob(jobId: string) {
  const body = {
    job_id: jobId,
    job_parameters: {
      model: serverEnv.sarvamSttModel,
      mode: serverEnv.sarvamSttMode,
      with_diarization: serverEnv.sarvamEnableDiarization,
      ...(serverEnv.sarvamEnableDiarization && {
        num_speakers: serverEnv.sarvamNumSpeakers,
      }),
    },
  };

  const res = await fetch(`${BASE}/job`, {
    method: "POST",
    headers: {
      "api-subscription-key": serverEnv.sarvamApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Sarvam start ${res.status}: ${text.slice(0, 500)}`);
  }
}

async function pollJob(jobId: string) {
  const startedAt = Date.now();
  let lastState = "";
  while (true) {
    if (Date.now() - startedAt > serverEnv.sarvamJobTimeoutMs) {
      throw new Error(
        `Sarvam job timed out after ${Math.round(serverEnv.sarvamJobTimeoutMs / 1000)}s (last state: ${lastState})`,
      );
    }
    const res = await fetch(`${BASE}/job/${jobId}/status`, {
      headers: { "api-subscription-key": serverEnv.sarvamApiKey },
    });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Sarvam status ${res.status}: ${text.slice(0, 300)}`);
    }
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Sarvam status returned non-JSON: ${text.slice(0, 200)}`);
    }
    const state =
      (json.job_state as string) ||
      (json.state as string) ||
      (json.status as string) ||
      "";
    lastState = state;
    const norm = state.toLowerCase();
    if (
      norm === "completed" ||
      norm === "succeeded" ||
      norm === "successful" ||
      norm === "success" ||
      norm === "done"
    ) {
      return;
    }
    if (norm === "failed" || norm === "error" || norm === "cancelled") {
      throw new Error(`Sarvam job ${state}: ${text.slice(0, 500)}`);
    }
    await sleep(serverEnv.sarvamPollIntervalMs);
  }
}

async function downloadResult(
  outputContainerSasUrl: string,
  inputFilename: string,
): Promise<Record<string, unknown>> {
  // After status=completed there can be a small lag before files appear.
  // Try a few rounds with a short delay between.
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt > 0) {
      await sleep(2000);
      console.log(`${LOG} download attempt ${attempt + 1}`);
    }

    // (a) Direct fetch using common filename patterns derived from input.
    const direct = await tryKnownFilenames(outputContainerSasUrl, inputFilename);
    if (direct) return direct;

    // (b) List the container/prefix and try every JSON file we find.
    const listed = await listContainer(outputContainerSasUrl);
    if (listed.length > 0) {
      console.log(`${LOG} listed ${listed.length} file(s):`, listed);
    }
    const merged = await fetchAndMergeJson(outputContainerSasUrl, listed);
    if (merged) return merged;

    // Last resort on this attempt: also try fetching .txt outputs as a transcript.
    const txt = await tryTextFallback(outputContainerSasUrl, listed, inputFilename);
    if (txt) return txt;
  }

  // Diagnostics for the error so we can debug exactly what went wrong.
  const finalListed = await listContainer(outputContainerSasUrl);
  throw new Error(
    `Sarvam output not found at ${trimSas(outputContainerSasUrl)}. ` +
      `Container listing: ${JSON.stringify(finalListed.slice(0, 30))}`,
  );
}

async function tryKnownFilenames(
  outputContainerSasUrl: string,
  inputFilename: string,
): Promise<Record<string, unknown> | null> {
  const base = inputFilename.replace(/\.[^.]+$/, "");
  const candidates = [
    `${base}.json`,
    `${inputFilename}.json`,
    `${base}_transcript.json`,
    `${base}-transcript.json`,
    "transcript.json",
    "output.json",
  ];
  for (const name of candidates) {
    const url = appendPathToSas(outputContainerSasUrl, name);
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        console.log(`${LOG} fetched ${name} (direct)`);
        return json;
      } catch {
        // not JSON, try next
      }
    }
  }
  return null;
}

async function fetchAndMergeJson(
  outputContainerSasUrl: string,
  listed: string[],
): Promise<Record<string, unknown> | null> {
  const jsons: Array<{ name: string; data: Record<string, unknown> }> = [];
  for (const name of listed) {
    if (!name.toLowerCase().endsWith(".json")) continue;
    const url = appendPathToSas(outputContainerSasUrl, name);
    const res = await fetch(url);
    if (!res.ok) continue;
    const text = await res.text();
    try {
      jsons.push({ name, data: JSON.parse(text) });
    } catch {
      // skip
    }
  }
  if (jsons.length === 0) return null;
  console.log(
    `${LOG} fetched ${jsons.length} JSON file(s):`,
    jsons.map((j) => j.name),
  );

  // Prefer the file that has a transcript field. If multiple, shallow-merge them
  // so a separate diarization file can fill in the diarized_transcript field.
  const withTranscript = jsons.find(
    (j) => "transcript" in j.data || "text" in j.data,
  );
  const withDia = jsons.find((j) => "diarized_transcript" in j.data);

  if (withTranscript && withDia && withTranscript !== withDia) {
    return { ...withTranscript.data, ...withDia.data };
  }
  if (withTranscript) return withTranscript.data;
  // Otherwise return the largest object (most likely to be the transcript bundle).
  jsons.sort((a, b) => JSON.stringify(b.data).length - JSON.stringify(a.data).length);
  return jsons[0].data;
}

async function tryTextFallback(
  outputContainerSasUrl: string,
  listed: string[],
  inputFilename: string,
): Promise<Record<string, unknown> | null> {
  const base = inputFilename.replace(/\.[^.]+$/, "");
  const candidates = listed.filter((n) => n.toLowerCase().endsWith(".txt"));
  if (candidates.length === 0) {
    const guess = `${base}.txt`;
    candidates.push(guess);
  }
  for (const name of candidates) {
    const url = appendPathToSas(outputContainerSasUrl, name);
    const res = await fetch(url);
    if (res.ok) {
      const text = await res.text();
      if (text.trim().length > 0) {
        console.log(`${LOG} fell back to text file ${name}`);
        return { transcript: text, language_code: null };
      }
    }
  }
  return null;
}

async function listContainer(containerSasUrl: string): Promise<string[]> {
  const idx = containerSasUrl.indexOf("?");
  if (idx === -1) return [];
  const base = containerSasUrl.slice(0, idx);
  const query = containerSasUrl.slice(idx);

  // Detect if URL is at container root (host/container) or has a subpath
  // (host/container/sub/path/...). For listing, Azure expects:
  //   GET https://host/container?{query}&restype=container&comp=list[&prefix=...]
  // — i.e. URL must be the *container*, and any path component must move into
  // the prefix= parameter.
  const m = base.match(/^(https?:\/\/[^/]+\/[^/?]+)(?:\/(.*))?$/);
  if (!m) return [];
  const containerOnly = m[1];
  const prefix = m[2] ? m[2].replace(/\/+$/, "") + "/" : "";

  const listUrl =
    `${containerOnly}${query}&restype=container&comp=list` +
    (prefix ? `&prefix=${encodeURIComponent(prefix)}` : "");

  const res = await fetch(listUrl);
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.warn(
      `${LOG} list ${res.status} on ${trimSas(listUrl)} — ${errBody.slice(0, 200)}`,
    );
    return [];
  }
  const xml = await res.text();
  const names: string[] = [];
  const re = /<Name>([^<]+)<\/Name>/g;
  let mm: RegExpExecArray | null;
  while ((mm = re.exec(xml)) !== null) {
    const fullName = mm[1];
    // Return name relative to the prefix so appendPathToSas works correctly.
    if (prefix && fullName.startsWith(prefix)) {
      names.push(fullName.slice(prefix.length));
    } else {
      names.push(fullName);
    }
  }
  return names;
}

function appendPathToSas(sasUrl: string, path: string): string {
  const idx = sasUrl.indexOf("?");
  if (idx === -1) return `${sasUrl.replace(/\/$/, "")}/${path}`;
  const base = sasUrl.slice(0, idx).replace(/\/$/, "");
  const query = sasUrl.slice(idx);
  return `${base}/${path}${query}`;
}

function trimSas(url: string): string {
  // Drop the SAS query string for log-safe display.
  const idx = url.indexOf("?");
  return idx === -1 ? url : url.slice(0, idx);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function parseSarvamResponse(input: Record<string, unknown>): SarvamResult {
  // Unwrap one level if the payload is nested under a common envelope key.
  const wrappers = ["output", "result", "data", "response"];
  let json: Record<string, unknown> = input;
  for (const k of wrappers) {
    const inner = input[k];
    if (
      inner &&
      typeof inner === "object" &&
      !Array.isArray(inner) &&
      ("transcript" in inner || "diarized_transcript" in inner || "text" in inner)
    ) {
      json = inner as Record<string, unknown>;
      break;
    }
  }

  const transcript =
    (typeof json.transcript === "string" && json.transcript) ||
    (typeof json.text === "string" && json.text) ||
    "";
  const language_code =
    (typeof json.language_code === "string" && json.language_code) ||
    (typeof json.detected_language === "string" && json.detected_language) ||
    null;

  // Diarized turns can show up under several possible keys.
  const dia =
    (json.diarized_transcript as
      | { entries?: Array<Record<string, unknown>>; segments?: Array<Record<string, unknown>> }
      | undefined) ||
    (json.diarization as
      | { entries?: Array<Record<string, unknown>>; segments?: Array<Record<string, unknown>> }
      | undefined) ||
    undefined;

  const directEntries = (json.entries as Array<Record<string, unknown>> | undefined) || [];
  const directSegments = (json.segments as Array<Record<string, unknown>> | undefined) || [];

  const allEntries: Array<Record<string, unknown>> = [];
  if (Array.isArray(dia?.entries)) allEntries.push(...(dia!.entries || []));
  if (Array.isArray(dia?.segments)) allEntries.push(...(dia!.segments || []));
  if (Array.isArray(directEntries)) allEntries.push(...directEntries);
  if (Array.isArray(directSegments)) allEntries.push(...directSegments);

  const turns: SpeakerTurn[] = [];
  for (const e of allEntries) {
    const t = (e.transcript ?? e.text ?? e.translated_text) as string | undefined;
    const speaker =
      (e.speaker_id as string | undefined) ||
      (e.speaker as string | undefined) ||
      "SPEAKER_UNKNOWN";
    const start =
      (e.start_time_seconds as number | undefined) ??
      (e.start as number | undefined) ??
      0;
    const end =
      (e.end_time_seconds as number | undefined) ??
      (e.end as number | undefined) ??
      0;
    if (typeof t === "string" && t.length > 0) {
      turns.push({
        speaker: normalizeSpeakerId(speaker),
        text: t,
        translated_text: t,
        start: Number(start) || 0,
        end: Number(end) || 0,
      });
    }
  }

  return { transcript, language_code, turns, raw: json };
}

function normalizeSpeakerId(s: string) {
  // Keep 0-based index: SPEAKER_00 → SPEAKER_0, SPEAKER_01 → SPEAKER_1, etc.
  // Do NOT add 1 — the extraction prompt receives these labels and must match exactly.
  const m = s.match(/(\d+)/);
  if (m) return `SPEAKER_${parseInt(m[1], 10)}`;
  return s;
}
export function formatTurnsForPrompt(turns: SpeakerTurn[]): string {
  if (turns.length === 0) return "(diarization unavailable — use full transcript text)";
  return turns
    .map((t) => `[${t.speaker}] ${t.translated_text || t.text}`)
    .join("\n");
}
