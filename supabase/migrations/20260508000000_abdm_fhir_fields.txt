-- =============================================================================
-- ABDM / FHIR R4 compatibility fields.
-- =============================================================================
-- Adds the minimum field set needed to export visits as a FHIR R4 Bundle
-- (OPConsultRecord profile) once the export endpoint is built. None of these
-- fields are required at insert time — they default to null / empty so
-- existing rows are unaffected.
--
-- See docs/abdm-fhir-r4.html for the full mapping.
-- =============================================================================

-- 1. Patient ABHA identity ----------------------------------------------------
alter table public.patients
  add column if not exists abha_id text;
alter table public.patients
  add column if not exists abha_address text;

-- 14-digit ABHA number (with or without dashes). Indexed for lookup.
create index if not exists patients_abha_id_idx
  on public.patients (abha_id)
  where abha_id is not null;

-- 2. Visit / encounter coding ------------------------------------------------
-- icd_codes already exists as text[] in initial setup; ensure it's there.
alter table public.visits
  add column if not exists icd_codes text[];

-- FHIR Encounter.class — for OPD this is always 'AMB' (ambulatory).
-- Stored explicitly so future export logic doesn't have to hardcode it.
alter table public.visits
  add column if not exists encounter_class text not null default 'AMB';

-- 3. Per-field AI assumption tracking ----------------------------------------
-- Map of clinical field name → 'stated' | 'assumed' | null.
-- Drives the yellow/green highlight in the review screen.
alter table public.visits
  add column if not exists field_assumptions jsonb;
