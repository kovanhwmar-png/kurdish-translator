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

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

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

    // هەوڵی یەکەم: بەکارهێنانی مۆدێلی نوێی gemini-2.5-flash
    if (geminiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptText }] }],
              generationConfig: {
                temperature: 0.3,
                maxOutputTokens: 2048,
              }
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const translated = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (translated) {
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
              body: translated.trim()
            };
          }
        }
      } catch (err) {
        console.log('Gemini error, switching to fallback...');
      }
    }

    // گۆڕینی خۆکارانە بۆ OpenAI ئەگەر گووگڵ پەستان یان هەڵەی هەبوو
    if (openaiKey) {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'تۆ وەرگێڕێکی زمانزانی لێهاتووی زمانی کوردیی سۆرانیت.'
            },
            {
              role: 'user',
              content: promptText
            }
          ],
          temperature: 0.3
        })
      });

      if (openaiRes.ok) {
        const openaiData = await openaiRes.json();
        const translated = openaiData.choices?.[0]?.message?.content;
        if (translated) {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: translated.trim()
          };
        }
      }
    }

    return {
      statusCode: 503,
      body: 'سێرڤەرەکان لەم ساتەدا سەرقاڵن، تکایە دوای چەند چرکەیەک هەوڵ بدەرەوە.'
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: `هەڵە: ${error.message}`
    };
  }
};
