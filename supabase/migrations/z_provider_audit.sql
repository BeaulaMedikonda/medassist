-- App Provider audit events.
-- Runs after provider_mvp.sql so public.is_platform_admin() is available for RLS policies.

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid null,
  action text not null,
  entity_type text not null,
  entity_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.audit_events
  add column if not exists actor_id uuid null,
  add column if not exists action text,
  add column if not exists entity_type text,
  add column if not exists entity_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

create index if not exists audit_events_created_at_idx
  on public.audit_events (created_at desc);

create index if not exists audit_events_entity_idx
  on public.audit_events (entity_type, entity_id);

alter table public.audit_events enable row level security;

drop policy if exists "Platform admins can view audit events" on public.audit_events;
create policy "Platform admins can view audit events"
on public.audit_events for select
using (public.is_platform_admin());

drop policy if exists "Platform admins can insert audit events" on public.audit_events;
create policy "Platform admins can insert audit events"
on public.audit_events for insert
with check (public.is_platform_admin());

notify pgrst, 'reload schema';
