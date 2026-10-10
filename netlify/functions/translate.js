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

    if (!geminiKey) {
      return {
        statusCode: 500,
        body: 'هەڵە: کلیلی GEMINI_API_KEY لە سێرڤەر بوونی نییە'
      };
    }

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
Rules:
1. Deeply understand Kurdish idioms, slang, and dialectal variations (Erbil, Sulaymani, Badini).
2. Output ONLY the English translation without quotes, notes, or extra commentary.

Kurdish text:
${text}`;
    } else {
      promptText = `تۆ زمانزانێکی لێهاتووی زمانی کوردییت. ئەم دەقە ئینگلیزییە وەربگێڕە بۆ کوردی بە شێوازی ${selectedTone}.
تەنها دەقی وەرگێڕدراوی کوردی بنووسە بەبێ هیچ تێبینی و ڕوونکردنەوەیەکی زیادە.

دەقی ئینگلیزی:
${text}`;
    }

    // بەکارهێنانی مۆدێلی نوێی فەرمی gemini-3.8-flash
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.3
          }
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
    }

    return {
      statusCode: 500,
      body: `هەڵەی گووگڵ: ${data.error?.message || 'وەرگێڕان ئەنجام نەدرا'}`
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: `هەڵەی سیستەم: ${error.message}`
    };
  }
};
