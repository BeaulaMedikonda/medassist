-- ===============================================================
-- TABLE: public.referrals
-- Clinic-scoped referrals to external specialists or hospitals
-- ===============================================================

create table if not exists public.referrals (
  id uuid primary key default extensions.gen_random_uuid(),

  clinic_id uuid not null references public.clinics(id),
  patient_id uuid not null references public.patients(id),
  visit_id uuid references public.visits(id),

  referring_doctor_id uuid not null references public.doctors(id),
  referred_to_doctor_id uuid references public.doctors(id),

  referred_to_name text not null,
  referred_to_specialty text not null,
  referred_to_hospital text,
  referred_to_phone text,
  referred_to_email text,

  reason text not null,
  notes text,

  status text not null default 'sent'
    check (status in ('draft', 'sent', 'accepted', 'completed', 'cancelled')),

  created_by uuid references public.doctors(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.referrals
  add column if not exists referred_to_doctor_id uuid references public.doctors(id);

update public.referrals referral
set referred_to_doctor_id = referred_doctor.id
from public.doctors referred_doctor
where referral.referred_to_doctor_id is null
  and referred_doctor.clinic_id = referral.clinic_id
  and lower(trim(referred_doctor.full_name)) = lower(trim(referral.referred_to_name));

create index if not exists referrals_clinic_patient_idx
  on public.referrals (clinic_id, patient_id, created_at desc);

create index if not exists referrals_doctor_idx
  on public.referrals (referring_doctor_id, created_at desc);

create index if not exists referrals_referred_to_doctor_idx
  on public.referrals (referred_to_doctor_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_referrals_updated_at on public.referrals;
create trigger set_referrals_updated_at
before update on public.referrals
for each row
execute function public.touch_updated_at();

alter table public.referrals enable row level security;

drop policy if exists "Clinic members can view referrals" on public.referrals;
create policy "Clinic members can view referrals"
on public.referrals
for select
using (
  exists (
    select 1
    from public.doctors d
    where d.id = auth.uid()
      and d.clinic_id = referrals.clinic_id
  )
);

drop policy if exists "Clinic members can create referrals" on public.referrals;
create policy "Clinic members can create referrals"
on public.referrals
for insert
with check (
  exists (
    select 1
    from public.doctors current_member
    join public.patients p
      on p.id = referrals.patient_id
     and p.clinic_id = current_member.clinic_id
    join public.doctors referring_doctor
      on referring_doctor.id = referrals.referring_doctor_id
     and referring_doctor.clinic_id = current_member.clinic_id
    where current_member.id = auth.uid()
      and current_member.clinic_id = referrals.clinic_id
      and (
        referrals.referred_to_doctor_id is null
        or exists (
          select 1
          from public.doctors referred_doctor
          where referred_doctor.id = referrals.referred_to_doctor_id
            and referred_doctor.clinic_id = current_member.clinic_id
        )
      )
      and (
        referrals.created_by is null
        or referrals.created_by = auth.uid()
      )
  )
);

drop policy if exists "Clinic members can update referrals" on public.referrals;
create policy "Clinic members can update referrals"
on public.referrals
for update
using (
  exists (
    select 1
    from public.doctors d
    where d.id = auth.uid()
      and d.clinic_id = referrals.clinic_id
  )
)
with check (
  exists (
    select 1
    from public.doctors current_member
    join public.patients p
      on p.id = referrals.patient_id
     and p.clinic_id = current_member.clinic_id
    join public.doctors referring_doctor
      on referring_doctor.id = referrals.referring_doctor_id
     and referring_doctor.clinic_id = current_member.clinic_id
    where current_member.id = auth.uid()
      and current_member.clinic_id = referrals.clinic_id
      and (
        referrals.referred_to_doctor_id is null
        or exists (
          select 1
          from public.doctors referred_doctor
          where referred_doctor.id = referrals.referred_to_doctor_id
            and referred_doctor.clinic_id = current_member.clinic_id
        )
      )
  )
);

drop policy if exists "Clinic members can delete referrals" on public.referrals;
create policy "Clinic members can delete referrals"
on public.referrals
for delete
using (
  exists (
    select 1
    from public.doctors d
    where d.id = auth.uid()
      and d.clinic_id = referrals.clinic_id
  )
);
