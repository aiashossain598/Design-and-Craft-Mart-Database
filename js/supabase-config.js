// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL = "https://cxseqajvzelaelhctucy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Y5wKXia6JYv0Y7Hau6doxQ_XwItV7wt";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);