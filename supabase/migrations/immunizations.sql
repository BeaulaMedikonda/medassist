create table if not exists public.immunizations (
  id uuid primary key default gen_random_uuid(),

  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid references public.visits(id) on delete set null,

  created_by uuid,
  updated_by uuid,
  created_role text check (created_role in ('doctor', 'medical_assistant', 'admin')),

  vaccine_name text not null,
  date_given date not null,
  dose text,
  cvx_code text,

  status text not null default 'completed'
    check (status in ('completed', 'scheduled', 'declined', 'contraindicated')),

  next_due_date date,
  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists immunizations_clinic_id_idx
on public.immunizations(clinic_id);

create index if not exists immunizations_patient_id_idx
on public.immunizations(patient_id);

create index if not exists immunizations_visit_id_idx
on public.immunizations(visit_id);

create index if not exists immunizations_date_given_idx
on public.immunizations(date_given desc);

alter table public.immunizations enable row level security;

drop policy if exists "Clinic members can view immunizations" on public.immunizations;
create policy "Clinic members can view immunizations"
on public.immunizations
for select
using (
  exists (
    select 1
    from public.doctors d
    where d.id = auth.uid()
      and d.clinic_id = immunizations.clinic_id
  )
);

drop policy if exists "Clinic members can create immunizations" on public.immunizations;
create policy "Clinic members can create immunizations"
on public.immunizations
for insert
with check (
  exists (
    select 1
    from public.doctors current_member
    join public.patients p
      on p.id = immunizations.patient_id
     and p.clinic_id = current_member.clinic_id
    where current_member.id = auth.uid()
      and current_member.clinic_id = immunizations.clinic_id
      and (
        immunizations.created_by is null
        or immunizations.created_by = auth.uid()
      )
      and (
        immunizations.updated_by is null
        or immunizations.updated_by = auth.uid()
      )
      and (
        immunizations.created_role is null
        or immunizations.created_role = current_member.role
      )
  )
);

drop policy if exists "Clinic members can update immunizations" on public.immunizations;
create policy "Clinic members can update immunizations"
on public.immunizations
for update
using (
  exists (
    select 1
    from public.doctors d
    where d.id = auth.uid()
      and d.clinic_id = immunizations.clinic_id
  )
)
with check (
  exists (
    select 1
    from public.doctors current_member
    join public.patients p
      on p.id = immunizations.patient_id
     and p.clinic_id = current_member.clinic_id
    where current_member.id = auth.uid()
      and current_member.clinic_id = immunizations.clinic_id
      and (
        immunizations.updated_by is null
        or immunizations.updated_by = auth.uid()
      )
  )
);

drop policy if exists "Clinic members can delete immunizations" on public.immunizations;
create policy "Clinic members can delete immunizations"
on public.immunizations
for delete
using (
  exists (
    select 1
    from public.doctors d
    where d.id = auth.uid()
      and d.clinic_id = immunizations.clinic_id
  )
);

notify pgrst, 'reload schema';
