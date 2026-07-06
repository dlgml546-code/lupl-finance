import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function getEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return "";
}

function send(res, status, body) {
  for (const [key, value] of Object.entries(corsHeaders)) res.setHeader(key, value);
  res.status(status).json(body);
}

async function findUserByEmail(admin, email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function assertManager(admin, req) {
  const authHeader = String(req.headers.authorization || "");
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw Object.assign(new Error("관리자 로그인이 필요합니다."), { status: 401 });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) throw Object.assign(new Error("로그인 세션을 확인하지 못했습니다."), { status: 401 });

  let { data: profile, error: profileError } = await admin
    .from("people")
    .select("rank")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();
  if (profileError) throw profileError;
  if (!profile && userData.user.email) {
    const byEmail = await admin
      .from("people")
      .select("rank")
      .eq("email", userData.user.email)
      .maybeSingle();
    if (byEmail.error) throw byEmail.error;
    profile = byEmail.data;
  }
  if (!profile || !["대표", "본부장"].includes(profile.rank)) {
    throw Object.assign(new Error("대표 또는 본부장만 직원 로그인 계정을 초기화할 수 있습니다."), { status: 403 });
  }
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") return send(res, 200, { ok: true });
  if (req.method !== "POST") return send(res, 405, { error: "Method not allowed" });

  try {
    const supabaseUrl = getEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SERVICE_KEY", "SUPABASE_SERVICE_ROLE", "SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return send(res, 500, { error: "Vercel에 SUPABASE_SERVICE_ROLE_KEY가 설정되어 있지 않습니다." });
    }

    const { personId, email, password, name, employeeNumber } = req.body || {};
    if (!personId || !email || !password) return send(res, 400, { error: "personId, email, password are required" });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    await assertManager(admin, req);

    const userMetadata = { name, employee_number: employeeNumber };
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata
    });

    if (createError && !createError.message.toLowerCase().includes("already")) {
      return send(res, 500, { error: createError.message });
    }

    let authUserId = created?.user?.id || null;
    if (!authUserId) {
      const found = await findUserByEmail(admin, email);
      authUserId = found?.id || null;
    }
    if (!authUserId) return send(res, 404, { error: "Auth 계정을 찾거나 생성하지 못했습니다." });

    const { error: resetError } = await admin.auth.admin.updateUserById(authUserId, {
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata
    });
    if (resetError) return send(res, 500, { error: resetError.message });

    const { error: updateError } = await admin
      .from("people")
      .update({ auth_user_id: authUserId, password_changed_at: null })
      .eq("id", personId);
    if (updateError) return send(res, 500, { error: updateError.message });

    return send(res, 200, { ok: true, auth_user_id: authUserId, password_reset: true, source: "vercel-api" });
  } catch (error) {
    return send(res, error.status || 500, { error: error instanceof Error ? error.message : String(error) });
  }
}
