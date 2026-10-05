const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const UPSTREAM_TIMEOUT_MS = 45000;
const MAX_PAYLOAD_BYTES = 8000000;

export default async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed. Use POST." }, 405);
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!GEMINI_API_KEY) {
    return jsonResponse({ error: "GEMINI_API_KEY is not configured on the server." }, 500);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body." }, 400);
  }

  const { parts } = body || {};

  if (!Array.isArray(parts) || parts.length === 0) {
    return jsonResponse({ error: "Field 'parts' must be a non-empty array." }, 400);
  }

  for (const part of parts) {
    const isText = typeof part?.text === "string";
    const isImage =
      part?.inlineData &&
      typeof part.inlineData.data === "string" &&
      typeof part.inlineData.mimeType === "string";

    if (!isText && !isImage) {
      return jsonResponse({ error: "Each part must contain either 'text' or 'inlineData'." }, 400);
    }

    if (isImage) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(part.inlineData.mimeType)) {
        return jsonResponse({ error: `Unsupported image MIME type: ${part.inlineData.mimeType}` }, 400);
      }
    }
  }

  const payloadSize = JSON.stringify(parts).length;
  if (payloadSize > MAX_PAYLOAD_BYTES) {
    return jsonResponse({ error: "Payload too large. Please use a smaller image." }, 413);
  }

  const url = `${GEMINI_ENDPOINT_BASE}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      const message = data?.error?.message || `Upstream returned HTTP ${upstream.status}`;
      return jsonResponse({ error: message }, upstream.status);
    }

    if (!data) {
      return jsonResponse({ error: "Upstream returned an empty response." }, 502);
    }

    return jsonResponse(data, 200);
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === "AbortError") {
      return jsonResponse({ error: "The AI model took too long to respond. Please try again." }, 504);
    }

    return jsonResponse({ error: "Upstream request failed: " + err.message }, 502);
  }
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}
