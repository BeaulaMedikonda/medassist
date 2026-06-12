import Anthropic from "@anthropic-ai/sdk";
import { serverEnv } from "@/lib/env";
import type { Immunization, Patient, Visit } from "@/types/db";

let cachedClient: Anthropic | null = null;
function client() {
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey: serverEnv.anthropicApiKey });
  }
  return cachedClient;
}

// Pre-visit summaries use their own lower-cost model so EMR extraction can
// keep the higher-reasoning default model.

export const SUMMARY_SYSTEM_PROMPT = `You are a pre-visit briefer for an Indian OPD doctor about to see a patient.

You are given:
- Patient's profile (age, sex, allergies, chronic conditions)
- Today's intake from the front desk (vitals, chief complaint)
- Recent immunizations, if any
- The two most recent past visits (date, diagnosis, prescription, follow-up notes)

Output a TERSE markdown brief with these exact four headings, each followed by 1-2 sentences max.

**Patient context** — name, age, sex, key chronic conditions, allergies. State only what's known. If a field is missing, omit it. Do not write phrases like "identity unclear", "not on file", or "unknown" — just leave the missing piece out.
**Today** — flag any vitals out of normal range; include the front-desk chief complaint if recorded. If vitals haven't been captured yet, say "Vitals pending."
**Recent pattern** — what happened in the last 2 visits and what was prescribed. If first visit at this clinic, write "First visit at this clinic."
**Watchpoints** — 2–3 short bullets the doctor should ask about (red-flag follow-ups, response to last therapy, missed follow-up dates). Skip the section entirely if there's nothing concrete to flag.

Rules:
- ≤180 words total. Concise clinical note, not prose. Write as a doctor would write to themselves.
- Highlight abnormal vitals: BP ≥140/90 or ≤90/60, HR <60 or >100, T ≥100°F, SpO₂ <94%.
- Never invent symptoms, diagnoses, or medicines that aren't in the source.
- Use Indian shorthand the doctor will recognize (BD, TDS, HS, etc. as written in the source).
- Never say "patient said" / "the doctor said" / "as stated by". State findings as findings, not as quoted speech.
- No preamble, no closing line, no disclaimers — just the four sections.`;

export type SummaryInput = {
  patient: Patient;
  visit: Visit;
  pastVisits: Visit[];
  immunizations?: Immunization[];
  painMaps?: PainMapBrief[];
};

export type PainMapBrief = {
  pain_type: string | null;
  intensity: number | null;
  pain_locations: string[] | null;
  marked_points: string[] | null;
  pain_summary: string | null;
  created_at: string | null;
};

export type SummaryUsage = {
  input_tokens: number | null;
  output_tokens: number | null;
  cache_creation_input_tokens: number | null;
  cache_read_input_tokens: number | null;
};

export async function generatePreVisitSummary(input: SummaryInput): Promise<{
  summary: string;
  raw: unknown;
  modelUsed: string;
  usage: SummaryUsage;
}> {
  const { patient, visit, pastVisits, immunizations = [], painMaps = [] } = input;

  const userMessage = formatSummaryUserMessage(
    patient,
    visit,
    pastVisits,
    immunizations,
    painMaps,
  );

  const response = await client().messages.create({
    model: serverEnv.anthropicSummaryModel,
    max_tokens: 600,
    temperature: 0.2,
    system: [
      {
        type: "text",
        text: SUMMARY_SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: userMessage }],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text content for summary");
  }
  const u = response.usage as unknown as
    | Record<string, number | null | undefined>
    | undefined;
  return {
    summary: textBlock.text.trim(),
    raw: response,
    modelUsed: serverEnv.anthropicSummaryModel,
    usage: {
      input_tokens: u?.input_tokens ?? null,
      output_tokens: u?.output_tokens ?? null,
      cache_creation_input_tokens: u?.cache_creation_input_tokens ?? null,
      cache_read_input_tokens: u?.cache_read_input_tokens ?? null,
    },
  };
}

function formatSummaryUserMessage(
  patient: Patient,
  visit: Visit,
  pastVisits: Visit[],
  immunizations: Immunization[],
  painMaps: PainMapBrief[],
): string {
  const lines: string[] = [];

  lines.push(`Patient: ${patient.full_name}, ${patient.age ?? "?"}${patient.sex ?? ""}`);
  lines.push(`Allergies: ${patient.known_allergies || "none recorded"}`);
  lines.push(`Chronic conditions: ${patient.chronic_conditions || "none recorded"}`);
  lines.push(
    `Immunizations: ${
      immunizations.length > 0
        ? immunizations.slice(0, 6).map(formatImmunizationLine).join("; ")
        : "none recorded"
    }`,
  );
  lines.push("");

  lines.push("Today's intake:");
  const vitals = [
    visit.bp_systolic && visit.bp_diastolic
      ? `BP ${visit.bp_systolic}/${visit.bp_diastolic} mmHg`
      : null,
    visit.pulse ? `pulse ${visit.pulse} bpm` : null,
    visit.temperature_f ? `temp ${visit.temperature_f}°F` : null,
    visit.spo2 ? `SpO₂ ${visit.spo2}%` : null,
    visit.weight_kg ? `weight ${visit.weight_kg} kg` : null,
  ].filter(Boolean);
  lines.push(`  Vitals: ${vitals.length > 0 ? vitals.join(", ") : "not yet captured"}`);
  if (visit.chief_complaints) {
    lines.push(`  Front-desk note: ${visit.chief_complaints}`);
  }
  if (painMaps.length > 0) {
    lines.push(
      `  Graphic pain map: ${painMaps
        .slice(0, 3)
        .map(formatPainMapLine)
        .join(" | ")}`,
    );
  }
  lines.push("");

  if (pastVisits.length === 0) {
    lines.push("Past visits: none on file at this clinic.");
  } else {
    lines.push(`Past visits (most recent first, ${pastVisits.length} shown):`);
    for (const pv of pastVisits) {
      const date = pv.visit_date.slice(0, 10);
      const dx = pv.confirmed_diagnosis || pv.provisional_diagnosis || "(no dx recorded)";
      lines.push(`- ${date}: ${dx}`);
      if (pv.examination_findings) {
        lines.push(`  O/E: ${pv.examination_findings}`);
      }
      const meds = pv.prescription?.medicines || [];
      const activeMeds = meds.filter((m) => m.status !== "stopped");
      if (activeMeds.length > 0) {
        lines.push(
          `  Rx: ${activeMeds
            .map((m) => `${m.name}${m.dose ? " " + m.dose : ""}${m.frequency ? " " + m.frequency : ""}${m.duration ? " × " + m.duration : ""}`)
            .join("; ")}`,
        );
      }
      if (pv.advice) lines.push(`  Advice: ${pv.advice}`);
      if (pv.follow_up_date) {
        lines.push(`  Follow-up due: ${pv.follow_up_date}${pv.follow_up_notes ? " — " + pv.follow_up_notes : ""}`);
      }
    }
  }

  lines.push("");
  lines.push(
    "Generate the four-section markdown brief now. No preamble.",
  );

  return lines.join("\n");
}

function formatPainMapLine(record: PainMapBrief) {
  const summary =
    record.pain_summary ||
    record.marked_points?.filter(Boolean).join("; ") ||
    record.pain_locations?.filter(Boolean).join(", ") ||
    "pain marked";
  const painType = record.pain_type ? `${record.pain_type} pain` : null;
  const intensity =
    typeof record.intensity === "number" ? `intensity ${record.intensity}/10` : null;

  return [summary, painType, intensity].filter(Boolean).join(" - ");
}

function formatImmunizationLine(record: Immunization) {
  return [
    record.vaccine_name,
    record.cvx_code ? `CVX ${record.cvx_code}` : null,
    record.dose,
    `given ${record.date_given.slice(0, 10)}`,
    record.next_due_date ? `next due ${record.next_due_date.slice(0, 10)}` : null,
    record.status !== "completed" ? `status ${record.status}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}
