/* DCM extras: quick-add "+" menu, Leads pipeline, dashboard range + KPIs,
   order history and the new-partner checklist.
   Loads after app.js and dcm-ui.js and reuses their globals:
   supabaseClient, currentUser, currentProfile, esc(), showToast(), showTab(). */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = (v) => (typeof esc === "function" ? esc(v) : String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
  const toast = (m, t) => (typeof showToast === "function" ? showToast(m, t) : console.log(m));
  const db = () => (typeof supabaseClient !== "undefined" ? supabaseClient : null);
  const uid = () => (typeof currentUser !== "undefined" && currentUser ? currentUser.id : null);
  const money = (v) => ((v || v === 0) && !isNaN(Number(v)) ? "\u09F3 " + Number(v).toLocaleString() : "\u2014");
  const day0 = (d) => new Date(new Date(d).setHours(0, 0, 0, 0));
  const lockScroll = (on) => { document.body.style.overflow = on ? "hidden" : ""; };

  /* ---------------------------------------------------------------
     1. "+" quick-add menu in the middle of the nav pill
  --------------------------------------------------------------- */
  function quickAddMenu() {
    const wrap = $("#navAdd"), btn = $("#navAddBtn"), menu = $("#navAddMenu");
    if (!wrap || !btn || !menu) return;
    const set = (open) => { menu.hidden = !open; btn.setAttribute("aria-expanded", String(open)); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); set(menu.hidden); });
    document.addEventListener("click", (e) => { if (!wrap.contains(e.target)) set(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });
    menu.addEventListener("click", (e) => {
      const b = e.target.closest("[data-add]"); if (!b) return;
      set(false);
      if (b.dataset.add === "content") $("#openIdeaModal")?.click();
      else if (b.dataset.add === "order") $("#openOrderModal")?.click();
      else if (b.dataset.add === "lead") openLeadModal();
    });
  }

  /* ---------------------------------------------------------------
     2. Leads pipeline
  --------------------------------------------------------------- */
  const STAGES = [["New inquiry", "new"], ["Quote sent", "quote_sent"], ["Follow-up due", "follow_up"], ["Converted", "converted"], ["Lost", "lost"]];
  const SOURCES = { messenger: "Messenger", facebook: "Facebook", phone: "Phone", other: "Other" };
  let leads = [];

  function dueInfo(l) {
    if (!l.follow_up_at || ["converted", "lost"].includes(l.stage)) return null;
    const d = Math.round((day0(l.follow_up_at) - day0(Date.now())) / 864e5);
    if (d < 0) return { t: `${-d} day${d < -1 ? "s" : ""} overdue`, late: true };
    if (d === 0) return { t: "Due today", late: false };
    return { t: `Due in ${d} day${d > 1 ? "s" : ""}`, late: false };
  }

  function leadCard(l) {
    const d = dueInfo(l);
    const move = `<select class="oc-move status-select" data-lead="${E(l.id)}" aria-label="Move lead">${STAGES.map(([n, s]) => `<option value="${s}" ${l.stage === s ? "selected" : ""}>${n}</option>`).join("")}</select>`;
    const conv = !["converted", "lost"].includes(l.stage) ? `<button type="button" class="oc-hist" data-convert="${E(l.id)}">Convert to order</button>` : "";
    return `<div class="oc ${d && d.late ? "late" : ""}" draggable="true" data-lead-id="${E(l.id)}">
      <div class="r"><b>${E(l.customer_name)}</b><b>${money(l.value)}</b></div>
      <div class="det">${E(l.interest)}</div>
      <div class="r"><span class="cd">${d ? d.t : "No follow-up date"}</span><span class="lead-src">${E(SOURCES[l.source] || "Other")}</span></div>
      ${move}<div class="lead-actions">${conv}<button type="button" class="oc-hist" data-edit="${E(l.id)}">Edit</button></div></div>`;
  }

  function renderLeads() {
    const box = $("#leadsBoard"); if (!box) return;
    if (!leads.length) { box.innerHTML = `<div class="empty-state">No leads yet. Add the first inquiry from Messenger, Facebook or a phone call.</div>`; return; }
    box.innerHTML = `<div class="kan leads-kan">${STAGES.map(([name, s]) => {
      const items = leads.filter((l) => l.stage === s);
      return `<div class="col" data-drop="${s}"><h3>${name}<span>${items.length}</span></h3>${items.map(leadCard).join("") || '<div class="empty-state">Nothing here</div>'}</div>`;
    }).join("")}</div>`;
    let cur = null;
    $$(".oc[draggable]", box).forEach((c) => {
      c.addEventListener("dragstart", () => { cur = c.dataset.leadId; c.classList.add("dg"); });
      c.addEventListener("dragend", () => c.classList.remove("dg"));
    });
    $$(".col", box).forEach((col) => {
      col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
      col.addEventListener("dragleave", () => col.classList.remove("over"));
      col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("over"); if (cur) setStage(cur, col.dataset.drop); });
    });
  }

  async function loadLeads() {
    const box = $("#leadsBoard"); if (!box || !db()) return;
    box.innerHTML = `<div class="empty-state">Loading leads\u2026</div>`;
    const { data, error } = await db().from("leads").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Leads loading error:", error);
      box.innerHTML = `<div class="empty-state">Could not load leads: ${E(error.message)}. Run supabase-leads-activity.sql in the Supabase SQL editor first.</div>`;
      return;
    }
    leads = data || []; renderLeads();
  }

  async function setStage(id, stage) {
    const l = leads.find((x) => x.id === id); if (!l || l.stage === stage) { renderLeads(); return; }
    if (stage === "converted" && !l.order_id) { await convertLead(l); return; }
    const { error } = await db().from("leads").update({ stage, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast("Could not move the lead: " + error.message, "error"); renderLeads(); return; }
    l.stage = stage; renderLeads(); refreshDashExtras();
  }

  async function convertLead(l) {
    try {
      let q = db().from("customers").select("id").eq("name", l.customer_name);
      q = l.contact ? q.eq("contact", l.contact) : q.is("contact", null);
      const found = await q.limit(1);
      let customerId = found.data?.[0]?.id;
      if (!customerId) {
        const c = await db().from("customers").insert({ name: l.customer_name, contact: l.contact || null }).select("id").single();
        if (c.error) throw c.error; customerId = c.data.id;
      }
      const o = await db().from("orders").insert({ customer_id: customerId, details: l.interest, price: l.value, status: "new", created_by: uid() }).select("id").single();
      if (o.error) throw o.error;
      const u = await db().from("leads").update({ stage: "converted", order_id: o.data.id, updated_at: new Date().toISOString() }).eq("id", l.id);
      if (u.error) throw u.error;
      window.dcmLogOrderEvent?.(o.data.id, "created", null, "new", "Converted from a lead");
      toast("Lead converted to an order.", "success");
      await loadLeads(); refreshDashExtras();
      if (typeof loadOrders === "function") loadOrders();
    } catch (err) {
      console.error("Convert lead error:", err);
      toast("Could not convert the lead: " + (err?.message || err), "error");
      renderLeads();
    }
  }

  const ymd = (iso) => { if (!iso) return ""; const d = new Date(iso); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  function openLeadModal(lead) {
    const m = $("#leadModal"); if (!m) return;
    $("#leadForm").reset();
    $("#leadId").value = lead?.id || "";
    $("#leadModalTitle").textContent = lead ? "Edit Lead" : "Add Lead";
    $("#leadSubmitBtn").textContent = lead ? "Save Changes" : "Save Lead";
    if (lead) {
      $("#leadName").value = lead.customer_name || ""; $("#leadContact").value = lead.contact || "";
      $("#leadInterest").value = lead.interest || ""; $("#leadValue").value = lead.value ?? "";
      $("#leadFollowUp").value = ymd(lead.follow_up_at); $("#leadSource").value = lead.source || "messenger";
      $("#leadStage").value = lead.stage || "new";
    }
    m.style.display = "flex"; lockScroll(true); $("#leadName").focus();
  }
  function closeLeadModal() { const m = $("#leadModal"); if (m) { m.style.display = "none"; lockScroll(false); } }
  window.dcmOpenLead = () => openLeadModal();

  function wireLeads() {
    $("#openLeadModal")?.addEventListener("click", () => openLeadModal());
    $("#closeLeadModal")?.addEventListener("click", closeLeadModal);
    $("#cancelLead")?.addEventListener("click", closeLeadModal);
    $("#leadModal")?.addEventListener("click", (e) => { if (e.target.id === "leadModal") closeLeadModal(); });
    $("#leadForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = $("#leadSubmitBtn"), id = $("#leadId").value, fu = $("#leadFollowUp").value;
      const payload = {
        customer_name: $("#leadName").value.trim(), contact: $("#leadContact").value.trim() || null,
        interest: $("#leadInterest").value.trim(), value: $("#leadValue").value === "" ? null : Number($("#leadValue").value),
        source: $("#leadSource").value, stage: $("#leadStage").value,
        follow_up_at: fu ? new Date(fu + "T12:00:00").toISOString() : null, updated_at: new Date().toISOString(),
      };
      btn.disabled = true;
      const res = id ? await db().from("leads").update(payload).eq("id", id) : await db().from("leads").insert({ ...payload, created_by: uid() });
      btn.disabled = false;
      if (res.error) { toast("Could not save the lead: " + res.error.message, "error"); return; }
      toast(id ? "Lead updated." : "Lead added.", "success");
      closeLeadModal(); loadLeads(); refreshDashExtras();
    });
    const box = $("#leadsBoard");
    box?.addEventListener("click", (e) => {
      const c = e.target.closest("[data-convert]"), ed = e.target.closest("[data-edit]");
      if (c) convertLead(leads.find((x) => x.id === c.dataset.convert));
      else if (ed) openLeadModal(leads.find((x) => x.id === ed.dataset.edit));
    });
    box?.addEventListener("change", (e) => { const s = e.target.closest("select[data-lead]"); if (s) setStage(s.dataset.lead, s.value); });
  }

  /* ---------------------------------------------------------------
     3. Dashboard: date range, follow-ups due, revenue
  --------------------------------------------------------------- */
  let range = 30;
  async function refreshDashExtras() {
    if (!db() || !$("#statRevenue")) return;
    const since = new Date(Date.now() - range * 864e5).toISOString();
    const endToday = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();
    const [cnt, rev, fu] = await Promise.all([
      db().from("orders").select("id", { count: "exact", head: true }).gte("order_time", since),
      db().from("orders").select("price").eq("status", "delivered").gte("updated_at", since),
      db().from("leads").select("id", { count: "exact", head: true }).in("stage", ["new", "quote_sent", "follow_up"]).lte("follow_up_at", endToday),
    ]);
    const so = $("#statOrders");
    if (so && !cnt.error) { so.textContent = cnt.count ?? 0; if (so.previousElementSibling) so.previousElementSibling.textContent = `Orders, last ${range} days`; }
    if (!rev.error) $("#statRevenue").textContent = money((rev.data || []).reduce((s, o) => s + (Number(o.price) || 0), 0));
    $("#revLabel").textContent = `Revenue, last ${range} days`;
    $("#statFollowUps").textContent = fu.error ? "\u2014" : fu.count ?? 0;
    if (fu.error) console.warn("Follow-ups unavailable (run supabase-leads-activity.sql):", fu.error.message);
  }

  function wireRange() {
    $$("#rangeToggle button").forEach((b) => b.addEventListener("click", () => {
      range = Number(b.dataset.range);
      $$("#rangeToggle button").forEach((x) => x.classList.toggle("on", x === b));
      refreshDashExtras();
    }));
  }

  /* ---------------------------------------------------------------
     4. Order history (order_events)
  --------------------------------------------------------------- */
  window.dcmLogOrderEvent = async function (orderId, type, from, to, note) {
    if (!orderId || !db()) return;
    try {
      const { error } = await db().from("order_events").insert({ order_id: orderId, event_type: type, from_status: from || null, to_status: to || null, note: note || null, actor_id: uid() });
      if (error) console.warn("Order history not saved (run supabase-leads-activity.sql):", error.message);
    } catch (e) { console.warn("Order history error:", e); }
  };

  const pretty = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let historyOrder = null;

  function eventText(ev) {
    if (ev.event_type === "created") return "Order created" + (ev.note ? ": " + ev.note : "");
    if (ev.event_type === "status_changed") return `Moved from ${pretty(ev.from_status)} to ${pretty(ev.to_status)}`;
    return ev.note || "Note";
  }

  async function loadHistory() {
    const list = $("#historyList"); if (!list || !historyOrder) return;
    list.innerHTML = `<div class="empty-state">Loading\u2026</div>`;
    let res = await db().from("order_events").select("*, actor:user_profiles(full_name)").eq("order_id", historyOrder).order("created_at", { ascending: false });
    if (res.error) res = await db().from("order_events").select("*").eq("order_id", historyOrder).order("created_at", { ascending: false });
    if (res.error) { list.innerHTML = `<div class="empty-state">Could not load history: ${E(res.error.message)}</div>`; return; }
    const rows = res.data || [];
    list.innerHTML = rows.length ? rows.map((ev) => `<div class="hist-item"><i class="hist-dot"></i><div><b>${E(eventText(ev))}</b><span>${E(ev.actor?.full_name || "A partner")} \u00B7 ${new Date(ev.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div></div>`).join("") : `<div class="empty-state">No history yet for this order.</div>`;
  }

  function wireHistory() {
    const m = $("#orderHistoryModal"); if (!m) return;
    const close = () => { m.style.display = "none"; lockScroll(false); historyOrder = null; };
    document.addEventListener("click", (e) => {
      const b = e.target.closest("[data-hist]"); if (!b) return;
      historyOrder = b.dataset.hist; m.style.display = "flex"; lockScroll(true); loadHistory();
    });
    $("#closeHistoryModal")?.addEventListener("click", close);
    m.addEventListener("click", (e) => { if (e.target === m) close(); });
    $("#historyNoteBtn")?.addEventListener("click", async () => {
      const inp = $("#historyNote"), txt = inp.value.trim(); if (!txt || !historyOrder) return;
      await window.dcmLogOrderEvent(historyOrder, "note", null, null, txt);
      inp.value = ""; loadHistory();
    });
    $("#historyNote")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); $("#historyNoteBtn").click(); } });
  }

  /* ---------------------------------------------------------------
     5. New-partner checklist on the dashboard
  --------------------------------------------------------------- */
  async function welcome() {
    const box = $("#welcomeCard"); if (!box || !db() || !uid()) return;
    const key = "dcm_welcome_off_" + uid();
    try { if (localStorage.getItem(key)) { box.hidden = true; return; } } catch (e) { /* storage blocked */ }
    const p = typeof currentProfile !== "undefined" ? currentProfile : null;
    const [c, o] = await Promise.all([
      db().from("content").select("id", { count: "exact", head: true }).eq("created_by", uid()),
      db().from("orders").select("id", { count: "exact", head: true }).eq("created_by", uid()),
    ]);
    const steps = [
      { k: "profile", t: "Complete your profile", d: "Name, mobile and position", done: !!(p && p.full_name && p.mobile && p.position), a: "Edit profile" },
      { k: "avatar", t: "Add your photo", d: "Shown next to your name", done: !!(p && p.avatar_url), a: "Add photo" },
      { k: "idea", t: "Post your first content idea", d: "Add a photo and a caption", done: (c.count || 0) > 0, a: "Add idea" },
      { k: "order", t: "Create your first order", d: "Track it from New to Delivered", done: (o.count || 0) > 0, a: "Add order" },
    ];
    const n = steps.filter((s) => s.done).length;
    if (n === steps.length) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = `<div class="welcome-head"><div><h3>Welcome to the Hub</h3><p class="welcome-sub">${n} of ${steps.length} first steps done</p></div><button type="button" class="text-button" id="welcomeDismiss">Dismiss</button></div>
      <div class="welcome-bar"><i style="width:${(n / steps.length) * 100}%"></i></div>
      <div class="welcome-steps">${steps.map((s) => `<div class="welcome-step ${s.done ? "done" : ""}"><div><b>${s.t}</b><span>${s.d}</span></div>${s.done ? '<span class="lead-src">Done</span>' : `<button type="button" class="btn-add" data-welcome="${s.k}">${s.a}</button>`}</div>`).join("")}</div>`;
    $("#welcomeDismiss").onclick = () => { try { localStorage.setItem(key, "1"); } catch (e) { /* ignore */ } box.hidden = true; };
    $$("[data-welcome]", box).forEach((b) => b.addEventListener("click", () => {
      const k = b.dataset.welcome;
      if (k === "idea") $("#openIdeaModal")?.click();
      else if (k === "order") $("#openOrderModal")?.click();
      else {
        /* The edit form and the photo button live inside the My Profile tab,
           so open that tab first or they stay hidden. */
        if (typeof showTab === "function") showTab("profile");
        if (k === "avatar") $("#profileAvatarEditBtn")?.click();
        else if (typeof openProfileEditModal === "function") openProfileEditModal();
      }
    }));
  }

  /* ---------------------------------------------------------------
     Hooks into existing functions
  --------------------------------------------------------------- */
  const prevShow = window.showTab;
  if (typeof prevShow === "function") {
    window.showTab = function (tab) {
      const r = prevShow.apply(this, arguments);
      if (tab === "leads") loadLeads();
      return r;
    };
  }
  const prevDash = window.loadDashboard;
  if (typeof prevDash === "function") {
    window.loadDashboard = async function () {
      await prevDash.apply(this, arguments);
      try { await Promise.all([refreshDashExtras(), welcome()]); } catch (e) { console.warn("Dashboard extras error:", e); }
    };
  }

  function init() {
    quickAddMenu(); wireLeads(); wireRange(); wireHistory();
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      closeLeadModal();
      const h = $("#orderHistoryModal"); if (h && h.style.display === "flex") $("#closeHistoryModal")?.click();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
