export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY دانەنراوە لە Vercel" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const parts = body?.parts;
  if (!parts || !Array.isArray(parts)) return res.status(400).json({ error: "هیچ دەقێک نەنێردراوە" });

  // لیستی ئەو مۆدێلانەی لەسەر هەژمارەکەت کاردەکەن
  const preferredModels = [
    "gemini-3.8-flash",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash"
  ];

  let activeModels = [];

  // دۆزینەوەی ئۆتۆماتیکیی ئەو مۆدێلانەی کە گۆگڵ لە ئێستادا بۆ کلیلەکەت ڕێگەیان پێدەدات
  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const listData = await listRes.json();
    if (listData?.models) {
      activeModels = listData.models
        .filter(m => m.supportedGenerationMethods?.includes("generateContent"))
        .map(m => m.name.replace("models/", ""));
    }
  } catch (e) {
    // پشت بەستن بە لیستی پێشوەختە لەکاتی کێشەی خزمەتگوزاری
  }

  // یەکخستنی مۆدێلە دۆزراوەکان
  const queue = Array.from(new Set([...preferredModels, ...activeModels]));
  let lastError = "";

  for (const model of queue) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
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

      // ئەگەر لۆدی لەسەر بوو یان بەردەست نەبوو، دەچێتە سەر مۆدێلی دواتر
      lastError = data?.error?.message || `Error with ${model}`;
    } catch (e) {
      lastError = e.message;
    }
  }

  return res.status(503).json({ error: lastError });
}
