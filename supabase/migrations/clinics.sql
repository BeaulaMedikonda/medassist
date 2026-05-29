-- ===============================================================
-- TABLE 1: public.clinics
-- Columns: 12
-- ===============================================================
create table if not exists public.clinics (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  invite_code text unique not null,
  created_at timestamptz not null default now(),
  city text,
  state text,
  email text,
  established_year integer,
  letterhead_header text,
  letterhead_footer text default 'AI-generated drafts reviewed and approved by the doctor. This prescription is valid for 30 days from date of issue.'
);
