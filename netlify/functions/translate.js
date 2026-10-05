const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const UPSTREAM_TIMEOUT_MS = 45000;
const MAX_PAYLOAD_BYTES = 8000000;

export default async function handler(req, res) {
  // ڕێکخستنی CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  // ئەگەر مۆدێل دیاری نەکرابوو لە Flash بەکاردێت
  const MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON body." });
    }
  }

  const { parts } = body || {};

  if (!Array.isArray(parts) || parts.length === 0) {
    return res.status(400).json({ error: "Field 'parts' must be a non-empty array." });
  }

  for (const part of parts) {
    const isText = typeof part?.text === "string";
    const isImage =
      part?.inlineData &&
      typeof part.inlineData.data === "string" &&
      typeof part.inlineData.mimeType === "string";

    if (!isText && !isImage) {
      return res.status(400).json({ error: "Each part must contain either 'text' or 'inlineData'." });
    }

    if (isImage) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!allowed.includes(part.inlineData.mimeType)) {
        return res.status(400).json({ error: `Unsupported image MIME type: ${part.inlineData.mimeType}` });
      }
    }
  }

  const payloadSize = JSON.stringify(parts).length;
  if (payloadSize > MAX_PAYLOAD_BYTES) {
    return res.status(413).json({ error: "Payload too large. Please use a smaller image." });
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
      return res.status(upstream.status).json({ error: message });
    }

    if (!data) {
      return res.status(502).json({ error: "Upstream returned an empty response." });
    }

    return res.status(200).json(data);
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === "AbortError") {
      return res.status(504).json({ error: "The AI model took too long to respond. Please try again." });
    }

    return res.status(502).json({ error: "Upstream request failed: " + err.message });
  }
}
