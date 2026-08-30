// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL = "https://cxseqajvzelaelhctucy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_Y5wKXia6JYv0Y7Hau6doxQ_XwItV7wt";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

function getLoginHistoryMeta() {
  return {
    source: "web",
    path: window.location.pathname || "/",
    userAgent: navigator.userAgent || null,
    referrer: document.referrer || null
  };
}

async function recordLoginHistory({ user, email, session } = {}) {
  if (!supabaseClient || !user?.id) {
    return { ok: false, error: "Missing authenticated user." };
  }

  const payload = {
    user_id: user.id,
    email: email || user.email || null,
    event_type: "login",
    success: true,
    login_at: new Date().toISOString(),
    logout_at: null,
    user_agent: navigator.userAgent || null,
    metadata: getLoginHistoryMeta()
  };

  try {
    const { error } = await supabaseClient
      .from("login_history")
      .insert(payload);

    if (error) {
      console.warn("login_history insert (login) failed:", error.message || error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.warn("login_history insert (login) threw:", error);
    return { ok: false, error };
  }
}

async function recordLogoutHistory({ user, email } = {}) {
  if (!supabaseClient || !user?.id) {
    return { ok: false, error: "Missing authenticated user." };
  }

  const payload = {
    user_id: user.id,
    email: email || user.email || null,
    event_type: "logout",
    success: true,
    login_at: new Date().toISOString(),
    logout_at: new Date().toISOString(),
    user_agent: navigator.userAgent || null,
    metadata: getLoginHistoryMeta()
  };

  try {
    const { error } = await supabaseClient
      .from("login_history")
      .insert(payload);

    if (error) {
      console.warn("login_history insert (logout) failed:", error.message || error);
      return { ok: false, error };
    }

    return { ok: true };
  } catch (error) {
    console.warn("login_history insert (logout) threw:", error);
    return { ok: false, error };
  }
}

window.recordLoginHistory = recordLoginHistory;
window.recordLogoutHistory = recordLogoutHistory;