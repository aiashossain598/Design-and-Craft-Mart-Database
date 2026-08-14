-- Migration: add avatar_url to user_profiles if it does not exist
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS avatar_url text;
