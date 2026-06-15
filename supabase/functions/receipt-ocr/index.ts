// Supabase Edge Function: receipt-ocr
// 배포:
// supabase functions deploy receipt-ocr
// supabase secrets set OPENAI_API_KEY=...
// supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...
// 선택: supabase secrets set OCR_MODEL=gpt-4o-mini

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { storagePath } = await req.json();

    if (!storagePath) {
      return json({ error: "storagePath is required" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const openAiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("OCR_MODEL") || "gpt-4o-mini";

    if (!supabaseUrl || !serviceRoleKey) {
      return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    if (!openAiKey) {
      return json({
        vendor_name: null,
        transaction_date: null,
        total_amount: null,
        supply_amount: null,
        vat_amount: null,
        purpose: "OCR API key missing",
        raw_text: "OPENAI_API_KEY is not configured."
      });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: signed, error: signedError } = await supabase
      .storage
      .from("receipts")
      .createSignedUrl(storagePath, 60 * 10);

    if (signedError || !signed?.signedUrl) {
      return json({ error: signedError?.message || "Failed to create signed URL" }, 500);
    }

    const fileResponse = await fetch(signed.signedUrl);
    const contentType = fileResponse.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return json({ error: "Receipt OCR currently supports image files only. Upload JPG, PNG, or WEBP." }, 400);
    }
    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const dataUrl = `data:${contentType};base64,${base64}`;

    const prompt = `
영수증 또는 지출 증빙 이미지를 읽고 JSON만 반환하세요.
필드는 다음과 같습니다.
{
  "vendor_name": "거래처명 또는 null",
  "transaction_date": "YYYY-MM-DD 또는 null",
  "total_amount": 숫자 또는 null,
  "supply_amount": 숫자 또는 null,
  "vat_amount": 숫자 또는 null,
  "purpose": "한 줄 요약",
  "raw_text": "읽은 주요 텍스트"
}
숫자는 쉼표 없이 숫자로만 반환하세요.
`.trim();

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You extract structured receipt data. Return JSON only." },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } }
            ]
          }
        ],
        temperature: 0
      })
    });

    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      return json({ error: text }, 500);
    }

    const result = await aiResponse.json();
    const content = result.choices?.[0]?.message?.content || "{}";
    const parsed = normalizeReceiptResult(JSON.parse(content));

    return json(parsed);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function normalizeReceiptResult(value: Record<string, unknown>) {
  return {
    vendor_name: cleanString(value.vendor_name),
    transaction_date: normalizeDate(value.transaction_date),
    total_amount: normalizeAmount(value.total_amount),
    supply_amount: normalizeAmount(value.supply_amount),
    vat_amount: normalizeAmount(value.vat_amount),
    purpose: cleanString(value.purpose),
    raw_text: cleanString(value.raw_text)
  };
}

function cleanString(value: unknown) {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text && text.toLowerCase() !== "null" ? text : null;
}

function normalizeAmount(value: unknown) {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeDate(value: unknown) {
  const text = cleanString(value);
  if (!text) return null;
  const match = text.match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    }
  });
}
