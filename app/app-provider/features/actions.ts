"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/lib/provider/auth";
import { logProviderAudit } from "@/lib/provider/audit";
import { supabaseAdmin } from "@/lib/supabase/admin";

const FLAGS = [
  "pharmacy",
  "appointments",
  "patient_portal",
  "fhir_export",
  "ai_extraction",
  "pre_visit_summary",
  "fax",
  "multilingual",
  "immunizations",
  "referrals",
] as const;

export type FeatureFlagKey = (typeof FLAGS)[number];
export type FeatureFlagDraft = Record<FeatureFlagKey, boolean>;

export async function saveClinicFeatureFlags(clinicId: string, draft: FeatureFlagDraft) {
  const { userId } = await requirePlatformAdmin();

  const row = FLAGS.reduce<Record<string, boolean | string>>(
    (acc, flag) => {
      acc[flag] = draft[flag] === true;
      return acc;
    },
    { clinic_id: clinicId, updated_by: userId },
  );

  await supabaseAdmin().from("clinic_feature_flags").upsert(row as never, { onConflict: "clinic_id" });
  await logProviderAudit({
    actorId: userId,
    action: "clinic_feature_flags_updated",
    entityType: "clinic",
    entityId: clinicId,
    metadata: draft,
  });

  revalidatePath("/app-provider/features");
  revalidatePath(`/app-provider/clinics/${clinicId}`);

  return { ok: true };
}
