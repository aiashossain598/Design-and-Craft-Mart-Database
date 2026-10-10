-- ============================================================
-- DCM Partner Hub: Leads pipeline + Order history
-- Run this once in the Supabase SQL editor (after supabase-setup.sql).
-- Safe to re-run: every statement checks for existing objects.
-- ============================================================

-- ---------- 1) LEADS ----------
-- An inquiry that has not become an order yet.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  contact text,
  interest text not null,
  value numeric,
  source text not null default 'messenger'
    check (source in ('messenger','facebook','phone','other')),
  stage text not null default 'new'
    check (stage in ('new','quote_sent','follow_up','converted','lost')),
  follow_up_at timestamptz,
  order_id uuid references public.orders(id) on delete set null,
  created_by uuid references public.user_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_stage_idx on public.leads (stage);
create index if not exists leads_follow_up_idx on public.leads (follow_up_at);

alter table public.leads enable row level security;

drop policy if exists "approved read leads" on public.leads;
create policy "approved read leads" on public.leads for select
  using (public.is_approved());

drop policy if exists "approved insert leads" on public.leads;
create policy "approved insert leads" on public.leads for insert
  with check (public.is_approved());

drop policy if exists "approved update leads" on public.leads;
create policy "approved update leads" on public.leads for update
  using (public.is_approved());

drop policy if exists "admin delete leads" on public.leads;
create policy "admin delete leads" on public.leads for delete
  using (public.is_admin());

-- ---------- 2) ORDER EVENTS (history) ----------
-- One row per change: order created, status moved, or a team note.
-- Rows are append-only: there is no update or delete policy.
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null check (event_type in ('created','status_changed','note')),
  from_status text,
  to_status text,
  note text,
  actor_id uuid references public.user_profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists order_events_order_idx
  on public.order_events (order_id, created_at desc);

alter table public.order_events enable row level security;

drop policy if exists "approved read order events" on public.order_events;
create policy "approved read order events" on public.order_events for select
  using (public.is_approved());

drop policy if exists "approved add order events" on public.order_events;
create policy "approved add order events" on public.order_events for insert
  with check (public.is_approved() and actor_id = auth.uid());

-- ============================================================
-- OPTIONAL HARDENING (not run by default)
-- If you enable the "Users can update own profile" policy from
-- supabase_migrations_add_user_profiles_fields.sql as written, a partner
-- could also change their own role and status. This trigger blocks that
-- for everyone except admins and the SQL editor (where auth.uid() is null).
-- Remove the leading "-- " from each line to enable.
-- ============================================================
-- create or replace function public.protect_profile_privileges()
-- returns trigger as $$
-- begin
--   if auth.uid() is not null and not public.is_admin()
--      and (new.role is distinct from old.role or new.status is distinct from old.status) then
--     raise exception 'Only an admin can change role or status';
--   end if;
--   return new;
-- end;
-- $$ language plpgsql security definer;
--
-- drop trigger if exists protect_profile_privileges on public.user_profiles;
-- create trigger protect_profile_privileges
--   before update on public.user_profiles
--   for each row execute procedure public.protect_profile_privileges();
