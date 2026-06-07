-- Provider / app-owner MVP console.
-- Adds platform-owner access, clinic subscription metadata, and feature flags.

alter table if exists public.api_usage_events
  add column if not exists cost_inr numeric(12, 4) not null default 0;

create table if not exists public.platform_admins (
  id uuid primary key default extensions.gen_random_uuid(),
  auth_user_id uuid unique not null,
  email text unique not null,
  full_name text,
  role text not null default 'platform_admin'
    check (role in ('platform_owner', 'platform_admin', 'platform_support', 'platform_billing')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_subscriptions (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid unique not null references public.clinics(id) on delete cascade,
  plan_code text not null default 'trial'
    check (plan_code in ('trial', 'basic', 'pro', 'enterprise')),
  status text not null default 'trial'
    check (status in ('trial', 'active', 'past_due', 'expired', 'suspended', 'cancelled')),
  monthly_fee_inr numeric(12, 2) not null default 0,
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  payment_status text not null default 'not_started'
    check (payment_status in ('not_started', 'paid', 'unpaid', 'overdue', 'waived')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_invoices (
  id uuid primary key default extensions.gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  subscription_id uuid references public.clinic_subscriptions(id) on delete set null,
  invoice_number text unique,
  amount_inr numeric(12, 2) not null default 0,
  status text not null default 'draft'
    check (status in ('draft', 'issued', 'paid', 'overdue', 'void')),
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_feature_flags (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  pharmacy boolean not null default true,
  appointments boolean not null default true,
  patient_portal boolean not null default true,
  fhir_export boolean not null default false,
  ai_extraction boolean not null default true,
  pre_visit_summary boolean not null default true,
  fax boolean not null default false,
  multilingual boolean not null default true,
  immunizations boolean not null default true,
  referrals boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create index if not exists platform_admins_auth_user_idx
  on public.platform_admins (auth_user_id)
  where status = 'active';

create index if not exists clinic_subscriptions_status_idx
  on public.clinic_subscriptions (status, payment_status);

create index if not exists clinic_invoices_clinic_status_idx
  on public.clinic_invoices (clinic_id, status, created_at desc);

drop trigger if exists set_platform_admins_updated_at on public.platform_admins;
create trigger set_platform_admins_updated_at
before update on public.platform_admins
for each row
execute function public.touch_updated_at();

drop trigger if exists set_clinic_subscriptions_updated_at on public.clinic_subscriptions;
create trigger set_clinic_subscriptions_updated_at
before update on public.clinic_subscriptions
for each row
execute function public.touch_updated_at();

create or replace function public.touch_feature_flags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_clinic_feature_flags_updated_at on public.clinic_feature_flags;
create trigger set_clinic_feature_flags_updated_at
before update on public.clinic_feature_flags
for each row
execute function public.touch_feature_flags_updated_at();

alter table public.platform_admins enable row level security;
alter table public.clinic_subscriptions enable row level security;
alter table public.clinic_invoices enable row level security;
alter table public.clinic_feature_flags enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins pa
    where pa.auth_user_id = auth.uid()
      and pa.status = 'active'
  );
$$;

drop policy if exists "Platform admins can view platform admins" on public.platform_admins;
create policy "Platform admins can view platform admins"
on public.platform_admins for select
using (public.is_platform_admin());

drop policy if exists "Platform admins can view subscriptions" on public.clinic_subscriptions;
create policy "Platform admins can view subscriptions"
on public.clinic_subscriptions for select
using (public.is_platform_admin());

drop policy if exists "Platform admins can manage subscriptions" on public.clinic_subscriptions;
create policy "Platform admins can manage subscriptions"
on public.clinic_subscriptions for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "Platform admins can view invoices" on public.clinic_invoices;
create policy "Platform admins can view invoices"
on public.clinic_invoices for select
using (public.is_platform_admin());

drop policy if exists "Platform admins can manage invoices" on public.clinic_invoices;
create policy "Platform admins can manage invoices"
on public.clinic_invoices for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

drop policy if exists "Platform admins can view feature flags" on public.clinic_feature_flags;
create policy "Platform admins can view feature flags"
on public.clinic_feature_flags for select
using (public.is_platform_admin());

drop policy if exists "Platform admins can manage feature flags" on public.clinic_feature_flags;
create policy "Platform admins can manage feature flags"
on public.clinic_feature_flags for all
using (public.is_platform_admin())
with check (public.is_platform_admin());

notify pgrst, 'reload schema';
