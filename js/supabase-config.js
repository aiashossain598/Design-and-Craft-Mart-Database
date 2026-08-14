// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL = "https://grhamoekrdzzhkuvkuzc.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_bufVLrMZq-wA7QFbzEfe6A__DipL78R";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);