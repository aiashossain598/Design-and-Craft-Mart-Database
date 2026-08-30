-- ============================================================
-- Migration: login history tracking
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.login_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null references auth.users(id) on delete set null,
  email text null,
  event_type text not null check (event_type in ('login', 'logout', 'login_failed')),
  success boolean not null default true,
  login_at timestamptz not null default now(),
  logout_at timestamptz null,
  ip_address inet null,
  user_agent text null,
  session_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists login_history_user_id_idx
  on public.login_history (user_id);

create index if not exists login_history_login_at_idx
  on public.login_history (login_at desc);

create index if not exists login_history_event_type_idx
  on public.login_history (event_type);

alter table public.login_history enable row level security;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$ language sql security definer stable;

create policy "login_history_users_select_own"
  on public.login_history for select
  using (
    user_id = auth.uid() or public.is_admin()
  );

create policy "login_history_users_insert_own"
  on public.login_history for insert
  with check (
    user_id = auth.uid()
    and event_type in ('login', 'logout')
    and success = true
  );

create policy "login_history_no_user_update"
  on public.login_history for update
  using (false);

create policy "login_history_no_user_delete"
  on public.login_history for delete
  using (false);

-- NOTE:
-- Failed login attempts are intentionally not recorded from browser code.
-- Browser JavaScript cannot safely identify a real client IP and cannot securely
-- distinguish a valid failed-attempt insert from arbitrary unauthenticated inserts.
-- A trusted server-side endpoint or Supabase Edge Function would be required for
-- login_failed events without exposing unsafe auth behavior to the client.
