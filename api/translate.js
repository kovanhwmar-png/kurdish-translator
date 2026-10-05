export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "تەنها POST ڕێگەپێدراوە" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const text = body?.text?.trim() || "";

  if (!text) {
    return res.status(400).json({ error: "هەڵە: تکایە دەقێک بنووسە" });
  }

  try {
    const translated = `وەرگێڕدراوی: ${text}`;
    return res.status(200).json({ result: translated });
  } catch (error) {
    return res.status(500).json({ error: "هەڵەیەک لە سێرڤەر ڕوویدا" });
  }
}
