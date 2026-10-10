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

    const systemPrompt = targetLang === 'ar'
      ? `Translate this Kurdish text into Arabic in a ${style} tone. Provide ONLY the direct translation without any explanation:`
      : `You are a Kurdish linguist. Translate this Kurdish text (Sorani, Erbil, Sulaymani, Badini dialects and slang) into English in a ${style} tone. Provide ONLY the direct translation without quotes or notes:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: `${systemPrompt}\n\n${text}` }]
            }
          ]
        })
      }
    );

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
    return {
      statusCode: 500,
      body: `هەڵەی سیستەم: ${error.message}`
    };
  }
};
