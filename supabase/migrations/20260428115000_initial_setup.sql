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
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default extensions.gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  emr_number text not null unique,
  full_name text not null,
  age integer,
  sex text check (sex in ('M', 'F', 'O')),
  phone text,
  email text,
  address text,
  blood_group text,
  known_allergies text,
  chronic_conditions text,
  emergency_contact text,
  created_at timestamptz not null default now(),
  last_visit_at timestamptz,
  unique (doctor_id, phone, full_name)
);

create table if not exists public.visits (
  id uuid primary key default extensions.gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  visit_date timestamptz not null default now(),
  bp_systolic integer,
  bp_diastolic integer,
  pulse integer,
  temperature_f numeric(4, 1),
  spo2 integer,
  weight_kg numeric(5, 2),
  height_cm numeric(5, 2),
  chief_complaints text,
  history_present_illness text,
  past_history text,
  examination_findings text,
  provisional_diagnosis text,
  confirmed_diagnosis text,
  icd_codes text[],
  investigations_ordered text,
  prescription jsonb,
  advice text,
  follow_up_date date,
  follow_up_notes text,
  audio_url text,
  transcript_text text,
  transcript_original text,
  transcript_language text,
  transcript_speakers jsonb,
  doctor_speaker_id text,
  doctor_id_confidence text check (doctor_id_confidence in ('high', 'medium', 'low')),
  llm_extraction_raw jsonb,
  doctor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default extensions.gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  actor_id uuid,
  entity_type text not null check (entity_type in ('visit')),
  entity_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete')),
  payload jsonb,
  created_at timestamptz not null default now()
);

create index if not exists patients_last_visit_idx on public.patients (doctor_id, last_visit_at desc);
create index if not exists patients_name_search_idx on public.patients using gin (to_tsvector('simple', full_name));
create index if not exists visits_patient_date_idx on public.visits (patient_id, visit_date desc);
create index if not exists visits_doctor_date_idx on public.visits (doctor_id, visit_date desc);
create index if not exists audit_events_doctor_created_idx on public.audit_events (doctor_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_patient_last_visit()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    update public.patients
      set last_visit_at = (
        select max(v.visit_date)
        from public.visits v
        where v.patient_id = old.patient_id
      )
    where id = old.patient_id;

    return old;
  end if;

  update public.patients
    set last_visit_at = (
      select max(v.visit_date)
      from public.visits v
      where v.patient_id = new.patient_id
    )
  where id = new.patient_id;

  if tg_op = 'UPDATE' and old.patient_id is distinct from new.patient_id then
    update public.patients
      set last_visit_at = (
        select max(v.visit_date)
        from public.visits v
        where v.patient_id = old.patient_id
      )
    where id = old.patient_id;
  end if;

  return new;
end;
$$;

create or replace function public.audit_visit_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doctor_id uuid;
  v_entity_id uuid;
  v_action text;
  v_payload jsonb;
begin
  if tg_op = 'DELETE' then
    v_doctor_id := old.doctor_id;
    v_entity_id := old.id;
    v_action := 'delete';
    v_payload := jsonb_build_object('old', to_jsonb(old));
  elsif tg_op = 'UPDATE' then
    v_doctor_id := new.doctor_id;
    v_entity_id := new.id;
    v_action := 'update';
    v_payload := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
  else
    v_doctor_id := new.doctor_id;
    v_entity_id := new.id;
    v_action := 'create';
    v_payload := jsonb_build_object('new', to_jsonb(new));
  end if;

  insert into public.audit_events (
    doctor_id,
    actor_id,
    entity_type,
    entity_id,
    action,
    payload
  )
  values (
    v_doctor_id,
    coalesce(auth.uid(), v_doctor_id),
    'visit',
    v_entity_id,
    v_action,
    v_payload
  );

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists set_visits_updated_at on public.visits;
create trigger set_visits_updated_at
before update on public.visits
for each row
execute function public.touch_updated_at();

drop trigger if exists sync_patient_last_visit_after_change on public.visits;
create trigger sync_patient_last_visit_after_change
after insert or update or delete on public.visits
for each row
execute function public.sync_patient_last_visit();

drop trigger if exists audit_visit_changes_after_write on public.visits;
create trigger audit_visit_changes_after_write
after insert or update or delete on public.visits
for each row
execute function public.audit_visit_changes();

alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.visits enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "Doctors can view their profile" on public.doctors;
create policy "Doctors can view their profile"
on public.doctors
for select
using (id = auth.uid());

drop policy if exists "Doctors can create their profile" on public.doctors;
create policy "Doctors can create their profile"
on public.doctors
for insert
with check (id = auth.uid());

drop policy if exists "Doctors can update their profile" on public.doctors;
create policy "Doctors can update their profile"
on public.doctors
for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "Doctors can view their patients" on public.patients;
create policy "Doctors can view their patients"
on public.patients
for select
using (doctor_id = auth.uid());

drop policy if exists "Doctors can create their patients" on public.patients;
create policy "Doctors can create their patients"
on public.patients
for insert
with check (doctor_id = auth.uid());

drop policy if exists "Doctors can update their patients" on public.patients;
create policy "Doctors can update their patients"
on public.patients
for update
using (doctor_id = auth.uid())
with check (doctor_id = auth.uid());

drop policy if exists "Doctors can delete their patients" on public.patients;
create policy "Doctors can delete their patients"
on public.patients
for delete
using (doctor_id = auth.uid());

drop policy if exists "Doctors can view their visits" on public.visits;
create policy "Doctors can view their visits"
on public.visits
for select
using (doctor_id = auth.uid());

drop policy if exists "Doctors can create their visits" on public.visits;
create policy "Doctors can create their visits"
on public.visits
for insert
with check (doctor_id = auth.uid());

drop policy if exists "Doctors can update their visits" on public.visits;
create policy "Doctors can update their visits"
on public.visits
for update
using (doctor_id = auth.uid())
with check (doctor_id = auth.uid());

drop policy if exists "Doctors can delete their visits" on public.visits;
create policy "Doctors can delete their visits"
on public.visits
for delete
using (doctor_id = auth.uid());

drop policy if exists "Doctors can view their audit trail" on public.audit_events;
create policy "Doctors can view their audit trail"
on public.audit_events
for select
using (doctor_id = auth.uid());

insert into storage.buckets (id, name, public)
values
  ('visit-audio', 'visit-audio', false),
  ('prescriptions', 'prescriptions', false),
  ('doctor-assets', 'doctor-assets', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Doctors can read own private files" on storage.objects;
create policy "Doctors can read own private files"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('visit-audio', 'prescriptions', 'doctor-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Doctors can upload own private files" on storage.objects;
create policy "Doctors can upload own private files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('visit-audio', 'prescriptions', 'doctor-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Doctors can update own private files" on storage.objects;
create policy "Doctors can update own private files"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('visit-audio', 'prescriptions', 'doctor-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id in ('visit-audio', 'prescriptions', 'doctor-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Doctors can delete own private files" on storage.objects;
create policy "Doctors can delete own private files"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('visit-audio', 'prescriptions', 'doctor-assets')
  and (storage.foldername(name))[1] = auth.uid()::text
);
