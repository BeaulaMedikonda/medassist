import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const FEATURE_KEYS = [
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

export type FeatureKey = (typeof FEATURE_KEYS)[number];
export type ClinicFeatureFlags = Record<FeatureKey, boolean>;

const DEFAULT_FLAGS: ClinicFeatureFlags = {
  pharmacy: true,
  appointments: true,
  patient_portal: true,
  fhir_export: true,
  ai_extraction: true,
  pre_visit_summary: true,
  fax: true,
  multilingual: true,
  immunizations: true,
  referrals: true,
};

export async function getClinicFeatureFlags(clinicId: string): Promise<ClinicFeatureFlags> {
  if (!clinicId) return DEFAULT_FLAGS;

  const { data } = await supabaseAdmin()
    .from("clinic_feature_flags")
    .select(FEATURE_KEYS.join(","))
    .eq("clinic_id", clinicId)
    .maybeSingle();

  if (!data) return DEFAULT_FLAGS;

  return FEATURE_KEYS.reduce<ClinicFeatureFlags>((flags, key) => {
    flags[key] = (data as Record<string, unknown>)[key] !== false;
    return flags;
  }, { ...DEFAULT_FLAGS });
}

export function isFeatureEnabled(flags: Partial<Record<FeatureKey, boolean>> | null | undefined, key: FeatureKey) {
  return flags?.[key] !== false;
}

export async function isClinicFeatureEnabled(clinicId: string, key: FeatureKey) {
  const flags = await getClinicFeatureFlags(clinicId);
  return isFeatureEnabled(flags, key);
}

export function featureDisabledResponse(featureName: string) {
  return NextResponse.json(
    {
      error: `${featureName} is not enabled for this clinic. Contact your app provider.`,
    },
    { status: 403 },
  );
}
