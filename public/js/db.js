"use strict";

let sb = null;

function initDB() {
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      flowType: "pkce",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "senna-auth",
    },
    realtime: { timeout: 30000 },
    global: { headers: { "X-Client-Info": "senna-web/1.0" } },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetSession() {
  const { data, error } = await sb.auth.getSession();
  if (error) throw error;
  return data.session;
}
async function dbSignIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}
async function dbSignUp(email, password, meta) {
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { data: meta },
  });
  if (error) throw error;
  return data.user;
}
async function dbSignOut() {
  await sb.auth.signOut();
}
async function dbExchangeCode(code) {
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) throw error;
}
function dbOnAuthChange(cb) {
  return sb.auth.onAuthStateChange(cb);
}

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetDoctor(userId) {
  const { data, error } = await sb
    .from("doctors")
    .select(
      "id,user_id,full_name,email,phone,address,university,semester,national_id_num,national_id_front_url,national_id_back_url,university_id_front_url,university_id_back_url,status,rejection_reason,last_seen,created_at,updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[db:getDoctor]", error.message);
    return null;
  }
  return data;
}

async function dbGetAdminRecord(userId) {
  // Try the SECURITY DEFINER RPC first (bypasses RLS)
  const { data: rpcData, error: rpcErr } = await sb.rpc("get_admin_record", {
    p_user_id: userId,
  });
  if (!rpcErr && rpcData !== undefined) {
    // RPC returns a JSON object or null
    return rpcData
      ? typeof rpcData === "string"
        ? JSON.parse(rpcData)
        : rpcData
      : null;
  }
  // Fallback: direct query (works if the user can read their own row)
  const { data, error } = await sb
    .from("admin_users")
    .select("id,user_id,role,permissions,display_name,email")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("[db:getAdminRecord fallback]", error.message);
    return null;
  }
  return data;
}

async function dbGetProfile(userId) {
  const [doctor, adminRec] = await Promise.all([
    dbGetDoctor(userId),
    dbGetAdminRecord(userId),
  ]);
  return { doctor, isAdmin: !!adminRec, adminRec };
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTORS
// ─────────────────────────────────────────────────────────────────────────────
async function dbCreateDoctorProfile(params) {
  // Try RPC first (SECURITY DEFINER — works even without auth)
  const { error: rpcErr } = await sb.rpc("create_doctor_profile", params);
  if (!rpcErr) return;
  // Fallback: direct insert (requires authenticated session and insert policy)
  console.warn(
    "[db:createDoctorProfile] RPC failed, trying direct insert:",
    rpcErr.message,
  );
  const { error: insErr } = await sb.from("doctors").insert({
    user_id: params.p_user_id,
    full_name: params.p_full_name,
    email: params.p_email,
    phone: params.p_phone,
    address: params.p_address,
    university: params.p_university,
    semester: params.p_semester,
    national_id_num: params.p_national_id,
    national_id_front_url: params.p_nid_front,
    national_id_back_url: params.p_nid_back,
    university_id_front_url: params.p_uid_front,
    university_id_back_url: params.p_uid_back,
    status: "pending",
  });
  if (insErr) throw insErr;
}

async function dbGetAllDoctors() {
  const { data, error } = await sb
    .from("doctors")
    .select(
      "id,user_id,full_name,email,phone,address,university,semester,national_id_num,national_id_front_url,national_id_back_url,university_id_front_url,university_id_back_url,status,rejection_reason,last_seen,created_at,updated_at",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function dbSetDoctorStatus(id, status, reason = null) {
  const update = { status, updated_at: new Date().toISOString() };
  update.rejection_reason = status === "rejected" && reason ? reason : null;
  const { error } = await sb.from("doctors").update(update).eq("id", id);
  if (error) throw error;
}
async function dbUpdateDoctorSelf(id, changes) {
  const allowed = [
    "full_name",
    "address",
    "phone",
    "university",
    "semester",
    "national_id_front_url",
    "national_id_back_url",
    "university_id_front_url",
    "university_id_back_url",
    "status",
    "rejection_reason",
  ];
  const safe = Object.fromEntries(
    Object.entries(changes).filter(([k]) => allowed.includes(k)),
  );
  const { error } = await sb
    .from("doctors")
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
async function dbUpdateDoctorLastSeen(id) {
  await sb
    .from("doctors")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", id);
}
async function dbGetDoctorPhoneEmail(phone) {
  const { data, error } = await sb
    .from("doctors")
    .select("email")
    .eq("phone", phone)
    .maybeSingle();
  if (error) throw error;
  return data?.email || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR PENDING EDITS
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetPendingEdits() {
  const { data, error } = await sb
    .from("doctor_pending_edits")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function dbGetPendingEditsForDoctor(doctorId) {
  const { data, error } = await sb
    .from("doctor_pending_edits")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}
async function dbSubmitDoctorEdit(doctorId, changes) {
  const { error } = await sb
    .from("doctor_pending_edits")
    .insert({ doctor_id: doctorId, changes, status: "pending" });
  if (error) throw error;
}
async function dbApproveDoctorEdit(editId, doctorId, changes) {
  const allowed = [
    "full_name",
    "address",
    "phone",
    "university",
    "semester",
    "national_id_front_url",
    "national_id_back_url",
    "university_id_front_url",
    "university_id_back_url",
  ];
  const safe = Object.fromEntries(
    Object.entries(changes).filter(([k]) => allowed.includes(k)),
  );
  const { error: e1 } = await sb
    .from("doctors")
    .update({ ...safe, updated_at: new Date().toISOString() })
    .eq("id", doctorId);
  if (e1) throw e1;
  const { error: e2 } = await sb
    .from("doctor_pending_edits")
    .update({ status: "approved" })
    .eq("id", editId);
  if (e2) throw e2;
  // Log the edit approval
  await dbLogDoctorEdit(doctorId, "approved", Object.keys(safe).join(","));
}
async function dbRejectDoctorEdit(editId, doctorId = null) {
  const { error } = await sb
    .from("doctor_pending_edits")
    .update({ status: "rejected" })
    .eq("id", editId);
  if (error) throw error;
  // Log the edit rejection if doctorId is provided
  if (doctorId) {
    await dbLogDoctorEdit(doctorId, "rejected", "");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR APPLICATIONS LOG
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetDoctorApplications(doctorId) {
  const { data, error } = await sb
    .from("doctor_applications")
    .select("id,action,reason,created_at")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn(error.message);
    return [];
  }
  return data || [];
}
async function dbLogDoctorApplication(doctorId, action, reason = null) {
  const { error } = await sb
    .from("doctor_applications")
    .insert({ doctor_id: doctorId, action, reason });
  if (error) console.warn("[db:logApp]", error.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR EDITS LOG
// ─────────────────────────────────────────────────────────────────────────────
async function dbLogDoctorEdit(doctorId, action, details = "") {
  const { error } = await sb
    .from("doctor_edits_log")
    .insert({ doctor_id: doctorId, action, details });
  if (error) console.warn("[db:logDoctorEdit]", error.message);
}
async function dbGetDoctorEditsLog(doctorId) {
  const { data, error } = await sb
    .from("doctor_edits_log")
    .select("id,action,details,created_at")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[db:getDoctorEditsLog]", error.message);
    return [];
  }
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT REQUESTS
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetRequests() {
  // Try SECURITY DEFINER RPC first
  const { data: rpcData, error: rpcErr } = await sb.rpc("get_all_requests");
  console.log("[db:getRequests] RPC result:", {
    rows: rpcData?.length ?? "null",
    error: rpcErr?.message ?? null,
  });
  if (!rpcErr && Array.isArray(rpcData)) return rpcData;

  // Fallback: direct query
  console.warn(
    "[db:getRequests] RPC failed:",
    rpcErr?.message,
    "— trying direct query",
  );
  const { data, error } = await sb
    .from("patient_requests")
    .select(
      "id,patient_id,full_name,gender,address,phone,national_id_num,national_id_front_url,national_id_back_url,suffering_types,notes,doctor_notes,status,assigned_doctor_id,assigned_doctor_name,date_of_birth,created_at,updated_at",
    )
    .order("created_at", { ascending: false });
  console.log("[db:getRequests] direct query result:", {
    rows: data?.length ?? "null",
    error: error?.message ?? null,
  });
  if (error)
    throw new Error(
      "get_all_requests: " +
        (rpcErr?.message || "unknown") +
        " | direct: " +
        error.message,
    );
  return data || [];
}
async function dbInsertRequest(payload) {
  const { error } = await sb.from("patient_requests").insert(payload);
  if (error) throw error;
}
async function dbUpdateRequestStatus(id, status, doctorId, doctorName) {
  const { error } = await sb
    .from("patient_requests")
    .update({
      status,
      assigned_doctor_id: doctorId,
      assigned_doctor_name: doctorName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
async function dbUpdateRequestNotes(id, notes) {
  const { error } = await sb
    .from("patient_requests")
    .update({ doctor_notes: notes, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER LOGS
// ─────────────────────────────────────────────────────────────────────────────
async function dbInsertLog({
  requestId,
  doctorId,
  doctorName,
  action,
  detail,
  oldValue,
  newValue,
}) {
  if (!requestId) return;
  const { error } = await sb.from("order_logs").insert({
    request_id: requestId,
    doctor_id: doctorId || null,
    doctor_name: doctorName || null,
    action,
    detail: detail || null,
    old_value: oldValue || null,
    new_value: newValue || null,
  });
  if (error) console.warn("[db:insertLog]", error.message);
}
async function dbGetLogsForRequest(requestId) {
  const { data, error } = await sb
    .from("order_logs")
    .select(
      "id,action,detail,old_value,new_value,doctor_id,doctor_name,created_at",
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn(error.message);
    return [];
  }
  return data || [];
}
async function dbGetLogsForDoctor(doctorId) {
  const { data, error } = await sb
    .from("order_logs")
    .select(
      "id,action,detail,old_value,new_value,doctor_id,doctor_name,created_at,patient_requests(patient_id,full_name)",
    )
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn(error.message);
    return [];
  }
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDER CLAIMS
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetActiveClaimsMap() {
  const { data, error } = await sb
    .from("order_claims")
    .select("request_id,status,doctor_id,doctor_name")
    .in("status", ["pending", "approved"]);
  if (error) {
    console.warn("[db:activeClaimsMap]", error.message);
    return {};
  }
  const map = {};
  for (const c of data || []) {
    const ex = map[c.request_id];
    if (!ex || c.status === "approved") map[c.request_id] = c;
  }
  return map;
}
async function dbSubmitClaim({
  requestId,
  doctorId,
  doctorName,
  paymentMethod,
  screenshotUrl,
}) {
  const { data: existing } = await sb
    .from("order_claims")
    .select("id,status,doctor_id")
    .eq("request_id", requestId)
    .in("status", ["pending", "approved"])
    .limit(1)
    .maybeSingle();
  if (existing) {
    const lang = getLang();
    if (existing.status === "approved")
      throw new Error(
        lang === "ar"
          ? "تم استلام هذا الطلب بالفعل"
          : "This request has already been claimed",
      );
    if (existing.status === "pending")
      throw new Error(
        lang === "ar"
          ? "هذا الطلب قيد المراجعة لطبيب آخر"
          : "Under review for another doctor",
      );
  }
  const { error } = await sb.from("order_claims").insert({
    request_id: requestId,
    doctor_id: doctorId,
    doctor_name: doctorName,
    payment_method: paymentMethod,
    payment_screenshot_url: screenshotUrl,
    status: "pending",
  });
  if (error) throw error;
}
async function dbGetPendingClaims() {
  const { data, error } = await sb
    .from("order_claims")
    .select("*,patient_requests(*)")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function dbResolveClaim(id, status, reason = null) {
  const { error } = await sb
    .from("order_claims")
    .update({
      status,
      decline_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}
async function dbGetAllClaimsForDoctor(doctorId) {
  const { data, error } = await sb
    .from("order_claims")
    .select("request_id,status,decline_reason")
    .eq("doctor_id", doctorId)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[db:getAllClaims]", error.message);
    return [];
  }
  const map = {};
  for (const c of data || []) {
    if (!map[c.request_id]) map[c.request_id] = c;
  }
  return Object.values(map);
}
async function dbGetClaimsForRequest(requestId) {
  const { data, error } = await sb
    .from("order_claims")
    .select("id,doctor_id,doctor_name,status,created_at")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT SETTINGS
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetPaymentSettings() {
  const { data, error } = await sb
    .from("payment_settings")
    .select("*")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
async function dbUpdatePaymentSettings(id, fee, methods, config = {}) {
  const update = {
    fee_per_order: fee,
    methods,
    updated_at: new Date().toISOString(),
  };
  if (Object.keys(config).length) update.metadata = config;
  const { error } = await sb
    .from("payment_settings")
    .update(update)
    .eq("id", id);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE COUNTS
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetBadgeCounts() {
  const [d, e, c] = await Promise.all([
    sb
      .from("doctors")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    sb
      .from("doctor_pending_edits")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    sb
      .from("order_claims")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);
  return {
    pendingDocs: d.count || 0,
    pendingEdits: e.count || 0,
    pendingClaims: c.count || 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
async function dbUploadFile(path, file) {
  if (!/^[a-zA-Z0-9\-_/]+\.[a-z]+$/.test(path))
    throw new Error("Invalid file path");
  const { error } = await sb.storage
    .from("national-ids")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return path;
}
async function dbGetSignedUrl(rawPath) {
  if (!rawPath) return null;
  let path = rawPath;
  if (rawPath.includes("/storage/v1/")) {
    const parts = rawPath.split("national-ids/");
    if (parts.length < 2) return null;
    path = parts[1];
  }
  if (path.includes("..")) return null;
  const { data } = await sb.storage
    .from("national-ids")
    .createSignedUrl(path, 3600);
  return data?.signedUrl || null;
}
function dbStoragePath(prefix, filename) {
  const ext = (filename.split(".").pop() || "jpg")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
  return `${prefix}/${crypto.randomUUID()}.${ext}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME
// ─────────────────────────────────────────────────────────────────────────────
function dbSubscribeToRequests(onInsert, onUpdate) {
  return sb
    .channel("pr_rt_" + Math.random().toString(36).slice(2, 7))
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "patient_requests" },
      (p) => onInsert(p.new),
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "patient_requests" },
      (p) => onUpdate(p.new),
    )
    .subscribe();
}
function dbSubscribeToClaims(onChange) {
  return sb
    .channel("cl_rt_" + Math.random().toString(36).slice(2, 7))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "order_claims" },
      (p) => onChange(p),
    )
    .subscribe();
}
function dbSubscribeToPendingEdits(onChange) {
  return sb
    .channel("pe_rt_" + Math.random().toString(36).slice(2, 7))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "doctor_pending_edits" },
      (p) => onChange(p),
    )
    .subscribe();
}
function dbSubscribeToBadges(onChange) {
  return sb
    .channel("badge_rt_" + Math.random().toString(36).slice(2, 7))
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "doctors" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "doctor_pending_edits" },
      () => onChange(),
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "order_claims" },
      () => onChange(),
    )
    .subscribe();
}
function dbJoinSessionChannel(doctorId, mySessionId, onConflict) {
  const ch = sb.channel(`ds_${doctorId}`, {
    config: { broadcast: { self: false } },
  });
  ch.on("broadcast", { event: "new_login" }, ({ payload }) => {
    if (payload.session_id !== mySessionId) onConflict();
  }).subscribe((s) => {
    if (s === "SUBSCRIBED")
      ch.send({
        type: "broadcast",
        event: "new_login",
        payload: { session_id: mySessionId },
      });
  });
  return ch;
}
function dbJoinPresenceChannel(doctorId, meta) {
  const ch = sb.channel("doctor_presence", {
    config: { presence: { key: doctorId } },
  });
  ch.subscribe(async (s) => {
    if (s === "SUBSCRIBED") await ch.track(meta);
  });
  return ch;
}
function dbSubscribePresence(onChange) {
  const ch = sb.channel("doctor_presence");
  ch.on("presence", { event: "sync" }, () => onChange(ch.presenceState()))
    .on("presence", { event: "join" }, () => onChange(ch.presenceState()))
    .on("presence", { event: "leave" }, () => onChange(ch.presenceState()))
    .subscribe();
  return ch;
}
function dbRemoveChannel(ch) {
  if (ch) sb.removeChannel(ch);
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — DELETE
// ─────────────────────────────────────────────────────────────────────────────
async function dbDeleteRequest(requestId) {
  await Promise.allSettled([
    sb.from("order_logs").delete().eq("request_id", requestId),
    sb.from("order_claims").delete().eq("request_id", requestId),
  ]);
  const { error } = await sb
    .from("patient_requests")
    .delete()
    .eq("id", requestId);
  if (error) throw error;
}
async function dbDeleteDoctor(doctorId) {
  await Promise.allSettled([
    sb.from("doctor_pending_edits").delete().eq("doctor_id", doctorId),
    sb.from("doctor_applications").delete().eq("doctor_id", doctorId),
    sb.from("order_claims").delete().eq("doctor_id", doctorId),
    sb.from("order_logs").delete().eq("doctor_id", doctorId),
  ]);
  const { error } = await sb.from("doctors").delete().eq("id", doctorId);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — STAFF MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────
async function dbGetAllAdmins() {
  const { data, error } = await sb
    .from("admin_users")
    .select("id,user_id,role,permissions,display_name,email,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}
async function dbCreateSubAdmin(email, password, displayName, permissions) {
  // Use a throwaway client so the super admin's session is preserved
  const tmp = supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error: signUpErr } = await tmp.auth.signUp({
    email: email.toLowerCase(),
    password,
    options: { data: { display_name: displayName } },
  });
  if (signUpErr) throw signUpErr;
  if (!data?.user?.id)
    throw new Error(
      getLang() === "ar"
        ? "فشل إنشاء الحساب — قد يكون الإيميل مسجل مسبقاً"
        : "Failed to create account — email may already be registered",
    );
  const { error: insErr } = await sb.from("admin_users").insert({
    user_id: data.user.id,
    role: "sub",
    permissions,
    display_name: displayName,
    email: email.toLowerCase(),
  });
  if (insErr) throw insErr;
}
async function dbUpdateSubAdminPerms(adminId, permissions) {
  const { error } = await sb
    .from("admin_users")
    .update({ permissions })
    .eq("id", adminId);
  if (error) throw error;
}
async function dbDeleteSubAdmin(adminId) {
  const { error } = await sb.from("admin_users").delete().eq("id", adminId);
  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT REQUEST SUBMISSION (via SECURITY DEFINER RPC — works for anon)
// ─────────────────────────────────────────────────────────────────────────────
async function dbSubmitPatientRequest({
  patientId,
  fullName,
  gender,
  address,
  phone,
  nationalId,
  nidFront,
  nidBack,
  suffering,
  notes,
  dob,
}) {
  // Try SECURITY DEFINER RPC first (works for anon, bypasses RLS)
  const { data, error } = await sb.rpc("submit_patient_request", {
    p_patient_id: patientId,
    p_full_name: fullName,
    p_gender: gender,
    p_address: address,
    p_phone: phone,
    p_national_id: nationalId,
    p_nid_front: nidFront,
    p_nid_back: nidBack,
    p_suffering: suffering, // pass array directly — PostgREST serialises to jsonb
    p_notes: notes || "",
    p_dob: dob || null,
  });
  if (!error) return data;

  // Fallback: direct insert (works if user is authenticated and RLS allows it)
  console.warn(
    "[db:submitPatientRequest] RPC failed, trying direct insert:",
    error.message,
  );
  const { data: d2, error: e2 } = await sb
    .from("patient_requests")
    .insert({
      patient_id: patientId,
      full_name: fullName,
      gender,
      address,
      phone,
      national_id_num: nationalId,
      national_id_front_url: nidFront,
      national_id_back_url: nidBack,
      suffering_types: suffering,
      notes: notes || null,
      date_of_birth: dob || null,
      status: "incomplete",
    })
    .select("id")
    .single();
  if (e2) throw e2;
  return d2?.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// RPCs
// ─────────────────────────────────────────────────────────────────────────────
async function dbFindPatientByIdentity(phone, nationalId) {
  const { data, error } = await sb.rpc("find_patient_by_identity", {
    p_phone: phone,
    p_national_id: nationalId,
  });
  if (error) {
    console.warn("[db:findPatient]", error.message);
    return null;
  }
  return data || null;
}

async function dbGeneratePatientCode() {
  // Try RPC first, fall back to client-side generation
  const { data, error } = await sb.rpc("generate_patient_code");
  if (!error && data) return data;
  // Fallback: generate locally and check uniqueness
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = Array.from(
      { length: 9 },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");
    const { data: exists } = await sb
      .from("patient_requests")
      .select("id")
      .eq("patient_id", code)
      .maybeSingle();
    if (!exists) return code;
  }
  throw new Error("Could not generate unique patient code");
}
