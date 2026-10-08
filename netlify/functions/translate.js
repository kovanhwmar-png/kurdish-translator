export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { text, sourceLang, tone } = await req.json();

    if (!text || !sourceLang || !tone) {
      return new Response('Missing required fields', { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response('API key not configured', { status: 500 });
    }

    const toneInstructions = {
      natural: 'بە شێوازێکی سروشتی و ئاسایی کە لە ژیانی ڕۆژانەدا بەکاردێت',
      formal: 'بە شێوازێکی فەرمی و ئەکادیمی بە ڕێزدارانە',
      street: 'بە شێوازێکی کۆڵانی و سلانگی نوێ کە گەنجان بەکاری دەهێنن',
      literary: 'بە شێوازێکی ئەدەبی و هونەری بە وشە جوانەکان'
    };

    const prompt = `تۆ وەرگێڕێکی پسپۆڕی بۆ زمانی کوردیی سۆرانی (ناوەڕاستی عێراق). ئەرکت ئەوەیە کە دەقی خوارەوە لە ${sourceLang === 'en' ? 'ئینگلیزی' : 'عەرەبی'} بۆ کوردیی سۆرانی بگێڕیتەوە ${toneInstructions[tone]}.
ڕێنماییە گرنگەکان:
- تەنها دەقی وەرگێڕدراو بنووسە، هیچ زیادەیەکی تر مەنووسە
- لە ئەلفوبێی کوردیی عەرەبی (یونیکۆد) بەکاری بهێنە
- ژمارەکان بە ژمارەی عەرەبی-ھیندی (١ ٢ ٣) بنووسە
- بیرکردنەوەی قووڵ بەکاربهێنە بۆ گەیاندنی واتای ڕاست نەک وشە بە وشە
- کەلتووری کوردی لە بەرچاو بگرە
- ئەگەر دەقەکە پرسیارێکە، وەڵامی مەدەرەوە، تەنها بیگێڕەوە
دەقەکە:
${text}
وەرگێڕانی کوردی:`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: tone === 'literary' ? 0.9 : tone === 'street' ? 0.85 : 0.7,
            maxOutputTokens: 2048,
          }
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const translation = data.candidates?.[0]?.content?.parts?.[0]?.text || 'هەڵەیەک ڕوویدا';

    return new Response(translation.trim(), {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error) {
    console.error('Translation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
};
