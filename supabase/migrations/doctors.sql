-- ===============================================================
-- TABLE 2: public.doctors
-- Columns: 14
-- ===============================================================
create table if not exists public.doctors (
  id uuid primary key,
  full_name text not null,
  qualification text,
  registration_number text,
  clinic_name text,
  clinic_address text,
  clinic_phone text,
  signature_url text,
  letterhead_url text,
  preferred_language text not null default 'en',
  created_at timestamptz not null default now(),
  role text not null default 'doctor' check (role in ('doctor', 'medical_assistant', 'admin')),
  clinic_id uuid references public.clinics(id) on delete set null,
  hpr_id text
);
