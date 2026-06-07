create table if not exists public.fhir_validation_results (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid not null references public.visits(id) on delete cascade,
  actor_id uuid references public.doctors(id) on delete set null,
  bundle_profile text not null default 'OPConsultRecord',
  validator text not null default 'app-basic',
  status text not null check (status in ('passed', 'warning', 'failed')),
  errors jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  validated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists fhir_validation_results_visit_created_idx
  on public.fhir_validation_results (visit_id, created_at desc);

create index if not exists fhir_validation_results_clinic_status_idx
  on public.fhir_validation_results (clinic_id, status, created_at desc);

alter table public.fhir_validation_results enable row level security;

drop policy if exists "Clinic members can view FHIR validation results" on public.fhir_validation_results;
create policy "Clinic members can view FHIR validation results"
on public.fhir_validation_results
for select
using (public.is_clinic_member(clinic_id));

drop policy if exists "Clinic members can create FHIR validation results" on public.fhir_validation_results;
create policy "Clinic members can create FHIR validation results"
on public.fhir_validation_results
for insert
with check (public.is_clinic_member(clinic_id));
