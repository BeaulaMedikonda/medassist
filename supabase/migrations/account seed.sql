-- Seed team accounts for Krypton Labs clinic.
-- Idempotent: skips any email that already exists in auth.users.
-- Each account is created with an email-confirmed Supabase auth row + matching identity + clinic-scoped doctors row.
--
-- Temp passwords printed via RAISE NOTICE — capture from the SQL Editor output panel and share with the team.
-- They can change their password after first sign-in (or you can rotate via Supabase dashboard).
--
-- Requires: 20260428160000_multi_role.sql and 20260428170000_rename_role_to_medical_assistant.sql to be applied first.

create extension if not exists pgcrypto;

do $$
declare
  target_clinic uuid;
  rec record;
  new_user_id uuid;
  identity_id uuid;
  team_members text[][] := array[
    -- email, full_name, role, temp_password, qualification, registration_number
    array['venkat@kryptonlabs.ai',         'Venkat',          'doctor',            'Venkat2026!',      'MBBS', ''],
    array['abhijit@kryptonlabs.ai',        'Abhijit',         'doctor',            'Abhijit2026!',     'MBBS', ''],
    array['chiranjeevi@kryptonlabs.ai',    'Chiranjeevi',     'doctor',            'Chiranjeevi2026!', 'MBBS', ''],
    array['saidharamtej@kryptonlabs.ai',   'Sai Dharam Tej',  'medical_assistant', 'SaiDharam2026!',   '',     '']
  ];
  i int;
begin
  -- Find the clinic to attach these accounts to: the first admin's clinic.
  select clinic_id into target_clinic
  from public.doctors
  where role = 'admin' and clinic_id is not null
  order by created_at asc
  limit 1;

  if target_clinic is null then
    raise exception 'No admin clinic found. Run 20260428160000_multi_role.sql first and ensure at least one admin exists.';
  end if;

  raise notice 'Seeding into clinic %', target_clinic;

  for i in 1 .. array_length(team_members, 1) loop
    declare
      m_email text := team_members[i][1];
      m_name text := team_members[i][2];
      m_role text := team_members[i][3];
      m_password text := team_members[i][4];
      m_qual text := team_members[i][5];
      m_regno text := team_members[i][6];
    begin
      -- Skip if already provisioned
      select id into new_user_id from auth.users where email = m_email;
      if new_user_id is not null then
        raise notice '  - % already exists (id %), skipping', m_email, new_user_id;
        continue;
      end if;

      new_user_id := gen_random_uuid();
      identity_id := gen_random_uuid();

      insert into auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token,
        is_super_admin,
        is_sso_user,
        is_anonymous
      ) values (
        '00000000-0000-0000-0000-000000000000',
        new_user_id,
        'authenticated',
        'authenticated',
        m_email,
        crypt(m_password, gen_salt('bf')),
        now(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('full_name', m_name),
        now(),
        now(),
        '',
        '',
        '',
        '',
        false,
        false,
        false
      );

      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        identity_id,
        new_user_id,
        jsonb_build_object(
          'sub', new_user_id::text,
          'email', m_email,
          'email_verified', true,
          'phone_verified', false
        ),
        'email',
        new_user_id::text,
        now(),
        now(),
        now()
      );

      insert into public.doctors (
        id,
        full_name,
        qualification,
        registration_number,
        clinic_id,
        role,
        preferred_language
      ) values (
        new_user_id,
        m_name,
        nullif(m_qual, ''),
        nullif(m_regno, ''),
        target_clinic,
        m_role,
        'en'
      );

      raise notice '  + Created % (%) — temp password: %', m_email, m_role, m_password;
    end;
  end loop;

  raise notice 'Done. Share the temp passwords above with each team member; they can rotate after first login.';
end $$;
