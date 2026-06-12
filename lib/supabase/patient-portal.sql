-- Patient Portal setup for MedAssist.
-- Run this in the Supabase SQL editor after deploying the patient portal pages.
--
-- Current workflow:
-- 1. Patient selects a clinic, enters a 10 digit mobile number, and verifies OTP.
-- 2. Patient fills personal details.
-- 3. Details are saved to patient_portal_intake_submissions with clinic_id + phone.
-- 4. Medical Assistant reviews that submission and assigns a doctor.
-- 5. The app creates/updates patients and marks the submission assigned.
--
-- The old patient_portal_registration_requests table is intentionally removed.
-- New OTP submissions use patient_portal_intake_submissions.
 
drop table if exists public.patient_portal_registration_requests cascade;
 
create table if not exists public.patient_portal_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (user_id),
  unique (patient_id)
);
 
create index if not exists patient_portal_accounts_user_id_idx
  on public.patient_portal_accounts(user_id);
 
create index if not exists patient_portal_accounts_patient_id_idx
  on public.patient_portal_accounts(patient_id);
 
alter table public.patient_portal_accounts enable row level security;
 
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patient_portal_accounts'
      and policyname = 'patient portal accounts can read own mapping'
  ) then
    create policy "patient portal accounts can read own mapping"
      on public.patient_portal_accounts
      for select
      using (user_id = auth.uid());
  end if;
end $$;
 
-- Link an existing Supabase Auth user to an existing EMR patient:
-- insert into public.patient_portal_accounts (user_id, patient_id, clinic_id)
-- values ('AUTH_USER_UUID', 'PATIENT_UUID', 'CLINIC_UUID');
 
create table if not exists public.patient_portal_intake_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete cascade,
  clinic_id uuid references public.clinics(id) on delete cascade,
  first_name text,
  last_name text,
  full_name text,
  birthdate date,
  age integer,
  sex text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  postal_code text,
  country text,
  blood_group text,
  height_cm numeric,
  known_allergies text,
  chronic_conditions text,
  chief_complaint text,
  abha_id text,
  abha_address text,
  bp_systolic integer,
  bp_diastolic integer,
  pulse integer,
  temperature_f numeric,
  spo2 integer,
  weight_kg numeric,
  emergency_contact text,
  status text not null default 'submitted',
  reviewed_by uuid references public.doctors(id),
  reviewed_at timestamptz,
  assigned_doctor_id uuid references public.doctors(id),
  created_patient_id uuid references public.patients(id),
  created_visit_id uuid references public.visits(id),
  created_at timestamptz not null default now()
);
 
alter table public.patient_portal_intake_submissions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  alter column patient_id drop not null,
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists birthdate date,
  add column if not exists age integer,
  add column if not exists sex text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists postal_code text,
  add column if not exists country text,
  add column if not exists height_cm numeric,
  add column if not exists chief_complaint text,
  add column if not exists abha_id text,
  add column if not exists abha_address text,
  add column if not exists bp_systolic integer,
  add column if not exists bp_diastolic integer,
  add column if not exists pulse integer,
  add column if not exists temperature_f numeric,
  add column if not exists spo2 integer,
  add column if not exists weight_kg numeric,
  add column if not exists assigned_doctor_id uuid references public.doctors(id),
  add column if not exists created_patient_id uuid references public.patients(id),
  add column if not exists created_visit_id uuid references public.visits(id);
 
create index if not exists patient_portal_intake_patient_id_idx
  on public.patient_portal_intake_submissions(patient_id);
 
create index if not exists patient_portal_intake_status_idx
  on public.patient_portal_intake_submissions(status);
 
create index if not exists patient_portal_intake_clinic_phone_idx
  on public.patient_portal_intake_submissions(clinic_id, phone);
 
create index if not exists patient_portal_intake_clinic_status_idx
  on public.patient_portal_intake_submissions(clinic_id, status);
 
-- Avoid duplicate waiting requests for the same mobile number inside the same clinic.
-- Same phone number can still be used in a different clinic.
create unique index if not exists patient_portal_intake_unique_open_clinic_phone_idx
  on public.patient_portal_intake_submissions(clinic_id, phone)
  where status = 'submitted' and clinic_id is not null and phone is not null;
 
create unique index if not exists patient_portal_intake_unique_open_no_clinic_phone_idx
  on public.patient_portal_intake_submissions(phone)
  where status = 'submitted' and clinic_id is null and phone is not null;
 
do $$
begin
  update public.patient_portal_intake_submissions
  set phone = right(regexp_replace(phone, '\D', '', 'g'), 10)
  where phone is not null
    and phone <> right(regexp_replace(phone, '\D', '', 'g'), 10)
    and length(regexp_replace(phone, '\D', '', 'g')) >= 10;
 
  update public.patient_portal_intake_submissions
  set phone = null
  where phone is not null
    and length(regexp_replace(phone, '\D', '', 'g')) < 10;
 
  if not exists (
    select 1
    from pg_constraint
    where conname = 'patient_portal_intake_phone_10_digits'
  ) then
    alter table public.patient_portal_intake_submissions
      add constraint patient_portal_intake_phone_10_digits
      check (phone is null or phone ~ '^[0-9]{10}$');
  end if;
end $$;
 
alter table public.patient_portal_intake_submissions enable row level security;
 
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patient_portal_intake_submissions'
      and policyname = 'patients can create own portal submissions'
  ) then
    create policy "patients can create own portal submissions"
      on public.patient_portal_intake_submissions
      for insert
      with check (
        user_id = auth.uid()
        or patient_id in (
          select patient_id
          from public.patient_portal_accounts
          where user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;
 
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patient_portal_intake_submissions'
      and policyname = 'patients can read own portal submissions'
  ) then
    create policy "patients can read own portal submissions"
      on public.patient_portal_intake_submissions
      for select
      using (
        user_id = auth.uid()
        or patient_id in (
          select patient_id
          from public.patient_portal_accounts
          where user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;
end $$;
 
-- Pain map columns on intake submissions (run once)
alter table public.patient_portal_intake_submissions
  add column if not exists pain_markers jsonb,
  add column if not exists pain_intensity integer,
  add column if not exists pain_type text,
  add column if not exists pain_summary text;

-- Optional patient read policies.
-- Only enable RLS on existing EMR tables after confirming your staff/admin
-- policies already allow doctors, MAs, and admins to continue using the app.
 
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'patients can read own patient record'
  ) then
    create policy "patients can read own patient record"
      on public.patients
      for select
      using (
        id in (
          select patient_id
          from public.patient_portal_accounts
          where user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;
 
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and policyname = 'patients can read own appointments'
  ) then
    create policy "patients can read own appointments"
      on public.appointments
      for select
      using (
        patient_id in (
          select patient_id
          from public.patient_portal_accounts
          where user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;
 
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'visits'
      and policyname = 'patients can read own visits'
  ) then
    create policy "patients can read own visits"
      on public.visits
      for select
      using (
        patient_id in (
          select patient_id
          from public.patient_portal_accounts
          where user_id = auth.uid()
            and status = 'active'
        )
      );
  end if;
end $$;
 
 