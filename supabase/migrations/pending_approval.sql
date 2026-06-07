-- Add pending_approval as a valid clinic_subscriptions status.
-- New clinic admins start in this state until the App Provider approves them.

-- PostgreSQL auto-names the unnamed column check constraint as {table}_{column}_check.
ALTER TABLE public.clinic_subscriptions
  DROP CONSTRAINT IF EXISTS clinic_subscriptions_status_check;

ALTER TABLE public.clinic_subscriptions
  ADD CONSTRAINT clinic_subscriptions_status_check
  CHECK (status IN ('pending_approval', 'trial', 'active', 'past_due', 'expired', 'suspended', 'cancelled'));

notify pgrst, 'reload schema';
