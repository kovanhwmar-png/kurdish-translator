exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { text, targetLang, tone } = JSON.parse(event.body || '{}');

    if (!text) {
      return { statusCode: 400, body: 'تکایە دەقێک بنووسە' };
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return { statusCode: 500, body: 'هەڵە: کلیلی GEMINI_API_KEY دانەنراوە' };
    }

    const toneInstructions = {
      natural: 'سروشتی، ڕۆژانە و ئاسایی',
      formal: 'فەرمی، نووسراوەیی و ئەکادیمی',
      street: 'کۆڵانی، بازاڕی و سلانگ',
      literary: 'ئەدەبی و شاعیرانە'
    };

    const selectedTone = toneInstructions[tone] || 'سروشتی';
    const isEnglish = targetLang === 'en';

    const promptText = isEnglish
      ? `You are an elite Kurdish-English linguist. Translate this Kurdish text (accurately handling Sorani: Hawleri, Sulaymani, and Kurmanji/Badini slang and idioms) into English with a ${selectedTone} tone. Output ONLY the translated text, no quotes or notes:\n\n${text}`
      : `تۆ وەرگێڕێکی پسپۆڕیت. ئەم دەقە کوردییە وەربگێڕە بۆ زمانی عەرەبی بە شێوازی ${selectedTone}. تەنها دەقی وەرگێڕدراو بنووسە:\n\n${text}`;

    // بەکارهێنانی مۆدێلی نوێی داواکراو
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: promptText }]
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

    return {
      statusCode: 500,
      body: `هەڵەی گووگڵ: ${data.error?.message || 'وەرگێڕان ئەنجام نەدرا'}`
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: `هەڵە: ${error.message}`
    };
  }
};
