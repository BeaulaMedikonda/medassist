/**
 * Verify the Supabase schema matches what our migrations declare.
 *
 * Hits the PostgREST OpenAPI document (no DB driver needed) to enumerate
 * every public table/view and its columns, then compares against the
 * expected set the app code depends on. Reports missing tables, missing
 * columns, and extras.
 *
 * Run: npx tsx scripts/check-supabase.ts
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

// ---- minimal .env loader (no extra deps) ----------------------------------
function loadEnv(file: string): Record<string, string> {
  if (!existsSync(file)) return {};
  const out: Record<string, string> = {};
  const lines = readFileSync(file, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const root = resolve(__dirname, "..");
const env = { ...loadEnv(resolve(root, ".env.local")), ...loadEnv(resolve(root, ".env")) };
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY =
  env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(2);
}

// ---- expected schema (what migrations should have created) ---------------
type Expected = { name: string; required: string[]; optional?: string[] };

const EXPECTED_TABLES: Expected[] = [
  {
    name: "clinics",
    required: [
      "id", "name", "invite_code", "created_at",
      "address", "phone", "city", "state", "email",
      "established_year", "letterhead_header", "letterhead_footer",
    ],
  },
  {
    name: "doctors",
    required: [
      "id", "full_name", "role", "clinic_id",
      "qualification", "registration_number", "hpr_id",
      "clinic_name", "clinic_address", "clinic_phone",
      "signature_url", "letterhead_url", "preferred_language", "created_at",
    ],
  },
  {
    name: "patients",
    required: [
      "id", "doctor_id", "clinic_id", "emr_number", "full_name",
      "given_name", "family_name",
      "age", "birthdate", "sex",
      "phone", "email", "address",
      "address_line1", "address_line2", "city", "state", "postal_code", "country",
      "blood_group", "known_allergies", "chronic_conditions", "emergency_contact",
      "abha_id", "abha_address",
      "created_at", "last_visit_at",
    ],
  },
  {
    name: "patient_allergies",
    required: ["id", "patient_id", "allergen", "reaction", "severity", "recorded_at"],
  },
  {
    name: "visits",
    required: [
      "id", "patient_id", "doctor_id", "clinic_id", "created_by",
      "visit_date", "status", "completed_at",
      "encounter_class",
      "bp_systolic", "bp_diastolic", "pulse", "temperature_f", "spo2", "weight_kg", "height_cm",
      "chief_complaints", "history_present_illness", "past_history",
      "examination_findings", "provisional_diagnosis", "confirmed_diagnosis",
      "icd_codes", "investigations_ordered", "prescription",
      "advice", "follow_up_date", "follow_up_notes",
      "audio_url", "transcript_text", "transcript_original",
      "transcript_language", "transcript_speakers",
      "doctor_speaker_id", "doctor_id_confidence", "llm_extraction_raw",
      "doctor_notes",
      "pre_visit_summary", "pre_visit_summary_generated_at",
      "field_assumptions",
      "created_at", "updated_at",
    ],
  },
  {
    name: "visit_doctors",
    required: ["visit_id", "doctor_id", "role", "assigned_at"],
  },
  {
    name: "appointments",
    required: [
      "id", "clinic_id", "patient_id", "doctor_id", "scheduled_at",
      "duration_minutes", "type", "priority", "status", "notes",
      "created_by", "created_at", "updated_at",
    ],
  },
  {
    name: "audit_events",
    required: ["id", "doctor_id", "actor_id", "entity_type", "entity_id", "action", "payload", "created_at"],
  },
  {
    name: "api_usage_events",
    required: [
      "id", "clinic_id", "user_id", "visit_id",
      "service", "operation",
      "audio_duration_seconds",
      "input_tokens", "output_tokens",
      "cache_creation_input_tokens", "cache_read_input_tokens",
      "cost_inr",
      "metadata", "created_at",
    ],
  },
  {
    name: "clinical_disclosures",
    required: [
      "id", "clinic_id", "patient_id", "visit_id", "actor_id",
      "consumer_type", "consumer_label", "consent_artifact_id",
      "bundle_profile", "content_sha256", "content_bytes",
      "metadata", "disclosed_at",
    ],
  },
];

const EXPECTED_VIEWS = [
  "api_usage_monthly",
  "clinical_disclosures_monthly",
];

const EXPECTED_BUCKETS = ["visit-audio", "doctor-assets"];

// ---- introspection -------------------------------------------------------

type OpenApiPaths = Record<string, unknown>;
type OpenApiDef = {
  type?: string;
  required?: string[];
  properties?: Record<string, unknown>;
};
type OpenApi = {
  paths?: OpenApiPaths;
  definitions?: Record<string, OpenApiDef>;
};

async function fetchOpenApi(): Promise<OpenApi> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Accept: "application/openapi+json",
    },
  });
  if (!res.ok) {
    throw new Error(`OpenAPI fetch failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()) as OpenApi;
}

async function fetchBuckets(): Promise<string[]> {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      apikey: SERVICE_KEY!,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) return [];
  const list = (await res.json()) as Array<{ name: string }>;
  return list.map((b) => b.name);
}

async function checkColumnExists(table: string, column: string): Promise<boolean> {
  // PostgREST: select=<col>&limit=0 returns 200 if column exists, 400 otherwise
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=0`,
    {
      headers: {
        apikey: SERVICE_KEY!,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  );
  return res.ok;
}

// ---- main ----------------------------------------------------------------
function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

(async () => {
  console.log(`\nChecking Supabase at ${SUPABASE_URL}\n`);

  let openapi: OpenApi;
  try {
    openapi = await fetchOpenApi();
  } catch (e) {
    console.error("Could not fetch OpenAPI:", (e as Error).message);
    process.exit(3);
  }

  const defs = openapi.definitions || {};
  const present = new Set(Object.keys(defs));

  let failures = 0;

  // ---- tables ----
  console.log("Tables");
  console.log("------");
  for (const t of EXPECTED_TABLES) {
    if (!present.has(t.name)) {
      console.log(`  ${pad(t.name, 30)} MISSING`);
      failures++;
      continue;
    }
    const props = defs[t.name].properties || {};
    const missingCols: string[] = [];
    for (const col of t.required) {
      if (!(col in props)) missingCols.push(col);
    }
    // For columns reported missing by OpenAPI, double-check via PostgREST query
    // (some computed/jsonb columns occasionally don't surface in the OpenAPI doc).
    const stillMissing: string[] = [];
    for (const col of missingCols) {
      const exists = await checkColumnExists(t.name, col);
      if (!exists) stillMissing.push(col);
    }
    if (stillMissing.length === 0) {
      console.log(`  ${pad(t.name, 30)} OK  (${t.required.length} cols)`);
    } else {
      console.log(`  ${pad(t.name, 30)} MISSING COLS: ${stillMissing.join(", ")}`);
      failures += stillMissing.length;
    }
  }

  // ---- views ----
  console.log("\nViews");
  console.log("-----");
  for (const v of EXPECTED_VIEWS) {
    if (present.has(v)) {
      console.log(`  ${pad(v, 30)} OK`);
    } else {
      console.log(`  ${pad(v, 30)} MISSING`);
      failures++;
    }
  }

  // ---- buckets ----
  console.log("\nStorage buckets");
  console.log("---------------");
  const buckets = await fetchBuckets();
  for (const b of EXPECTED_BUCKETS) {
    if (buckets.includes(b)) {
      console.log(`  ${pad(b, 30)} OK`);
    } else {
      console.log(`  ${pad(b, 30)} MISSING`);
      failures++;
    }
  }

  // ---- summary ----
  console.log("");
  if (failures === 0) {
    console.log("✓ All expected tables, views, columns, and buckets are present.");
  } else {
    console.log(`✗ ${failures} issue(s) — see above.`);
    process.exit(1);
  }
})();
