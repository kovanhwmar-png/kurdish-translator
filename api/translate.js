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

  // ڕاستەوخۆ دیاریکردنی ئەو دوو مۆدێلەی لەسەر هەژمارەکەت کاردەکەن بەبێ دواکەوتن
  const models = ["gemini-3.8-flash", "gemini-3.1-pro-preview"];
  let lastError = "";

  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { 
            responseMimeType: "application/json", 
            temperature: 0.3 
          }
        })
      });

      const data = await response.json();

      if (response.ok) {
        let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          // پاککردنەوەی هەموو نیشانە و ئەستێرە و مارکداونەکان پێش و پاشی JSON
          const jsonStart = rawText.indexOf('{');
          const jsonEnd = rawText.lastIndexOf('}');
          if (jsonStart !== -1 && jsonEnd !== -1) {
            rawText = rawText.substring(jsonStart, jsonEnd + 1);
          }
          data.candidates[0].content.parts[0].text = rawText.trim();
        }
        return res.status(200).json(data);
      }

      lastError = data?.error?.message || `Error with ${model}`;
    } catch (e) {
      lastError = e.message;
    }
  }

  return res.status(503).json({ error: lastError });
}
