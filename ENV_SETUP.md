# MedAssist Env Setup

Fill [`.env`](</d:/Project MedAssist/.env>) before I start building the app.

## Required first

These values should be filled before development starts:

| Variable | What to put here | Where to get it |
|---|---|---|
| `EMR_CLINIC_CODE` | A short clinic code such as `AC1`, `KDH`, or `DRS1` | Choose it yourself. This is used in EMR numbers. |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard -> Project Settings -> API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Supabase Dashboard -> Project Settings -> API |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only service role key | Supabase Dashboard -> Project Settings -> API |
| `SARVAM_API_KEY` | Sarvam API subscription key | Sarvam dashboard / API access page |
| `ANTHROPIC_API_KEY` | Anthropic API key | Anthropic Console -> API Keys |

## Usually keep these defaults

You can leave these as they are unless you have a specific reason to change them:

- `NEXT_PUBLIC_APP_NAME=MedAssist`
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXT_PUBLIC_DEFAULT_LOCALE=en-IN`
- `EMR_NUMBER_PREFIX=HD`
- `SUPABASE_AUDIO_BUCKET=visit-audio`
- `SUPABASE_PDF_BUCKET=prescriptions`
- `SUPABASE_ASSETS_BUCKET=doctor-assets`
- `SARVAM_STT_MODEL=saaras:v3`
- `SARVAM_STT_MODE=translate`
- `SARVAM_ENABLE_DIARIZATION=true`
- `SARVAM_POLL_INTERVAL_MS=5000`
- `SARVAM_JOB_TIMEOUT_MS=180000`
- `ANTHROPIC_DEFAULT_MODEL=claude-haiku-4-5-20251001`
- `ANTHROPIC_FALLBACK_MODEL=claude-sonnet-4-6`
- `ANTHROPIC_TEMPERATURE=0.2`
- `ANTHROPIC_MAX_TOKENS=2000`
- `TRANSCRIPTION_MAX_MINUTES=15`
- `AUDIO_RETENTION_DAYS=30`
- `PDF_PAGE_SIZE=A5`
- `PDF_INCLUDE_DOCTOR_NOTES_BY_DEFAULT=false`

## Optional values

These can stay blank for now:

- `SUPABASE_PROJECT_REF`
- `SUPABASE_ACCESS_TOKEN`
- `WHISPER_FALLBACK_PROVIDER`
- `GROQ_API_KEY`
- `REPLICATE_API_TOKEN`
- `LOCAL_WHISPER_ENDPOINT`

If you do not already have a Whisper fallback ready, keep:

```env
ENABLE_WHISPER_FALLBACK=false
```

## Example

```env
EMR_CLINIC_CODE=AC1
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
SARVAM_API_KEY=your-sarvam-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

## Production note

- Do not share `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ACCESS_TOKEN`, or `ANTHROPIC_API_KEY` publicly.
- When you move to production later, update `NEXT_PUBLIC_APP_URL` to your real deployed domain.
- For deployment, these same variables should also be added to your hosting provider's environment settings, such as Vercel project environment variables.
- Once `.env` is filled, tell me and I can scaffold and build the project around this config.
