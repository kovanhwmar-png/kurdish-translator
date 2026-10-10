exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { text, targetLang, tone } = JSON.parse(event.body || '{}');

    if (!text || !text.trim()) {
      return { statusCode: 400, body: 'تکایە دەقێک بنووسە' };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: 'هەڵە: کلیلی GEMINI_API_KEY دانەنراوە' };
    }

    const toneMap = {
      natural: 'natural conversational',
      formal: 'formal academic',
      street: 'street slang',
      literary: 'poetic literary'
    };
    const style = toneMap[tone] || 'natural';

    const promptText = targetLang === 'ar'
      ? `وەک زمانزانێکی پسپۆڕ، ئەم دەقە کوردییە وەربگێڕە بۆ عەرەبی بە شێوازی ${style}. تەنها دەقی وەرگێڕدراو بنووسە بەبێ هیچ تێبینییەک:\n\n${text}`
      : `You are an elite Kurdish linguist. Translate this Kurdish text (Sorani, Hawleri, Sulaymani, and Badini dialects, idioms, and slang) into English with a ${style} tone. Output ONLY the translation without quotes or notes:\n\n${text}`;

    // سنووردارکردنی چاوەڕوانی بۆ ١٠ چرکە تا نەکەوێتە داوی ٣٠ چرکەی سێرڤەر
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }]
            }
          ]
        }),
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: data.candidates[0].content.parts[0].text.trim()
      };
    }

    if (data.error?.message) {
      return {
        statusCode: 500,
        body: `هەڵەی گووگڵ: ${data.error.message}`
      };
    }

    return {
      statusCode: 500,
      body: 'هەڵە لە وەرگرتنەوەی ئەنجام'
    };

  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return {
      statusCode: 500,
      body: isTimeout ? 'کاتی وەڵامدانەوە بەسەرچوو، تکایە کلیلەکەت بپشکنە.' : `هەڵەی سیستەم: ${error.message}`
    };
  }
};
