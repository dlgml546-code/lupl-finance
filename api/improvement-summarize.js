import { parseJsonText, readJsonBody, requireManager, send } from "./_shared.js";

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "POST만 지원합니다." });
  try {
    await requireManager(req);
    const apiKey = process.env.OPENAIAPIkeys || process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEYS;
    if (!apiKey) return send(res, 500, { error: "OPENAIAPIkeys 환경변수가 없습니다." });

    const body = readJsonBody(req);
    const requests = Array.isArray(body.requests) ? body.requests.slice(0, 100) : [];
    if (requests.length === 0) return send(res, 400, { error: "정리할 개선 요청이 없습니다." });

    const prompt = [
      "너는 LUPL 경영관리 대시보드 개선 요청을 개발 작업 단위로 정리하는 한국어 PM이다.",
      "관리자가 Codex에게 바로 맡길 수 있도록 중복 요청을 합치고, 페이지별·카테고리별 우선순위를 정리한다.",
      "자동 수정, 배포, 법률 판단은 하지 않는다. 반드시 JSON만 반환한다.",
      "필드: overview, priority_items, action_items, questions.",
      "priority_items는 배열이며 각 항목은 title, menu, submenu, reason, severity 필드를 가진다.",
      "action_items는 배열이며 각 항목은 task, scope, acceptance_criteria 필드를 가진다.",
      "",
      `개선 요청 목록: ${JSON.stringify(requests)}`
    ].join("\n");

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.15,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "너는 소프트웨어 개선 요청을 실행 가능한 개발 작업으로 정리하는 한국어 PM이다." },
          { role: "user", content: prompt }
        ]
      })
    });
    const data = await openaiRes.json();
    if (!openaiRes.ok) return send(res, openaiRes.status, { error: data?.error?.message || "OpenAI 호출 실패" });
    const content = data?.choices?.[0]?.message?.content || "{}";
    return send(res, 200, { summary: parseJsonText(content) });
  } catch (error) {
    return send(res, error.statusCode || 500, { error: error.message || String(error) });
  }
}
