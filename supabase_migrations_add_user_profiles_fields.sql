-- Migration: add avatar_url and position to user_profiles
-- Run this in your Supabase SQL editor (Project > SQL)
-- This adds two optional text columns: avatar_url (stores public URL of uploaded avatar)
-- and position (the user's professional/business position). Both are nullable.
-- IMPORTANT: The system 'role' column remains unchanged and must be controlled by admins-only flows.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS position text;

-- If you rely on created_at/updated_at timestamps and they don't exist, consider adding them separately.
-- The storage bucket used by the client is 'content-files' in the existing app code. Make sure the
-- bucket exists and is configured for public access to the uploaded files or configure a signed
-- URL flow and RLS policies accordingly.

-- Example guidance for a simple public-access bucket (run via Supabase UI > Storage > Buckets):
-- 1. Create bucket named "content-files" (if not present).
-- 2. In Bucket Policies, ensure public access is enabled for read if you plan to use getPublicUrl.

-- NOTE: Do NOT embed any service_role keys in frontend code. Use RLS policies to allow authenticated
-- users to update only their own profile row (recommended policy example provided separately).

-- Example RLS policy (optional, run only if you want Supabase to manage row-level security):
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can update own profile" ON public.user_profiles
--   FOR UPDATE USING ( auth.uid() = id ) WITH CHECK ( auth.uid() = id );

-- Always review policies and test with a non-admin user before enabling in production.
