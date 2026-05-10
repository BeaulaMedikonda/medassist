-- =============================================================================
-- API usage events — per-call cost tracking for Sarvam STT and Claude.
-- =============================================================================
-- Every Sarvam transcription, Claude extraction, and Claude pre-visit summary
-- writes one row here with token / duration counts and a pre-computed USD cost
-- so admins can audit spend over time. Inserts come from server-side API
-- routes only (using the service-role admin client) — never from the client.
-- =============================================================================

create table if not exists public.api_usage_events (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  user_id uuid references public.doctors(id) on delete set null,
  visit_id uuid references public.visits(id) on delete set null,

  -- Which provider + model handled the call.
  service text not null check (
    service in (
      'sarvam_stt',
      'claude_haiku_4_5',
      'claude_sonnet_4_6',
      'claude_opus_4_7'
    )
  ),
  -- What we asked it to do: 'transcribe', 'extract', 'pre_visit_summary', etc.
  operation text not null,

  -- Sarvam-specific
  audio_duration_seconds numeric(10, 2),

  -- Claude-specific (token counts)
  input_tokens int,
  output_tokens int,
  cache_creation_input_tokens int,
  cache_read_input_tokens int,

  -- Computed USD cost. Stored at insert time so price changes don't rewrite history.
  cost_usd numeric(12, 6) not null default 0,

  -- Free-form metadata (e.g. job id, model id string, request id).
  metadata jsonb,

  created_at timestamptz not null default now()
);

create index if not exists api_usage_events_clinic_idx
  on public.api_usage_events (clinic_id, created_at desc);

create index if not exists api_usage_events_visit_idx
  on public.api_usage_events (visit_id);

create index if not exists api_usage_events_service_idx
  on public.api_usage_events (service, created_at desc);

-- RLS: clinic members can read their clinic's usage. Inserts only via the
-- admin client on the server (which bypasses RLS). No client-side INSERT policy.
alter table public.api_usage_events enable row level security;

drop policy if exists "Clinic members can view usage" on public.api_usage_events;
create policy "Clinic members can view usage"
on public.api_usage_events for select
using (clinic_id = public.current_clinic_id());

-- Convenience: monthly totals per clinic + service. Useful for an admin
-- dashboard widget without recomputing each request.
create or replace view public.api_usage_monthly as
select
  clinic_id,
  service,
  date_trunc('month', created_at)::date as month,
  count(*)                              as call_count,
  sum(coalesce(audio_duration_seconds, 0)) as audio_seconds,
  sum(coalesce(input_tokens, 0))           as input_tokens,
  sum(coalesce(output_tokens, 0))          as output_tokens,
  sum(coalesce(cache_creation_input_tokens, 0)) as cache_creation_tokens,
  sum(coalesce(cache_read_input_tokens, 0))     as cache_read_tokens,
  sum(cost_usd)                            as cost_usd
from public.api_usage_events
group by clinic_id, service, date_trunc('month', created_at);

-- The view inherits RLS from the underlying table when accessed via
-- security_invoker, but Postgres views are by default security_definer in
-- terms of permissions. To keep things tight, recreate as security_invoker:
alter view public.api_usage_monthly set (security_invoker = true);
