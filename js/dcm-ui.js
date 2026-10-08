/* DCM editorial UI layer. Loads after app.js; reuses its Supabase client, esc() and loaders. */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = (v) => (typeof esc === "function" ? esc(v) : String(v ?? ""));

  /* ---------- sliding indicators (nav pill, filter chips) ---------- */
  function slide(container, itemSel, cls) {
    if (!container) return;
    let ind = $("." + cls, container);
    if (!ind) { ind = document.createElement("i"); ind.className = cls; container.appendChild(ind); }
    const move = () => {
      const on = $(itemSel + ".active", container);
      if (!on || !on.offsetWidth) return;
      ind.style.width = on.offsetWidth + "px";
      ind.style.transform = `translateX(${on.offsetLeft}px)`;
      if (cls === "filter-ind") { ind.style.left = "0"; }
    };
    new MutationObserver(move).observe(container, { subtree: true, attributes: true, attributeFilter: ["class", "style"] });
    addEventListener("resize", move);
    setTimeout(move, 60); setTimeout(move, 600);
  }

  /* ---------- count-up for stat numbers ---------- */
  function countUp(el) {
    const n = parseInt(el.textContent, 10);
    if (isNaN(n) || el.dataset.done === String(n)) return;
    el.dataset.done = String(n);
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min(1, (t - t0) / 900);
      el.textContent = Math.round(n * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step); else el.dataset.done = String(n);
    };
    el.textContent = "0"; requestAnimationFrame(step);
  }
  function watchStats() {
    ["statIdeas", "statOrders", "statPending", "statDue"].forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      new MutationObserver(() => { if (el.dataset.busy) return; el.dataset.busy = "1"; countUp(el); setTimeout(() => delete el.dataset.busy, 1000); })
        .observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  /* ---------- greeting + date ---------- */
  function greeting() {
    const h = new Date().getHours();
    const w = $("#greetWord"); if (w) w.textContent = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const p = $("#tab-dashboard .page-heading p");
    if (p) p.textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  /* ---------- dashboard: pending + due today ---------- */
  const origDash = window.loadDashboard;
  if (typeof origDash === "function") {
    window.loadDashboard = async function () {
      await origDash.apply(this, arguments);
      try {
        const { data } = await supabaseClient.from("orders").select("status, delivery_time");
        const open = (data || []).filter((o) => !["delivered", "cancelled"].includes(o.status));
        const today = new Date().toDateString();
        const due = open.filter((o) => o.delivery_time && new Date(o.delivery_time).toDateString() === today);
        const a = $("#statPending"), b = $("#statDue");
        if (a) a.textContent = open.length;
        if (b) b.textContent = due.length;
      } catch (e) { console.error("Extra stats error:", e); }
    };
  }

  /* ---------- orders: board + list ---------- */
  const COLS = [
    ["New", ["new", "confirmed"], "new"],
    ["In Progress", ["in_progress"], "in_progress"],
    ["Done", ["ready"], "ready"],
    ["Delivered", ["delivered"], "delivered"],
  ];
  const STATUS = ["new", "confirmed", "in_progress", "ready", "delivered", "cancelled"];
  const label = (s) => s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  let view = "board", cache = [];

  function countdown(o) {
    if (!o.delivery_time) return { t: "No date", late: false };
    const d = Math.round((new Date(o.delivery_time).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 864e5);
    const closed = ["delivered", "cancelled"].includes(o.status);
    if (d < 0) return { t: `${-d} day${d < -1 ? "s" : ""} late`, late: !closed };
    if (d === 0) return { t: "Due today", late: false };
    return { t: `${d} day${d > 1 ? "s" : ""} left`, late: false };
  }
  const money = (p) => (p || p === 0) && !isNaN(Number(p)) ? "৳ " + Number(p).toLocaleString() : E(p || "—");

  function card(o, list) {
    const c = countdown(o);
    const name = o.customers?.name || "—";
    const move = `<select class="oc-move status-select" data-id="${E(o.id)}" aria-label="Move order">${STATUS.map((s) => `<option value="${s}" ${o.status === s ? "selected" : ""}>${label(s)}</option>`).join("")}</select>`;
    if (list) return `<div class="oc ${c.late ? "late" : ""}"><b>${E(name)}</b><span class="det" style="margin:0">${E(o.details || "—")}</span><b>${money(o.price)}</b><span class="cd" style="justify-self:start">${c.t}</span>${move}</div>`;
    return `<div class="oc ${c.late ? "late" : ""}" draggable="true" data-id="${E(o.id)}">
      <div class="r"><b>${E(name)}</b><b>${money(o.price)}</b></div>
      <div class="det">${E(o.details || "—")}</div>
      <div class="r"><span class="cd">${c.t}</span><span style="color:var(--mu);font-size:13px">${E(o.customers?.contact || "")}</span></div>${move}</div>`;
  }

  async function setStatus(id, status) {
    const { error } = await supabaseClient.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) { console.error("Order update error:", error); alert("Problem: " + error.message); return false; }
    const o = cache.find((x) => x.id === id); if (o) o.status = status;
    render();
    if (typeof loadDashboard === "function") loadDashboard();
    return true;
  }

  function render() {
    const box = $("#ordersBoard"); if (!box) return;
    if (!cache.length) { box.innerHTML = `<div class="empty-state">No orders yet. Add your first order to see it here.</div>`; return; }
    if (view === "list") {
      box.innerHTML = `<div class="olist" style="margin-top:20px">${cache.map((o) => card(o, true)).join("")}</div>`;
    } else {
      box.innerHTML = `<div class="kan">${COLS.map(([name, sts, drop]) => {
        const items = cache.filter((o) => sts.includes(o.status));
        return `<div class="col" data-drop="${drop}"><h3>${name}<span>${items.length}</span></h3>${items.map((o) => card(o)).join("") || '<div class="empty-state">Nothing here</div>'}</div>`;
      }).join("")}</div>`;
      let cur = null;
      $$(".oc[draggable]", box).forEach((c) => {
        c.addEventListener("dragstart", () => { cur = c.dataset.id; c.classList.add("dg"); });
        c.addEventListener("dragend", () => c.classList.remove("dg"));
      });
      $$(".col", box).forEach((col) => {
        col.addEventListener("dragover", (e) => { e.preventDefault(); col.classList.add("over"); });
        col.addEventListener("dragleave", () => col.classList.remove("over"));
        col.addEventListener("drop", (e) => { e.preventDefault(); col.classList.remove("over"); if (cur) setStatus(cur, col.dataset.drop); });
      });
    }
    $$(".oc-move", box).forEach((s) => s.addEventListener("change", () => setStatus(s.dataset.id, s.value)));
  }

  window.loadOrders = async function () {
    const box = $("#ordersBoard"); if (!box) return;
    box.innerHTML = `<div class="empty-state">Loading orders…</div>`;
    const { data, error } = await supabaseClient.from("orders").select("*, customers(name, contact)").order("order_time", { ascending: false });
    if (error) { console.error("Orders loading error:", error); box.innerHTML = `<div class="empty-state">Could not load orders: ${E(error.message)}</div>`; return; }
    cache = data || []; render();
  };

  /* ---------- order modal: 3 steps ---------- */
  function stepOrderForm() {
    const form = $("#orderForm"); if (!form || form.dataset.steps) return;
    form.dataset.steps = "1";
    const g = $$(":scope > .grid-2", form);
    const label2 = $(':scope > label[for="orderDetails"]', form), ta = $("#orderDetails");
    if (g.length < 3 || !ta) return;
    const contact = $("#newCustomerContact").parentElement, price = $("#price").parentElement;
    const mk = (n) => { const d = document.createElement("div"); d.className = "order-step"; d.dataset.s = n; return d; };
    const s1 = mk(1), s2 = mk(2), s3 = mk(3);
    s1.append(g[0], contact);
    s2.append(label2, ta);
    s3.append(price, g[2]);
    const actions = $(".modal-actions", form);
    const bar = document.createElement("div"); bar.className = "step-prog"; bar.innerHTML = "<i></i>";
    const txt = document.createElement("p"); txt.style.cssText = "color:var(--mu);font-size:14px";
    form.prepend(txt); txt.after(bar); bar.after(s1, s2, s3);
    g[1].remove();
    const next = document.createElement("button"); next.type = "button"; next.className = "btn-add"; next.textContent = "Continue";
    const back = document.createElement("button"); back.type = "button"; back.className = "btn-secondary"; back.textContent = "Back";
    const submit = $("#orderSubmitBtn"), cancel = $("#cancelOrder");
    actions.prepend(back); actions.append(next);
    let step = 1;
    const names = ["Customer", "Product details", "Price and delivery date"];
    const show = () => {
      $$(".order-step", form).forEach((s) => s.classList.toggle("on", +s.dataset.s === step));
      txt.textContent = `Step ${step} of 3 · ${names[step - 1]}`;
      $("i", bar).style.width = (step / 3) * 100 + "%";
      back.style.display = step > 1 ? "" : "none"; cancel.style.display = step === 1 ? "" : "none";
      next.style.display = step < 3 ? "" : "none"; submit.style.display = step === 3 ? "" : "none";
    };
    next.onclick = () => {
      const stepEl = $(`.order-step[data-s="${step}"]`, form);
      const bad = $$("[required]", stepEl).find((f) => !f.value);
      if (bad) { bad.reportValidity(); return; }
      step++; show();
    };
    back.onclick = () => { step--; show(); };
    $("#openOrderModal")?.addEventListener("click", () => { step = 1; show(); });
    $("#dockPlus") && $("#quickSheet")?.addEventListener("click", () => { step = 1; show(); });
    show();
  }

  /* ---------- orders view toggle ---------- */
  function wireToggle() {
    $$("#ordersViewToggle button").forEach((b) => b.addEventListener("click", () => {
      view = b.dataset.view;
      $$("#ordersViewToggle button").forEach((x) => x.classList.toggle("on", x === b));
      render();
    }));
  }

  /* ---------- mobile quick add ---------- */
  function quickAdd() {
    const plus = $("#dockPlus"), sheet = $("#quickSheet"); if (!plus || !sheet) return;
    plus.addEventListener("click", () => { sheet.hidden = !sheet.hidden; });
    sheet.addEventListener("click", (e) => {
      const b = e.target.closest("[data-q]"); if (!b) return;
      sheet.hidden = true;
      (b.dataset.q === "order" ? $("#openOrderModal") : $("#openIdeaModal"))?.click();
    });
  }

  /* ---------- content: staggered card entrance + copy caption ---------- */
  function contentExtras() {
    const grid = $("#contentGrid"); if (!grid) return;
    new MutationObserver(() => {
      $$(".content-card", grid).forEach((c, i) => {
        if (c.dataset.dcm) return; c.dataset.dcm = "1";
        c.style.animation = "rise .55s ease both"; c.style.animationDelay = Math.min(i, 12) * 60 + "ms";
        const cap = $(".caption", c);
        if (cap && !$(".content-view-btn", c)) {
          const b = document.createElement("button"); b.type = "button"; b.className = "content-view-btn"; b.textContent = "Copy caption";
          b.addEventListener("click", (e) => { e.stopPropagation(); navigator.clipboard?.writeText(cap.textContent.trim()); b.textContent = "Copied ✓"; setTimeout(() => (b.textContent = "Copy caption"), 1600); });
          c.appendChild(b);
        }
      });
    }).observe(grid, { childList: true });
  }

  function init() {
    slide($(".sidebar-nav"), ".nav-item", "nav-ind");
    slide($(".content-filters"), ".filter-btn", "filter-ind");
    watchStats(); greeting(); wireToggle(); stepOrderForm(); quickAdd(); contentExtras();
    $$(".stats-grid > *, .dashboard-columns > *").forEach((el, i) => { el.style.animation = "rise .55s ease both"; el.style.animationDelay = i * 60 + "ms"; });
    // keep the dock highlight / mobile drawer in sync is handled by app.js (.nav-item.active)
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
