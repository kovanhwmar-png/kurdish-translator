exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const { text, direction, tone } = JSON.parse(event.body || '{}');

    if (!text) {
      return { statusCode: 400, body: 'تکایە دەقێک بنووسە' };
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    const toneInstructions = {
      natural: 'سروشتی، ڕۆژانە و گفتوگۆیی',
      formal: 'فەرمی، ئەکادیمی و پڕۆفیشناڵ',
      street: 'کۆڵانی، بازاڕی و سلانگ',
      literary: 'ئەدەبی، شاعیرانە و قووڵ'
    };

    const selectedTone = toneInstructions[tone] || 'سروشتی';

    let promptText = '';

    if (direction === 'ku-to-en') {
      promptText = `You are an expert Kurdish linguist and translator specialized in all Kurdish dialects (Sorani: Erbil/Hawleri, Sulaymaniyah, and Kurmanji/Badini) including local street slang and idioms.
Task: Translate the following Kurdish text into accurate English with a ${selectedTone} tone.
Important rules:
1. Deeply understand Kurdish idioms, slang, and dialectal variations (whether Erbil, Sulaymani, or Badini slang).
2. Output ONLY the English translation. Do NOT add notes, explanations, or quotes.

Kurdish input:
${text}`;
    } else {
      promptText = `تۆ زمانزانێکی پسپۆڕی زمانی کوردییت. ئەم دەقە ئینگلیزییە وەربگێڕە بۆ کوردی بە شێوازی ${selectedTone}.
دەبێت ڕەچاوی دەربڕینی ڕەسەنی کوردی بکەیت.
تەنها دەقی وەرگێڕدراوی کوردی بنووسە بەبێ هیچ ڕوونکردنەوە و تێبینییەکی زیادە.

دەقی ئینگلیزی:
${text}`;
    }

    let lastError = '';

    // هەوڵی یەکەم: بەکارهێنانی مۆدێلە مۆدێرنەکانی گووگڵ جێمینای
    if (geminiKey) {
      const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];
      for (const model of models) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { temperature: 0.3 }
              })
            }
          );

          const data = await res.json();
          if (res.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'text/plain; charset=utf-8' },
              body: data.candidates[0].content.parts[0].text.trim()
            };
          } else if (data.error?.message) {
            lastError = `گووگڵ (${model}): ${data.error.message}`;
          }
        } catch (e) {
          lastError = `گووگڵ: ${e.message}`;
        }
      }
    }

    // هەوڵی دووەم (Fallback): کاتێک گووگڵ دانەخرێت یان ئۆڤەرلۆد بێت، ChatGPT وەریدەگێڕێت
    if (openaiKey) {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an elite Kurdish-English translator.' },
              { role: 'user', content: promptText }
            ],
            temperature: 0.3
          })
        });

        const data = await res.json();
        if (res.ok && data.choices?.[0]?.message?.content) {
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
            body: data.choices[0].message.content.trim()
          };
        } else if (data.error?.message) {
          lastError += ` | ئۆپن ئەی ئای: ${data.error.message}`;
        }
      } catch (e) {
        lastError += ` | ئۆپن ئەی ئای: ${e.message}`;
      }
    }

    return {
      statusCode: 500,
      body: `هەڵە: ${lastError || 'سێرڤەر وەڵامی نەدایەوە'}`
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: `هەڵەی ناوخۆیی: ${error.message}`
    };
  }
};
