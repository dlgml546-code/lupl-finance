// Supabase Edge Function: admin-create-user
// 관리자 직원 등록 시 Supabase Auth 계정을 생성합니다.
// 비밀번호는 저장하지 않고 Auth에만 설정합니다.
// 배포:
// supabase functions deploy admin-create-user
// supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { personId, email, password, name, employeeNumber } = await req.json();
    if (!personId || !email || !password) return json({ error: "personId, email, password are required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "Missing Supabase service role settings" }, 500);

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "관리자 로그인이 필요합니다." }, 401);

    const { data: callerData, error: callerError } = await admin.auth.getUser(token);
    if (callerError || !callerData.user) return json({ error: "로그인 세션을 확인하지 못했습니다." }, 401);

    let { data: callerProfile, error: profileError } = await admin
      .from("people")
      .select("rank")
      .eq("auth_user_id", callerData.user.id)
      .maybeSingle();
    if (profileError) return json({ error: profileError.message }, 500);
    if (!callerProfile && callerData.user.email) {
      const byEmail = await admin
        .from("people")
        .select("rank")
        .eq("email", callerData.user.email)
        .maybeSingle();
      if (byEmail.error) return json({ error: byEmail.error.message }, 500);
      callerProfile = byEmail.data;
    }
    if (!callerProfile || !["대표", "본부장"].includes(callerProfile.rank)) {
      return json({ error: "대표 또는 본부장만 직원 로그인 계정을 초기화할 수 있습니다." }, 403);
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        employee_number: employeeNumber
      }
    });

    if (createError && !createError.message.toLowerCase().includes("already")) {
      return json({ error: createError.message }, 500);
    }

    let authUserId = created?.user?.id || null;

    if (!authUserId) {
      const { data: listData, error: listError } = await admin.auth.admin.listUsers();
      if (listError) return json({ error: listError.message }, 500);
      authUserId = listData.users.find((u) => u.email === email)?.id || null;
    }

    if (authUserId) {
      const { error: resetError } = await admin.auth.admin.updateUserById(authUserId, {
        email,
        password,
        email_confirm: true,
        user_metadata: {
          name,
          employee_number: employeeNumber
        }
      });
      if (resetError) return json({ error: resetError.message }, 500);

      const { error: updateError } = await admin
        .from("people")
        .update({ auth_user_id: authUserId, password_changed_at: null })
        .eq("id", personId);
      if (updateError) return json({ error: updateError.message }, 500);
    }

    return json({ ok: true, auth_user_id: authUserId, password_reset: true, source: "supabase-edge" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
