-- ============================================================
-- DCM Partner Hub: let partners save their own profile and photo
-- Run once in the Supabase SQL editor. Safe to run again.
--
-- Why: supabase-setup.sql only lets admins update user_profiles, so when a
-- partner saved a photo, position, mobile or address the update matched no
-- rows and the app reported a failure. This adds the missing policy and a
-- trigger so partners still cannot change their own role or approval status.
-- ============================================================

-- 1) Columns used by the profile page (no-op if they already exist)
alter table public.user_profiles add column if not exists avatar_url text;
alter table public.user_profiles add column if not exists position text;

-- 2) A partner may update their own row
drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile" on public.user_profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 3) ...but only an admin may change role or status
create or replace function public.protect_profile_privileges()
returns trigger as $$
begin
  if auth.uid() is not null
     and not public.is_admin()
     and (new.role is distinct from old.role or new.status is distinct from old.status) then
    raise exception 'Only an admin can change role or status';
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_profile_privileges on public.user_profiles;
create trigger protect_profile_privileges
  before update on public.user_profiles
  for each row execute procedure public.protect_profile_privileges();
