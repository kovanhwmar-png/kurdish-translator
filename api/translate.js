export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "تەنها میتۆدی POST ڕێگەپێدراوە" });
  }

  let text = "";
  
  if (typeof req.body === "string") {
    try {
      const parsed = JSON.parse(req.body);
      text = parsed.text || "";
    } catch {
      return res.status(400).json({ error: "JSON نادروست" });
    }
  } else if (typeof req.body === "object" && req.body !== null) {
    text = req.body.text || "";
  }

  text = text.trim();

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
