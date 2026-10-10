exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: 'Method not allowed'
    };
  }

  try {
    const { text, sourceLang, tone } = JSON.parse(event.body || '{}');

    if (!text) {
      return {
        statusCode: 400,
        body: 'تکایە دەقێک بنووسە'
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: 'کلیلی GEMINI_API_KEY لە سێرڤەر نەدۆزرایەوە'
      };
    }

    const toneInstructions = {
      natural: 'سروشتی و ئاسایی',
      formal: 'فەرمی و ئەکادیمی',
      street: 'کۆڵانی و سلانگ',
      literary: 'ئەدەبی و شاعیرانە'
    };

    const selectedTone = toneInstructions[tone] || 'سروشتی';
    const fromLanguage = sourceLang === 'ar' ? 'عەرەبی' : 'ئینگلیزی';

    const promptText = `تۆ وەرگێڕێکی لێهاتووی. ئەم دەقەی خوارەوە لە زمانی ${fromLanguage} وەربگێڕە بۆ زمانی کوردیی سۆرانی بە شێوازی ${selectedTone}.
تەنها و تەنها دەقی وەرگێڕدراوی کوردی بنووسە بەبێ هیچ ڕوونکردنەوە و دەقی زیادە.

دەق:
${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: promptText }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `هەڵەی گووگڵ: ${data?.error?.message || response.statusText}`
      };
    }

    const translation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'وەرگێڕان بەردەست نەبوو';

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8'
      },
      body: translation.trim()
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: `هەڵەی سێرڤەر: ${error.message}`
    };
  }
};
