import { supabaseAdmin } from "@/lib/supabase/admin";

// =============================================================================
// API usage / cost tracking
// =============================================================================
// Pricing constants are INR per 1,000,000 tokens (Claude) or per second
// (Sarvam). Update these whenever the provider changes prices — old rows are
// preserved at the price they were billed at.
//
// Claude USD → INR conversion: ~₹85 per USD (2026-05).
// Anthropic USD prices: https://docs.anthropic.com/en/docs/about-claude/pricing
// Sarvam pricing: ₹45 per hour = ₹45/3600 per second.
// =============================================================================

export const PRICING = {
  // Claude Haiku 4.5 — $1/$5 per MTok input/output → INR at ₹85/USD.
  claude_haiku_4_5: {
    input_per_mtok: 85.0,
    output_per_mtok: 425.0,
    cache_create_per_mtok: 106.25,
    cache_read_per_mtok: 8.5,
  },
  // Claude Sonnet 4.6 — $3/$15 per MTok input/output → INR at ₹85/USD.
  claude_sonnet_4_6: {
    input_per_mtok: 255.0,
    output_per_mtok: 1275.0,
    cache_create_per_mtok: 318.75,
    cache_read_per_mtok: 25.5,
  },
  // Claude Opus 4.7 — $15/$75 per MTok input/output → INR at ₹85/USD.
  claude_opus_4_7: {
    input_per_mtok: 1275.0,
    output_per_mtok: 6375.0,
    cache_create_per_mtok: 1593.75,
    cache_read_per_mtok: 127.5,
  },
  // Sarvam Saaras v3 — ₹45/hour = ₹0.0125/second.
  sarvam_stt: {
    per_second_inr: 45 / 3600,
  },
} as const;

export type Service = keyof typeof PRICING;

/**
 * Map a model id string returned by the SDK to one of our service codes.
 * Returns null for unknown models so we don't accidentally mis-bill.
 */
export function modelToService(model: string): Service | null {
  const m = model.toLowerCase();
  if (m.includes("haiku-4-5") || m.includes("haiku-4.5")) return "claude_haiku_4_5";
  if (m.includes("sonnet-4-6") || m.includes("sonnet-4.6")) return "claude_sonnet_4_6";
  if (m.includes("opus-4-7") || m.includes("opus-4.7")) return "claude_opus_4_7";
  return null;
}

type ClaudeUsage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};

/** Compute INR cost for a Claude call from token counts. */
export function computeClaudeCost(service: Service, usage: ClaudeUsage): number {
  if (service === "sarvam_stt") return 0;
  const p = PRICING[service];
  if (!("input_per_mtok" in p)) return 0;
  const input = (usage.input_tokens || 0) * p.input_per_mtok;
  const output = (usage.output_tokens || 0) * p.output_per_mtok;
  const cacheCreate = (usage.cache_creation_input_tokens || 0) * p.cache_create_per_mtok;
  const cacheRead = (usage.cache_read_input_tokens || 0) * p.cache_read_per_mtok;
  return (input + output + cacheCreate + cacheRead) / 1_000_000;
}

/** Compute INR cost for a Sarvam STT call from audio duration in seconds. */
export function computeSarvamCost(audioSeconds: number): number {
  return audioSeconds * PRICING.sarvam_stt.per_second_inr;
}

// -----------------------------------------------------------------------------
// recordUsage — single entry point used by every API route. Always async,
// wrapped in try/catch by callers because we never want billing logging to
// fail an actual user-facing request.
// -----------------------------------------------------------------------------

export type RecordUsageInput = {
  clinicId: string;
  userId?: string | null;
  visitId?: string | null;
  operation: string;
  metadata?: Record<string, unknown> | null;
} & (
  | {
      service: Exclude<Service, "sarvam_stt">;
      claudeUsage: ClaudeUsage;
      audioDurationSeconds?: never;
    }
  | {
      service: "sarvam_stt";
      audioDurationSeconds: number;
      claudeUsage?: never;
    }
);

export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const admin = supabaseAdmin();
  const cost =
    input.service === "sarvam_stt"
      ? computeSarvamCost(input.audioDurationSeconds)
      : computeClaudeCost(input.service, input.claudeUsage);

  const row = {
    clinic_id: input.clinicId,
    user_id: input.userId ?? null,
    visit_id: input.visitId ?? null,
    service: input.service,
    operation: input.operation,
    audio_duration_seconds:
      input.service === "sarvam_stt" ? input.audioDurationSeconds : null,
    input_tokens: input.service !== "sarvam_stt" ? input.claudeUsage.input_tokens ?? null : null,
    output_tokens: input.service !== "sarvam_stt" ? input.claudeUsage.output_tokens ?? null : null,
    cache_creation_input_tokens:
      input.service !== "sarvam_stt"
        ? input.claudeUsage.cache_creation_input_tokens ?? null
        : null,
    cache_read_input_tokens:
      input.service !== "sarvam_stt"
        ? input.claudeUsage.cache_read_input_tokens ?? null
        : null,
    cost_inr: Number(cost.toFixed(4)),
    metadata: input.metadata ?? null,
  };

  const { error } = await admin.from("api_usage_events").insert(row as never);
  if (error) {
    // Log but don't throw — billing telemetry must never break the request.
    console.error("[usage] failed to record", error.message);
  }
}
