// Append-only audit log of every clinical-record disclosure. Required for
// ABDM / DPDP Act 2023 (≥7 year retention). Always called from server code
// using the admin client so RLS does not block inserts.

import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { DisclosureConsumerType } from "@/types/db";

export type DisclosureInput = {
  clinicId: string;
  patientId: string;
  visitId?: string | null;
  actorId?: string | null;
  consumerType: DisclosureConsumerType;
  consumerLabel?: string | null;
  consentArtifactId?: string | null;
  bundleProfile?: string;
  body: string;
  metadata?: Record<string, unknown> | null;
};

export async function recordDisclosure(input: DisclosureInput): Promise<void> {
  const sha = createHash("sha256").update(input.body).digest("hex");
  const bytes = Buffer.byteLength(input.body, "utf8");
  const admin = supabaseAdmin();
  const { error } = await admin.from("clinical_disclosures").insert({
    clinic_id: input.clinicId,
    patient_id: input.patientId,
    visit_id: input.visitId ?? null,
    actor_id: input.actorId ?? null,
    consumer_type: input.consumerType,
    consumer_label: input.consumerLabel ?? null,
    consent_artifact_id: input.consentArtifactId ?? null,
    bundle_profile: input.bundleProfile ?? "OPConsultRecord",
    content_sha256: sha,
    content_bytes: bytes,
    metadata: input.metadata ?? null,
  } as never);
  if (error) {
    // Audit logging must not break the disclosure itself — log and move on.
    console.error("[disclosures] insert failed", error.message);
  }
}
