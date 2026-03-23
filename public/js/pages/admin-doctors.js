"use strict";

registerRoute("/admin/doctors", async (app) => {
  if (!AppState.isAdmin) {
    navigate("/doctor/login");
    return;
  }
  app.innerHTML = `<div class="sp-page"><div class="spin"></div></div>`;

  let doctors = [],
    presence = {},
    presenceCh = null,
    badgeCh = null;
  let badges = { pendingDocs: 0, pendingEdits: 0, pendingClaims: 0 };
  let activeTab = loadTab("admin-doctors", "doctors");
  let docSearch = "",
    docStatus = "all";
  let appSettings = null;

  async function load() {
    try {
      [doctors, badges, appSettings] = await Promise.all([
        dbGetAllDoctors(),
        dbGetBadgeCounts(),
        dbGetPaymentSettings().catch(() => null),
      ]);
    } catch (err) {
      console.error(err);
      toast(err.message || t("c.err"), "error");
    }
  }

  function cooldowns() {
    try {
      return appSettings?.metadata?.cooldowns || {};
    } catch {
      return {};
    }
  }

  function startPresence() {
    presenceCh = dbSubscribePresence((state) => {
      presence = {};
      Object.values(state).forEach((ps) =>
        ps.forEach((p) => {
          presence[p.doctor_id] = p;
        }),
      );
      if (activeTab === "doctors") renderDoctorList();
    });
  }
  function startBadgeRt() {
    badgeCh = dbSubscribeToBadges(async () => {
      badges = await dbGetBadgeCounts().catch(() => badges);
      renderTabs();
      renderBottomNav(badges);
    });
  }
  const isOnline = (id) => !!presence[id];

  function filteredDoctors() {
    return doctors.filter((d) => {
      if (docStatus !== "all" && d.status !== docStatus) return false;
      if (docSearch) {
        const sq = docSearch.toLowerCase();
        if (
          !d.full_name.toLowerCase().includes(sq) &&
          !d.email.toLowerCase().includes(sq) &&
          !(d.phone || "").includes(sq)
        )
          return false;
      }
      return true;
    });
  }

  async function setStatus(id, status, reason = null) {
    try {
      await dbSetDoctorStatus(id, status, reason);
      const d = doctors.find((x) => x.id === id);
      if (d) {
        d.status = status;
        d.rejection_reason = status === "rejected" ? reason : null;
      }
      await dbLogDoctorApplication(
        id,
        status === "approved" ? "approved" : "rejected",
        reason,
      );
      toast(
        {
          approved: t("adm.approve"),
          pending: t("prof.pend"),
          rejected: t("adm.reject"),
        }[status] || status,
        "success",
      );
      badges = await dbGetBadgeCounts().catch(() => badges);
      renderTabs();
      closeModal();
      renderDoctorList();
    } catch (err) {
      toast(err.message || t("c.err"), "error");
    }
  }

  function promptReject(doc) {
    showModal({
      title: t("adm.reject"),
      size: "sm",
      content: `<div class="fg"><label class="lbl">${esc(t("adm.rej_r"))}<span class="req">*</span></label><input class="inp" id="rr" type="text" autocomplete="off"><p class="ferr" id="rr-e" style="display:none"></p></div>`,
      footer: `<button class="btn btn-s btn-md" id="bc">${esc(t("c.cancel"))}</button><button class="btn btn-d btn-md" id="br">${esc(t("adm.reject"))}</button>`,
    });
    q("#bc").onclick = closeModal;
    q("#br").onclick = async () => {
      const r = san(q("#rr").value.trim());
      if (!r) {
        showErr("rr", t("c.req"));
        return;
      }
      await setStatus(doc.id, "rejected", r);
    };
  }

  function renderDoctorList() {
    const dl = q("#doctor-list");
    if (!dl) return;
    const list = filteredDoctors();
    const lang = getLang();
    if (!list.length) {
      dl.innerHTML = `<div class="empty-state">${esc(t("adm.no_pend"))}</div>`;
      return;
    }
    dl.innerHTML = list
      .map((doc) => {
        const online = isOnline(doc.id);
        return `<div class="doc-card" data-did="${doc.id}" tabindex="0" role="button">
        <div class="doc-card-inner">
          <div class="doc-card-left">
            ${onlineDot(online)}
            <div class="doc-card-info">
              <div class="doc-card-name-row">
                <span class="fw6">${esc(doc.full_name)}</span>
                <span data-edit-badge="${doc.id}"></span>
              </div>
              <p class="tx t2c" dir="ltr">${esc(doc.email)}</p>
              <p class="tx tm">${esc(doc.university)} · ${esc(doc.semester)}</p>
            </div>
          </div>
          <div class="doc-card-right" onclick="event.stopPropagation()">
            ${statusBadge(doc.status)}
            ${
              doc.status === "pending"
                ? `
              <button class="btn btn-ok btn-sm" data-apd="${doc.id}">${esc(t("adm.approve"))}</button>
              <button class="btn btn-d  btn-sm" data-rjd="${doc.id}">${esc(t("adm.reject"))}</button>`
                : ""
            }
          </div>
        </div>
      </div>`;
      })
      .join("");

    qs(".doc-card", dl).forEach((el) => {
      el.addEventListener("click", () =>
        openDocDetails(doctors.find((d) => d.id === el.dataset.did)),
      );
      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") el.click();
      });
    });
    qs("[data-apd]", dl).forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const doc = doctors.find((d) => d.id === btn.dataset.apd);
        confirmDialog(`${t("adm.approve")} "${doc?.full_name}"?`, () =>
          setStatus(btn.dataset.apd, "approved"),
        );
      }),
    );
    qs("[data-rjd]", dl).forEach((btn) =>
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        promptReject(doctors.find((d) => d.id === btn.dataset.rjd));
      }),
    );

    // Async: load pending edit badges
    dbGetPendingEdits()
      .then((edits) => {
        const lang = getLang();
        edits.forEach((ed) => {
          const b = q(`[data-edit-badge="${ed.doctor_id}"]`);
          if (b)
            b.innerHTML = `<span class="doc-edit-badge">${lang === "ar" ? "تعديل معلّق" : "Pending Edit"}</span>`;
        });
      })
      .catch(() => {});
  }

  function openDocDetails(doc) {
    if (!doc) return;
    const lang = getLang(),
      online = isOnline(doc.id);

    // ── Build modal with 4 tabs: Info | Orders | History | Actions ────────────
    showModal({
      title: doc.full_name,
      size: "lg",
      content: `
        <div class="doc-modal-tabs" id="dmt">
          <button class="doc-modal-tab on" data-dmt="info">${lang === "ar" ? "البيانات" : "Info"}</button>
          <button class="doc-modal-tab" data-dmt="orders">${lang === "ar" ? "الطلبات" : "Orders"}</button>
          <button class="doc-modal-tab" data-dmt="history">${lang === "ar" ? "السجل" : "History"}</button>
          <button class="doc-modal-tab" data-dmt="actions">${lang === "ar" ? "الإجراءات" : "Actions"}</button>
        </div>
        <div id="dmt-body" style="min-height:200px"></div>`,
      footer: `<button class="btn btn-s btn-md" id="bc-m">${esc(t("c.close"))}</button>`,
    });
    q("#bc-m").onclick = () => {
      if (pendEditsChannel) {
        dbRemoveChannel(pendEditsChannel);
        pendEditsChannel = null;
      }
      closeModal();
    };

    // Pre-load all async data so tab switches are instant
    let allReqs = null,
      pendEdits = null,
      appHistory = null,
      actLogs = null;
    const loads = {
      reqs: dbGetRequests()
        .then((r) => {
          // Normalize suffering_types to always be an array
          allReqs = r.map((req) => ({
            ...req,
            suffering_types: Array.isArray(req.suffering_types)
              ? req.suffering_types
              : typeof req.suffering_types === "string"
                ? JSON.parse(req.suffering_types || "[]")
                : [],
          }));
        })
        .catch(() => {
          allReqs = [];
        }),
      edits: dbGetPendingEditsForDoctor(doc.id)
        .then((r) => {
          pendEdits = r;
        })
        .catch(() => {
          pendEdits = [];
        }),
      apps: dbGetDoctorApplications(doc.id)
        .then((r) => {
          appHistory = r;
        })
        .catch(() => {
          appHistory = [];
        }),
      logs: dbGetLogsForDoctor(doc.id)
        .then((r) => {
          actLogs = r;
        })
        .catch(() => {
          actLogs = [];
        }),
    };
    let pendEditsChannel = null;

    Promise.all(Object.values(loads)).then(() => {
      // If on orders/history tab, re-render now that data is loaded
      const active = q(".doc-modal-tab.on")?.dataset.dmt;
      if (active && active !== "info") renderTab(active);

      // Subscribe to pending edits changes for live updates
      pendEditsChannel = dbSubscribeToPendingEdits((change) => {
        // Reload pending edits for this doctor
        dbGetPendingEditsForDoctor(doc.id)
          .then((r) => {
            pendEdits = r;
            // Re-render if we're on the history tab
            const histTab = q(".doc-modal-tab.on")?.dataset.dmt;
            if (histTab === "history") {
              renderTab("history");
            }
          })
          .catch(() => {});
      });
    });

    function renderTab(tab) {
      const body = q("#dmt-body");
      if (!body) return;
      qs(".doc-modal-tab", q("#dmt")).forEach((b) =>
        b.classList.toggle("on", b.dataset.dmt === tab),
      );

      if (tab === "info") {
        const mine = allReqs
          ? allReqs.filter((r) => r.assigned_doctor_id === doc.id)
          : null;
        body.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:1rem">
            <div class="ig">
              <div><p class="ii-lbl">${esc(t("auth.name"))}</p><p class="ii-val">${esc(doc.full_name)}</p></div>
              <div><p class="ii-lbl">${esc(t("auth.email"))}</p><p class="ii-val" dir="ltr">${esc(doc.email)}</p></div>
              <div><p class="ii-lbl">${esc(t("auth.phone"))}</p><p class="ii-val mono" dir="ltr">${esc(doc.phone || "—")}</p></div>
              <div><p class="ii-lbl">${esc(t("auth.addr"))}</p><p class="ii-val">${esc(doc.address || "—")}</p></div>
              <div><p class="ii-lbl">${esc(t("auth.uni"))}</p><p class="ii-val">${esc(doc.university || "—")}</p></div>
              <div><p class="ii-lbl">${esc(t("auth.sem"))}</p><p class="ii-val">${esc(doc.semester || "—")}</p></div>
              <div><p class="ii-lbl">${esc(t("auth.nid"))}</p><p class="ii-val mono" dir="ltr">${esc(doc.national_id_num || "—")}</p></div>
              <div><p class="ii-lbl">${lang === "ar" ? "آخر ظهور" : "Last Seen"}</p>
                <p class="ii-val" style="display:flex;align-items:center;gap:.375rem">
                  ${onlineDot(online)}${online ? (lang === "ar" ? "متصل الآن" : "Online now") : formatLastSeen(doc.last_seen)}
                </p>
              </div>
              <div><p class="ii-lbl">${lang === "ar" ? "تسجيل" : "Joined"}</p><p class="ii-val tx">${formatDateTime(doc.created_at)}</p></div>
              <div><p class="ii-lbl">${lang === "ar" ? "الحالة" : "Status"}</p>${statusBadge(doc.status)}</div>
              <div><p class="ii-lbl">${lang === "ar" ? "مكتملة" : "Done"}</p><p class="ii-val fw7" style="color:var(--green)">${mine ? mine.filter((r) => r.status === "done").length : "—"}</p></div>
              <div><p class="ii-lbl">${lang === "ar" ? "جارية" : "Ongoing"}</p><p class="ii-val fw7" style="color:var(--amber)">${mine ? mine.filter((r) => r.status === "ongoing").length : "—"}</p></div>
            </div>
            ${doc.rejection_reason ? `<div class="notice n-red"><div><p style="font-weight:600;margin-bottom:.25rem">${esc(t("auth.rej_r"))}:</p><p>${esc(doc.rejection_reason)}</p></div></div>` : ""}
            <div style="display:flex;flex-wrap:wrap;gap:.5rem">
              ${imgBtn(doc.national_id_front_url, t("adm.id_f"))}
              ${imgBtn(doc.national_id_back_url, t("adm.id_b"))}
              ${imgBtn(doc.university_id_front_url, t("adm.uid_f"))}
              ${imgBtn(doc.university_id_back_url, t("adm.uid_b"))}
            </div>
          </div>`;
        bindImgPreviews(body);
        return;
      }

      if (tab === "orders") {
        if (!allReqs) {
          body.innerHTML = `<div class="sp-page" style="min-height:120px"><div class="spin" style="width:1.5rem;height:1.5rem"></div></div>`;
          return;
        }
        const mine = allReqs.filter((r) => r.assigned_doctor_id === doc.id);
        if (!mine.length) {
          body.innerHTML = `<div class="empty-state">${lang === "ar" ? "لا توجد طلبات بعد" : "No orders yet"}</div>`;
          return;
        }

        body.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.875rem;flex-wrap:wrap;gap:.5rem">
            <p class="fw6">${lang === "ar" ? "سجل الطلبات" : "Order History"}</p>
            <div style="display:flex;gap:.5rem">
              <span class="badge b-don">${mine.filter((r) => r.status === "done").length} ${lang === "ar" ? "مكتمل" : "Done"}</span>
              <span class="badge b-ong">${mine.filter((r) => r.status === "ongoing").length} ${lang === "ar" ? "جارٍ" : "Ongoing"}</span>
            </div>
          </div>
          <div class="order-list">
            ${mine
              .map(
                (r, i) => `
              <div class="order-list-item" id="doli-${i}">
                <div class="order-list-header" data-doli="${i}">
                  <div style="min-width:0;flex:1">
                    <p class="fw6 trunc" style="font-size:.875rem">${esc(r.full_name)}</p>
                    <p class="tx mono tm" dir="ltr">${esc(r.patient_id)}</p>
                  </div>
                  <div style="display:flex;align-items:center;gap:.5rem;flex-shrink:0">
                    ${reqBadge(r.status)}
                    <span class="order-list-chevron">${IC.chevDown}</span>
                  </div>
                </div>
                <div class="order-list-body">
                  <div class="order-list-content">
                    <div class="ig" style="margin-bottom:.75rem">
                      <div><p class="ii-lbl">${lang === "ar" ? "الجنس" : "Gender"}</p><p class="ii-val">${r.gender === "male" ? (lang === "ar" ? "ذكر" : "Male") : lang === "ar" ? "أنثى" : "Female"}</p></div>
                      <div><p class="ii-lbl">${lang === "ar" ? "الهاتف" : "Phone"}</p><p class="ii-val mono" dir="ltr">${esc(r.phone || "—")}</p></div>
                      <div><p class="ii-lbl">${lang === "ar" ? "العنوان" : "Address"}</p><p class="ii-val">${esc(r.address || "—")}</p></div>
                      <div><p class="ii-lbl">${lang === "ar" ? "الرقم القومي" : "National ID"}</p><p class="ii-val mono" dir="ltr">${esc(r.national_id_num || "—")}</p></div>
                      <div><p class="ii-lbl">${lang === "ar" ? "تاريخ التقديم" : "Submitted"}</p><p class="ii-val tx">${formatDateTime(r.created_at)}</p></div>
                      <div><p class="ii-lbl">${lang === "ar" ? "آخر تحديث" : "Updated"}</p><p class="ii-val tx">${formatDateTime(r.updated_at || r.created_at)}</p></div>
                    </div>
                    ${r.suffering_types?.length ? `<div style="margin-bottom:.625rem"><p class="ii-lbl" style="margin-bottom:.375rem">${lang === "ar" ? "المشاكل الصحية" : "Conditions"}</p><div style="display:flex;flex-wrap:wrap;gap:.25rem">${r.suffering_types.map((v) => `<span class="badge b-pen" style="font-size:.7rem">${esc(sufLabel(v))}</span>`).join("")}</div></div>` : ""}
                    ${r.notes ? `<div style="margin-bottom:.625rem"><p class="ii-lbl" style="margin-bottom:.25rem">${lang === "ar" ? "ملاحظات المريض" : "Patient Notes"}</p><p class="ts t2c">${esc(r.notes)}</p></div>` : ""}
                    ${r.doctor_notes ? `<div><p class="ii-lbl" style="margin-bottom:.25rem">${lang === "ar" ? "ملاحظات الطبيب" : "Doctor Notes"}</p><p class="ts t2c">${esc(r.doctor_notes)}</p></div>` : ""}
                  </div>
                </div>
              </div>`,
              )
              .join("")}
          </div>`;
        qs(".order-list-header", body).forEach((hdr) => {
          hdr.addEventListener("click", () => {
            document
              .getElementById(`doli-${hdr.dataset.doli}`)
              ?.classList.toggle("open");
          });
        });
        return;
      }

      if (tab === "history") {
        if (!appHistory && !actLogs && !pendEdits) {
          body.innerHTML = `<div class="sp-page" style="min-height:120px"><div class="spin" style="width:1.5rem;height:1.5rem"></div></div>`;
          return;
        }
        // History tab has its own sub-tabs: Pending Edit | Applications | Activity
        const histTabs = [
          {
            k: "edit",
            l: lang === "ar" ? "التعديلات" : "Edits",
            badge: pendEdits?.length || 0,
          },
          {
            k: "apps",
            l: lang === "ar" ? "التقديمات" : "Applications",
            badge: 0,
          },
          { k: "activity", l: lang === "ar" ? "النشاط" : "Activity", badge: 0 },
        ];
        let histActive = pendEdits?.length ? "edit" : "apps";

        function renderHistTabs() {
          const ht = q("#hist-tabs");
          if (!ht) return;
          ht.innerHTML = histTabs
            .map(
              (tb) =>
                `<button class="log-tab${histActive === tb.k ? " on" : ""}" data-ht="${tb.k}">${tb.l}${tb.badge ? `<span class="log-tab-count">${tb.badge}</span>` : ""}</button>`,
            )
            .join("");
          qs("[data-ht]", ht).forEach((b) =>
            b.addEventListener("click", () => {
              histActive = b.dataset.ht;
              renderHistContent();
            }),
          );
        }

        function renderHistContent() {
          renderHistTabs();
          const hb = q("#hist-body");
          if (!hb) return;

          if (histActive === "edit") {
            if (!pendEdits || !pendEdits.length) {
              hb.innerHTML = `<div class="empty-state" style="padding:1.5rem 0">${lang === "ar" ? "لا توجد تعديلات معلّقة" : "No pending edits"}</div>`;
              return;
            }
            const ed = pendEdits[0];
            hb.innerHTML = `
              <div class="card" style="padding:.875rem 1rem;background:rgba(255,149,0,.04);border-color:rgba(255,149,0,.2)">
                <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:.875rem">
                  ${Object.entries(ed.changes)
                    .map(([k, v]) => {
                      const isImg = [
                        "national_id_front_url",
                        "national_id_back_url",
                        "university_id_front_url",
                        "university_id_back_url",
                      ].includes(k);
                      return isImg
                        ? `<div class="change-chip">${imgBtn(v, k.replace(/_url$/, "").replace(/_/g, " "))}</div>`
                        : `<div class="change-chip"><p class="change-key">${esc(k)}</p><p class="change-val">${esc(v)}</p></div>`;
                    })
                    .join("")}
                </div>
                <p class="tx tm mb3">${formatDateTime(ed.created_at)}</p>
                <div style="display:flex;gap:.5rem">
                  <button class="btn btn-ok btn-sm" id="b-app-edit">${IC.check}<span>${esc(t("adm.app_edit"))}</span></button>
                  <button class="btn btn-d  btn-sm" id="b-rej-edit">${IC.close.replace('width="18"', 'width="14"').replace('height="18"', 'height="14"')}<span>${esc(t("adm.rej_edit"))}</span></button>
                </div>
              </div>`;
            bindImgPreviews(hb);
            q("#b-app-edit").onclick = () =>
              confirmDialog(t("adm.app_edit") + "?", async () => {
                try {
                  await dbApproveDoctorEdit(ed.id, doc.id, ed.changes);
                  const d = doctors.find((x) => x.id === doc.id);
                  if (d) Object.assign(d, ed.changes);
                  pendEdits = [];
                  badges = await dbGetBadgeCounts().catch(() => badges);
                  toast(t("adm.app_edit"), "success");
                  renderTabs();
                  renderHistContent();
                } catch (err) {
                  toast(err.message || t("c.err"), "error");
                }
              });
            q("#b-rej-edit").onclick = () => {
              showModal({
                title: t("adm.rej_edit"),
                size: "sm",
                content: `<div class="fg"><label class="lbl">${esc(t("adm.rej_r"))}<span class="req">*</span></label><input class="inp" id="er" type="text" autocomplete="off"><p class="ferr" id="er-e" style="display:none"></p></div>`,
                footer: `<button class="btn btn-s btn-md" id="ec">${esc(t("c.cancel"))}</button><button class="btn btn-d btn-md" id="eo">${esc(t("adm.rej_edit"))}</button>`,
              });
              q("#ec").onclick = closeModal;
              q("#eo").onclick = async () => {
                const r = san(q("#er").value.trim());
                if (!r) {
                  showErr("er", t("c.req"));
                  return;
                }
                try {
                  await dbRejectDoctorEdit(ed.id, doc.id);
                  pendEdits = [];
                  badges = await dbGetBadgeCounts().catch(() => badges);
                  toast(t("adm.rej_edit"), "info");
                  closeModal();
                  renderTabs();
                  renderHistContent();
                } catch (err) {
                  toast(err.message || t("c.err"), "error");
                }
              };
            };
            return;
          }

          if (histActive === "apps") {
            if (!appHistory?.length) {
              hb.innerHTML = `<div class="empty-state" style="padding:1.5rem 0">${lang === "ar" ? "لا يوجد سجل" : "No history"}</div>`;
              return;
            }
            const cols = {
              applied: "var(--p)",
              approved: "var(--green)",
              rejected: "var(--red)",
              reapplied: "var(--amber)",
            };
            hb.innerHTML = `<div class="log-group"><div class="log-group-label"><span>${lang === "ar" ? "سجل التقديمات" : "Application History"}</span></div>${appHistory
              .map(
                (a) => `<div class="log-card">
                <div class="log-card-icon" style="background:${cols[a.action] || "var(--tm)"}18;color:${cols[a.action] || "var(--tm)"}">
                  ${{ applied: "⊕", approved: "✓", rejected: "✕", reapplied: "↻" }[a.action] || "·"}
                </div>
                <div class="log-card-body">
                  <div class="log-card-top"><span class="log-card-action">${esc(t("log." + a.action) || a.action)}</span></div>
                  ${a.reason ? `<p class="log-card-detail">${esc(a.reason)}</p>` : ""}
                  <p class="log-card-time">${formatDateTime(a.created_at)}</p>
                </div>
              </div>`,
              )
              .join("")}</div>`;
            return;
          }

          if (histActive === "activity") {
            if (!actLogs?.length) {
              hb.innerHTML = `<div class="empty-state" style="padding:1.5rem 0">${lang === "ar" ? "لا يوجد نشاط" : "No activity"}</div>`;
              return;
            }
            hb.innerHTML = '<div id="doc-act-filter"></div>';
            renderFilteredLogBlock("doc-act-filter", actLogs);
            return;
          }
        }

        body.innerHTML = `<div class="log-tabs" id="hist-tabs"></div><div id="hist-body"></div>`;
        renderHistContent();
        return;
      }

      if (tab === "actions") {
        body.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:1.25rem">
            <div>
              <p class="lbl mb3">${lang === "ar" ? "تغيير الحالة" : "Change Status"}</p>
              <div style="display:flex;gap:.5rem;flex-wrap:wrap">
                <button class="btn btn-sm ${doc.status === "approved" ? "btn-p" : "btn-s"}" data-st="approved">${esc(t("adm.approve"))}</button>
                <button class="btn btn-sm ${doc.status === "pending" ? "btn-p" : "btn-s"}" data-st="pending">${esc(t("prof.pend"))}</button>
                <button class="btn btn-sm ${doc.status === "rejected" ? "btn-d" : "btn-s"}" data-st="rejected">${esc(t("adm.reject"))}</button>
              </div>
            </div>
            <div class="danger-zone">
              <p class="danger-zone-label">${lang === "ar" ? "منطقة الخطر" : "Danger Zone"}</p>
              <button class="btn btn-d btn-sm" id="b-del-doc">${IC.trash}<span>${esc(t("adm.delete_doc"))}</span></button>
            </div>
          </div>`;
        qs("[data-st]", body).forEach((btn) =>
          btn.addEventListener("click", () => {
            const target = btn.dataset.st;
            if (target === "rejected") promptReject(doc);
            else
              confirmDialog(`${t("adm.approve")} "${doc.full_name}"?`, () =>
                setStatus(doc.id, target),
              );
          }),
        );
        q("#b-del-doc")?.addEventListener("click", () => {
          destructiveConfirm(
            lang === "ar"
              ? `حذف الطبيب "${doc.full_name}"؟`
              : `Delete doctor "${doc.full_name}"?`,
            async () => {
              try {
                await dbDeleteDoctor(doc.id);
                doctors = doctors.filter((d) => d.id !== doc.id);
                toast(t("c.deleted"), "success");
                closeModal();
                renderDoctorList();
              } catch (err) {
                toast(err.message || t("c.err"), "error");
              }
            },
          );
        });
        return;
      }
    }

    // Bind tab switching
    qs(".doc-modal-tab", q("#dmt")).forEach((btn) =>
      btn.addEventListener("click", () => renderTab(btn.dataset.dmt)),
    );

    // Render initial tab
    renderTab("info");
  }

  async function renderClaimsTab() {
    const tc = q("#tc");
    if (!tc) return;
    tc.innerHTML = `<div class="sp-page"><div class="spin" style="width:1.5rem;height:1.5rem"></div></div>`;
    try {
      const [claims, reqs] = await Promise.all([
        dbGetPendingClaims(),
        dbGetRequests(),
      ]);
      // Normalize suffering_types to always be an array
      const allReqs = reqs.map((r) => ({
        ...r,
        suffering_types: Array.isArray(r.suffering_types)
          ? r.suffering_types
          : typeof r.suffering_types === "string"
            ? JSON.parse(r.suffering_types || "[]")
            : [],
      }));
      if (!claims.length) {
        tc.innerHTML = `<div class="empty-state">${esc(t("adm.no_pend"))}</div>`;
        return;
      }
      const lang = getLang();
      tc.innerHTML = claims
        .map((cl) => {
          const req = allReqs.find((r) => r.id === cl.request_id);
          const types =
            req && Array.isArray(req.suffering_types)
              ? req.suffering_types
              : [];
          const tags = types
            .slice(0, 2)
            .map(
              (v) =>
                `<span class="badge b-pen" style="font-size:.7rem">${esc(sufLabel(v))}</span>`,
            )
            .join("");
          return `<div class="card mb4">
          <div class="flex jsb" style="gap:1rem;margin-bottom:.875rem;flex-wrap:wrap">
            <div style="flex:1;min-width:0">
              <p class="fw6">${esc(cl.doctor_name)}</p>
              ${req ? `<p class="tx t2c">${esc(req.full_name)} · <span dir="ltr">${esc(req.patient_id)}</span></p>` : ""}
              <p class="tx tm">${formatDateTime(cl.created_at)}</p>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:.375rem">
              <span class="badge b-pen">${esc(cl.payment_method)}</span>
              ${req ? `<div style="display:flex;flex-wrap:wrap;gap:.25rem">${tags}</div>` : ""}
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:.625rem;margin-bottom:.875rem">
            ${imgBtn(cl.payment_screenshot_url, lang === "ar" ? "إيصال الدفع" : "Payment Receipt")}
          </div>
          <div style="display:flex;gap:.625rem;flex-wrap:wrap">
            <button class="btn btn-ok btn-sm" data-cap="${cl.id}" data-rid="${cl.request_id}" data-did="${cl.doctor_id}" data-dn="${esc(cl.doctor_name)}" onclick="event.stopPropagation()">
              ${IC.check}<span>${esc(t("adm.claim_approve"))}</span>
            </button>
            <button class="btn btn-d btn-sm" data-cdec="${cl.id}" onclick="event.stopPropagation()">
              ${IC.close.replace('width="18"', 'width="14"').replace('height="18"', 'height="14"')}<span>${esc(t("adm.claim_decline"))}</span>
            </button>
          </div>
        </div>`;
        })
        .join("");
      bindImgPreviews(tc);
      qs("[data-cap]", tc).forEach((btn) =>
        btn.addEventListener("click", () => {
          const lang = getLang();
          confirmDialog(
            lang === "ar"
              ? "الموافقة على هذه المطالبة ومنح الطبيب حق الوصول؟"
              : "Approve this claim and grant access?",
            async () => {
              try {
                await dbResolveClaim(btn.dataset.cap, "approved");
                await dbUpdateRequestStatus(
                  btn.dataset.rid,
                  "ongoing",
                  btn.dataset.did,
                  btn.dataset.dn,
                );
                await dbInsertLog({
                  requestId: btn.dataset.rid,
                  doctorId: btn.dataset.did,
                  doctorName: btn.dataset.dn,
                  action: "claim_approved",
                  detail: "",
                });
                toast(t("adm.claim_approve"), "success");
                badges = await dbGetBadgeCounts().catch(() => badges);
                renderTabs();
                await renderClaimsTab();
              } catch (err) {
                toast(err.message || t("c.err"), "error");
              }
            },
          );
        }),
      );
      qs("[data-cdec]", tc).forEach((btn) =>
        btn.addEventListener("click", () => {
          showModal({
            title: t("adm.claim_decline"),
            size: "sm",
            content: `<div class="fg"><label class="lbl">${esc(t("adm.rej_r"))}<span class="req">*</span></label><input class="inp" id="dr" type="text" autocomplete="off"><p class="ferr" id="dr-e" style="display:none"></p></div>`,
            footer: `<button class="btn btn-s btn-md" id="dc-c">${esc(t("c.cancel"))}</button><button class="btn btn-d btn-md" id="dc-ok">${esc(t("adm.claim_decline"))}</button>`,
          });
          q("#dc-c").onclick = closeModal;
          q("#dc-ok").onclick = async () => {
            const reason = san(q("#dr").value.trim());
            if (!reason) {
              showErr("dr", t("c.req"));
              return;
            }
            try {
              await dbResolveClaim(btn.dataset.cdec, "declined", reason);
              toast(t("adm.claim_decline"), "info");
              closeModal();
              badges = await dbGetBadgeCounts().catch(() => badges);
              renderTabs();
              await renderClaimsTab();
            } catch (err) {
              toast(err.message || t("c.err"), "error");
            }
          };
        }),
      );
    } catch (err) {
      tc.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    }
  }

  async function renderSettingsTab() {
    const tc = q("#tc");
    if (!tc) return;
    tc.innerHTML = `<div class="sp-page"><div class="spin" style="width:1.5rem;height:1.5rem"></div></div>`;
    try {
      const ps = await dbGetPaymentSettings();
      if (!ps) {
        tc.innerHTML = `<div class="page-wrap"><div class="notice n-amb"><span class="notice-icon">${IC.warning}</span><span>${getLang() === "ar" ? "لم يتم العثور على إعدادات الدفع. شغّل PATCH.sql أولاً." : "Payment settings not found. Run PATCH.sql first."}</span></div></div>`;
        return;
      }
      const lang = getLang();
      const cd = { patientRequest: 0, doctorEdit: 0, reapply: 0 };
      try {
        const cfg = ps.metadata?.cooldowns || {};
        cd.patientRequest = cfg.patientRequest ?? 0;
        cd.doctorEdit = cfg.doctorEdit ?? 0;
        cd.reapply = cfg.reapply ?? 0;
      } catch (_) {}

      tc.innerHTML = `
        <div class="page-wrap">
          <h2 class="stitle" style="margin-bottom:1.5rem">${lang === "ar" ? "إعدادات النظام" : "System Settings"}</h2>
          
          <!-- Payment Settings Section -->
          <div class="settings-collapsible collapsed" data-section="payment">
            <div class="settings-collapsible-header" role="button" tabindex="0">
              <div class="settings-header-icon">${IC.wallet.replace('width="28"', 'width="20"').replace('height="28"', 'height="20"')}</div>
              <div class="settings-header-content">
                <h3 class="settings-title">${lang === "ar" ? "إعدادات الدفع" : "Payment Settings"}</h3>
                <p class="settings-desc">${lang === "ar" ? "رسوم الطلب وطرق الدفع" : "Order fees and payment methods"}</p>
              </div>
              <div class="settings-chevron">${IC.chevDown}</div>
            </div>
            <div class="settings-collapsible-body">
              <div class="fg">
                <label class="lbl">${esc(t("adm.fee_label"))} (EGP)<span class="req">*</span></label>
                <input class="inp" id="s-fee" type="number" min="0" step="0.5" value="${esc(String(ps.fee_per_order ?? 0))}" dir="ltr">
                <p class="fhint">${lang === "ar" ? "الرسم المقتطع من كل استلام" : "Fee deducted per claim"}</p>
              </div>
              
              ${
                (ps.methods || []).length
                  ? `
                <div style="padding-top:1rem;border-top:1px solid var(--bdr2)">
                  <label class="lbl" style="margin-bottom:1rem">${esc(t("adm.pay_methods"))}</label>
                  <div style="display:flex;flex-direction:column;gap:1rem">
                    ${(ps.methods || [])
                      .map(
                        (m, i) => `
                      <div class="settings-payment-method">
                        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
                          <div class="settings-method-icon" style="background:linear-gradient(135deg, var(--p-l) 0%, rgba(13, 148, 136, 0.08) 100%)">${IC.phone.replace('width="28"', 'width="16"').replace('height="28"', 'height="16"')}</div>
                          <p class="fw6" style="color:var(--t1);font-size:0.9375rem">${esc(m.label || m.name || "")}</p>
                        </div>
                        <input class="inp" id="s-pm-${i}" type="tel" dir="ltr" placeholder="${lang === "ar" ? "رقم الهاتف" : "Phone number"}" value="${esc(m.phone || "")}">
                      </div>`,
                      )
                      .join("")}
                  </div>
                </div>`
                  : `<div class="notice n-blu" style="margin-top:1rem"><span class="notice-icon">${IC.info}</span><span>${lang === "ar" ? "لا توجد طرق دفع مضافة بعد." : "No payment methods configured yet."}</span></div>`
              }
            </div>
          </div>

          <!-- Cooldowns Section -->
          <div class="settings-collapsible collapsed" data-section="cooldowns">
            <div class="settings-collapsible-header" role="button" tabindex="0">
              <div class="settings-header-icon">${IC.clock.replace('width="28"', 'width="20"').replace('height="28"', 'height="20"')}</div>
              <div class="settings-header-content">
                <h3 class="settings-title">${lang === "ar" ? "فترات الانتظار" : "Cooldown Periods"}</h3>
                <p class="settings-desc">${lang === "ar" ? "فترات الانتظار بين الإجراءات" : "Wait times between actions"}</p>
              </div>
              <div class="settings-chevron">${IC.chevDown}</div>
            </div>
            <div class="settings-collapsible-body">
              <div class="g2">
                <div class="fg">
                  <label class="lbl">${lang === "ar" ? "تعديل الملف الطبي" : "Doctor Edit"}</label>
                  <input class="inp" id="s-cd-edit" type="number" min="0" step="1" value="${cd.doctorEdit}" dir="ltr">
                  <p class="fhint">${lang === "ar" ? "بالساعات (0 = بلا تأخير)" : "In hours (0 = none)"}</p>
                </div>
                <div class="fg">
                  <label class="lbl">${lang === "ar" ? "إعادة التقديم" : "Reapply"}</label>
                  <input class="inp" id="s-cd-reapply" type="number" min="0" step="1" value="${cd.reapply}" dir="ltr">
                  <p class="fhint">${lang === "ar" ? "بعد الرفض (بالساعات)" : "After rejection (hours)"}</p>
                </div>
                <div class="fg">
                  <label class="lbl">${lang === "ar" ? "طلب مريض" : "Patient Request"}</label>
                  <input class="inp" id="s-cd-patient" type="number" min="0" step="1" value="${cd.patientRequest}" dir="ltr">
                  <p class="fhint">${lang === "ar" ? "بين الطلبات (بالساعات)" : "Between requests (hours)"}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Save Section -->
          <div style="display:flex;gap:0.75rem;margin-top:2rem;flex-wrap:wrap">
            <button class="btn btn-p btn-md" id="b-save-s">${IC.check}<span>${esc(t("adm.save_settings"))}</span></button>
          </div>
          <p class="ferr" id="s-err" style="display:none;margin-top:1rem"></p>
          <p class="notice n-grn" id="s-success" style="display:none;margin-top:1rem"><span class="notice-icon">${IC.check}</span><span>${lang === "ar" ? "تم حفظ الإعدادات بنجاح" : "Settings saved successfully"}</span></p>
        </div>`;

      // Collapsible functionality
      qs(".settings-collapsible-header", tc).forEach((header) => {
        header.addEventListener("click", () => {
          const section = header.closest(".settings-collapsible");
          section.classList.toggle("collapsed");
        });
        header.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            header.click();
          }
        });
      });

      // Load handler
      const loadSettings = (isReset = false) => {
        if (isReset) {
          q("#s-fee").value = ps.fee_per_order ?? 0;
          (ps.methods || []).forEach((m, i) => {
            const inp = document.getElementById(`s-pm-${i}`);
            if (inp) inp.value = m.phone || "";
          });
          q("#s-cd-edit").value = cd.doctorEdit;
          q("#s-cd-reapply").value = cd.reapply;
          q("#s-cd-patient").value = cd.patientRequest;
          q("#s-err").style.display = "none";
          q("#s-success").style.display = "none";
        }
      };

      q("#b-save-s").onclick = async () => {
        const errEl = q("#s-err");
        const succEl = q("#s-success");
        errEl.style.display = "none";
        succEl.style.display = "none";

        const fee = parseFloat(q("#s-fee").value);
        if (isNaN(fee) || fee < 0) {
          errEl.textContent =
            lang === "ar"
              ? "الرسم مطلوب وعدد صحيح موجب"
              : "Fee is required and must be positive";
          errEl.style.display = "block";
          return;
        }

        const um = (ps.methods || []).map((m, i) => ({
          ...m,
          phone: san(document.getElementById(`s-pm-${i}`)?.value.trim() || ""),
        }));

        const newCd = {
          patientRequest: parseInt(q("#s-cd-patient").value) || 0,
          doctorEdit: parseInt(q("#s-cd-edit").value) || 0,
          reapply: parseInt(q("#s-cd-reapply").value) || 0,
        };

        const btn = q("#b-save-s");
        setLoad(btn, true);
        try {
          await dbUpdatePaymentSettings(ps.id, fee, um, { cooldowns: newCd });
          appSettings = {
            ...ps,
            fee_per_order: fee,
            methods: um,
            metadata: { cooldowns: newCd },
          };
          succEl.style.display = "block";
          setTimeout(() => {
            succEl.style.display = "none";
          }, 4000);
        } catch (err) {
          errEl.textContent = err.message || t("c.err");
          errEl.style.display = "block";
        }
        setLoad(btn, false);
      };
    } catch (err) {
      tc.innerHTML = `<div class="page-wrap"><div class="notice n-red"><span class="notice-icon">${IC.xCircle.replace('width="28"', 'width="16"').replace('height="28"', 'height="16"')}</span><span>${esc(err.message)}</span></div></div>`;
    }
  }

  async function renderTeamTab() {
    if (!AppState.isSuperAdmin) {
      q("#tc").innerHTML =
        `<div class="empty-state">${getLang() === "ar" ? "غير مصرح" : "Not authorized"}</div>`;
      return;
    }
    const tc = q("#tc");
    if (!tc) return;
    tc.innerHTML = `<div class="sp-page"><div class="spin" style="width:1.5rem;height:1.5rem"></div></div>`;
    const lang = getLang();
    const PERMS = {
      approveDoctors:
        lang === "ar" ? "قبول / رفض الأطباء" : "Approve / Reject Doctors",
      manageClaims: lang === "ar" ? "إدارة الاستلام" : "Manage Claims",
      manageSettings: lang === "ar" ? "الإعدادات" : "Settings",
      deleteRequests: lang === "ar" ? "حذف الطلبات" : "Delete Requests",
      deleteDoctors: lang === "ar" ? "حذف الأطباء" : "Delete Doctors",
    };
    try {
      const allAdmins = await dbGetAllAdmins();
      const subs = allAdmins.filter((a) => a.role !== "super");
      tc.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
          <p class="lbl">${lang === "ar" ? "الفريق" : "Team Members"} <span class="badge b-pen" style="font-size:.75rem">${subs.length}</span></p>
          <div style="display:flex;gap:.5rem">
            <button class="btn btn-s btn-sm" id="b-add-doctor-team">${IC.doctor.replace('width="20"', 'width="14"').replace('height="20"', 'height="14"')}&nbsp;${lang === "ar" ? "طبيب جديد" : "Add Doctor"}</button>
            <button class="btn btn-p btn-sm" id="b-add-admin">${IC.user.replace('width="20"', 'width="14"').replace('height="20"', 'height="14"')}&nbsp;${lang === "ar" ? "مشرف جديد" : "Add Admin"}</button>
          </div>
        </div>
        ${
          !subs.length
            ? `<div class="empty-state">${lang === "ar" ? "لا يوجد مشرفون فرعيون بعد" : "No sub-admins yet"}</div>`
            : subs
                .map(
                  (adm) => `
            <div class="card mb3">
              <div class="flex jsb aic mb3" style="flex-wrap:wrap;gap:.5rem">
                <div>
                  <p class="fw6">${esc(adm.display_name || adm.email || "—")}</p>
                  <p class="tx t2c" dir="ltr">${esc(adm.email || "")}</p>
                </div>
                <div class="flex g2r">
                  <button class="btn btn-s btn-sm" data-edit-adm="${adm.id}">${IC.pencil}&nbsp;${lang === "ar" ? "تعديل" : "Edit"}</button>
                  <button class="btn btn-d btn-sm" data-del-adm="${adm.id}">${IC.trash}</button>
                </div>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:.375rem">
                ${Object.entries(PERMS)
                  .map(
                    ([k, label]) => `
                  <span class="badge ${adm.permissions?.[k] ? "b-app" : "b-rej"}" style="font-size:.75rem">
                    ${adm.permissions?.[k] ? "✓" : "✕"} ${esc(label)}
                  </span>`,
                  )
                  .join("")}
              </div>
            </div>`,
                )
                .join("")
        }`;

      q("#b-add-doctor-team")?.addEventListener("click", () =>
        _showAddDoctorModal(),
      );
      q("#b-add-admin")?.addEventListener("click", () =>
        _showAddAdminModal(PERMS),
      );
      qs("[data-edit-adm]", tc).forEach((btn) =>
        btn.addEventListener("click", () => {
          const adm = allAdmins.find((a) => a.id === btn.dataset.editAdm);
          if (adm) _showEditPermsModal(adm, PERMS);
        }),
      );
      qs("[data-del-adm]", tc).forEach((btn) =>
        btn.addEventListener("click", () => {
          const adm = allAdmins.find((a) => a.id === btn.dataset.delAdm);
          if (!adm) return;
          destructiveConfirm(
            lang === "ar"
              ? `حذف "${adm.display_name || adm.email}"؟`
              : `Delete "${adm.display_name || adm.email}"?`,
            async () => {
              try {
                await dbDeleteSubAdmin(adm.id);
                toast(t("c.deleted"), "success");
                await renderTeamTab();
              } catch (err) {
                toast(err.message || t("c.err"), "error");
              }
            },
          );
        }),
      );
    } catch (err) {
      tc.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
    }
  }

  function _showAddDoctorModal() {
    const lang = getLang();
    showModal({
      title: lang === "ar" ? "إضافة طبيب جديد" : "Add New Doctor",
      size: "md",
      content: `<div style="display:flex;flex-direction:column;gap:.875rem">
        ${fld("td-name", lang === "ar" ? "الاسم الكامل" : "Full Name", "text", true)}
        ${fld("td-email", lang === "ar" ? "البريد الإلكتروني" : "Email", "email", true, "", "ltr")}
        ${fld("td-phone", lang === "ar" ? "رقم الهاتف" : "Phone", "tel", false, "01XXXXXXXXX", "ltr")}
        ${fld("td-uni", lang === "ar" ? "الجامعة" : "University", "text", false)}
        ${fld("td-sem", lang === "ar" ? "الفصل / السنة" : "Semester", "text", false)}
        ${fld("td-nid", lang === "ar" ? "الرقم القومي" : "National ID", "text", false, "14 digits", "ltr")}
        ${pwdFieldHTML("td-pass", lang === "ar" ? "كلمة المرور" : "Password", true)}
        <p class="ferr" id="td-err" style="display:none"></p>
      </div>`,
      footer: `<button class="btn btn-s btn-md" id="td-cancel">${esc(t("c.cancel"))}</button><button class="btn btn-p btn-md" id="td-save">${lang === "ar" ? "إنشاء وإضافة" : "Create & Add"}</button>`,
    });
    bindPwdToggle("td-pass");
    q("#td-cancel").onclick = closeModal;
    q("#td-save").onclick = async () => {
      const name = san(q("#td-name").value.trim());
      const email = san(q("#td-email").value.trim());
      const pass = q("#td-pass").value;
      const errEl = q("#td-err");
      if (!name || !email || !pass) {
        errEl.textContent = t("c.req");
        errEl.style.display = "block";
        return;
      }
      if (pass.length < 6) {
        errEl.textContent =
          lang === "ar"
            ? "كلمة المرور 6 أحرف على الأقل"
            : "Password must be at least 6 chars";
        errEl.style.display = "block";
        return;
      }
      const btn = q("#td-save");
      setLoad(btn, true);
      try {
        // 1. Create auth user using throwaway client
        const tmp = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        });
        const { data: signUpData, error: signUpErr } = await tmp.auth.signUp({
          email: email.toLowerCase(),
          password: pass,
          options: { data: { full_name: name } },
        });
        if (signUpErr) throw signUpErr;
        if (!signUpData?.user?.id)
          throw new Error(
            lang === "ar" ? "فشل إنشاء الحساب" : "Account creation failed",
          );

        // 2. Sign in as that user to create doctor profile (needs auth session for RLS)
        const { data: sinData, error: sinErr } =
          await tmp.auth.signInWithPassword({
            email: email.toLowerCase(),
            password: pass,
          });
        const userId = signUpData.user.id;

        // 3. Create doctor profile via RPC
        await dbCreateDoctorProfile({
          p_user_id: userId,
          p_full_name: name,
          p_email: email.toLowerCase(),
          p_phone: san(q("#td-phone").value.trim()) || "",
          p_address: "",
          p_university: san(q("#td-uni").value.trim()) || "",
          p_semester: san(q("#td-sem").value.trim()) || "",
          p_national_id: san(q("#td-nid").value.trim()) || "",
          p_nid_front: null,
          p_nid_back: null,
          p_uid_front: null,
          p_uid_back: null,
        });

        // 4. Reload doctors list
        doctors = await dbGetAllDoctors().catch(() => doctors);
        toast(
          lang === "ar"
            ? "تم إنشاء حساب الطبيب بنجاح"
            : "Doctor account created",
          "success",
        );
        closeModal();
        badges = await dbGetBadgeCounts().catch(() => badges);
        renderTabs();
      } catch (err) {
        errEl.textContent = err.message || t("c.err");
        errEl.style.display = "block";
        setLoad(btn, false);
      }
    };
  }

  function _showAddAdminModal(PERMS) {
    const lang = getLang();
    showModal({
      title: lang === "ar" ? "إنشاء مشرف فرعي" : "Create Sub-Admin",
      size: "md",
      content: `<div style="display:flex;flex-direction:column;gap:.875rem">
        <div class="notice n-blu">
          <span class="notice-icon">${IC.info}</span>
          <span style="font-size:.8125rem">${lang === "ar" ? "سيتم إنشاء حساب جديد وربطه تلقائياً كمشرف فرعي." : "A new account will be created and automatically linked as a sub-admin."}</span>
        </div>
        ${fld("adm-name", lang === "ar" ? "الاسم المعروض" : "Display Name", "text", true)}
        ${fld("adm-email", lang === "ar" ? "البريد الإلكتروني" : "Email", "email", true, "", "ltr")}
        ${pwdFieldHTML("adm-pass", lang === "ar" ? "كلمة المرور" : "Password", true)}
        <div>
          <p class="lbl mb3">${lang === "ar" ? "الصلاحيات" : "Permissions"}</p>
          <div style="display:flex;flex-direction:column;gap:.5rem">
            ${Object.entries(PERMS)
              .map(
                ([k, label]) => `
              <label style="display:flex;align-items:center;gap:.625rem;cursor:pointer;padding:.25rem 0">
                <input type="checkbox" id="perm-${k}" style="accent-color:var(--p);width:1rem;height:1rem">
                <span>${esc(label)}</span>
              </label>`,
              )
              .join("")}
          </div>
        </div>
        <p class="ferr" id="adm-err" style="display:none"></p>
      </div>`,
      footer: `<button class="btn btn-s btn-md" id="adm-cancel">${esc(t("c.cancel"))}</button><button class="btn btn-p btn-md" id="adm-save">${lang === "ar" ? "إنشاء المشرف" : "Create Admin"}</button>`,
    });
    bindPwdToggle("adm-pass");
    q("#adm-cancel").onclick = closeModal;
    q("#adm-save").onclick = async () => {
      const name = san(q("#adm-name").value.trim());
      const email = san(q("#adm-email").value.trim());
      const pass = q("#adm-pass").value;
      const errEl = q("#adm-err");
      if (!name || !email || !pass) {
        errEl.textContent = t("c.req");
        errEl.style.display = "block";
        return;
      }
      if (pass.length < 6) {
        errEl.textContent =
          lang === "ar"
            ? "كلمة المرور 6 أحرف على الأقل"
            : "Password must be at least 6 characters";
        errEl.style.display = "block";
        return;
      }
      const perms = {};
      Object.keys(PERMS).forEach((k) => {
        perms[k] = !!document.getElementById(`perm-${k}`)?.checked;
      });
      const btn = q("#adm-save");
      setLoad(btn, true);
      try {
        await dbCreateSubAdmin(email, pass, name, perms);
        toast(
          lang === "ar"
            ? "تم إنشاء المشرف بنجاح"
            : "Sub-admin created successfully",
          "success",
        );
        closeModal();
        await renderTeamTab();
      } catch (err) {
        errEl.textContent = err.message || t("c.err");
        errEl.style.display = "block";
        setLoad(btn, false);
      }
    };
  }

  function _showEditPermsModal(adm, PERMS) {
    const lang = getLang();
    showModal({
      title: lang === "ar" ? "تعديل الصلاحيات" : "Edit Permissions",
      size: "sm",
      content: `<div>
        <p class="fw6 mb3">${esc(adm.display_name || adm.email)}</p>
        <div style="display:flex;flex-direction:column;gap:.5rem">
          ${Object.entries(PERMS)
            .map(
              ([k, label]) => `
            <label style="display:flex;align-items:center;gap:.625rem;cursor:pointer;padding:.25rem 0">
              <input type="checkbox" id="ep-${k}" ${adm.permissions?.[k] ? "checked" : ""} style="accent-color:var(--p);width:1rem;height:1rem">
              <span>${esc(label)}</span>
            </label>`,
            )
            .join("")}
        </div>
      </div>`,
      footer: `<button class="btn btn-s btn-md" id="ep-cancel">${esc(t("c.cancel"))}</button><button class="btn btn-p btn-md" id="ep-save">${esc(t("c.save"))}</button>`,
    });
    q("#ep-cancel").onclick = closeModal;
    q("#ep-save").onclick = async () => {
      const newPerms = {};
      Object.keys(PERMS).forEach((k) => {
        newPerms[k] = !!document.getElementById(`ep-${k}`)?.checked;
      });
      try {
        await dbUpdateSubAdminPerms(adm.id, newPerms);
        toast(
          lang === "ar" ? "تم تحديث الصلاحيات" : "Permissions updated",
          "success",
        );
        closeModal();
        await renderTeamTab();
      } catch (err) {
        toast(err.message || t("c.err"), "error");
      }
    };
  }

  function buildTabs(lang) {
    return [
      {
        k: "doctors",
        l: lang === "ar" ? "الأطباء" : "Doctors",
        badge: badges.pendingDocs + badges.pendingEdits,
      },
      {
        k: "claims",
        l: lang === "ar" ? "الاستلام" : "Claims",
        badge: badges.pendingClaims,
      },
      { k: "settings", l: lang === "ar" ? "الإعدادات" : "Settings", badge: 0 },
      ...(AppState.isSuperAdmin
        ? [{ k: "team", l: lang === "ar" ? "الفريق" : "Team", badge: 0 }]
        : []),
    ];
  }

  function renderTabs() {
    const el = q(".tabs", app);
    if (!el) return;
    const lang = getLang(),
      tabs = buildTabs(lang);
    el.innerHTML = tabs
      .map(
        (tb) =>
          `<button class="tab${activeTab === tb.k ? " on" : ""}" data-tab="${tb.k}">${tb.l}${tabBadge(tb.badge)}</button>`,
      )
      .join("");
    qs(".tab", el).forEach((btn) =>
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        saveTab("admin-doctors", activeTab);
        render();
      }),
    );
  }

  function render() {
    const lang = getLang(),
      tabs = buildTabs(lang);
    const pendingCount = doctors.filter((d) => d.status === "pending").length;
    const ph =
      lang === "ar" ? "اسم، إيميل، أو تليفون..." : "Name, email, or phone...";
    app.innerHTML = `<div class="page-wrap">
      <h1 class="ptitle">${esc(t("adm.docs_title"))}</h1>
      ${pendingCount > 0 ? `<div class="notice n-amb" style="margin-bottom:1rem"><span class="notice-icon">${IC.warning}</span><span>${pendingCount} ${esc(t("adm.pend_app"))}</span></div>` : ""}
      <div class="tabs">${tabs.map((tb) => `<button class="tab${activeTab === tb.k ? " on" : ""}" data-tab="${tb.k}">${tb.l}${tabBadge(tb.badge)}</button>`).join("")}</div>
      <div id="tc">
        ${
          activeTab === "doctors"
            ? `
          <div class="fb" style="margin-bottom:1rem">
            <div style="position:relative;flex:1;min-width:160px">
              <span class="inp-icon">${IC.search}</span>
              <input class="inp inp-with-icon" id="ds" placeholder="${esc(ph)}" value="${esc(docSearch)}">
            </div>
            <div class="sel-w" style="min-width:150px">
              <select class="sel" id="dst" style="padding:.5rem .875rem;font-size:.875rem">
                <option value="all">${esc(t("adm.all_tab"))}</option>
                <option value="pending">${esc(t("adm.pend_tab"))}</option>
                <option value="approved">${esc(t("adm.app_tab"))}</option>
                <option value="rejected">${esc(t("adm.rej_tab"))}</option>
              </select>
            </div>
          </div>
          <div id="doctor-list"></div>`
            : ""
        }
      </div>
    </div>`;

    qs(".tab", app).forEach((btn) =>
      btn.addEventListener("click", () => {
        activeTab = btn.dataset.tab;
        saveTab("admin-doctors", activeTab);
        render();
      }),
    );

    if (activeTab === "doctors") {
      q("#dst").value = docStatus;
      q("#ds").addEventListener("input", (e) => {
        docSearch = e.target.value;
        renderDoctorList();
      });
      q("#dst").addEventListener("change", (e) => {
        docStatus = e.target.value;
        renderDoctorList();
      });
      renderDoctorList();
    } else if (activeTab === "claims") renderClaimsTab();
    else if (activeTab === "settings") renderSettingsTab();
    else if (activeTab === "team") renderTeamTab();
  }

  await load();
  startPresence();
  startBadgeRt();
  render();
  // Re-render labels when language changes (no form state to lose)
  window.addEventListener(
    "hashchange",
    () => {
      dbRemoveChannel(presenceCh);
      dbRemoveChannel(badgeCh);
    },
    { once: true },
  );
});
