// api/deep-analysis.js
import { Groq } from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { observation, userCountry, relatedObservations } = req.body;

    // بارگذاری دانش پایه (سند آزمایشگاه سپهر خردمندی)
    const SEPEHR_KNOWLEDGE_BASE = `
      [متن کامل سند آزمایشگاه سپهر خردمندی و الحاقیه ۱ که قبلاً استخراج کردیم]
      ...
    `;

    const prompt = `
      تو "تحلیلگر ارشد آزمایشگاه سپهر خردمندی" هستی.
      کشور کاربر: ${userCountry || 'Unknown'} (تحلیل را با توجه به فرهنگ و واقعیت‌های این منطقه بومی‌سازی کن).
      
      وظیفه تو تبدیل این مشاهده خام به یک "پرونده ظهور" استاندارد است.
      از فیلترهای ۱۰ گانه (تعلیق معنا، ردیابی گسست، لایه‌برداری معنایی، و...) استفاده کن.
      
      خروجی باید فقط یک JSON باشد:
      {
        "cluster": "human" | "knowledge" | "governance" | "survival",
        "raw_emergence": ["ظهور ۱", "ظهور ۲", "ظهور ۳"],
        "matrix_layers": { "individual": "...", "social": "...", "institutional": "...", "civilizational": "..." },
        "connections": "...",
        "scale": "...",
        "neglected_capacity": ["...", "..."],
        "deep_insight": "...",
        "connection_logic": "...",
        "guide_individual": "...",
        "guide_network": "...",
        "guide_policy": "..."
      }
    `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SEPEHR_KNOWLEDGE_BASE },
        { role: 'user', content: prompt }
      ],
      model: 'qwen-2.5-72b',
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    });

    const analysis = JSON.parse(chatCompletion.choices[0]?.message?.content || '{}');

    return res.status(200).json({ success: true, analysis });

  } catch (error) {
    console.error('Deep Analysis Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
