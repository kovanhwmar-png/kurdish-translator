export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { text, sourceLang, tone } = await req.json();

    if (!text) {
      return new Response('تکایە دەقێک بنووسە', { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response('کلیلی GEMINI_API_KEY لە سێرڤەر نەدۆزرایەوە', { status: 500 });
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
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
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
      return new Response(`هەڵەی گووگڵ:
