-- =============================================================================
-- Demo-frontend compatibility: visit.status workflow, appointments,
-- richer clinic profile fields, invite-code regeneration support.
-- =============================================================================

-- 1) Visit lifecycle status
--    intake          : MA captured patient, no doctor assigned yet
--    queued          : assigned to doctor, waiting in their queue
--    in_progress     : doctor is consulting / recording
--    awaiting_review : AI extraction complete, doctor needs to review
--    completed       : doctor reviewed and saved
--    cancelled       : abandoned
alter table public.visits
  add column if not exists status text not null default 'queued'
    check (status in ('intake', 'queued', 'in_progress', 'awaiting_review', 'completed', 'cancelled'));

alter table public.visits
  add column if not exists completed_at timestamptz;

create index if not exists visits_clinic_status_date_idx
  on public.visits (clinic_id, status, visit_date desc);

-- Backfill: visits that already have audio + extraction → awaiting_review;
--           visits with confirmed_diagnosis filled → completed (assume reviewed);
--           remainder stays queued.
update public.visits
  set status = case
    when confirmed_diagnosis is not null and updated_at > visit_date + interval '1 minute' then 'completed'
    when audio_url is not null and (provisional_diagnosis is not null or confirmed_diagnosis is not null) then 'awaiting_review'
    when audio_url is not null then 'in_progress'
    else 'queued'
  end
  where true;

update public.visits
  set completed_at = updated_at
  where status = 'completed' and completed_at is null;

-- 2) Richer clinic profile (city/state/email/established + letterhead text)
alter table public.clinics
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists email text,
  add column if not exists established_year integer,
  add column if not exists letterhead_header text,
  add column if not exists letterhead_footer text default 'AI-generated drafts reviewed and approved by the doctor. This prescription is valid for 30 days from date of issue.';

-- 3) Appointments
create table if not exists public.appointments (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid references public.patients(id) on delete set null,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 15,
  type text not null default 'regular'
    check (type in ('regular', 'follow_up', 'emergency', 'procedure')),
  priority text not null default 'normal'
    check (priority in ('normal', 'urgent', 'routine')),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'checked_in', 'completed', 'cancelled', 'no_show')),
  notes text,
  created_by uuid references public.doctors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_clinic_date_idx
  on public.appointments (clinic_id, scheduled_at);

create index if not exists appointments_doctor_date_idx
  on public.appointments (doctor_id, scheduled_at);

create index if not exists appointments_patient_date_idx
  on public.appointments (patient_id, scheduled_at desc);

drop trigger if exists set_appointments_updated_at on public.appointments;
create trigger set_appointments_updated_at
before update on public.appointments
for each row
execute function public.touch_updated_at();

drop trigger if exists set_appointments_clinic_id on public.appointments;
create trigger set_appointments_clinic_id
before insert on public.appointments
for each row
execute function public.set_clinic_id_from_user();

alter table public.appointments enable row level security;

drop policy if exists "Clinic members can view appointments" on public.appointments;
create policy "Clinic members can view appointments"
on public.appointments for select
using (clinic_id = public.current_clinic_id());

drop policy if exists "Clinic members can create appointments" on public.appointments;
create policy "Clinic members can create appointments"
on public.appointments for insert
with check (clinic_id = public.current_clinic_id());

drop policy if exists "Clinic members can update appointments" on public.appointments;
create policy "Clinic members can update appointments"
on public.appointments for update
using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

drop policy if exists "Clinic members can delete appointments" on public.appointments;
create policy "Clinic members can delete appointments"
on public.appointments for delete
using (clinic_id = public.current_clinic_id());

-- 4) Invite-code regeneration helper (admin-only enforced in API route)
create or replace function public.regenerate_clinic_invite_code(p_clinic uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
  caller_role text;
  caller_clinic uuid;
begin
  select role, clinic_id into caller_role, caller_clinic
  from public.doctors where id = auth.uid();

  if caller_role is null or caller_clinic is null then
    raise exception 'Not a clinic member';
  end if;

  if caller_clinic <> p_clinic then
    raise exception 'Cannot regenerate another clinic''s invite code';
  end if;

  if caller_role <> 'admin' then
    raise exception 'Only admins can regenerate invite codes';
  end if;

  loop
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 8));
    exit when not exists (select 1 from public.clinics where invite_code = new_code);
  end loop;

  update public.clinics set invite_code = new_code where id = p_clinic;
  return new_code;
end;
$$;

grant execute on function public.regenerate_clinic_invite_code(uuid) to authenticated;
