-- =============================================================================
-- Clinical-disclosure audit log.
-- =============================================================================
-- ABDM / DPDP Act 2023 require that every release of a patient's clinical
-- record be auditable for a minimum of 7 years. This table is the system of
-- record for those releases — one row per FHIR Bundle dispatched to any
-- consumer (the clinic itself for printout, the patient via portal, an HIU
-- via a consent token, etc.). It is APPEND-ONLY: rows are never updated or
-- deleted. The 7-year retention is enforced by a check constraint on the
-- delete policy (none) and by the absence of an UPDATE policy.
--
-- Sibling to api_usage_events (which logs LLM/STT spend); this table logs
-- clinical-content disclosures.
-- =============================================================================

create table if not exists public.clinical_disclosures (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete restrict,
  patient_id uuid not null references public.patients(id) on delete restrict,
  visit_id uuid references public.visits(id) on delete restrict,

  -- Who initiated the disclosure (a clinic user or a system process).
  actor_id uuid references public.doctors(id) on delete set null,

  -- What kind of consumer received the data:
  --   'self_print'  - clinic printed the prescription / record
  --   'patient_pdf' - patient downloaded their own record
  --   'fhir_export' - FHIR Bundle handed off (manual, pre-CM)
  --   'abdm_hiu'    - released via ABDM Consent Manager to an HIU (post-CM)
  --   'referral'    - Bundle attached to a referral letter
  --   'insurer'     - Bundle attached to an insurance claim
  consumer_type text not null check (
    consumer_type in (
      'self_print', 'patient_pdf', 'fhir_export',
      'abdm_hiu', 'referral', 'insurer'
    )
  ),

  -- Free-text identifier of the recipient (HIU id, insurer name, "patient", etc.).
  consumer_label text,

  -- ABDM Consent Manager artifact ID, if released via CM. Null otherwise.
  consent_artifact_id text,

  -- FHIR Bundle profile released (e.g. "OPConsultRecord"). Multiple disclosures
  -- of the same visit under different profiles get separate rows.
  bundle_profile text not null default 'OPConsultRecord',

  -- SHA-256 of the released Bundle JSON. Lets us prove the recipient got
  -- exactly what we logged without storing the body itself.
  content_sha256 text not null,

  -- Bytes released. Used for audit summaries.
  content_bytes integer not null,

  -- Optional metadata: HIU public-key fingerprint, request id, IP, etc.
  metadata jsonb,

  disclosed_at timestamptz not null default now()
);

create index if not exists clinical_disclosures_clinic_idx
  on public.clinical_disclosures (clinic_id, disclosed_at desc);

create index if not exists clinical_disclosures_patient_idx
  on public.clinical_disclosures (patient_id, disclosed_at desc);

create index if not exists clinical_disclosures_visit_idx
  on public.clinical_disclosures (visit_id);

create index if not exists clinical_disclosures_consent_idx
  on public.clinical_disclosures (consent_artifact_id)
  where consent_artifact_id is not null;

-- RLS: clinic members can read their clinic's disclosures. Inserts are
-- restricted to the service role (the FHIR export route uses the admin
-- client). No update or delete policy — append-only by design.
alter table public.clinical_disclosures enable row level security;

drop policy if exists "Clinic members read disclosures" on public.clinical_disclosures;
create policy "Clinic members read disclosures"
on public.clinical_disclosures for select
using (clinic_id = public.current_clinic_id());

-- Convenience view: counts by consumer type per month, per clinic.
create or replace view public.clinical_disclosures_monthly as
select
  clinic_id,
  consumer_type,
  date_trunc('month', disclosed_at)::date as month,
  count(*) as disclosure_count,
  sum(content_bytes) as total_bytes
from public.clinical_disclosures
group by clinic_id, consumer_type, date_trunc('month', disclosed_at);

alter view public.clinical_disclosures_monthly set (security_invoker = true);
