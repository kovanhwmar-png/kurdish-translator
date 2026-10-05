const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY دانەنراوە" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const parts = body?.parts;
  if (!parts || !Array.isArray(parts)) return res.status(400).json({ error: "هیچ دەقێک نەنێردراوە" });

  // لیستێک لە مۆدێلە خێرا و کاراکان؛ ئەگەر یەکێکیان لۆدی لەسەر بوو، دەچێتە سەر ئەوی تر
  const candidateModels = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash-latest"
  ];

  let lastErrorMessage = "";

  for (const model of candidateModels) {
    try {
      const response = await fetch(`${GEMINI_ENDPOINT_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
        })
      });

      const data = await response.json();

      if (response.ok) {
        return res.status(200).json(data);
      }

      lastErrorMessage = data?.error?.message || `Error with model ${model}`;
    } catch (e) {
      lastErrorMessage = e.message;
    }
  }

  return res.status(503).json({ error: lastErrorMessage });
}
