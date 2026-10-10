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
      ? `تۆ وەرگێڕێکی کوردی و عەرەبیت. ئەم دەقە کوردییە وەربگێڕە بۆ زمانی عەرەبی بە شێوازی ${style}. تەنها دەقی وەرگێڕدراو بنووسە بەبێ هیچ ڕوونکردنەوەیەک:`
      : `You are an expert Kurdish linguist. Accurately translate this Kurdish text (Sorani, Hawleri, Sulaymani, and Badini dialects, idioms, and slang) into English with a ${style} tone. Output ONLY the translated text without quotes or notes:`;

    // بەکارهێنانی فەرمیی Interactions API بۆ gemini-3.8-flash
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        model: 'gemini-3.8-flash',
        input: `${systemPrompt}\n\n${text}`
      })
    });

    const data = await response.json();

    // وەرگرتنەوەی ئەنجام لە فۆرماتی نوێی Interactions API
    const result = data.output_text || data.output?.[0]?.content || data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (response.ok && result) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        body: result.trim()
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
      body: 'هەڵە لە وەرگرتنەوەی وەڵام'
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: `هەڵەی سێرڤەر: ${error.message}`
    };
  }
};
