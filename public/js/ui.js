"use strict";

// ── Core helpers ──────────────────────────────────────────────────────────────
const esc = (s) =>
  s == null
    ? ""
    : String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
const san = (v) =>
  typeof v === "string"
    ? DOMPurify.sanitize(v.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    : v;
const sanObj = (o) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, san(v)]));
const q = (s, c = document) => c.querySelector(s);
const qs = (s, c = document) => [...c.querySelectorAll(s)];

function setLoad(btn, on) {
  if (!btn) return;
  btn.disabled = on;
  const id = "_sp";
  if (on) {
    const s = document.createElement("span");
    s.className = "spin-btn";
    s.id = id;
    btn.prepend(s);
  } else btn.querySelector("#" + id)?.remove();
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  const er = document.getElementById(id + "-e");
  el?.classList.toggle("err", !!msg);
  if (er) {
    er.textContent = msg || "";
    er.style.display = msg ? "block" : "none";
  }
}

function clearErrs(container) {
  qs(".ferr", container).forEach((e) => {
    e.textContent = "";
    e.style.display = "none";
  });
  qs(".err", container).forEach((e) => e.classList.remove("err"));
}

function fld(id, label, type = "text", req = false, ph = "", dir = "") {
  return `<div class="fg">
    <label class="lbl" for="${id}">${esc(label)}${req ? '<span class="req">*</span>' : ""}</label>
    <input class="inp" id="${id}" type="${type}"${ph ? ` placeholder="${esc(ph)}"` : ""} ${dir ? `dir="${dir}"` : ""} autocomplete="off">
    <p class="ferr" id="${id}-e" style="display:none"></p>
  </div>`;
}

function pwdFieldHTML(id, label, req = false) {
  return `<div class="fg">
    <label class="lbl" for="${id}">${esc(label)}${req ? '<span class="req">*</span>' : ""}</label>
    <div class="pwd-wrap">
      <input class="inp" id="${id}" type="password" dir="ltr" autocomplete="off">
      <button type="button" class="btn-pwd-eye" id="${id}-eye" tabindex="-1">${IC.eye}</button>
    </div>
    <p class="ferr" id="${id}-e" style="display:none"></p>
  </div>`;
}

function bindPwdToggle(id) {
  const inp = document.getElementById(id);
  const btn = document.getElementById(id + "-eye");
  if (!inp || !btn) return;
  btn.addEventListener("click", () => {
    const showing = inp.type === "text";
    inp.type = showing ? "password" : "text";
    btn.innerHTML = showing ? IC.eye : IC.eyeOff;
  });
}

function saveTab(k, v) {
  localStorage.setItem("senna-tab-" + k, v);
}
function loadTab(k, fb = "") {
  return localStorage.getItem("senna-tab-" + k) || fb;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function toast(msg, type = "info", ms = 4000) {
  const root = document.getElementById("toasts");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast t-${type === "success" ? "ok" : type === "error" ? "err" : "inf"}`;
  const ic = document.createElement("span");
  ic.className = "toast-icon";
  ic.innerHTML =
    { success: IC.check, error: IC.xCircle, info: IC.info }[type] || IC.info;
  const mg = document.createElement("span");
  mg.className = "toast-msg";
  mg.textContent = msg;
  const xb = document.createElement("button");
  xb.className = "toast-x";
  xb.textContent = "×";
  xb.onclick = () => el.remove();
  el.append(ic, mg, xb);
  root.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function showModal({ title, size = "md", content, footer }) {
  const root = document.getElementById("modals");
  root.innerHTML = `<div class="mbk" id="mbk">
    <div class="modal modal-${size}" role="dialog" aria-modal="true">
      <div class="mhd">
        <h2 class="mtitle"></h2>
        <button class="btn btn-g btn-icon" id="m-x" aria-label="Close">${IC.close}</button>
      </div>
      <div class="mbody" id="mbody"></div>
      ${footer ? '<div class="mfoot" id="mfoot"></div>' : ""}
    </div>
  </div>`;
  q(".mtitle").textContent = title;
  const body = q("#mbody");
  typeof content === "string"
    ? (body.innerHTML = content)
    : body.appendChild(content);
  if (footer) {
    const ft = q("#mfoot");
    typeof footer === "string"
      ? (ft.innerHTML = footer)
      : ft.appendChild(footer);
  }
  q("#m-x").onclick = closeModal;
  q("#mbk").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.body.style.overflow = "hidden";
  setTimeout(() => q("#m-x")?.focus(), 50);
}

function closeModal() {
  document.getElementById("modals").innerHTML = "";
  document.body.style.overflow = "";
}

function confirmDialog(message, onConfirm, onCancel) {
  const root = document.getElementById("modals");
  root.innerHTML = `<div class="mbk" id="conf-bk">
    <div class="modal modal-sm" role="alertdialog">
      <div class="mbody" style="padding:1.75rem 1.5rem;text-align:center">
        <div class="si si-amb" style="margin:0 auto 1rem">
          ${IC.warning.replace('width="16"', 'width="24"').replace('height="16"', 'height="24"')}
        </div>
        <p style="font-size:.9375rem;font-weight:600;color:var(--t1);margin-bottom:.375rem">${esc(t("c.confirm"))}</p>
        <p style="font-size:.875rem;color:var(--t2);margin-bottom:1.5rem;line-height:1.5">${esc(message)}</p>
        <div style="display:flex;gap:.75rem;justify-content:center">
          <button class="btn btn-s btn-md" id="conf-no" style="min-width:80px">${esc(t("c.no"))}</button>
          <button class="btn btn-p btn-md" id="conf-yes" style="min-width:80px">${esc(t("c.yes"))}</button>
        </div>
      </div>
    </div>
  </div>`;
  document.body.style.overflow = "hidden";
  q("#conf-yes").onclick = () => {
    closeModal();
    onConfirm();
  };
  q("#conf-no").onclick = () => {
    closeModal();
    if (onCancel) onCancel();
  };
  q("#conf-bk").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      closeModal();
      if (onCancel) onCancel();
    }
  });
}

function destructiveConfirm(itemName, onConfirm) {
  const lang = getLang();
  showModal({
    title: lang === "ar" ? "تأكيد الحذف" : "Confirm Deletion",
    size: "sm",
    content: `<div style="text-align:center;margin-bottom:1.25rem">
      <div class="si si-red" style="margin:0 auto 1rem">
        ${IC.trash.replace('width="16"', 'width="24"').replace('height="16"', 'height="24"')}
      </div>
      <p style="font-size:.9375rem;font-weight:600;color:var(--t1);margin-bottom:.375rem">${esc(itemName)}</p>
      <p style="font-size:.8125rem;color:var(--red);margin-bottom:1rem">
        ${lang === "ar" ? "هذا الإجراء لا يمك�� التراجع عنه" : "This action cannot be undone"}
      </p>
    </div>
    <div class="fg">
      <label class="lbl">${esc(t("adm.delete_type"))}</label>
      <input class="inp" id="del-confirm" type="text" dir="ltr" autocomplete="off" placeholder="DELETE">
      <p class="ferr" id="del-confirm-e" style="display:none"></p>
    </div>`,
    footer: `<button class="btn btn-s btn-md" id="del-cancel">${esc(t("c.cancel"))}</button>
             <button class="btn btn-d btn-md" id="del-go" disabled style="opacity:.4">${esc(t("c.delete"))}</button>`,
  });
  const goBtn = q("#del-go"),
    inp = q("#del-confirm");
  q("#del-cancel").onclick = closeModal;
  inp.addEventListener("input", () => {
    const v = inp.value.trim() === "DELETE";
    goBtn.disabled = !v;
    goBtn.style.opacity = v ? "1" : ".4";
  });
  goBtn.onclick = () => {
    if (inp.value.trim() !== "DELETE") return;
    closeModal();
    onConfirm();
  };
}

// ── Badges ────────────────────────────────────────────────────────────────────
function statusBadge(s) {
  const m = { approved: "b-app", pending: "b-pen", rejected: "b-rej" };
  const l = {
    approved: t("prof.app"),
    pending: t("prof.pend"),
    rejected: t("prof.rej"),
  };
  return `<span class="badge ${m[s] || "b-pen"}">${esc(l[s] || s)}</span>`;
}
function reqBadge(s) {
  const m = { incomplete: "b-inc", ongoing: "b-ong", done: "b-don" };
  const l = {
    incomplete: t("c.s_new"),
    ongoing: t("c.s_ong"),
    done: t("c.s_don"),
  };
  return `<span class="badge ${m[s] || "b-inc"}">${esc(l[s] || s)}</span>`;
}
function onlineDot(isOnline) {
  const c = isOnline ? "var(--green)" : "var(--bdr)";
  const title = isOnline
    ? getLang() === "ar"
      ? "متصل"
      : "Online"
    : getLang() === "ar"
      ? "غير متصل"
      : "Offline";
  return `<span title="${title}" style="display:inline-block;width:.5rem;height:.5rem;border-radius:50%;background:${c};flex-shrink:0"></span>`;
}
function tabBadge(count) {
  if (!count) return "";
  return `<span class="tab-badge">${count > 99 ? "99+" : count}</span>`;
}

function formatLastSeen(ts) {
  if (!ts) return getLang() === "ar" ? "لم يسجّل دخوله بعد" : "Never";
  const d = Date.now() - new Date(ts).getTime();
  const m = Math.floor(d / 60000),
    h = Math.floor(d / 3600000),
    dy = Math.floor(d / 86400000);
  if (m < 2) return getLang() === "ar" ? "الآن" : "Just now";
  if (m < 60) return getLang() === "ar" ? `منذ ${m} دقيقة` : `${m}m ago`;
  if (h < 24) return getLang() === "ar" ? `منذ ${h} ساعة` : `${h}h ago`;
  return getLang() === "ar" ? `منذ ${dy} يوم` : `${dy}d ago`;
}

function formatDateTime(ts) {
  if (!ts) return "—";
  const d = new Date(ts),
    lang = getLang();
  return (
    d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

// ── Image preview ─────────────────────────────────────────────────────────────
function imgBtn(path, label) {
  if (!path) return "";
  const uid = "ip" + Math.random().toString(36).slice(2, 7);
  return `<div class="img-preview-wrap" data-path="${esc(path)}">
    <button class="btn btn-s btn-sm" id="${uid}" type="button">${IC.eye}&nbsp;${esc(label)}</button>
    <div class="img-pop-shell" id="${uid}-shell">
      <div class="img-pop-load" id="${uid}-load"><div class="spin" style="width:1.25rem;height:1.25rem"></div></div>
      <img class="img-pop-img" id="${uid}-img" src="" alt="${esc(label)}" style="display:none">
    </div>
  </div>`;
}

function bindImgPreviews(container) {
  qs(".img-preview-wrap", container).forEach((wrap) => {
    const btn = wrap.querySelector("button");
    const shell = wrap.querySelector(".img-pop-shell");
    const load = wrap.querySelector(".img-pop-load");
    const img = wrap.querySelector(".img-pop-img");
    const path = wrap.dataset.path;
    if (!btn || !path) return;
    let loaded = false,
      loading = false,
      hideTimer = null;
    const show = () => {
      clearTimeout(hideTimer);
      shell.style.display = "block";
    };
    const hide = () => {
      hideTimer = setTimeout(() => {
        shell.style.display = "none";
      }, 120);
    };
    wrap.addEventListener("mouseenter", async () => {
      show();
      if (loaded || loading) return;
      loading = true;
      if (load) load.style.display = "flex";
      const url = await dbGetSignedUrl(path);
      loading = false;
      if (load) load.style.display = "none";
      if (url && img) {
        img.src = url;
        img.style.display = "block";
        loaded = true;
      }
    });
    wrap.addEventListener("mouseleave", hide);
    shell?.addEventListener("mouseenter", show);
    shell?.addEventListener("mouseleave", hide);
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const url = await dbGetSignedUrl(path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      else toast(t("c.err"), "error");
    });
  });
}

// ── Log ───────────────────────────────────────────────────────────────────────
const LOG_META = {
  created: { color: "var(--p)", icon: "⊕", cat: "status" },
  status_changed: { color: "var(--amber)", icon: "↻", cat: "status" },
  notes_updated: { color: "var(--blue)", icon: "✎", cat: "notes" },
  claim_submitted: { color: "var(--amber)", icon: "⊙", cat: "claims" },
  claim_approved: { color: "var(--green)", icon: "✓", cat: "claims" },
  claim_declined: { color: "var(--red)", icon: "✕", cat: "claims" },
  profile_updated: { color: "var(--p)", icon: "✎", cat: "profile" },
  applied: { color: "var(--blue)", icon: "⊕", cat: "profile" },
  approved: { color: "var(--green)", icon: "✓", cat: "profile" },
  rejected: { color: "var(--red)", icon: "✕", cat: "profile" },
  reapplied: { color: "var(--amber)", icon: "↻", cat: "profile" },
};

function renderLogSkeleton() {
  const lang = getLang();
  const tabs = [
    { k: "all", l: lang === "ar" ? "الكل" : "All" },
    { k: "status", l: lang === "ar" ? "الحالة" : "Status" },
    { k: "notes", l: lang === "ar" ? "الملاحظات" : "Notes" },
    { k: "claims", l: lang === "ar" ? "الاستلام" : "Claims" },
    { k: "profile", l: lang === "ar" ? "الملف" : "Profile" },
  ];
  return `
    <div class="log-tabs" id="req-log-filter">
      ${tabs.map((tb, i) => `<button class="log-tab${i === 0 ? " on" : ""}"><span style="display:inline-block;width:2.25rem;height:0.875rem;background:var(--bdr2);border-radius:4px"></span></button>`).join("")}
    </div>
    <div class="log-body-wrap log-skeleton">
      ${Array.from({ length: 3 })
        .map(
          (_, i) => `
        <div class="log-group">
          <div class="log-group-label"><span style="display:inline-block;width:2rem;height:0.75rem;background:var(--bdr2);border-radius:4px"></span></div>
          ${Array.from({ length: 2 })
            .map(
              () => `
            <div class="log-card" style="pointer-events:none">
              <div class="log-card-icon" style="background:var(--bdr2);width:1.75rem;height:1.75rem;border-radius:8px"></div>
              <div class="log-card-body">
                <div style="display:flex;gap:0.5rem;margin-bottom:0.5rem"><span style="display:inline-block;width:5rem;height:0.875rem;background:var(--bdr2);border-radius:4px"></span><span style="display:inline-block;width:3rem;height:0.75rem;background:var(--bdr2);border-radius:4px"></span></div>
                <span style="display:block;width:100%;height:0.75rem;background:var(--bdr2);border-radius:4px;margin-bottom:0.5rem"></span>
                <span style="display:block;width:3rem;height:0.75rem;background:var(--bdr2);border-radius:4px"></span>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
      `,
        )
        .join("")}
    </div>
  `;
}

function renderLogTimeline(logs) {
  const lang = getLang();
  if (!logs || !logs.length)
    return `<div class="log-empty">${lang === "ar" ? "لا توجد سجلات بعد" : "No activity yet"}</div>`;

  const groups = {};
  for (const l of logs) {
    const day = new Date(l.created_at).toDateString();
    if (!groups[day])
      groups[day] = { date: new Date(l.created_at), entries: [] };
    groups[day].entries.push(l);
  }

  const now = new Date(),
    today = now.toDateString();
  const yesterday = new Date(now - 86400000).toDateString();
  const dayLabel = (d) => {
    const s = d.toDateString();
    if (s === today) return lang === "ar" ? "اليوم" : "Today";
    if (s === yesterday) return lang === "ar" ? "أمس" : "Yesterday";
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  return Object.entries(groups)
    .map(
      ([, grp]) => `
    <div class="log-group">
      <div class="log-group-label"><span>${esc(dayLabel(grp.date))}</span></div>
      ${grp.entries
        .map((l) => {
          const meta = LOG_META[l.action] || { color: "var(--tm)", icon: "·" };
          const label = t("log." + l.action) || l.action;
          return `<div class="log-card">
          <div class="log-card-icon" style="background:${meta.color}18;color:${meta.color}">${meta.icon}</div>
          <div class="log-card-body">
            <div class="log-card-top">
              <span class="log-card-action">${esc(label)}</span>
              ${l.doctor_name ? `<span class="log-card-who">${esc(l.doctor_name)}</span>` : ""}
            </div>
            ${
              l.old_value && l.new_value
                ? `<div class="log-card-change">
              <span class="log-old">${esc(l.old_value)}</span>
              <span class="log-arrow">→</span>
              <span class="log-new">${esc(l.new_value)}</span>
            </div>`
                : ""
            }
            ${l.detail && l.detail !== l.old_value ? `<p class="log-card-detail">${esc(l.detail)}</p>` : ""}
            <p class="log-card-time">${new Date(l.created_at).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>`;
        })
        .join("")}
    </div>`,
    )
    .join("");
}

// Tab-based log block: All | Status | Notes | Claims | Profile
function renderFilteredLogBlock(cid, allLogs) {
  const el = document.getElementById(cid);
  if (!el) return;
  const lang = getLang();
  let activeTab = "all";

  const TAB_DEFS = [
    { k: "all", l: lang === "ar" ? "الكل" : "All", cats: null },
    {
      k: "status",
      l: lang === "ar" ? "الحالة" : "Status",
      cats: ["status_changed", "created"],
    },
    {
      k: "notes",
      l: lang === "ar" ? "الملاحظات" : "Notes",
      cats: ["notes_updated"],
    },
    {
      k: "claims",
      l: lang === "ar" ? "الاستلام" : "Claims",
      cats: ["claim_submitted", "claim_approved", "claim_declined"],
    },
    {
      k: "profile",
      l: lang === "ar" ? "الملف" : "Profile",
      cats: ["applied", "approved", "rejected", "reapplied", "profile_updated"],
    },
  ];

  function count(cats) {
    return cats
      ? allLogs.filter((l) => cats.includes(l.action)).length
      : allLogs.length;
  }
  function filtered(cats) {
    return cats ? allLogs.filter((l) => cats.includes(l.action)) : allLogs;
  }

  function renderTabs() {
    return `<div class="log-tabs" id="${cid}-tabs">
      ${TAB_DEFS.map((tb) => {
        const n = count(tb.cats);
        const showBadge = ["claims", "profile"].includes(tb.k);
        return `<button class="log-tab${activeTab === tb.k ? " on" : ""}" data-tk="${tb.k}">
          ${esc(tb.l)}${showBadge && n > 0 ? `<span class="log-tab-count">${n}</span>` : ""}
        </button>`;
      }).join("")}
    </div>`;
  }

  function renderBody() {
    const td = TAB_DEFS.find((t) => t.k === activeTab);
    return `<div class="log-body-wrap" id="${cid}-body">${renderLogTimeline(filtered(td?.cats))}</div>`;
  }

  function render() {
    el.innerHTML = renderTabs() + renderBody();
    qs(".log-tab", el).forEach((btn) =>
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tk;
        render();
      }),
    );
  }

  render();
  if (el.parentElement) el.parentElement.style.opacity = "1";
}

// ── Top Navbar ────────────────────────────────────────────────────────────────
function renderNavbar() {
  const nb = document.getElementById("nb");
  if (!nb) return;
  nb.innerHTML = `<nav class="nb" role="navigation">
    <div class="nb-inner">
      <div class="nb-center">${IC.tooth}<span>${esc(t("app.name"))}</span></div>
    </div>
  </nav>`;
}

// ── Bottom nav ────────────────────────────────────────────────────────────────
function renderBottomNav(badges = {}) {
  const bnav = document.getElementById("bnav");
  if (!bnav) return;
  const lang = getLang();
  const themeIcon = getTheme() === "light" ? IC.moon : IC.sun;
  const themeLabel =
    lang === "ar"
      ? getTheme() === "light"
        ? "الوضع الداكن"
        : "الوضع الفات��"
      : getTheme() === "light"
        ? "Dark Mode"
        : "Light Mode";

  let pillHTML = "",
    hasPill = false;

  if (AppState.session) {
    const hash = decodeURIComponent(window.location.hash.slice(1)) || "/";
    let items = [];

    if (AppState.isAdmin) {
      items = [
        {
          path: "/admin",
          icon: IC.clipboard,
          label: t("nav.requests"),
          badge: 0,
        },
        {
          path: "/admin/doctors",
          icon: IC.users,
          label: t("nav.management"),
          badge:
            (badges.pendingDocs || 0) +
            (badges.pendingEdits || 0) +
            (badges.pendingClaims || 0),
        },
      ];
    } else if (AppState.doctor) {
      items = [
        {
          path: "/doctor/dash",
          icon: IC.clipboard,
          label: t("nav.dash"),
          badge: 0,
        },
        {
          path: "/doctor/profile",
          icon: IC.user,
          label: t("nav.profile"),
          badge: 0,
        },
      ];
    }

    if (items.length) {
      hasPill = true;
      const isActive = (path) => hash === path;
      pillHTML = `<div class="bnav-pill" id="bnav-pill-inner">
        <div class="bnav-pill-track" id="bnav-pill-track"></div>
        ${items
          .map(
            (item) => `
          <button type="button" class="bnav-item${isActive(item.path) ? " active" : ""}" data-path="${item.path}" role="button" aria-label="${esc(item.label)}">
            ${item.icon}
            <span>${esc(item.label)}</span>
            ${item.badge ? `<span class="bnav-badge">${item.badge > 99 ? "99+" : item.badge}</span>` : ""}
          </button>`,
          )
          .join("")}
      </div>`;
    }
  }

  bnav.innerHTML = `<div class="bnav-outer">
    ${hasPill ? pillHTML : ""}
    <div class="bnav-bubble" id="bnav-bubble">
      <button class="bnav-bubble-btn" id="bnav-bubble-toggle" aria-label="Settings" aria-expanded="false">
        ${IC.settings}
      </button>
      <div class="bnav-bubble-menu" id="bnav-bubble-menu" role="menu">
        <button class="bnav-menu-item" id="bm-lang">${IC.globe}<span>${esc(t("nav.language"))}</span></button>
        <button class="bnav-menu-item" id="bm-theme">${themeIcon}<span>${esc(themeLabel)}</span></button>
        ${
          AppState.session
            ? `<div class="bnav-menu-sep"></div>
          <button class="bnav-menu-item danger" id="bm-logout">${IC.logout}<span>${esc(t("nav.logout"))}</span></button>`
            : ""
        }
      </div>
    </div>
  </div>`;

  if (hasPill) {
    bnav.classList.add("visible");
    document.body.classList.add("has-bnav");
  } else {
    bnav.classList.remove("visible");
    document.body.classList.remove("has-bnav");
  }

  function movePillTrack(targetItem, immediate = false) {
    const pill = q("#bnav-pill-inner");
    const track = q("#bnav-pill-track");
    if (!pill || !track || !targetItem) return;
    const pr = pill.getBoundingClientRect();
    const ir = targetItem.getBoundingClientRect();
    const isRtl = document.documentElement.dir === "rtl";
    const left = ir.left - pr.left;
    const right = pr.right - ir.right;

    if (immediate) {
      track.style.transition = "none";
    }

    track.style.width = ir.width + "px";
    track.style.top = "5px";
    track.style.bottom = "5px";

    if (isRtl) {
      track.style.right = right + "px";
      track.style.left = "auto";
    } else {
      track.style.left = left + "px";
      track.style.right = "auto";
    }

    if (immediate) {
      requestAnimationFrame(() => {
        track.style.transition = "";
      });
    }
  }

  // ── Wire up pill navigation ─────────────────────────────────────────────────
  if (hasPill) {
    const pill = q("#bnav-pill-inner");

    // Position the sliding track on the active item after paint
    requestAnimationFrame(() => {
      const activeItem = q(".bnav-item.active", pill);
      movePillTrack(activeItem, true);
    });

    qs(".bnav-item", pill).forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const path = item.dataset.path;
        if (!path) return;

        item.style.animation = "none";
        requestAnimationFrame(() => { item.style.animation = ""; });

        qs(".bnav-item", pill).forEach((it) => it.classList.remove("active"));
        item.classList.add("active");
        movePillTrack(item);
        navigate(path);

        if (navigator.vibrate) navigator.vibrate(10);
      });

      item.addEventListener("mouseenter", () => {
        const track = q("#bnav-pill-track", pill);
        if (track) track.style.opacity = "0.7";
      });

      item.addEventListener("mouseleave", () => {
        const track = q("#bnav-pill-track", pill);
        if (track) track.style.opacity = "1";
      });
    });

    document._bnavResize &&
      window.removeEventListener("resize", document._bnavResize);
    document._bnavResize = () => {
      const current = q(".bnav-item.active", pill);
      movePillTrack(current);
    };
    window.addEventListener("resize", document._bnavResize);
  }

  // Bubble toggle with enhanced feedback
  const bubble = q("#bnav-bubble-toggle"),
    menu = q("#bnav-bubble-menu");
  bubble?.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = menu.classList.toggle("open");
    bubble.classList.toggle("open", open);
    bubble.setAttribute("aria-expanded", String(open));

    // Haptic feedback
    if (navigator.vibrate && open) {
      navigator.vibrate(12);
    }
  });
  document._bnavClose &&
    document.removeEventListener("click", document._bnavClose);
  document._bnavClose = () => {
    menu?.classList.remove("open");
    bubble?.classList.remove("open");
    bubble?.setAttribute("aria-expanded", "false");
  };
  document.addEventListener("click", document._bnavClose);

  // ── Language toggle — NEVER re-renders the page ───────────────────────────
  // Only updates dir/lang attributes and the nav itself.
  q("#bm-lang")?.addEventListener("click", () => {
    // Snapshot all current input values before re-rendering
    const snap = {};
    qs("input,textarea,select", document.getElementById("app")).forEach(
      (el) => {
        if (el.id) snap[el.id] = el.type === "checkbox" ? el.checked : el.value;
      },
    );

    setLang(getLang() === "ar" ? "en" : "ar");
    renderNavbar();
    renderBottomNav(badges);

    // Re-render the current page in the new language
    dispatch();

    // Restore form values after the new render settles
    requestAnimationFrame(() => {
      Object.entries(snap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === "checkbox") el.checked = val;
        else el.value = val;
      });
    });
  });

  q("#bm-theme")?.addEventListener("click", () => {
    toggleTheme();
    renderBottomNav(badges);
  });

  q("#bm-logout")?.addEventListener("click", async () => {
    await authSignOut();
    renderNavbar();
    renderBottomNav();
    navigate("/");
  });
}
