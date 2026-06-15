-- Allow both legacy staff rows (doctors.id = auth.uid()) and newer
-- multi-role rows (doctors.auth_user_id = auth.uid()) to manage their profile.
 
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
 
drop policy if exists "Doctors can view their profile" on public.doctors;
drop policy if exists "Doctors can create their profile" on public.doctors;
drop policy if exists "Doctors can update their profile" on public.doctors;
drop policy if exists "Members can view clinic colleagues" on public.doctors;
drop policy if exists "Members can update own staff profile" on public.doctors;
drop policy if exists "Members can create own staff profile" on public.doctors;
 
create policy "Members can view clinic colleagues"
on public.doctors
for select
to authenticated
using (
  id = auth.uid()
  or auth_user_id = auth.uid()
  or public.is_clinic_member(clinic_id)
);
 
create policy "Members can create own staff profile"
on public.doctors
for insert
to authenticated
with check (
  id = auth.uid()
  or auth_user_id = auth.uid()
);
 
create policy "Members can update own staff profile"
on public.doctors
for update
to authenticated
using (
  id = auth.uid()
  or auth_user_id = auth.uid()
)
with check (
  id = auth.uid()
  or auth_user_id = auth.uid()
);
 
notify pgrst, 'reload schema';
 
 
 