-- ============================================================
-- Team Hub — Database Schema (Phase 1 MVP)
-- পুরো ফাইলটা কপি করে Supabase SQL Editor-এ Run করো
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- 1) USER PROFILES ----------
-- প্রতিটা auth user-এর জন্য একটা প্রোফাইল, role আর approval status সহ
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  mobile text not null,
  address text not null,
  fb_profile text,
  role text not null default 'partner' check (role in ('admin','partner')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);

-- নতুন কেউ সাইনআপ করলেই (join-request ফর্ম থেকে) স্বয়ংক্রিয়ভাবে
-- একটা pending প্রোফাইল তৈরি হবে, ফর্মে দেওয়া তথ্য দিয়ে
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, mobile, address, fb_profile, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'mobile',''),
    coalesce(new.raw_user_meta_data->>'address',''),
    coalesce(new.raw_user_meta_data->>'fb_profile',''),
    'partner',
    'pending'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- 2) CUSTOMERS ----------
create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  created_at timestamptz default now()
);

-- ---------- 3) CONTENT ----------
create table content (
  id uuid primary key default gen_random_uuid(),
  file_url text not null,
  caption text not null,
  status text not null default 'pending_approval' check (status in ('pending_approval','posted','rejected')),
  created_by uuid references user_profiles(id),
  approved_by uuid references user_profiles(id),
  created_at timestamptz default now()
);

-- ---------- 4) ORDERS ----------
create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id),
  details text not null,
  price numeric,
  order_time timestamptz default now(),
  delivery_time timestamptz,
  status text not null default 'new' check (status in ('new','confirmed','in_progress','ready','delivered','cancelled')),
  created_by uuid references user_profiles(id),
  updated_at timestamptz default now()
);

-- ============================================================
-- HELPER FUNCTIONS — role check করার জন্য
-- ============================================================
create or replace function public.is_approved()
returns boolean as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and status = 'approved'
  );
$$ language sql security definer stable;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid() and role = 'admin' and status = 'approved'
  );
$$ language sql security definer stable;

-- ============================================================
-- ROW LEVEL SECURITY — কে কী দেখতে/করতে পারবে
-- ============================================================
alter table user_profiles enable row level security;
alter table customers enable row level security;
alter table content enable row level security;
alter table orders enable row level security;

-- user_profiles: নিজের প্রোফাইল নিজে দেখতে পারবে, admin সবার দেখতে/আপডেট করতে পারবে
create policy "read own or admin reads all" on user_profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "admin can update any profile" on user_profiles for update
  using (public.is_admin());

-- customers: শুধু approved user রা পড়তে/লিখতে পারবে
create policy "approved read customers" on customers for select
  using (public.is_approved());
create policy "approved insert customers" on customers for insert
  with check (public.is_approved());

-- content: approved user রা পড়তে/আপলোড করতে পারবে, শুধু admin approve/reject করতে পারবে
create policy "approved read content" on content for select
  using (public.is_approved());
create policy "approved insert content" on content for insert
  with check (public.is_approved());
create policy "admin update content status" on content for update
  using (public.is_admin());

-- orders: approved user রা সব করতে পারবে (add + status update)
create policy "approved read orders" on orders for select
  using (public.is_approved());
create policy "approved insert orders" on orders for insert
  with check (public.is_approved());
create policy "approved update orders" on orders for update
  using (public.is_approved());


-- ============================================================
-- 5) TEAM CHAT MESSAGES
-- ============================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  message text not null check (char_length(trim(message)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists messages_created_at_idx
  on public.messages (created_at);

create index if not exists messages_sender_id_idx
  on public.messages (sender_id);

alter table public.messages enable row level security;

drop policy if exists "approved users can read messages" on public.messages;
create policy "approved users can read messages"
  on public.messages for select
  using (public.is_approved());

drop policy if exists "approved users can send messages" on public.messages;
create policy "approved users can send messages"
  on public.messages for insert
  with check (
    public.is_approved()
    and sender_id = auth.uid()
  );

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end
$$;

-- ============================================================
-- STORAGE (ফাইল আপলোডের জন্য) — Storage বাকেট বানানোর পর এই policy রান করো
-- ============================================================
create policy "approved users can upload files"
  on storage.objects for insert
  with check (bucket_id = 'content-files' and public.is_approved());

create policy "anyone can view files"
  on storage.objects for select
  using (bucket_id = 'content-files');

-- ============================================================
-- সবার শেষে: নিজেকে প্রথম Admin বানাও
-- নিচের কমান্ডটা রান কোরো তোমার নিজের সাইনআপ করার পর,
-- 'তোমার-ইমেইল@example.com' জায়গায় নিজের ইমেইল বসিয়ে
-- ============================================================
-- update user_profiles set role = 'admin', status = 'approved'
-- where id = (select id from auth.users where email = 'তোমার-ইমেইল@example.com');
