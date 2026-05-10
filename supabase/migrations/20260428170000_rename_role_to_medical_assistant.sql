-- Rename the "reception" role to "medical_assistant" to match clinical terminology.
-- Idempotent: re-running this is safe.

-- Drop the old check constraint so we can update values
alter table public.doctors drop constraint if exists doctors_role_check;

-- Migrate existing rows
update public.doctors set role = 'medical_assistant' where role = 'reception';

-- Reinstate the constraint with the new value set
alter table public.doctors
  add constraint doctors_role_check
  check (role in ('doctor', 'medical_assistant', 'admin'));
