import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";
import { EXTRACTION_SYSTEM_PROMPT, buildUserMessage } from "./prompts";
import type {
  ExtractionResult,
  FieldAssumption,
  Visit,
  Patient,
  SpeakerTurn,
} from "@/types/db";
import { formatTurnsForPrompt } from "@/lib/stt/sarvam";

let cachedClient: Anthropic | null = null;
function client() {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: serverEnv.anthropicApiKey });
  }
  return cachedClient;
}

export type ClaudeCallUsage = {
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
};

export async function extractEmrFromVisit(args: {
  patient: Patient;
  visit: Visit;
  previousVisit: Visit | null;
}): Promise<{
  result: ExtractionResult;
  modelUsed: string;
  raw: unknown;
  usage: ClaudeCallUsage;
}> {
  const { patient, visit, previousVisit } = args;

  const turns = (visit.transcript_speakers || []) as SpeakerTurn[];
  const diarizationAvailable = turns.length > 0;
  const userMessage = buildUserMessage({
    patientName: patient.full_name,
    patientAge: patient.age,
    patientSex: patient.sex,
    knownAllergies: patient.known_allergies,
    chronicConditions: patient.chronic_conditions,
    previousPrescription: previousVisit?.prescription || null,
    previousVisitDate: previousVisit?.visit_date || null,
    diarizedTranscript: formatTurnsForPrompt(turns),
    fullTranscript: visit.transcript_text || "",
    diarizationAvailable,
    intakeVitals: {
      bp_systolic: visit.bp_systolic,
      bp_diastolic: visit.bp_diastolic,
      pulse: visit.pulse,
      temperature_f: visit.temperature_f,
      spo2: visit.spo2,
      weight_kg: visit.weight_kg,
    },
  });

  const primary = await callClaude({
    model: serverEnv.anthropicDefaultModel,
    system: EXTRACTION_SYSTEM_PROMPT,
    user: userMessage,
  });

  if (
    primary.parsed.extraction_confidence === "low" ||
    (primary.parsed.ambiguities?.length ?? 0) > 3
  ) {
    if (
      serverEnv.anthropicFallbackModel &&
      serverEnv.anthropicFallbackModel !== serverEnv.anthropicDefaultModel
    ) {
      try {
        const fb = await callClaude({
          model: serverEnv.anthropicFallbackModel,
          system: EXTRACTION_SYSTEM_PROMPT,
          user: userMessage,
        });
        return {
          result: fb.parsed,
          modelUsed: serverEnv.anthropicFallbackModel,
          raw: fb.raw,
          usage: fb.usage,
        };
      } catch {
        // fall through to primary on fallback failure
      }
    }
  }

  return {
    result: primary.parsed,
    modelUsed: serverEnv.anthropicDefaultModel,
    raw: primary.raw,
    usage: primary.usage,
  };
}

async function callClaude(args: {
  model: string;
  system: string;
  user: string;
}): Promise<{ parsed: ExtractionResult; raw: unknown; usage: ClaudeCallUsage }> {
  const response = await client().messages.create({
    model: args.model,
    max_tokens: serverEnv.anthropicMaxTokens,
    temperature: serverEnv.anthropicTemperature,
    system: [
      {
        type: "text",
        text: args.system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: args.user }],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content");
  }
  const parsed = parseJsonStrict(textBlock.text);
  const u = response.usage as unknown as
    | Record<string, number | null | undefined>
    | undefined;
  const usage: ClaudeCallUsage = {
    input_tokens: u?.input_tokens ?? null,
    output_tokens: u?.output_tokens ?? null,
    cache_creation_input_tokens: u?.cache_creation_input_tokens ?? null,
    cache_read_input_tokens: u?.cache_read_input_tokens ?? null,
  };
  return { parsed: normalizeResult(parsed), raw: response, usage };
}

function parseJsonStrict(s: string): Record<string, unknown> {
  const trimmed = s.trim();
  // tolerate ```json fenced output
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1].trim() : trimmed;
  // tolerate leading prose by extracting first {...}
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1 || last < first) {
    throw new Error("Claude output did not contain a JSON object");
  }
  const sliced = candidate.slice(first, last + 1);
  try {
    return JSON.parse(sliced) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      `Claude output was not valid JSON: ${(err as Error).message}`,
    );
  }
}

function normalizeResult(obj: Record<string, unknown>): ExtractionResult {
  const v = (obj.vitals as Record<string, unknown>) || {};
  const rx = (obj.prescription as Record<string, unknown>) || {};
  const medicines = Array.isArray(rx.medicines) ? (rx.medicines as Record<string, unknown>[]) : [];
  const assumptionsRaw = (obj.field_assumptions as Record<string, unknown>) || {};

  // Hard rule: prescription, advice, vitals are NEVER "assumed" — they're either
  // stated by the doctor or empty. Even if the model returns "assumed" for them,
  // downgrade to null so the UI does not paint them yellow.
  const neverAssumed = (key: string): FieldAssumption => {
    const raw = coerceAssumption(assumptionsRaw[key]);
    return raw === "stated" ? "stated" : null;
  };

  return {
    doctor_speaker_id: (obj.doctor_speaker_id as string) || null,
    doctor_id_confidence:
      coerceConfidence(obj.doctor_id_confidence) || "medium",
    speaker_role_notes: (obj.speaker_role_notes as string) || null,
    vitals: {
      bp_systolic: numOrNull(v.bp_systolic),
      bp_diastolic: numOrNull(v.bp_diastolic),
      pulse: numOrNull(v.pulse),
      temperature_f: numOrNull(v.temperature_f),
      spo2: numOrNull(v.spo2),
      weight_kg: numOrNull(v.weight_kg),
    },
    chief_complaints: strOrNull(obj.chief_complaints),
    history_present_illness: strOrNull(obj.history_present_illness),
    examination_findings: strOrNull(obj.examination_findings),
    provisional_diagnosis: strOrNull(obj.provisional_diagnosis),
    confirmed_diagnosis: strOrNull(obj.confirmed_diagnosis),
    investigations_ordered: strOrNull(obj.investigations_ordered),
    icd_codes: [],
    icd_code_details: [],
    loinc_code_details: [],
    prescription: {
      medicines: medicines.map((m) => ({
        name: (m.name as string) || "",
        dose: strOrNull(m.dose),
        frequency: strOrNull(m.frequency),
        duration: strOrNull(m.duration),
        route: strOrNull(m.route),
        instructions: strOrNull(m.instructions),
        status: coerceStatus(m.status) || "new",
      })),
    },
    advice: strOrNull(obj.advice),
    follow_up_days: numOrNull(obj.follow_up_days),
    follow_up_notes: strOrNull(obj.follow_up_notes),
    field_assumptions: {
      chief_complaints: coerceAssumption(assumptionsRaw.chief_complaints),
      history_present_illness: coerceAssumption(assumptionsRaw.history_present_illness),
      examination_findings: coerceAssumption(assumptionsRaw.examination_findings),
      provisional_diagnosis: coerceAssumption(assumptionsRaw.provisional_diagnosis),
      confirmed_diagnosis: coerceAssumption(assumptionsRaw.confirmed_diagnosis),
      investigations_ordered: coerceAssumption(assumptionsRaw.investigations_ordered),
      icd_codes: null,
      vitals: neverAssumed("vitals"),
      advice: neverAssumed("advice"),
      prescription: neverAssumed("prescription"),
      follow_up_notes: coerceAssumption(assumptionsRaw.follow_up_notes),
    },
    extraction_confidence: coerceConfidence(obj.extraction_confidence) || "medium",
    ambiguities: Array.isArray(obj.ambiguities)
      ? (obj.ambiguities as unknown[]).map(String).filter(Boolean)
      : [],
    speaker_roles: (obj.speaker_roles as Record<string, string>) ?? {},
  };
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function strOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length === 0 ? null : s;
}
function coerceConfidence(v: unknown): "high" | "medium" | "low" | null {
  if (v === "high" || v === "medium" || v === "low") return v;
  return null;
}
function coerceStatus(v: unknown): "new" | "continued" | "modified" | "stopped" | null {
  if (v === "new" || v === "continued" || v === "modified" || v === "stopped") return v;
  return null;
}
function coerceAssumption(v: unknown): FieldAssumption {
  if (v === "stated" || v === "assumed") return v;
  return null;
}
