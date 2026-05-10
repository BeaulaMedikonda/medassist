-- =============================================================================
-- Switch cost tracking from USD to INR.
-- =============================================================================
-- Sarvam pricing: ₹45 / hour → ₹0.0125 per second.
-- Claude pricing in INR at ~₹85 per USD (adjust the constant in lib/usage.ts
-- if the exchange rate drifts significantly; old rows stay at the rate logged).
-- =============================================================================

-- 1. Rename the cost column in-place (preserves existing rows, no data loss).
alter table public.api_usage_events
  rename column cost_usd to cost_inr;

-- 2. Tighten the precision: INR amounts rarely need 6 decimal places.
alter table public.api_usage_events
  alter column cost_inr type numeric(12, 4);

-- 3. Recreate the monthly summary view with the new column name.
drop view if exists public.api_usage_monthly;

create or replace view public.api_usage_monthly as
select
  clinic_id,
  service,
  date_trunc('month', created_at)::date as month,
  count(*)                                   as call_count,
  sum(coalesce(audio_duration_seconds, 0))   as audio_seconds,
  sum(coalesce(input_tokens, 0))             as input_tokens,
  sum(coalesce(output_tokens, 0))            as output_tokens,
  sum(coalesce(cache_creation_input_tokens, 0)) as cache_creation_tokens,
  sum(coalesce(cache_read_input_tokens, 0))     as cache_read_tokens,
  sum(cost_inr)                              as cost_inr
from public.api_usage_events
group by clinic_id, service, date_trunc('month', created_at);

alter view public.api_usage_monthly set (security_invoker = true);
