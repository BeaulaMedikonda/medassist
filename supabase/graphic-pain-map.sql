create table if not exists public.graphic_pain_maps (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.patients(id) on delete cascade,
  visit_id uuid not null references public.visits(id) on delete cascade,
  created_by uuid not null references public.doctors(id) on delete restrict,
  pain_type text not null,
  intensity integer not null check (intensity between 0 and 10),
  pain_locations text[] not null default '{}',
  marked_points text[] not null default '{}',
  pain_summary text,
  markers jsonb not null default '[]'::jsonb check (jsonb_typeof(markers) = 'array'),
  created_at timestamptz not null default now()
);

alter table public.graphic_pain_maps
  add column if not exists pain_locations text[] not null default '{}',
  add column if not exists marked_points text[] not null default '{}',
  add column if not exists pain_summary text;

create index if not exists graphic_pain_maps_clinic_id_idx
  on public.graphic_pain_maps(clinic_id);

create index if not exists graphic_pain_maps_patient_id_idx
  on public.graphic_pain_maps(patient_id);

create index if not exists graphic_pain_maps_visit_id_idx
  on public.graphic_pain_maps(visit_id);

create or replace view public.graphic_pain_map_points
with (security_invoker = true)
as
select
  gpm.id as pain_map_id,
  gpm.clinic_id,
  gpm.patient_id,
  gpm.visit_id,
  gpm.created_by,
  gpm.created_at,
  point.ordinality::integer as point_number,
  gpm.pain_locations,
  gpm.marked_points,
  gpm.pain_summary,
  point.marker ->> 'side' as body_side,
  point.marker ->> 'location' as pain_location,
  coalesce(point.marker ->> 'painType', gpm.pain_type) as pain_type,
  coalesce((point.marker ->> 'intensity')::integer, gpm.intensity) as intensity,
  (point.marker ->> 'x')::numeric as x,
  (point.marker ->> 'y')::numeric as y,
  concat(
    point.ordinality,
    '. ',
    point.marker ->> 'location',
    ' - ',
    coalesce(point.marker ->> 'painType', gpm.pain_type),
    ' - ',
    coalesce((point.marker ->> 'intensity')::integer, gpm.intensity),
    '/10'
  ) as marked_point_label
from public.graphic_pain_maps gpm
cross join lateral jsonb_array_elements(gpm.markers)
  with ordinality as point(marker, ordinality);

alter table public.graphic_pain_maps enable row level security;

drop policy if exists "Clinic members can read pain maps"
  on public.graphic_pain_maps;
create policy "Clinic members can read pain maps"
  on public.graphic_pain_maps
  for select
  using (clinic_id = public.current_clinic_id());

drop policy if exists "Clinic members can create pain maps"
  on public.graphic_pain_maps;
create policy "Clinic members can create pain maps"
  on public.graphic_pain_maps
  for insert
  with check (
    created_by = auth.uid()
    and clinic_id = public.current_clinic_id()
  );

drop policy if exists "Creators can update pain maps"
  on public.graphic_pain_maps;
create policy "Creators can update pain maps"
  on public.graphic_pain_maps
  for update
  using (
    created_by = auth.uid()
    and clinic_id = public.current_clinic_id()
  )
  with check (
    created_by = auth.uid()
    and clinic_id = public.current_clinic_id()
  );

drop policy if exists "Creators can delete pain maps"
  on public.graphic_pain_maps;
create policy "Creators can delete pain maps"
  on public.graphic_pain_maps
  for delete
  using (
    created_by = auth.uid()
    and clinic_id = public.current_clinic_id()
  );
