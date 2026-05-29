# Project MedAssist — Build Spec

**An AI medical scribe for Indian doctors.** Multilingual voice-driven EMR creation with Claude-powered structured field extraction and intelligent prescription diff-editing.

---

## 1. Problem & Positioning

Indian doctors see 40–80+ patients/day in OPD. They write minimal notes, rely on memory, and lose follow-up context. Western scribes (Abridge, Nuance DAX, Heidi, Freed) don't handle:

- **Code-mixed Indian speech** — Hindi/Tamil/Telugu medical terms mixed with English ("patient ko fever hai 3 din se, paracetamol 500 BD likh do")
- **Indian prescription conventions** — BD/TDS/HS/SOS shorthand, brand-name prevalence over generic, OPD slip format

**MedAssist wins by:** Indian-language-first STT (Sarvam AI / Bhashini), Indian prescription format, simple flow that matches OPD reality (record → review → print/share), and a smart prescription editor that diffs old vs. new instead of regenerating from scratch.

---

## 2. Tech Stack (Recommended)

| Layer | Choice | Why |
|---|---|---|
| Frontend | **Next.js 14 (App Router) + Tailwind + shadcn/ui** as PWA | Single codebase, installable on phone, fast iteration. React Native later if native features needed. |
| Auth | **Supabase Auth** (phone OTP + email) | Phone OTP is doctor-friendly in India |
| Database | **Supabase Postgres** | Row-level security per doctor, easy schema migrations |
| Storage | **Supabase Storage** | Audio files (delete after processing), prescription PDFs |
| Speech-to-Text | **Sarvam AI Saaras v3** — `translate` mode + `with_diarization=True` via Batch API. **Whisper large-v3** as offline fallback (no diarization). | One call returns English-translated transcript with speaker labels — perfect for distinguishing doctor from patient |
| LLM (default) | **Claude Haiku 4.5** (`claude-haiku-4-5-20251001`) via Anthropic API | Structured field extraction with a tight schema is exactly Haiku's sweet spot; supports prompt caching |
| LLM (fallback) | **Claude Sonnet 4.6** (`claude-sonnet-4-6`) | Route low-confidence extractions or complex polypharmacy cases here for higher quality |
| PDF generation | **react-pdf** or **Puppeteer + HTML template** | Pixel-perfect prescription printouts |
| Hosting | **Vercel** (frontend) + **Supabase** (backend) | Solo-dev friendly |
| Audio capture | **MediaRecorder API** + opus codec | Native browser, no plugin |

---

## 3. Core User Flows

### 3.1 Doctor Login
- Phone OTP via Supabase Auth (primary) or email magic link (fallback).
- First-time: capture name, qualification (MBBS, MD, etc.), registration number, clinic name, clinic address, phone, signature image upload. This goes on every prescription.

### 3.2 Home — EMR List
- Header: search bar (by name, phone, EMR number), "+ New EMR" button, profile icon.
- List of EMR cards showing: EMR number, patient name, age/sex, last visit date, last diagnosis (truncated).
- Pagination or infinite scroll, sorted by `last_visit_at desc`.
- Tapping a card → EMR detail screen.

### 3.3 New EMR Flow
- Tap "+ New EMR" → modal asks: **"Manual entry"** or **"Start transcription"**.
- Both paths first capture minimum patient identity: name, age, sex, phone (this becomes the deduplication key — phone + name).
- EMR number auto-generated: `HD-{clinic_code}-{YYYYMM}-{seq}` e.g. `HD-AC1-202604-00231`.

### 3.4 Existing EMR — Add Visit
- EMR detail screen shows patient header + chronological list of past visits (collapsible cards).
- Sticky FAB: **"+ New visit"** with same two options (manual / transcribe).
- Each visit is a separate row in the `visits` table tied to the patient.

### 3.5 Transcription Screen
- Big mic button, recording indicator with live waveform (Web Audio API — `AnalyserNode` + canvas).
- Recording level meter shows audio is being captured. (Live transcript is NOT shown — Sarvam diarization runs in batch mode, transcript appears after stop.)
- Buttons: **Pause / Resume**, **Stop & Process**, **Cancel**.
- Recording length cap: 15 minutes per visit (configurable).
- On "Stop & Process":
  1. Final audio blob uploaded to Supabase Storage.
  2. Sent to Sarvam batch API: `saaras:v3` model, `mode="translate"`, `with_diarization=True`.
  3. Poll job status (or use webhook). Show progress: "🎙️ Audio captured → 🗣️ Identifying speakers → 🌐 Translating → 🤖 Extracting fields…"
  4. Speaker-labeled English transcript + previous EMR sent to Claude for extraction (Claude also identifies which speaker is the doctor).
  5. Total wait: typically 60-120 seconds for a 5-min recording. Doctor can navigate away and come back; processing continues server-side.

### 3.6 Review Screen (the critical UX moment)
- **Top banner:** Shows Claude's doctor-identification result. Example: *"Identified Dr. {name} as SPEAKER_1 (high confidence)"* with a small **Flip** button if Claude got it backwards. Clicking Flip re-attributes content (doctor ↔ patient swap) and re-runs extraction.
- Two-pane layout (single-column on mobile):
  - **Left/top:** Extracted fields, each editable, with a small "AI" badge and a "Revert" button per field.
  - **Right/bottom:** Prescription editor showing diff against previous prescription:
    - 🟢 **Added** medicines (green background, "+ NEW")
    - 🔴 **Removed** medicines (strikethrough, "STOPPED")
    - 🟡 **Modified** medicines (yellow, showing old → new dose/duration)
    - ⚪ **Continued** medicines (no badge)
- **Collapsible "View transcript"** section: shows speaker-labeled English transcript with the identified doctor highlighted. Doctor can verify what Claude based extractions on.
- Below: **"Doctor's notes"** free-text area (always blank, doctor adds extra context not captured in audio).
- Top-right: **Save** button. Bottom: **"Print prescription"** and **"Save without printing"**.

### 3.7 Print
- Generates A5 PDF in clinic letterhead format. Includes: clinic header, doctor info, patient block, vitals, diagnosis, Rx (with Rx symbol), advice, signature, follow-up date, footer with regn number.
- Hindi/regional script support in PDF (use Noto Sans Devanagari, Tamil, etc.).

---

## 4. Data Model

```sql
-- doctors (auth.users extension)
create table doctors (
  id uuid primary key references auth.users(id),
  full_name text not null,
  qualification text,             -- "MBBS, MD (General Medicine)"
  registration_number text,       -- state medical council reg number
  clinic_name text,
  clinic_address text,
  clinic_phone text,
  signature_url text,             -- in Supabase Storage
  letterhead_url text,            -- optional custom letterhead
  preferred_language text default 'en', -- UI language
  created_at timestamptz default now()
);

-- patients
create table patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references doctors(id) not null,
  emr_number text unique not null,    -- HD-AC1-202604-00231
  full_name text not null,
  age int,
  sex text check (sex in ('M','F','O')),
  phone text,                          -- E.164 format +91XXXXXXXXXX
  email text,
  address text,
  blood_group text,
  known_allergies text,
  chronic_conditions text,             -- "T2DM, HTN"
  emergency_contact text,
  created_at timestamptz default now(),
  last_visit_at timestamptz,
  unique (doctor_id, phone, full_name) -- soft dedup
);

create index on patients (doctor_id, last_visit_at desc);
create index on patients using gin (to_tsvector('simple', full_name));

-- visits (one EMR has many visits)
create table visits (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id) not null,
  doctor_id uuid references doctors(id) not null,
  visit_date timestamptz default now(),

  -- Vitals
  bp_systolic int,
  bp_diastolic int,
  pulse int,
  temperature_f numeric(4,1),
  spo2 int,
  weight_kg numeric(5,2),
  height_cm numeric(5,2),

  -- Clinical
  chief_complaints text,               -- "fever x 3 days, body ache"
  history_present_illness text,
  past_history text,
  examination_findings text,
  provisional_diagnosis text,
  confirmed_diagnosis text,
  icd_codes text[],                    -- optional

  -- Plan
  investigations_ordered text,         -- "CBC, Dengue NS1"
  prescription jsonb,                  -- structured, see below
  advice text,                          -- lifestyle, diet, etc.
  follow_up_date date,
  follow_up_notes text,

  -- Audio + AI traceability
  audio_url text,
  transcript_text text,                -- final translated English transcript
  transcript_original text,            -- original-language transcript (Hindi/Tamil/etc.)
  transcript_language text,            -- detected source language e.g. "hi-IN"
  transcript_speakers jsonb,           -- diarized turns: [{speaker, text, translated_text, start, end}]
  doctor_speaker_id text,              -- Claude's identification: "SPEAKER_1" etc.
  doctor_id_confidence text,           -- "high" | "medium" | "low"
  llm_extraction_raw jsonb,            -- full Claude response for debugging
  doctor_notes text,                   -- doctor's manual additions on review screen

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index on visits (patient_id, visit_date desc);

-- prescription jsonb shape:
-- {
--   "medicines": [
--     {
--       "name": "Tab. Paracetamol 500mg",
--       "dose": "1 tab",
--       "frequency": "TDS",       // BD, TDS, QID, HS, SOS, OD
--       "duration": "5 days",
--       "route": "PO",            // PO, IV, IM, SC, topical
--       "instructions": "after food",
--       "status": "new"           // new | continued | modified | stopped
--     }
--   ],
--   "previous_prescription_id": "uuid-of-prior-visit-or-null"
-- }
```

**Row-level security:** every table filters by `doctor_id = auth.uid()`. MedAssist is single-tenant per doctor in V1; clinic-with-multiple-doctors comes in V2.

---

## 5. AI Pipeline

### 5.1 STT — Sarvam Saaras v3 (Speech-to-Text + Translate + Diarization)

This is the heart of MedAssist. One Sarvam Batch API call gives us all three jobs:

1. **Transcription** of code-mixed Indian speech
2. **Translation** to English (`mode="translate"`), so Claude gets clean English input
3. **Speaker diarization** — labels each utterance as `SPEAKER_1`, `SPEAKER_2`, etc.

```python
from sarvamai import SarvamAI

client = SarvamAI(api_subscription_key=os.getenv("SARVAM_API_KEY"))

# Diarization requires the Batch API. The REST sync endpoint does not support it.
job = client.speech_to_text.batch.create(
    file_path=audio_file_path,
    model="saaras:v3",
    mode="translate",          # outputs English regardless of input language
    with_diarization=True,
    language_code=None         # auto-detect
)

# Poll until complete (typically 10-30% of audio duration)
result = client.speech_to_text.batch.wait(job.id)

# Result structure:
# {
#   "transcript": "Full English-translated transcript...",
#   "language_code": "hi-IN",
#   "turns": [
#     {"speaker": "SPEAKER_1", "text": "Namaste, kya tahkleef hai?",
#      "translated_text": "Hello, what's the problem?",
#      "start": 0.0, "end": 2.4},
#     {"speaker": "SPEAKER_2", "text": "Doctor sahab fever hai 3 din se",
#      "translated_text": "Doctor, I've had fever for 3 days",
#      "start": 2.5, "end": 5.1}
#   ]
# }
```

**Doctor identification:** Sarvam labels speakers but doesn't know roles. We pass the labeled turns to Claude and let it identify the doctor from conversation content (whoever asks diagnostic questions, gives prescriptions, uses clinical terms). No voice fingerprinting infrastructure needed in V1.

**Multi-speaker scenarios** (e.g. patient + family member translating): diarization labels all distinct voices. Claude attributes information appropriately — symptoms/history from patient or caregiver-on-behalf-of-patient, clinical decisions from doctor.

**Storage:** save both `result.transcript` (English, what Claude sees) and the per-turn original-language strings into `transcript_speakers` JSONB. Original-language preservation matters for medico-legal review and for future re-extraction if models improve.

**Fallback:** if Sarvam Batch is unavailable or times out (>3min for a 5min audio), fall back to **Whisper large-v3** locally. No diarization in this path — pass un-diarized transcript to Claude with a `diarization_unavailable: true` flag, and Claude will extract without speaker attribution.

### 5.2 Field Extraction (Claude Haiku 4.5 default, Sonnet 4.6 fallback)

Use **prompt caching** on the system prompt + previous EMR context to cut costs ~75%.

```python
SYSTEM_PROMPT = """You are a medical scribe assistant for an Indian doctor in OPD practice.

Your job: extract structured EMR fields from a SPEAKER-LABELED consultation transcript.

Input format: The transcript has tags like [SPEAKER_1], [SPEAKER_2], etc. from Sarvam's
diarization. Speakers are NOT pre-labeled by role. You must identify which speaker is the
doctor from conversation content.

STEP 1 — Identify the doctor:
- The doctor asks diagnostic questions ("how long?", "any other symptoms?", "kab se?")
- The doctor gives examination findings ("BP is 130/80", "throat looks red")
- The doctor states diagnosis and writes prescription
- The doctor uses clinical terminology (drug names, doses, frequencies like BD/TDS)
- The patient describes symptoms in first person ("I have", "mujhe", "ennaku")
- A third speaker may be a family member translating or giving history on behalf of patient

STEP 2 — Attribute information correctly:
- Chief complaints, history, allergies → from PATIENT (or caregiver speaking for patient)
- Examination findings, diagnosis, advice, prescription → from DOCTOR
- If a finding/instruction is stated by both, attribute to doctor
- If you're uncertain about role assignment, say so via doctor_id_confidence

STEP 3 — Other extraction rules:
- Output valid JSON matching the schema exactly.
- Do NOT invent findings, diagnoses, or medicines not stated in the transcript.
- If a field is not mentioned, use null. Do not guess.
- Indian shorthand expansion: BD = twice daily, TDS = thrice daily, QID = four times daily,
  HS = at bedtime, SOS = as needed, OD = once daily, AC = before meals, PC = after meals.
- Brand names: keep as the doctor said them (e.g. "Crocin" stays "Crocin").
- Vitals: only extract if explicitly stated. BP "120 by 80" → systolic 120, diastolic 80.

STEP 4 — Prescription diff against previous Rx:
You will receive the patient's PREVIOUS prescription. For each medicine in the new Rx, emit status:
  "new"        - first time prescribed
  "continued"  - was on previous Rx, doctor said continue / no change mentioned
  "modified"   - was on previous Rx, doctor changed dose/frequency/duration
  "stopped"    - doctor said stop / discontinue / take off

Output schema:
{
  "doctor_speaker_id": "SPEAKER_1",
  "doctor_id_confidence": "high"|"medium"|"low",
  "speaker_role_notes": "brief reason for identification, e.g. 'Speaker 1 asks diagnostic questions and prescribes medication'",
  "vitals": { "bp_systolic": int|null, "bp_diastolic": int|null, "pulse": int|null,
              "temperature_f": float|null, "spo2": int|null, "weight_kg": float|null },
  "chief_complaints": str|null,
  "history_present_illness": str|null,
  "examination_findings": str|null,
  "provisional_diagnosis": str|null,
  "confirmed_diagnosis": str|null,
  "investigations_ordered": str|null,
  "prescription": { "medicines": [ {name, dose, frequency, duration, route, instructions, status} ] },
  "advice": str|null,
  "follow_up_days": int|null,
  "follow_up_notes": str|null,
  "extraction_confidence": "high"|"medium"|"low",
  "ambiguities": [str]   // things the doctor should manually verify
}
"""

USER_MESSAGE = f"""Patient: {patient.name}, {patient.age}{patient.sex}
Known allergies: {patient.known_allergies or 'none recorded'}
Chronic conditions: {patient.chronic_conditions or 'none recorded'}

Previous prescription (from visit on {prev_visit.date}):
{json.dumps(prev_visit.prescription, indent=2) if prev_visit else 'No previous prescription on file.'}

Today's consultation transcript (Sarvam-translated to English, speaker-diarized):
\"\"\"
{format_speaker_turns(result.turns)}
\"\"\"

Where format_speaker_turns produces:
[SPEAKER_1] Hello, what's the problem?
[SPEAKER_2] Doctor, I've had fever for 3 days, body ache, weakness.
[SPEAKER_1] Any cough? Vomiting?
[SPEAKER_2] No vomiting, slight cough.
[SPEAKER_1] Let me check. Temperature is 100.4°F, BP 118/76. Take Crocin 500mg, three times daily for 5 days. Also Cetzine 10mg at bedtime. Come back in 3 days if not better.

Identify the doctor speaker, then extract structured EMR fields. Output JSON only, no preamble.
"""
```

Use the Anthropic SDK with `cache_control: {"type": "ephemeral"}` on the system prompt block. Default model: `claude-haiku-4-5-20251001`. Temperature: 0.2. Max tokens: 2000.

**Quality fallback:** if `extraction_confidence == "low"` or `len(ambiguities) > 3`, automatically retry with `claude-sonnet-4-6` and surface the higher-quality result. This keeps the bulk of calls on cheap Haiku and reserves Sonnet for the hard cases where it earns its keep.

### 5.3 Confidence + Ambiguities → UX
- Render `extraction_confidence: "low"` as a yellow banner on the review screen: "Please verify all fields carefully."
- Render each item in `ambiguities` as a chip the doctor can click to jump to that field.

---

## 6. Prescription Diff Logic (the differentiator)

The diff is **already done by Claude** via the `status` field on each medicine. Frontend just needs to render it.

**Render rules on review screen:**

```
For each medicine in new_prescription.medicines:
  if status == "new":      green card, "+ NEW" badge
  if status == "continued": neutral card, no badge
  if status == "modified": yellow card, show "old → new" inline diff on changed fields
  if status == "stopped":  red card with strikethrough, "STOPPED" badge

Below the active list, collapsible section: "Stopped medicines from previous visit"
```

**Doctor edit operations on review screen:**
- Edit any field of any medicine inline.
- Drag to reorder.
- "+ Add medicine" button → manual entry row.
- Delete medicine → moves to `status: stopped` (preserves audit trail).
- "Revert to AI suggestion" per medicine (restores Claude's original output for that row).

**On save:** persist final prescription as `visits.prescription` JSONB. Store Claude's raw output in `llm_extraction_raw` for traceability.

---

## 7. Print / Output

### 7.1 PDF Layout (A5, portrait)
```
┌──────────────────────────────────────┐
│  [LOGO]   Dr. {name}                 │
│           {qualification}            │
│           Reg No: {reg_no}           │
│  {clinic_name}, {clinic_address}     │
│  📞 {clinic_phone}                   │
├──────────────────────────────────────┤
│ Patient: {name}        EMR: {emr_no} │
│ Age/Sex: {age}/{sex}   Date: {date}  │
│ Phone: {phone}                       │
├──────────────────────────────────────┤
│ Vitals: BP 120/80, P 78, T 99.2°F    │
│                                      │
│ Complaints: {chief_complaints}       │
│ Diagnosis: {diagnosis}               │
│                                      │
│ Investigations: {investigations}     │
│                                      │
│ ℞                                    │
│  1. Tab. Crocin 500mg — 1 TDS × 5d   │
│     after food                       │
│  2. Cap. Azithral 500mg — 1 OD × 3d  │
│  ...                                 │
│                                      │
│ Advice: {advice}                     │
│ Follow-up: {follow_up_date}          │
├──────────────────────────────────────┤
│            [signature image]         │
│            Dr. {name}                │
└──────────────────────────────────────┘
```

Use Noto Sans Devanagari (and Tamil/Telugu/etc.) for any non-Latin script. Stopped medicines do NOT print. Doctor's notes do NOT print (internal only) unless doctor toggles "include notes on print".

---

## 8. Build Phases

Each phase ends with a deployable, dogfoodable build. Sequence matters; weeks don't.

### Phase 1 — Skeleton
- Next.js + Supabase setup, RLS policies.
- Auth (phone OTP).
- Doctor profile setup screen.
- EMR list + search + manual create (no AI yet).
- Patient detail + manual visit entry.
- ✅ Done = doctor can run a full manual EMR workflow.

### Phase 2 — Audio + Sarvam STT
- Recording UI with waveform (Web Audio API). No live transcript display.
- Audio upload to Supabase Storage.
- Sarvam Batch API integration: `saaras:v3` with `mode="translate"` and `with_diarization=True`. Polling/webhook for job completion.
- Whisper large-v3 fallback (no diarization, degrade gracefully).
- Transcript display screen with speaker labels.
- ✅ Done = doctor records, gets speaker-labeled English transcript, manually copies into fields.

### Phase 3 — Claude Extraction
- Anthropic SDK integration with prompt caching.
- Field extraction endpoint (Supabase Edge Function or Next.js API route).
- Haiku 4.5 as default with Sonnet 4.6 quality-fallback for low-confidence cases.
- Doctor-speaker identification from diarized turns (Claude infers from content).
- Review screen with all editable fields + AI badges + speaker-flip override.
- ✅ Done = doctor records → all fields auto-filled with correct speaker attribution → reviews → saves.

### Phase 4 — Prescription Intelligence
- Previous-prescription context injection.
- Diff rendering UI (new/continued/modified/stopped).
- Inline edit + reorder + revert.
- Audit trail in `llm_extraction_raw`.
- ✅ Done = prescription editing feels magical.

### Phase 5 — Print + Polish
- A5 PDF generation (react-pdf).
- Multi-script font support.
- Letterhead + signature upload.
- Dashboard polish, empty states, error handling.
- ✅ Done = ready to use end-to-end.

### Phase 6 — Future Ideas
- WhatsApp prescription delivery via Meta Cloud API or Gupshup. Patient gets a PDF link tied to their EMR number; expires after 7 days.
- SMS fallback with shortlink (TextLocal / MSG91).
- Lab report attachment to visits (upload + show on prescription/portal link).
- Patient-facing portal at `helldoctr.in/p/{emr_number}` — view past prescriptions and reports.
- Voice-driven follow-up reminders 1 day before `follow_up_date`.
- Drug interaction warnings (using OpenFDA or RxNorm + a thin wrapper, surfaced as warnings during review).
- Multi-doctor clinic mode + receptionist role.
- ABHA (Ayushman Bharat Health Account) integration for national health ID.

---

## 9. Compliance & Trust

- **DPDP Act 2023:** explicit consent on first login for processing health data. Audio files auto-deleted 30 days after processing (configurable).
- **No third-party analytics** in V1. Posthog-self-hosted later if needed.
- **Audit log table** `audit_events` capturing every visit create/edit with timestamp + actor.
- **Encryption:** Supabase encrypts at rest. Add column-level encryption (`pgsodium`) for `phone`, `email`, `address`, `chronic_conditions` in V2.
- **Backups:** Supabase PITR enabled. Monthly export to S3 in case of platform lock-in.
- **Disclaimer on every PDF and review screen:** "AI-generated draft. Reviewed and approved by Dr. {name}." This is non-negotiable for medico-legal.

---

## 10. Open Questions / Decisions Needed Before Coding

1. **Single doctor or multi-doctor clinics in V1?** Recommend: single-doctor only. Multi-doctor later.
2. **Mobile-first PWA or native app?** Recommend: PWA in V1, React Native wrapper later if useful.
3. **Whisper fallback hosting:** run Whisper locally on a GPU box, or use a hosted API (Replicate, Groq) for the failover path? Recommend: hosted at first, self-host later if usage warrants it.
4. **Prescription template per doctor?** V1: one template, doctor uploads letterhead. Later: per-doctor template editor.
5. **Languages in V1 UI?** Recommend: English UI only. Doctors are comfortable with English UI; the magic is in the *speech* understanding, not the interface text.

---

## 11. Folder Structure (suggested)

```
hello-doctor/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── onboarding/page.tsx
│   ├── (app)/
│   │   ├── emr/
│   │   │   ├── page.tsx              # list
│   │   │   ├── new/page.tsx          # create patient
│   │   │   └── [id]/
│   │   │       ├── page.tsx          # patient detail
│   │   │       ├── visit/new/page.tsx
│   │   │       └── visit/[vid]/review/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       ├── transcribe/route.ts       # STT proxy
│       ├── extract/route.ts          # Claude extraction
│       └── pdf/[visitId]/route.ts    # PDF generation
├── components/
│   ├── audio/Recorder.tsx
│   ├── audio/Waveform.tsx
│   ├── emr/PatientCard.tsx
│   ├── emr/VisitTimeline.tsx
│   ├── prescription/MedicineRow.tsx
│   ├── prescription/PrescriptionDiff.tsx
│   └── review/FieldWithAIBadge.tsx
├── lib/
│   ├── supabase/{client,server,middleware}.ts
│   ├── stt/{sarvam,whisper-fallback,index}.ts
│   ├── claude/{client,extract,prompts}.ts
│   ├── pdf/{template,render}.ts
│   └── emr/{numbering,validation}.ts
├── types/{db,emr,prescription}.ts
└── supabase/migrations/*.sql
```

---

## 12. Definition of Done for V1

- [ ] Doctor signs up via phone OTP, completes profile with letterhead + signature.
- [ ] Creates EMR, records 5-min Hindi+English consultation, gets fields auto-filled with >85% accuracy on subjective fields and >95% on prescription medicines.
- [ ] Sarvam diarization correctly identifies distinct speakers (>90% turn-attribution accuracy).
- [ ] Claude correctly identifies the doctor speaker (>95% accuracy in 2-speaker recordings).
- [ ] Edits fields, sees prescription diff against previous visit, saves.
- [ ] Prints A5 prescription with correct Indian format, regional script renders correctly.
- [ ] Audio deleted after 30 days. RLS prevents Doctor A from reading Doctor B's data (verified with test).
- [ ] End-to-end consultation → saved EMR → printable PDF takes ≤3 minutes for a 5-min recording (Sarvam batch + Claude extraction + review).
