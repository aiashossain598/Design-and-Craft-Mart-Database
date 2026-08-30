-- ============================================================
-- Safe upgrade for existing public.login_history table
-- ============================================================

create extension if not exists pgcrypto;

-- Ensure the table exists without recreating it.
create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  email text null,
  event_type text null,
  success boolean null,
  login_at timestamptz null,
  logout_at timestamptz null,
  ip_address inet null,
  user_agent text null,
  session_id text null,
  metadata jsonb null,
  created_at timestamptz not null default now()
);

alter table public.login_history
  add column if not exists user_id uuid,
  add column if not exists email text,
  add column if not exists event_type text,
  add column if not exists success boolean,
  add column if not exists login_at timestamptz,
  add column if not exists logout_at timestamptz,
  add column if not exists ip_address inet,
  add column if not exists user_agent text,
  add column if not exists session_id text,
  add column if not exists metadata jsonb,
  add column if not exists created_at timestamptz;

-- Backfill existing rows without destroying history.
update public.login_history
set
  event_type = coalesce(event_type, 'login'),
  success = coalesce(success, true),
  metadata = coalesce(metadata, '{}'::jsonb),
  created_at = coalesce(created_at, now())
where event_type is null
   or success is null
   or metadata is null
   or created_at is null;

-- Ensure the core columns have defaults that match the app.
alter table public.login_history
  alter column event_type set default 'login',
  alter column success set default true,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now();

-- Add the foreign key safely if it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'login_history_user_id_fkey'
  ) then
    alter table public.login_history
      add constraint login_history_user_id_fkey
      foreign key (user_id)
      references auth.users(id)
      on delete cascade;
  end if;
end $$;

-- Keep the table compatible with the current design but do not force a null-sensitive
-- migration on older data that may still have legacy records.
alter table public.login_history
  alter column user_id type uuid using user_id::uuid;

create index if not exists login_history_user_id_idx
  on public.login_history (user_id);

create index if not exists login_history_login_at_idx
  on public.login_history (login_at desc);

create index if not exists login_history_event_type_idx
  on public.login_history (event_type);

alter table public.login_history enable row level security;

-- Do not override an existing admin helper if the project already has one.
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'is_admin'
  ) then
    create function public.is_admin()
    returns boolean
    language sql
    security definer
    stable
    as $$
      select exists (
        select 1
        from public.user_profiles
        where id = auth.uid()
          and role = 'admin'
          and status = 'approved'
      );
    $$;
  end if;
end $$;

drop policy if exists "login_history_select_own_or_admin" on public.login_history;
drop policy if exists "login_history_insert_own" on public.login_history;
drop policy if exists "login_history_update_block" on public.login_history;
drop policy if exists "login_history_delete_block" on public.login_history;

create policy "login_history_select_own_or_admin"
  on public.login_history for select
  using (
    user_id = auth.uid()
    or public.is_admin()
  );

create policy "login_history_insert_own"
  on public.login_history for insert
  with check (
    user_id = auth.uid()
    and event_type in ('login', 'logout')
    and success = true
  );

create policy "login_history_update_block"
  on public.login_history for update
  using (false)
  with check (false);

create policy "login_history_delete_block"
  on public.login_history for delete
  using (false);

-- NOTE:
-- Failed login attempts are intentionally not recorded from browser JavaScript.
-- Browser code cannot safely determine an IP address or create authenticated,
-- trusted failed-login records without a server-side auth hook or Edge Function.
