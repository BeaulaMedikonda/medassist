// Single source of truth for env vars. Server-only values are not exposed via NEXT_PUBLIC_*.

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(`Missing env var: ${name}`);
  }
  return value;
}

export const publicEnv = {
  appName:       process.env.NEXT_PUBLIC_APP_NAME    || "MedAssist",
  appUrl:        process.env.NEXT_PUBLIC_APP_URL     || "http://localhost:3000",
  defaultLocale: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en-IN",
  supabaseUrl:      process.env.NEXT_PUBLIC_SUPABASE_URL      || "",
  supabaseAnonKey:  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

export const serverEnv = {
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  supabaseAudioBucket:    process.env.SUPABASE_AUDIO_BUCKET     || "visit-audio",
  supabasePdfBucket:      process.env.SUPABASE_PDF_BUCKET       || "prescriptions",
  supabaseAssetsBucket:   process.env.SUPABASE_ASSETS_BUCKET    || "doctor-assets",

  emrPrefix:    process.env.EMR_NUMBER_PREFIX || "HD",
  emrClinicCode: process.env.EMR_CLINIC_CODE  || "AC1",

  sarvamApiKey:           process.env.SARVAM_API_KEY          || "",
  sarvamSttModel:         process.env.SARVAM_STT_MODEL        || "saaras:v3",
  sarvamSttMode:          process.env.SARVAM_STT_MODE         || "translate",
  sarvamEnableDiarization:(process.env.SARVAM_ENABLE_DIARIZATION || "true") === "true",
  sarvamNumSpeakers:      Number(process.env.SARVAM_NUM_SPEAKERS     || 4),
  sarvamPollIntervalMs:   Number(process.env.SARVAM_POLL_INTERVAL_MS || 10000),
  sarvamJobTimeoutMs:     Number(process.env.SARVAM_JOB_TIMEOUT_MS   || 1200000),

  // Whisper is optional — no hardcoded fallback URL so the service is
  // disabled when WHISPER_SERVICE_URL is absent from the environment.
  // The empty string is the "not configured" sentinel checked in whisper.ts.
  whisperServiceUrl: process.env.WHISPER_SERVICE_URL || "",
  whisperTimeoutMs:  Number(process.env.WHISPER_TIMEOUT_MS || 900000),
  hfAuthToken:       process.env.HF_AUTH_TOKEN || "",

  anthropicApiKey:        process.env.ANTHROPIC_API_KEY           || "",
  anthropicDefaultModel:  process.env.ANTHROPIC_DEFAULT_MODEL     || "claude-sonnet-4-6",
  anthropicFallbackModel: process.env.ANTHROPIC_FALLBACK_MODEL    || "claude-sonnet-4-6",
  anthropicTemperature:   Number(process.env.ANTHROPIC_TEMPERATURE || 0.2),
  anthropicMaxTokens:     Number(process.env.ANTHROPIC_MAX_TOKENS  || 8192),

  transcriptionMaxMinutes:       Number(process.env.TRANSCRIPTION_MAX_MINUTES || 25),
  audioRetentionDays:            Number(process.env.AUDIO_RETENTION_DAYS      || 30),
  pdfPageSize:                   process.env.PDF_PAGE_SIZE || "A5",
  pdfIncludeDoctorNotesByDefault:(process.env.PDF_INCLUDE_DOCTOR_NOTES_BY_DEFAULT || "false") === "true",
};

export function requireServerEnv() {
  required("NEXT_PUBLIC_SUPABASE_URL",      publicEnv.supabaseUrl);
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY", publicEnv.supabaseAnonKey);
  required("SUPABASE_SERVICE_ROLE_KEY",     serverEnv.supabaseServiceRoleKey);
  required("SARVAM_API_KEY",                serverEnv.sarvamApiKey);
  required("ANTHROPIC_API_KEY",             serverEnv.anthropicApiKey);
}