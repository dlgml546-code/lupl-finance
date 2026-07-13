export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

export function readJsonBody(req) {
  return typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
}

export function parseJsonText(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) throw new Error("AI 응답을 JSON으로 해석할 수 없습니다.");
    return JSON.parse(match[0]);
  }
}

function getEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return process.env[name];
  }
  return "";
}

export async function requireManager(req) {
  const supabaseUrl = getEnv("SUPABASE_URL", "VITE_SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY", "VITE_SUPABASE_ANON_KEY");
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!supabaseUrl || !anonKey) throw Object.assign(new Error("Supabase 환경변수가 없습니다."), { statusCode: 500 });
  if (!token) throw Object.assign(new Error("로그인이 필요합니다."), { statusCode: 401 });

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!userRes.ok) throw Object.assign(new Error("로그인 정보를 확인할 수 없습니다."), { statusCode: 401 });
  const user = await userRes.json();

  const byAuth = await fetch(`${supabaseUrl}/rest/v1/people?select=id,rank,is_active,email&auth_user_id=eq.${encodeURIComponent(user.id)}&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!byAuth.ok) throw new Error("직원 정보를 확인할 수 없습니다.");
  let person = (await byAuth.json())[0];

  if (!person && user.email) {
    const byEmail = await fetch(`${supabaseUrl}/rest/v1/people?select=id,rank,is_active,email&email=eq.${encodeURIComponent(user.email)}&limit=1`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
    });
    if (!byEmail.ok) throw new Error("직원 정보를 확인할 수 없습니다.");
    person = (await byEmail.json())[0];
  }

  if (!person || !person.is_active || !["대표", "본부장"].includes(person.rank)) {
    throw Object.assign(new Error("대표 또는 본부장만 사용할 수 있습니다."), { statusCode: 403 });
  }
  return person;
}
