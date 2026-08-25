// api/register.js
export default async function handler(req, res) {
  // فقط درخواست‌های POST را قبول می‌کنیم
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // خواندن توکن از تنظیمات Vercel
  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'تنظیمات سرور ناقص است (GH_TOKEN)' });
  }

  try {
    const data = req.body;

    // ۱. تشخیص کشور از IP
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    let country = 'نامشخص';
    let countryCode = 'XX';

    if (ip && ip !== '::1' && !ip.startsWith('127.0.0.1')) {
      try {
        const ipResponse = await fetch(`https://ipwho.is/${ip}`);
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.success) {
            country = ipData.country || 'نامشخص';
            countryCode = ipData.country_code || 'XX';
          }
        }
      } catch (e) {
        console.error('IP Error:', e);
      }
    }

    // ۲. تولید کد کارت ۳ بخشی امن
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    const part3 = Math.floor(10000 + Math.random() * 90000);
    const cardCode = `CIM-${part1}-${part2}-${part3}`;

    // ۳. ساخت داده‌های کاربر
    const userData = {
      cardCode: cardCode,
      country: country,
      countryCode: countryCode,
      values: data.values || [],
      optionalCode: data.optionalCode || '',
      communicationEmail: data.communicationEmail || '',
      registrationDate: new Date().toISOString(),
      status: 'pending',
      allowConnection: !!data.communicationEmail,
      allowAchievements: false,
      culturalInfo: data.culturalInfo || ''
    };

    // ۴. ارسال به گیت‌هاب
    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const path = `data/active/${cardCode}.json`;

    // تبدیل به base64 برای گیت‌هاب
    const content = Buffer.from(JSON.stringify(userData, null, 2)).toString('base64');

    const commitData = {
      message: `Register new user: ${cardCode} from ${country}`,
      content: content,
      branch: 'main'
    };

    const commitResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(commitData)
    });

    if (!commitResponse.ok) {
      const errText = await commitResponse.text();
      throw new Error(`GitHub Error: ${commitResponse.status}`);
    }

    // ۵. پاسخ موفقیت‌آمیز به فرانت‌اند (با نام cardCode)
    return res.status(200).json({
      success: true,
      cardCode: cardCode,
      country: country,
      message: 'ثبت‌نام با موفقیت انجام شد'
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
