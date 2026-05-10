-- =============================================================================
-- ABDM full compliance — close the remaining data-model gaps.
-- =============================================================================
-- Adds the fields the FHIR R4 OPConsultRecord profile requires that we did not
-- previously capture:
--   * Patient.birthDate, name split (given/family), structured address
--   * Practitioner.identifier (HPR — Healthcare Professional Registry ID)
--   * AllergyIntolerance — promoted from free text to a related table
--
-- All columns are nullable / default-safe; existing rows are unaffected. The
-- FHIR exporter (lib/fhir/bundle.ts) falls back to derived/inferred values when
-- a column is empty, so partial data still produces a valid Bundle.
-- =============================================================================

-- 1. Patient — birthDate, name split, structured address ----------------------
alter table public.patients
  add column if not exists birthdate date,
  add column if not exists given_name text,
  add column if not exists family_name text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text default 'IN';

-- 2. Doctor / Practitioner — HPR ID ------------------------------------------
alter table public.doctors
  add column if not exists hpr_id text;

create index if not exists doctors_hpr_id_idx
  on public.doctors (hpr_id)
  where hpr_id is not null;

-- 3. Patient allergies — structured per-allergen rows -------------------------
-- The free-text patients.known_allergies column is kept for backward compat;
-- new code reads from this table when present.
create table if not exists public.patient_allergies (
  id uuid primary key default extensions.gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  allergen text not null,
  reaction text,
  severity text check (severity in ('mild', 'moderate', 'severe') or severity is null),
  recorded_at timestamptz not null default now()
);

create index if not exists patient_allergies_patient_idx
  on public.patient_allergies (patient_id);

alter table public.patient_allergies enable row level security;

drop policy if exists "Clinic members read allergies" on public.patient_allergies;
create policy "Clinic members read allergies"
on public.patient_allergies for select
using (
  patient_id in (
    select id from public.patients where clinic_id = public.current_clinic_id()
  )
);

drop policy if exists "Clinic members write allergies" on public.patient_allergies;
create policy "Clinic members write allergies"
on public.patient_allergies for all
using (
  patient_id in (
    select id from public.patients where clinic_id = public.current_clinic_id()
  )
)
with check (
  patient_id in (
    select id from public.patients where clinic_id = public.current_clinic_id()
  )
);
