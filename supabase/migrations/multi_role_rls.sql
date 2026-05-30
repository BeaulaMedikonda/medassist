-- Multi-role / multi-clinic RLS repair.
-- A single Supabase Auth user may own multiple staff rows in public.doctors
-- through doctors.auth_user_id. Policies must therefore check clinic
-- membership, not doctors.id = auth.uid().

alter table public.doctors
  add column if not exists auth_user_id uuid,
  add column if not exists email text;

create or replace function public.is_clinic_member(target_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.doctors d
    where d.clinic_id = target_clinic_id
      and (
        d.auth_user_id = auth.uid()
        or d.id = auth.uid()
      )
  );
$$;

create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.clinic_id
  from public.doctors d
  where d.auth_user_id = auth.uid()
     or d.id = auth.uid()
  order by d.created_at asc
  limit 1;
$$;

drop policy if exists "Doctors can view their patients" on public.patients;
drop policy if exists "Doctors can create their patients" on public.patients;
drop policy if exists "Doctors can update their patients" on public.patients;
drop policy if exists "Doctors can delete their patients" on public.patients;
drop policy if exists "Clinic members can view patients" on public.patients;
drop policy if exists "Clinic members can create patients" on public.patients;
drop policy if exists "Clinic members can update patients" on public.patients;
drop policy if exists "Clinic members can delete patients" on public.patients;

create policy "Clinic members can view patients"
on public.patients
for select
using (public.is_clinic_member(clinic_id));

create policy "Clinic members can create patients"
on public.patients
for insert
with check (public.is_clinic_member(clinic_id));

create policy "Clinic members can update patients"
on public.patients
for update
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

create policy "Clinic members can delete patients"
on public.patients
for delete
using (public.is_clinic_member(clinic_id));

drop policy if exists "Doctors can view their visits" on public.visits;
drop policy if exists "Doctors can create their visits" on public.visits;
drop policy if exists "Doctors can update their visits" on public.visits;
drop policy if exists "Doctors can delete their visits" on public.visits;
drop policy if exists "Clinic members can view visits" on public.visits;
drop policy if exists "Clinic members can create visits" on public.visits;
drop policy if exists "Clinic members can update visits" on public.visits;
drop policy if exists "Clinic members can delete visits" on public.visits;

create policy "Clinic members can view visits"
on public.visits
for select
using (public.is_clinic_member(clinic_id));

create policy "Clinic members can create visits"
on public.visits
for insert
with check (public.is_clinic_member(clinic_id));

create policy "Clinic members can update visits"
on public.visits
for update
using (public.is_clinic_member(clinic_id))
with check (public.is_clinic_member(clinic_id));

create policy "Clinic members can delete visits"
on public.visits
for delete
using (public.is_clinic_member(clinic_id));

drop trigger if exists set_patients_clinic_id on public.patients;
drop trigger if exists set_visits_clinic_id on public.visits;

notify pgrst, 'reload schema';
