function extractOutputText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const chunks = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") chunks.push(content.text);
      if (typeof content?.output_text === "string") chunks.push(content.output_text);
    }
  }
  return chunks.join("\n").trim();
}

function parseJsonObject(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST only" });
  }

  const apiKey = process.env.OPENAIAPIkeys || process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEYS;
  if (!apiKey) return res.status(500).json({ error: "OPENAIAPIkeys is not configured." });

  const { messages = [], context = {} } = req.body || {};
  const transcript = messages
    .slice(-16)
    .map((message) => `${message.role === "assistant" ? "AI" : "사용자"}: ${message.content}`)
    .join("\n");

  const instructions = [
    "너는 러플(LUPL) 경영관리 대시보드의 한국어 입력 도우미다.",
    "목표는 사용자의 말에서 프로젝트 매출, 강사 직접수령 정산, 회사 회수액, 고용 시 월 인건비를 구조화하는 것이다.",
    "기관이 강사에게 먼저 돈을 준 경우: 회사 회수 예정액 = 기관이 강사에게 입금한 총액 - 강사 실제 지급 예정액이다.",
    "정보가 부족하면 한 번에 1~3개만 짧게 질문한다. 버튼으로 고를 수 있게 quickReplies를 만든다.",
    "충분히 모이면 draft를 채운다. 모든 금액은 숫자 원 단위로 넣고, 문자열 금액은 쓰지 않는다.",
    "반드시 JSON 하나만 출력한다. 마크다운 금지.",
    "JSON 스키마: {\"reply\":\"string\",\"quickReplies\":[\"string\"],\"draft\":{\"projectName\":\"string\",\"clientName\":\"string\",\"clientType\":\"일반학교|특수학교|공공기관|기업|비영리재단\",\"paymentFlow\":\"company|instructor\",\"instructorCount\":number,\"grossInstitutionPaid\":number,\"instructorPlannedPayTotal\":number,\"companyCollectionTotal\":number,\"companyCollectionReceivedTotal\":number,\"companyRevenue\":number,\"memo\":\"string\",\"instructors\":[{\"name\":\"string\",\"hours\":number,\"mainSessions\":number,\"assistantSessions\":number,\"institutionPaid\":number,\"plannedPay\":number,\"companyCollection\":number}],\"employmentCandidates\":[{\"name\":\"string\",\"role\":\"string\",\"employeeNumber\":\"string\",\"phone\":\"string\",\"monthlySalary\":number,\"annualSalary\":number,\"weeklyWorkDays\":number,\"dailyWorkHours\":number}]}}"
  ].join("\n");

  const input = [
    `오늘: ${context.today || ""}`,
    `현재 등록 프로젝트 수: ${context.projectCount || 0}`,
    `현재 등록 직원 수: ${context.peopleCount || 0}`,
    `현재 월 인건비 합계: ${Math.round(context.monthlyPayroll || 0)}원`,
    `기존 프로젝트/직원 참고: ${JSON.stringify({ projects: context.projects || [], people: context.people || [] })}`,
    "대화:",
    transcript || "사용자가 아직 입력하지 않음"
  ].join("\n");

  try {
    const model = process.env.OPENAI_MODEL || "gpt-5.2";
    const openaiRes = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        instructions,
        input
      })
    });

    const data = await openaiRes.json();
    if (!openaiRes.ok) {
      return res.status(openaiRes.status).json({ error: data?.error?.message || "OpenAI request failed." });
    }

    const text = extractOutputText(data);
    const parsed = parseJsonObject(text);
    if (!parsed) {
      return res.status(200).json({
        reply: text || "응답을 구조화하지 못했습니다. 프로젝트명, 기관명, 강사 수, 받은 금액을 다시 알려주세요.",
        quickReplies: ["기관이 강사에게 직접 입금", "회사로 직접 입금", "강사별 금액 입력"],
        draft: null
      });
    }
    return res.status(200).json({
      reply: parsed.reply || "좋아요. 다음 정보를 알려주세요.",
      quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies : [],
      draft: parsed.draft || null
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "AI request failed." });
  }
}
