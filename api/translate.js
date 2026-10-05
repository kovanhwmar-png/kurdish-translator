export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { text, mode, targetLang } = req.body || {};
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY دیاری نەکراوە.' });
  }

  if (!text) {
    return res.status(400).json({ error: 'تکایە دەقێک بنووسە.' });
  }

  try {
    const prompt = `Translate the following text accurately considering Kurdish nuances. 
Target Language: ${targetLang || 'English'}
Style/Tone: ${mode || 'Natural'}
Text:
${text}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'کێشەیەک لە Gemini API ڕوویدا' });
    }

    const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return res.status(200).json({ translation: translatedText });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
