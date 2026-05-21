/**
 * lib/stt/whisper.ts
 *
 * Local Whisper service client.
 * Only used when WHISPER_SERVICE_URL is explicitly set in the environment.
 * If the env var is absent, transcribeWithWhisper() throws immediately
 * instead of trying to connect to a hardcoded localhost address.
 */

import type { SpeakerTurn } from "@/types/db";
import http from "http";
import https from "https";

// No hardcoded fallback — if the var is absent the service is disabled.
const WHISPER_SERVICE_URL = (process.env.WHISPER_SERVICE_URL ?? "").replace(/\/$/, "");
const WHISPER_TIMEOUT_MS  = Number(process.env.WHISPER_TIMEOUT_MS ?? 900_000);

export type TranscribeResult = {
  transcript: string;
  language_code: string;
  turns: SpeakerTurn[];
};

type ServiceResponse = {
  transcript: string;
  language_code: string;
  turns: Array<{ speaker: string; text: string; start: number; end: number }>;
};

/**
 * Post audio to the local Whisper service using Node's native http module.
 * Avoids the Windows fetch() connection-reset bug on long-running requests.
 *
 * Throws immediately if WHISPER_SERVICE_URL is not configured — use
 * transcribeWithSarvam() (lib/stt/sarvam.ts) instead when running without
 * the local GPU service.
 */
export async function transcribeWithWhisper(
  audioBuf: Buffer,
  filename: string,
  contentType: string,
  languageHint?: string,
): Promise<TranscribeResult> {
  // Fail fast — do not attempt a connection to an unconfigured service.
  if (!WHISPER_SERVICE_URL) {
    throw new Error(
      "Whisper service is not configured. " +
      "Set WHISPER_SERVICE_URL in your .env to enable it, " +
      "or use transcribeWithSarvam() from lib/stt/sarvam.ts instead."
    );
  }

  const url = new URL(`${WHISPER_SERVICE_URL}/transcribe`);

  // Build multipart/form-data manually
  const boundary = `----WhisperBoundary${Date.now()}`;
  const parts: Buffer[] = [];

  // file field
  parts.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`
  ));
  parts.push(audioBuf);
  parts.push(Buffer.from("\r\n"));

  // optional language field
  if (languageHint) {
    parts.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="language"\r\n\r\n` +
      `${languageHint}\r\n`
    ));
  }

  parts.push(Buffer.from(`--${boundary}--\r\n`));
  const body = Buffer.concat(parts);

  const data = await new Promise<ServiceResponse>((resolve, reject) => {
    const transport = url.protocol === "https:" ? https : http;
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length,
          "Connection": "keep-alive",
        },
        timeout: WHISPER_TIMEOUT_MS,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          if (res.statusCode !== 200) {
            reject(new Error(`Whisper service returned HTTP ${res.statusCode}: ${raw}`));
            return;
          }
          try {
            resolve(JSON.parse(raw) as ServiceResponse);
          } catch {
            reject(new Error(`Whisper service returned invalid JSON: ${raw.slice(0, 200)}`));
          }
        });
      },
    );

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Whisper service timed out after ${WHISPER_TIMEOUT_MS}ms`));
    });

    req.on("error", (err) => {
      reject(new Error(
        `Whisper service unreachable at ${url.origin}: ${err.message}. ` +
        "Ensure the local-whisper-cpu service is running (python main.py)."
      ));
    });

    req.write(body);
    req.end();
  });

  if (!data.transcript || !Array.isArray(data.turns)) {
    throw new Error("Whisper service response missing transcript or turns");
  }

  const turns: SpeakerTurn[] = data.turns.map((t) => ({
    speaker: t.speaker,
    text: t.text,
    start: t.start,
    end: t.end,
  }));

  return { transcript: data.transcript, language_code: data.language_code, turns };
}

export function formatTurnsForPrompt(turns: SpeakerTurn[]): string {
  return turns
    .map((t) => `[${t.speaker}] ${(t.translated_text ?? t.text).trim()}`)
    .join("\n");
}

// ─── REMOVED ──────────────────────────────────────────────────────────────────
// The old alias below was the root cause of "Whisper service unreachable" errors
// when running Sarvam-only:
//
//   export const transcribeWithSarvam = transcribeWithWhisper  ← WRONG
//
// transcribeWithSarvam now lives in lib/stt/sarvam.ts and calls the Sarvam API.
// Any file that was importing transcribeWithSarvam from here must be updated to:
//
//   import { transcribeWithSarvam } from "@/lib/stt/sarvam";
// ──────────────────────────────────────────────────────────────────────────────