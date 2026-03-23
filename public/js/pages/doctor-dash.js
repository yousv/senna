"use strict";

registerRoute("/doctor/dash", async (app) => {
  if (!AppState.session || !AppState.doctor) {
    navigate("/doctor/login");
    return;
  }
  if (AppState.doctor.status !== "approved") {
    await authSignOut();
    navigate("/doctor/login");
    return;
  }
  app.innerHTML = `<div class="sp-page"><div class="spin"></div></div>`;

  const doctor = AppState.doctor;
  let reqs = [],
    paySettings = null,
    myClaimMap = {},
    approvedReqIds = [];
  // activeClaimsMap: requestId → {status, doctor_id, doctor_name}
  let activeClaimsMap = {};
  let search = "",
    fStatus = "",
    fType = "";
  let rtChannel = null,
    claimChannel = null;
  const dismissedDeclines = new Set();

  async function loadData() {
    const [allClaims, allActive] = await Promise.all([
      dbGetAllClaimsForDoctor(doctor.id),
      dbGetActiveClaimsMap(),
    ]);
    myClaimMap = {};
    for (const c of allClaims)
      myClaimMap[c.request_id] = {
        status: c.status,
        decline_reason: c.decline_reason || null,
      };
    approvedReqIds = allClaims
      .filter((c) => c.status === "approved")
      .map((c) => c.request_id);
    activeClaimsMap = allActive;
    [reqs, paySettings] = await Promise.all([
      dbGetRequests(),
      dbGetPaymentSettings().catch(() => null),
    ]);
    // Normalize suffering_types to always be an array
    reqs = reqs.map((r) => ({
      ...r,
      suffering_types: Array.isArray(r.suffering_types)
        ? r.suffering_types
        : typeof r.suffering_types === "string"
          ? JSON.parse(r.suffering_types || "[]")
          : [],
    }));
    console.log("[doctor-dash] loaded", reqs.length, "requests");
  }

  const hasAccess = (reqId) => approvedReqIds.includes(reqId);
  const myClaim = (reqId) => myClaimMap[reqId] || null;
  // A request is locked if there's a pending/approved claim from ANOTHER doctor
  const isLocked = (reqId) => {
    const active = activeClaimsMap[reqId];
    return active && active.doctor_id !== doctor.id;
  };
  // A doctor should NOT see a request that has an APPROVED claim by someone else
  const isHidden = (reqId) => {
    const active = activeClaimsMap[reqId];
    return (
      active && active.status === "approved" && active.doctor_id !== doctor.id
    );
  };

  function filtered() {
    return reqs.filter((r) => {
      // Hide completely if another doctor has an approved claim
      if (isHidden(r.id)) return false;
      // Hide done requests not assigned to me
      if (r.status === "done" && r.assigned_doctor_id !== doctor.id)
        return false;
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

  function startRealtime() {
    if (rtChannel) dbRemoveChannel(rtChannel);
    if (claimChannel) dbRemoveChannel(claimChannel);

    rtChannel = dbSubscribeToRequests(
      (nr) => {
        if (!reqs.find((r) => r.id === nr.id)) reqs.unshift(nr);
        else {
          const i = reqs.findIndex((r) => r.id === nr.id);
          if (i !== -1) reqs[i] = nr;
        }
        renderCards();
      },
      (ur) => {
        const i = reqs.findIndex((r) => r.id === ur.id);
        if (i !== -1) reqs[i] = ur;
        else reqs.unshift(ur);
        renderCards();
      },
    );

    claimChannel = dbSubscribeToClaims(async (p) => {
      const cl = p.new || p.old;
      if (!cl) return;
      const lang = getLang();

      if (p.eventType === "INSERT") {
        // Another doctor submitted a claim
        if (cl.doctor_id !== doctor.id) {
          activeClaimsMap[cl.request_id] = {
            status: cl.status,
            doctor_id: cl.doctor_id,
            doctor_name: cl.doctor_name,
          };
        } else {
          myClaimMap[cl.request_id] = {
            status: cl.status,
            decline_reason: null,
          };
          activeClaimsMap[cl.request_id] = {
            status: cl.status,
            doctor_id: cl.doctor_id,
            doctor_name: cl.doctor_name,
          };
        }
      } else if (p.eventType === "UPDATE") {
        const status = cl.status;
        if (cl.doctor_id === doctor.id) {
          myClaimMap[cl.request_id] = {
            status,
            decline_reason: cl.decline_reason || null,
          };
          if (status === "approved") {
            approvedReqIds.push(cl.request_id);
            toast(
              lang === "ar"
                ? "✓ تمت الموافقة على طلب الاستلام!"
                : "✓ Your claim was approved!",
              "success",
            );
          } else if (status === "declined") {
            toast(
              lang === "ar" ? "تم رفض طلب الاستلام" : "Your claim was declined",
              "error",
            );
          }
        }
        if (status === "declined") {
          // Unlock — remove from active if it was the pending one
          if (activeClaimsMap[cl.request_id]?.doctor_id === cl.doctor_id)
            delete activeClaimsMap[cl.request_id];
        } else {
          activeClaimsMap[cl.request_id] = {
            status,
            doctor_id: cl.doctor_id,
            doctor_name: cl.doctor_name,
          };
        }
      } else if (p.eventType === "DELETE") {
        if (activeClaimsMap[cl.request_id]?.doctor_id === cl.doctor_id)
          delete activeClaimsMap[cl.request_id];
      }
      renderCards();
    });
  }

  function claimStatusBadge(reqId) {
    const ci = myClaim(reqId);
    const lang = getLang();
    if (ci) {
      if (ci.status === "approved")
        return `<span class="badge b-app" style="font-size:.7rem">${lang === "ar" ? "لديك وصول" : "Access granted"}</span>`;
      if (ci.status === "pending")
        return `<span class="badge b-pen" style="font-size:.7rem">${lang === "ar" ? "قيد المراجعة" : "Claim pending"}</span>`;
      if (ci.status === "declined" && !dismissedDeclines.has(reqId))
        return `<span class="badge b-rej" style="font-size:.7rem">${lang === "ar" ? "مرفوض" : "Declined"}</span>`;
      return "";
    }
    if (isLocked(reqId))
      return `<span class="claim-lock-badge">${lang === "ar" ? "قيد المراجعة" : "Under review"}</span>`;
    return "";
  }

  function renderCard(r) {
    const types = Array.isArray(r.suffering_types) ? r.suffering_types : [];
    const tags =
      types
        .slice(0, 2)
        .map(
          (v) =>
            `<span class="badge b-pen" style="font-size:.7rem">${esc(sufLabel(v))}</span>`,
        )
        .join("") +
      (types.length > 2
        ? `<span class="badge-more">+${types.length - 2}</span>`
        : "");
    const locked = isLocked(r.id) && !hasAccess(r.id);
    return `<div class="rc${locked ? " rc-locked" : ""}" data-id="${r.id}" tabindex="0" role="button" style="${locked ? "opacity:.7" : ""}">
      <div class="rc-main"><div class="rc-title-row"><span class="rc-name">${esc(r.full_name)}</span><span class="rc-pid">${esc(r.patient_id)}</span>${claimStatusBadge(r.id)}</div><div class="rc-tags">${tags}</div></div>
      <div class="rc-side">${reqBadge(r.status)}</div>
    </div>`;
  }

  function renderCards() {
    const rl = q("#rl");
    if (!rl) return;
    const list = filtered();
    rl.innerHTML = list.length
      ? list.map(renderCard).join("")
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

  function renderPage() {
    const lang = getLang();
    app.innerHTML = `<div class="page-wrap" style="max-width:var(--max-w);margin:0 auto;padding:1.25rem">
      <h1 class="ptitle">${esc(t("doc.title"))}</h1>
      <div class="fb">
        <div style="position:relative;flex:1;min-width:160px"><span class="inp-icon">${IC.search}</span><input class="inp inp-with-icon" id="fs" placeholder="${lang === "ar" ? "اسم، رقم مريض، أو تليفون" : "Name, code, or phone"}" value="${esc(search)}"></div>
        <div class="sel-w" style="min-width:130px"><select class="sel" id="fst" style="padding:.5rem .875rem;font-size:.875rem"><option value="">${esc(t("doc.all_s"))}</option><option value="incomplete">${esc(t("c.s_new"))}</option><option value="ongoing">${esc(t("c.s_ong"))}</option><option value="done">${esc(t("c.s_don"))}</option></select></div>
        <div class="sel-w" style="min-width:140px"><select class="sel" id="fty" style="padding:.5rem .875rem;font-size:.875rem"><option value="">${esc(t("doc.all_t"))}</option>${SUFFERING.map((s) => `<option value="${s.v}">${esc(lang === "ar" ? s.ar : s.en)}</option>`).join("")}</select></div>
      </div>
      <div id="rl" style="display:flex;flex-direction:column;gap:.625rem"></div>
    </div>`;
    q("#fs").addEventListener("input", (e) => {
      search = e.target.value;
      renderCards();
    });
    q("#fst").value = fStatus;
    q("#fst").addEventListener("change", (e) => {
      fStatus = e.target.value;
      renderCards();
    });
    q("#fty").value = fType;
    q("#fty").addEventListener("change", (e) => {
      fType = e.target.value;
      renderCards();
    });
    renderCards();
    startRealtime();
  }

  async function openClaimDialog(r) {
    const lang = getLang();
    // Live guard: re-check active claims before showing form
    const liveClaims = await dbGetClaimsForRequest(r.id).catch(() => []);
    const active = liveClaims.find(
      (c) => c.status === "pending" || c.status === "approved",
    );
    if (active && active.doctor_id !== doctor.id) {
      activeClaimsMap[r.id] = {
        status: active.status,
        doctor_id: active.doctor_id,
        doctor_name: active.doctor_name,
      };
      renderCards();
      toast(
        active.status === "approved"
          ? lang === "ar"
            ? "تم استلام هذا الطلب بالفعل"
            : "Already claimed"
          : lang === "ar"
            ? "هذا الطلب قيد المراجعة لطبيب آخر"
            : "Under review for another doctor",
        "error",
      );
      return;
    }
    const ci = myClaim(r.id);
    if (ci) {
      if (ci.status === "pending") {
        toast(
          lang === "ar"
            ? "طلب الاستلام قيد المراجعة"
            : "Your claim is under review",
          "info",
        );
        return;
      }
      if (ci.status === "approved") {
        toast(
          lang === "ar"
            ? "تمت الموافقة على طلب الاستلام"
            : "Your claim was approved",
          "success",
        );
        return;
      }
      if (ci.status === "declined") {
        showModal({
          title: lang === "ar" ? "طلب استلام مرفوض" : "Claim Declined",
          size: "sm",
          content: `<div class="notice n-red" style="margin-bottom:1rem"><div><p style="font-weight:600;margin-bottom:.25rem">${lang === "ar" ? "سبب الرفض" : "Decline Reason"}:</p><p>${esc(ci.decline_reason || (lang === "ar" ? "لم يُحدَّد سبب" : "No reason provided"))}</p></div></div><p style="font-size:.875rem;color:var(--t2)">${lang === "ar" ? "يمكنك تقديم طلب استلام جديد." : "You may submit a new claim."}</p>`,
          footer: `<button class="btn btn-s btn-md" id="cl-d">${lang === "ar" ? "إغلاق" : "Dismiss"}</button><button class="btn btn-p btn-md" id="cl-r">${lang === "ar" ? "إعادة التقديم" : "Submit New Claim"}</button>`,
        });
        q("#cl-d").onclick = () => {
          dismissedDeclines.add(r.id);
          closeModal();
          renderCards();
        };
        q("#cl-r").onclick = () => {
          closeModal();
          _showClaimForm(r);
        };
        return;
      }
    }
    _showClaimForm(r);
  }

  function _showClaimForm(r) {
    if (!paySettings) {
      toast(t("c.err"), "error");
      return;
    }
    const methods = paySettings.methods || [],
      fee = paySettings.fee_per_order || 0,
      lang = getLang();
    let selectedMethod = null,
      screenshotFile = null;

    // Build payment method options with better styling
    const paymentMethodsHTML = methods.length
      ? methods
          .map(
            (m, idx) => `
        <label class="pm-card" data-method-idx="${idx}">
          <input type="radio" name="pm" value="${esc(m.name)}" class="pm-radio" style="display:none">
          <div class="pm-card-content">
            <div class="pm-card-header">
              <span class="pm-label">${esc(m.label)}</span>
              <div class="pm-indicator">
                <div class="pm-check"></div>
              </div>
            </div>
            ${m.phone ? `<div class="pm-phone" dir="ltr">${IC.phone.replace('width="28"', 'width="16"').replace('height="28"', 'height="16"')} ${esc(m.phone)}</div>` : ""}
          </div>
        </label>
      `,
          )
          .join("")
      : `<p class="ts t2c">${lang === "ar" ? "لا توجد طرق دفع متاحة" : "No payment methods available"}</p>`;

    showModal({
      title: t("doc.claim_title"),
      size: "md",
      content: `<div class="claim-pay-sheet">
        <div class="claim-fee-card">
          <div class="claim-fee-head">
            <div>
              <p class="ii-lbl">${lang === "ar" ? "رسم الطلب" : "Order Fee"}</p>
              <p class="claim-fee-val">${fee} <span>EGP</span></p>
            </div>
          </div>
          <p class="ii-lbl claim-request-label">${lang === "ar" ? "الطلب" : "Request"}</p>
          <div class="claim-request-row">
            <span class="claim-request-name">${esc(r.full_name)}</span>
            <span class="badge b-pen" style="font-size:0.7rem">${esc(r.patient_id)}</span>
          </div>
        </div>

        <div class="fg">
          <label class="lbl">${lang === "ar" ? "اختر طريقة الدفع" : "Select Payment Method"}<span class="req">*</span></label>
          <div class="claim-methods">
            ${paymentMethodsHTML}
          </div>
          <p class="ferr" id="pm-e" style="display:none;margin-top:0.5rem"></p>
        </div>

        <div class="fg">
          <label class="lbl" style="font-size:1.0625rem;text-align:center;display:block">${lang === "ar" ? "صورة إيصال الدفع" : "Payment Receipt"}<span class="req">*</span></label>
          ${fuHTML("claim-ss", lang === "ar" ? "اضغط لاختيار الملف أو اسحبه هنا" : "Click to select or drag file here", true)}
          <p class="claim-upload-hint">${lang === "ar" ? "PNG، JPG أو WEBP (حتى 5MB)" : "PNG, JPG or WEBP (up to 5MB)"}</p>
          <p class="ferr" id="claim-ss-e" style="display:none;margin-top:0.5rem"></p>
        </div>

        <p class="ferr" id="claim-e" style="display:none"></p>
      </div>`,
      footer: `<button class="btn btn-s btn-md" id="cl-cancel">${esc(t("c.cancel"))}</button><button class="btn btn-p btn-md" id="cl-submit">${esc(t("doc.claim"))}</button>`,
    });

    // Style payment method cards on selection
    const pmCards = qs(".pm-card", q(".mbody"));
    pmCards.forEach((card) => {
      const radio = q("input[type='radio']", card);
      const indicator = q(".pm-indicator", card);

      radio.addEventListener("change", () => {
        pmCards.forEach((c) => {
          c.classList.remove("pm-card-selected");
          q(".pm-check", c)?.classList.remove("show");
          q(".pm-indicator", c)?.classList.remove("on");
        });
        if (radio.checked) {
          card.classList.add("pm-card-selected");
          q(".pm-check", card)?.classList.add("show");
          indicator?.classList.add("on");
          selectedMethod = radio.value;
        }
      });
    });

    fuBind("claim-ss", (f) => (screenshotFile = f));
    qs("[name=pm]", q(".mbody")).forEach((rb) =>
      rb.addEventListener("change", () => (selectedMethod = rb.value)),
    );
    q("#cl-cancel").onclick = closeModal;
    q("#cl-submit").onclick = async () => {
      const pme = q("#pm-e"),
        cle = q("#claim-e");
      pme.style.display = "none";
      cle.style.display = "none";
      if (!selectedMethod) {
        pme.textContent = t("c.req");
        pme.style.display = "block";
        return;
      }
      if (!screenshotFile) {
        const fe = document.getElementById("fu-claim-ss-e");
        if (fe) {
          fe.textContent = t("c.req");
          fe.style.display = "block";
        }
        return;
      }
      const btn = q("#cl-submit");
      setLoad(btn, true);
      try {
        const ssPath = await dbUploadFile(
          dbStoragePath("claims", screenshotFile.name),
          screenshotFile,
        );
        await dbSubmitClaim({
          requestId: r.id,
          doctorId: doctor.id,
          doctorName: doctor.full_name,
          paymentMethod: selectedMethod,
          screenshotUrl: ssPath,
        });
        await dbInsertLog({
          requestId: r.id,
          doctorId: doctor.id,
          doctorName: doctor.full_name,
          action: "claim_submitted",
          detail: selectedMethod,
        });
        myClaimMap[r.id] = { status: "pending", decline_reason: null };
        activeClaimsMap[r.id] = {
          status: "pending",
          doctor_id: doctor.id,
          doctor_name: doctor.full_name,
        };
        closeModal();
        renderCards();
        toast(
          lang === "ar"
            ? "تم إرسال طلب الاستلام للمراجعة"
            : "Claim submitted for review",
          "success",
        );
      } catch (err) {
        cle.textContent = err.message || t("c.err");
        cle.style.display = "block";
        setLoad(btn, false);
      }
    };
  }

  function openModal(r) {
    if (!r) return;
    const lang = getLang(),
      isDone = r.status === "done",
      acc = hasAccess(r.id),
      ci = myClaim(r.id),
      locked = isLocked(r.id) && !acc;
    const types = Array.isArray(r.suffering_types) ? r.suffering_types : [];
    const tags = types
      .map((v) => `<span class="badge b-pen">${esc(sufLabel(v))}</span>`)
      .join(" ");
    const fullInfoHTML = acc
      ? `<div><p class="ii-lbl">${esc(t("doc.phone"))}</p><p class="ii-val mono" dir="ltr">${esc(r.phone)}</p></div><div><p class="ii-lbl">${esc(t("doc.nid"))}</p><p class="ii-val mono" dir="ltr">${esc(r.national_id_num)}</p></div>`
      : `<div class="notice n-blu" style="grid-column:1/-1"><span class="notice-icon">${IC.info}</span><span style="font-size:.8125rem">${lang === "ar" ? "رقم الهاتف والرقم القومي تظهر بعد الموافقة على طلب الاستلام" : "Phone and national ID shown after claim is approved"}</span></div>`;

    showModal({
      title: r.full_name,
      size: "lg",
      content: `<div style="display:flex;flex-direction:column;gap:1.25rem">
      <div class="ig">
        <div><p class="ii-lbl">${esc(t("doc.pid"))}</p><p class="ii-val mono">${esc(r.patient_id)}</p></div>
        <div><p class="ii-lbl">${lang === "ar" ? "الحالة" : "Status"}</p><p>${reqBadge(r.status)}</p></div>
        <div><p class="ii-lbl">${esc(t("doc.gender"))}</p><p class="ii-val">${r.gender === "male" ? esc(t("doc.male")) : esc(t("doc.female"))}</p></div>
        ${r.date_of_birth ? `<div><p class="ii-lbl">${lang === "ar" ? "السن" : "Age"}</p><p class="ii-val">${Math.floor((Date.now() - new Date(r.date_of_birth).getTime()) / (365.25 * 24 * 3600 * 1000))} ${lang === "ar" ? "سنة" : "yrs"}</p></div>` : ""}
        <div><p class="ii-lbl">${esc(t("doc.addr"))}</p><p class="ii-val">${esc(r.address)}</p></div>
        ${fullInfoHTML}
      </div>
      <div><p class="lbl mb3">${esc(t("doc.suf"))}</p><div style="display:flex;flex-wrap:wrap;gap:.375rem">${tags}</div></div>
      ${r.notes ? `<div><p class="lbl mb3">${esc(t("pat.notes"))}</p><p class="ts">${esc(r.notes)}</p></div>` : ""}
      ${
        isDone
          ? `<div class="notice n-grn"><span class="notice-icon">${IC.checkCircle.replace('width="28"', 'width="16"').replace('height="28"', 'height="16"')}</span><span>${lang === "ar" ? "هذا الطلب مكتمل" : "This request is completed"}</span></div>`
          : `
      <div><p class="lbl mb3">${lang === "ar" ? "الإجراءات" : "Actions"}</p><div style="display:flex;gap:.5rem;flex-wrap:wrap">
        ${
          locked
            ? `<div class="notice n-amb" style="margin:0;flex:1"><span class="notice-icon">${IC.warning}</span><span style="font-size:.8125rem">${lang === "ar" ? "هذا الطلب قيد المراجعة لطبيب آخر حالياً" : "This request is currently under review for another doctor"}</span></div>`
            : !acc
              ? `<button class="btn btn-tl btn-sm" id="b-claim">${IC.doctor.replace('width="20"', 'width="14"').replace('height="20"', 'height="14"')}<span>${ci?.status === "pending" ? (lang === "ar" ? "قيد المراجعة" : "Claim Pending") : ci?.status === "declined" ? (lang === "ar" ? "إعادة التقديم" : "Re-claim") : esc(t("doc.claim"))}</span></button>`
              : `<button class="btn btn-sm${r.status === "ongoing" ? " btn-p" : " btn-s"}" id="b-ong" ${r.status === "ongoing" ? "disabled" : ""}>${esc(t("doc.m_ong"))}</button>
           <button class="btn btn-ok btn-sm" id="b-don" ${r.status === "done" ? "disabled" : ""}>${esc(t("doc.m_done"))}</button>`
        }
      </div></div>
      ${acc ? `<div><p class="lbl mb3">${esc(t("doc.notes"))}</p><textarea class="ta" id="m-nt" rows="4" placeholder="${esc(t("doc.notes_ph"))}" maxlength="2000">${esc(r.doctor_notes || "")}</textarea><div style="display:flex;justify-content:flex-end;margin-top:.5rem"><button class="btn btn-p btn-sm" id="b-sn">${IC.check}<span>${esc(t("doc.save_n"))}</span></button></div></div>` : ""}`
      }
      <div><p class="lbl mb3">${lang === "ar" ? "سجل نشاطك" : "Your Activity Log"}</p>
        ${!acc ? `<div class="notice n-blu" style="margin:0"><span class="notice-icon">${IC.info}</span><span style="font-size:.8125rem">${esc(t("doc.log_locked"))}</span></div>` : `<div id="req-log-wrap"><div class="spin" style="margin:.75rem auto;display:block;width:1.25rem;height:1.25rem"></div></div>`}
      </div>
    </div>`,
    });

    if (acc) {
      dbGetLogsForRequest(r.id).then((logs) => {
        const wrap = q("#req-log-wrap");
        if (!wrap) return;
        const myLogs = logs.filter((l) => l.doctor_id === doctor.id);
        wrap.innerHTML = '<div id="req-log-filter"></div>';
        renderFilteredLogBlock("req-log-filter", myLogs);
      });
    }
    if (!isDone) {
      if (!locked && !acc) {
        q("#b-claim")?.addEventListener("click", () => {
          closeModal();
          openClaimDialog(r);
        });
      } else if (acc) {
        let noteVal = r.doctor_notes || "";
        q("#m-nt")?.addEventListener(
          "input",
          (e) => (noteVal = e.target.value),
        );
        q("#b-sn")?.addEventListener("click", async () => {
          const btn = q("#b-sn");
          setLoad(btn, true);
          try {
            await dbUpdateRequestNotes(r.id, san(noteVal));
            await dbInsertLog({
              requestId: r.id,
              doctorId: doctor.id,
              doctorName: doctor.full_name,
              action: "notes_updated",
              detail: "",
            });
            const rec = reqs.find((x) => x.id === r.id);
            if (rec) rec.doctor_notes = san(noteVal);
            toast(t("c.save"), "success");
          } catch (err) {
            toast(err.message || t("c.err"), "error");
          }
          setLoad(btn, false);
        });
        const bOng = q("#b-ong"),
          bDon = q("#b-don");
        if (bOng)
          bOng.onclick = () => {
            if (r.status === "ongoing") return;
            confirmDialog(t("doc.confirm_msg"), async () => {
              try {
                await dbUpdateRequestStatus(
                  r.id,
                  "ongoing",
                  doctor.id,
                  doctor.full_name,
                );
                await dbInsertLog({
                  requestId: r.id,
                  doctorId: doctor.id,
                  doctorName: doctor.full_name,
                  action: "status_changed",
                  detail: "",
                  oldValue: r.status,
                  newValue: "ongoing",
                });
                const rec = reqs.find((x) => x.id === r.id);
                if (rec) {
                  rec.status = "ongoing";
                  rec.assigned_doctor_id = doctor.id;
                  rec.assigned_doctor_name = doctor.full_name;
                }
                renderCards();
                closeModal();
              } catch (err) {
                toast(err.message || t("c.err"), "error");
              }
            });
          };
        if (bDon)
          bDon.onclick = () => {
            if (r.status === "done") return;
            confirmDialog(t("doc.confirm_msg"), async () => {
              try {
                await dbUpdateRequestStatus(
                  r.id,
                  "done",
                  doctor.id,
                  doctor.full_name,
                );
                await dbInsertLog({
                  requestId: r.id,
                  doctorId: doctor.id,
                  doctorName: doctor.full_name,
                  action: "status_changed",
                  detail: "",
                  oldValue: r.status,
                  newValue: "done",
                });
                const rec = reqs.find((x) => x.id === r.id);
                if (rec) rec.status = "done";
                renderCards();
                closeModal();
              } catch (err) {
                toast(err.message || t("c.err"), "error");
              }
            });
          };
      }
    }
  }

  try {
    await loadData();
  } catch (err) {
    console.error("[doctor-dash:load]", err.message, err);
    const lang = getLang();
    app.innerHTML = `<div class="page-wrap" style="max-width:var(--max-w);margin:0 auto;padding:1.25rem" style="padding-top:2rem">
      <div class="notice n-red">
        <span class="notice-icon">${IC.xCircle.replace('width="28"', 'width="16"').replace('height="28"', 'height="16"')}</span>
        <div>
          <p class="fw6" style="margin-bottom:.375rem">${lang === "ar" ? "تعذّر تحميل الطلبات" : "Could not load requests"}</p>
          <p class="ts" style="font-family:monospace;font-size:.8rem;word-break:break-all">${esc(err.message)}</p>
          <button class="btn btn-s btn-sm" style="margin-top:.75rem" onclick="location.reload()">${lang === "ar" ? "إعادة المحاولة" : "Retry"}</button>
        </div>
      </div>
    </div>`;
    return;
  }
  renderPage();
  window.addEventListener(
    "hashchange",
    () => {
      dbRemoveChannel(rtChannel);
      dbRemoveChannel(claimChannel);
    },
    { once: true },
  );
});
