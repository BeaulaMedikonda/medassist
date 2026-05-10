-- Multi-role + multi-clinic + multi-doctor visits + pre-visit AI summary.
-- Re-runnable: existing single-doctor users get a default clinic backfilled.

-- 1) Clinics
create table if not exists public.clinics (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  invite_code text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists clinics_invite_code_idx on public.clinics (invite_code);

-- 2) Add role + clinic_id to doctors (kept named "doctors" to avoid breaking existing FKs)
alter table public.doctors
  add column if not exists role text not null default 'doctor'
    check (role in ('doctor', 'reception', 'admin'));

alter table public.doctors
  add column if not exists clinic_id uuid references public.clinics(id) on delete set null;

-- 3) Add clinic_id to patients & visits
alter table public.patients
  add column if not exists clinic_id uuid references public.clinics(id) on delete set null;

alter table public.visits
  add column if not exists clinic_id uuid references public.clinics(id) on delete set null;

alter table public.visits
  add column if not exists created_by uuid references public.doctors(id) on delete set null;

alter table public.visits
  add column if not exists pre_visit_summary text;

alter table public.visits
  add column if not exists pre_visit_summary_generated_at timestamptz;

-- 4) Multi-doctor assignment per visit
create table if not exists public.visit_doctors (
  visit_id uuid not null references public.visits(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  role text not null default 'attending'
    check (role in ('attending', 'resident', 'consultant')),
  assigned_at timestamptz not null default now(),
  primary key (visit_id, doctor_id)
);

create index if not exists visit_doctors_doctor_idx
  on public.visit_doctors (doctor_id, assigned_at desc);

-- 5) Helper: current user's clinic id (for RLS)
create or replace function public.current_clinic_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select clinic_id from public.doctors where id = auth.uid();
$$;

-- 6) Backfill: each existing doctor gets their own clinic if they don't have one
do $$
declare
  d record;
  new_id uuid;
begin
  for d in
    select id, full_name, clinic_name, clinic_address, clinic_phone
    from public.doctors
    where clinic_id is null
  loop
    insert into public.clinics (name, address, phone, invite_code)
    values (
      coalesce(nullif(d.clinic_name, ''), d.full_name || '''s Clinic'),
      d.clinic_address,
      d.clinic_phone,
      upper(substring(md5(random()::text || d.id::text) for 8))
    )
    returning id into new_id;

    -- The original signup is the clinic admin (only member at backfill time).
    update public.doctors set clinic_id = new_id, role = 'admin' where id = d.id;
    update public.patients set clinic_id = new_id where doctor_id = d.id and clinic_id is null;
    update public.visits set clinic_id = new_id where doctor_id = d.id and clinic_id is null;

    -- Backfill visit_doctors so the existing doctor is the attending on past visits
    insert into public.visit_doctors (visit_id, doctor_id, role)
    select v.id, d.id, 'attending'
    from public.visits v
    where v.doctor_id = d.id
    on conflict do nothing;
  end loop;
end $$;

-- 7) Replace patient/visit RLS with clinic-scoped policies

-- Patients
drop policy if exists "Doctors can view their patients" on public.patients;
drop policy if exists "Doctors can create their patients" on public.patients;
drop policy if exists "Doctors can update their patients" on public.patients;
drop policy if exists "Doctors can delete their patients" on public.patients;

create policy "Clinic members can view patients"
on public.patients for select
using (clinic_id = public.current_clinic_id());

create policy "Clinic members can create patients"
on public.patients for insert
with check (clinic_id = public.current_clinic_id());

create policy "Clinic members can update patients"
on public.patients for update
using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

create policy "Clinic members can delete patients"
on public.patients for delete
using (clinic_id = public.current_clinic_id());

-- Visits
drop policy if exists "Doctors can view their visits" on public.visits;
drop policy if exists "Doctors can create their visits" on public.visits;
drop policy if exists "Doctors can update their visits" on public.visits;
drop policy if exists "Doctors can delete their visits" on public.visits;

create policy "Clinic members can view visits"
on public.visits for select
using (clinic_id = public.current_clinic_id());

create policy "Clinic members can create visits"
on public.visits for insert
with check (clinic_id = public.current_clinic_id());

create policy "Clinic members can update visits"
on public.visits for update
using (clinic_id = public.current_clinic_id())
with check (clinic_id = public.current_clinic_id());

create policy "Clinic members can delete visits"
on public.visits for delete
using (clinic_id = public.current_clinic_id());

-- Doctors: members can view colleagues in same clinic; users always see themselves.
drop policy if exists "Doctors can view their profile" on public.doctors;
create policy "Members can view clinic colleagues"
on public.doctors for select
using (clinic_id = public.current_clinic_id() or id = auth.uid());

-- Audit events: scoped through doctor's clinic
drop policy if exists "Doctors can view their audit trail" on public.audit_events;
create policy "Clinic members can view audit"
on public.audit_events for select
using (
  exists (
    select 1 from public.doctors d
    where d.id = audit_events.doctor_id
      and d.clinic_id = public.current_clinic_id()
  )
);

-- visit_doctors RLS
alter table public.visit_doctors enable row level security;

drop policy if exists "Clinic members can view visit_doctors" on public.visit_doctors;
create policy "Clinic members can view visit_doctors"
on public.visit_doctors for select
using (
  exists (
    select 1 from public.visits v
    where v.id = visit_doctors.visit_id
      and v.clinic_id = public.current_clinic_id()
  )
);

drop policy if exists "Clinic members can manage visit_doctors" on public.visit_doctors;
create policy "Clinic members can manage visit_doctors"
on public.visit_doctors for all
using (
  exists (
    select 1 from public.visits v
    where v.id = visit_doctors.visit_id
      and v.clinic_id = public.current_clinic_id()
  )
)
with check (
  exists (
    select 1 from public.visits v
    where v.id = visit_doctors.visit_id
      and v.clinic_id = public.current_clinic_id()
  )
);

-- clinics RLS
alter table public.clinics enable row level security;

drop policy if exists "Members can view their clinic" on public.clinics;
create policy "Members can view their clinic"
on public.clinics for select
using (id = public.current_clinic_id());

drop policy if exists "Members can update their clinic" on public.clinics;
create policy "Members can update their clinic"
on public.clinics for update
using (id = public.current_clinic_id())
with check (id = public.current_clinic_id());

-- Anyone authenticated may insert a new clinic (used during onboarding when creating a new clinic)
drop policy if exists "Authenticated users can create clinics" on public.clinics;
create policy "Authenticated users can create clinics"
on public.clinics for insert
to authenticated
with check (true);

-- 8) Default clinic_id on inserts via trigger (so app code doesn't need to repeat it)
create or replace function public.set_clinic_id_from_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cid uuid;
begin
  if new.clinic_id is null then
    select clinic_id into v_cid from public.doctors where id = auth.uid();
    if v_cid is not null then
      new.clinic_id := v_cid;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists set_patients_clinic_id on public.patients;
create trigger set_patients_clinic_id
before insert on public.patients
for each row
execute function public.set_clinic_id_from_user();

drop trigger if exists set_visits_clinic_id on public.visits;
create trigger set_visits_clinic_id
before insert on public.visits
for each row
execute function public.set_clinic_id_from_user();

-- 9) Idempotent admin promotion: in any clinic that currently has exactly one
-- member, that lone member is the de-facto admin. Re-running the migration is
-- safe and won't downgrade clinics that already have a clear admin.
update public.doctors d
set role = 'admin'
where d.clinic_id is not null
  and d.role <> 'admin'
  and (
    select count(*) from public.doctors d2 where d2.clinic_id = d.clinic_id
  ) = 1;
