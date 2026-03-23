"use strict";

registerRoute("/admin", async (app) => {
  if (!AppState.isAdmin) {
    navigate("/doctor/login");
    return;
  }
  app.innerHTML = `<div class="sp-page"><div class="spin"></div></div>`;

  let reqs = [],
    rtChannel = null,
    claimChannel = null,
    badgeChannel = null;
  let search = "",
    fStatus = "",
    fType = "";
  let notifications = [];

  async function load() {
    // Let errors bubble up — caller handles them
    reqs = await dbGetRequests();
    // Normalize suffering_types to always be an array
    reqs = reqs.map((r) => ({
      ...r,
      suffering_types: Array.isArray(r.suffering_types)
        ? r.suffering_types
        : typeof r.suffering_types === "string"
          ? JSON.parse(r.suffering_types || "[]")
          : [],
    }));
    console.log("[admin-dash] loaded", reqs.length, "requests");
  }

  function addNotif(title, sub, type = "new") {
    notifications.unshift({ title, sub, type, time: Date.now() });
    if (notifications.length > 20) notifications.pop();
    renderNotifFeed();
  }

  function startRealtime() {
    if (rtChannel) dbRemoveChannel(rtChannel);
    if (claimChannel) dbRemoveChannel(claimChannel);
    if (badgeChannel) dbRemoveChannel(badgeChannel);

    rtChannel = dbSubscribeToRequests(
      (nr) => {
        if (!reqs.find((r) => r.id === nr.id)) reqs.unshift(nr);
        else {
          const i = reqs.findIndex((r) => r.id === nr.id);
          if (i !== -1) reqs[i] = nr;
        }
        addNotif(
          getLang() === "ar" ? "طلب جديد وصل" : "New request",
          nr.full_name,
          "new",
        );
        renderList();
      },
      (ur) => {
        const i = reqs.findIndex((r) => r.id === ur.id);
        if (i !== -1) reqs[i] = ur;
        else reqs.unshift(ur);
        renderList();
      },
    );
    claimChannel = dbSubscribeToClaims((p) => {
      if (p.eventType === "INSERT")
        addNotif(
          getLang() === "ar" ? "طلب استلام جديد" : "New claim",
          p.new?.doctor_name || "",
          "warn",
        );
    });
    badgeChannel = dbSubscribeToBadges(async () => {
      const b = await dbGetBadgeCounts().catch(() => ({}));
      renderBottomNav(b);
    });
  }

  function filtered() {
    return reqs.filter((r) => {
      if (fStatus && r.status !== fStatus) return false;
      const types = Array.isArray(r.suffering_types) ? r.suffering_types : [];
      if (fType && !types.includes(fType)) return false;
      if (search) {
        const sq = search.toLowerCase();
        if (
          !r.full_name.toLowerCase().includes(sq) &&
          !r.patient_id.toLowerCase().includes(sq) &&
          !(r.phone || "").toLowerCase().includes(sq)
        )
          return false;
      }
      return true;
    });
  }

  function renderNotifFeed() {
    const el = q("#notif-feed");
    if (!el) return;
    if (!notifications.length) {
      el.innerHTML = "";
      return;
    }
    const lang = getLang();
    el.innerHTML = `
      <div class="notif-feed">
        ${notifications
          .slice(0, 5)
          .map(
            (n) => `
          <div class="notif-item notif-${n.type}">
            <div class="notif-dot" style="background:${n.type === "new" ? "var(--p)" : "var(--amber)"}"></div>
            <div class="notif-body">
              <p class="notif-title">${esc(n.title)}</p>
              ${n.sub ? `<p class="notif-sub">${esc(n.sub)}</p>` : ""}
            </div>
            <span class="notif-time">${formatLastSeen(n.time)}</span>
          </div>`,
          )
          .join("")}
      </div>`;
  }

  function renderList() {
    const rl = q("#rl");
    if (!rl) return;
    const list = filtered(),
      lang = getLang();
    rl.innerHTML = list.length
      ? list
          .map((r) => {
            const types = Array.isArray(r.suffering_types)
              ? r.suffering_types
              : [];
            const tags =
              types
                .slice(0, 2)
                .map(
                  (v) =>
                    `<span class="badge b-neu" style="font-size:.7rem">${esc(sufLabel(v))}</span>`,
                )
                .join("") +
              (types.length > 2
                ? `<span class="badge-more">+${types.length - 2}</span>`
                : "");
            return `<div class="rc" data-id="${r.id}" tabindex="0" role="button">
        <div class="rc-main">
          <div class="rc-title-row">
            <span class="rc-name">${esc(r.full_name)}</span>
            <span class="rc-pid">${esc(r.patient_id)}</span>
            ${r.assigned_doctor_name ? `<span class="rc-doctor">${esc(r.assigned_doctor_name)}</span>` : ""}
          </div>
          <div class="rc-tags">${tags}</div>
        </div>
        <div class="rc-side">${reqBadge(r.status)}</div>
      </div>`;
          })
          .join("")
      : `<div class="empty-state">${esc(t("doc.empty"))}</div>`;
    qs(".rc", rl).forEach((el) => {
      el.addEventListener("click", () =>
        openModal(reqs.find((r) => r.id === el.dataset.id)),
      );
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") el.click();
      });
    });
  }

  function render() {
    const lang = getLang();
    const ph =
      lang === "ar" ? "اسم، رقم مريض، أو تليفون" : "Name, code, or phone";
    app.innerHTML = `<div class="page-wrap">
      <h1 class="ptitle">${esc(t("adm.reqs_title"))}</h1>
      <div id="notif-feed"></div>
      <div class="fb">
        <div style="position:relative;flex:1;min-width:160px">
          <span class="inp-icon">${IC.search}</span>
          <input class="inp inp-with-icon" id="fs" placeholder="${esc(ph)}" value="${esc(search)}" style="padding-block:.5rem;font-size:.875rem">
        </div>
        <div class="sel-w" style="min-width:130px">
          <select class="sel" id="fst" style="padding:.5rem .875rem;font-size:.875rem">
            <option value="">${esc(t("doc.all_s"))}</option>
            <option value="incomplete">${esc(t("c.s_new"))}</option>
            <option value="ongoing">${esc(t("c.s_ong"))}</option>
            <option value="done">${esc(t("c.s_don"))}</option>
          </select>
        </div>
        <div class="sel-w" style="min-width:150px">
          <select class="sel" id="fty" style="padding:.5rem .875rem;font-size:.875rem">
            <option value="">${esc(t("doc.all_t"))}</option>
            ${SUFFERING.map((s) => `<option value="${s.v}">${esc(lang === "ar" ? s.ar : s.en)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div id="rl" style="display:flex;flex-direction:column;gap:.625rem"></div>
    </div>`;

    q("#fs").addEventListener("input", (e) => {
      search = e.target.value;
      renderList();
    });
    q("#fst").value = fStatus;
    q("#fst").addEventListener("change", (e) => {
      fStatus = e.target.value;
      renderList();
    });
    q("#fty").value = fType;
    q("#fty").addEventListener("change", (e) => {
      fType = e.target.value;
      renderList();
    });
    renderNotifFeed();
    renderList();
    startRealtime();
  }

  function openModal(r) {
    if (!r) return;
    const lang = getLang();
    const types = Array.isArray(r.suffering_types) ? r.suffering_types : [];
    const tags = types
      .map((v) => `<span class="badge b-neu">${esc(sufLabel(v))}</span>`)
      .join(" ");
    showModal({
      title: r.full_name,
      size: "lg",
      content: `<div style="display:flex;flex-direction:column;gap:1rem">
        <div class="ig">
          <div><p class="ii-lbl">${esc(t("doc.pid"))}</p><p class="ii-val mono">${esc(r.patient_id)}</p></div>
          <div><p class="ii-lbl">${lang === "ar" ? "الحالة" : "Status"}</p>${reqBadge(r.status)}</div>
          <div><p class="ii-lbl">${esc(t("auth.name"))}</p><p class="ii-val">${esc(r.full_name)}</p></div>
          <div><p class="ii-lbl">${esc(t("doc.gender"))}</p><p class="ii-val">${r.gender === "male" ? esc(t("doc.male")) : esc(t("doc.female"))}</p></div>
          ${r.date_of_birth ? `<div><p class="ii-lbl">${lang === "ar" ? "السن" : "Age"}</p><p class="ii-val">${Math.floor((Date.now() - new Date(r.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))} ${lang === "ar" ? "سنة" : "yrs"}</p></div>` : ""}
          <div><p class="ii-lbl">${esc(t("doc.phone"))}</p><p class="ii-val mono" dir="ltr">${esc(r.phone)}</p></div>
          <div><p class="ii-lbl">${esc(t("doc.addr"))}</p><p class="ii-val">${esc(r.address)}</p></div>
          <div><p class="ii-lbl">${esc(t("doc.nid"))}</p><p class="ii-val mono" dir="ltr">${esc(r.national_id_num)}</p></div>
          ${r.assigned_doctor_name ? `<div><p class="ii-lbl">${esc(t("doc.assigned"))}</p><p class="ii-val" style="color:var(--p)">${esc(r.assigned_doctor_name)}</p></div>` : ""}
          <div><p class="ii-lbl">${lang === "ar" ? "تاريخ التقديم" : "Submitted"}</p><p class="ii-val tx">${formatDateTime(r.created_at)}</p></div>
        </div>
        <div><p class="lbl mb3">${esc(t("doc.suf"))}</p><div style="display:flex;flex-wrap:wrap;gap:.375rem">${tags}</div></div>
        ${r.notes ? `<div><p class="lbl mb3">${esc(t("pat.notes"))}</p><p class="ts t2c">${esc(r.notes)}</p></div>` : ""}
        ${r.doctor_notes ? `<div><p class="lbl mb3">${esc(t("doc.notes"))}</p><p class="ts t2c">${esc(r.doctor_notes)}</p></div>` : ""}
        ${
          r.national_id_front_url || r.national_id_back_url
            ? `
          <div style="display:flex;flex-wrap:wrap;gap:.5rem">
            ${imgBtn(r.national_id_front_url, t("adm.id_f"))}
            ${imgBtn(r.national_id_back_url, t("adm.id_b"))}
          </div>`
            : ""
        }
        <div>
          <p class="lbl mb3">${lang === "ar" ? "سجل النشاط" : "Activity Log"}</p>
          <div id="req-log-wrap">${renderLogSkeleton()}</div>
        </div>
        <div class="danger-zone">
          <p class="danger-zone-label">${lang === "ar" ? "منطقة الخطر" : "Danger Zone"}</p>
          <button class="btn btn-d btn-sm" id="b-del-req">${IC.trash}<span>${esc(t("adm.delete_req"))}</span></button>
        </div>
      </div>`,
      footer: `<button class="btn btn-s btn-md" id="m-close">${esc(t("c.close"))}</button>`,
    });
    q("#m-close").onclick = closeModal;
    bindImgPreviews(q(".mbody"));
    dbGetLogsForRequest(r.id).then((logs) => {
      const wrap = q("#req-log-wrap");
      if (!wrap) return;
      wrap.innerHTML = '<div id="req-log-filter"></div>';
      renderFilteredLogBlock("req-log-filter", logs);
    });
    q("#b-del-req").addEventListener("click", () => {
      destructiveConfirm(
        lang === "ar"
          ? `حذف طلب "${r.full_name}"؟`
          : `Delete request for "${r.full_name}"?`,
        async () => {
          try {
            await dbDeleteRequest(r.id);
            reqs = reqs.filter((x) => x.id !== r.id);
            toast(t("c.deleted"), "success");
            closeModal();
            renderList();
          } catch (err) {
            toast(err.message || t("c.err"), "error");
          }
        },
      );
    });
  }

  try {
    await load();
    render();
  } catch (err) {
    console.error("[admin-dash:load]", err.message, err);
    const lang = getLang();
    app.innerHTML = `<div class="page-wrap" style="padding-top:2rem">
      <div class="notice n-red">
        <span class="notice-icon">${IC.xCircle.replace('width="28"', 'width="16"').replace('height="28"', 'height="16"')}</span>
        <div>
          <p class="fw6" style="margin-bottom:.375rem">${lang === "ar" ? "تعذّر تحميل الطلبات" : "Could not load requests"}</p>
          <p class="ts" style="font-family:monospace;font-size:.8rem;word-break:break-all">${esc(err.message)}</p>
          <button class="btn btn-s btn-sm" style="margin-top:.75rem" onclick="location.reload()">${lang === "ar" ? "إعادة المحاولة" : "Retry"}</button>
        </div>
      </div>
    </div>`;
  }
  // Re-render labels when language changes (no form state to lose)
  window.addEventListener(
    "hashchange",
    () => {
      dbRemoveChannel(rtChannel);
      dbRemoveChannel(claimChannel);
      dbRemoveChannel(badgeChannel);
    },
    { once: true },
  );
});
