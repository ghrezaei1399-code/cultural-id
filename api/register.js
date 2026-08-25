// api/register.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'توکن گیت‌هاب تنظیم نشده است' });
  }

  try {
    const data = req.body;
    
    // ===== تشخیص کشور از IP (بهینه‌شده و پایدار) =====
    // استخراج IP واقعی کاربر از هدرهای درخواست
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    let country = 'نامشخص';
    let countryCode = 'XX';
    
    // اگر IP معتبر باشد (لوکال هاست نباشد)
    if (ip && ip !== '::1' && !ip.startsWith('127.0.0.1')) {
      try {
        // استفاده از سرویس رایگان و بدون محدودیت سخت‌گیرانه ipwho.is
        const ipResponse = await fetch(`https://ipwho.is/${ip}`);
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.success) {
            country = ipData.country || 'نامشخص';
            countryCode = ipData.country_code || 'XX';
          }
        }
      } catch (e) {
        console.error('Error fetching IP location:', e);
        // در صورت خطا، کشور همان "نامشخص" باقی می‌ماند
      }
    }

    // ===== تولید کد کارت ۳ بخشی =====
    const part1 = Math.floor(1000 + Math.random() * 9000); // ۴ رقم
    const part2 = Math.floor(1000 + Math.random() * 9000); // ۴ رقم
    const part3 = Math.floor(10000 + Math.random() * 90000); // ۵ رقم
    const cardCode = `CIM-${part1}-${part2}-${part3}`;

    // ===== ساخت داده کاربر (فقط اطلاعات فرهنگی و ناشناس) =====
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
      allowAchievements: false, // فقط ادمین می‌تواند این را برای ۲۰۰ نفر اول فعال کند
      culturalInfo: data.culturalInfo || ''
    };

    // ===== Commit به گیت‌هاب =====
    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const path = `data/active/${cardCode}.json`;
    const content = Buffer.from(JSON.stringify(userData, null, 2)).toString('base64');

    // بررسی وجود فایل (برای به‌روزرسانی)
    let sha = null;
    try {
      const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (fileRes.ok) {
        const fileData = await fileRes.json();
        sha = fileData.sha;
      }
    } catch (e) {
      // فایل وجود ندارد، مشکلی نیست (ثبت‌نام جدید)
    }

    // ساخت Commit
    const commitData = {
      message: `Register new user: ${cardCode} from ${country}`,
      content: content,
      branch: 'main'
    };
    if (sha) commitData.sha = sha;

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
      throw new Error(`GitHub API Error: ${commitResponse.status}`);
    }

    return res.status(200).json({ 
      success: true, 
      cardCode: cardCode,
      country: country,
      message: 'ثبت‌نام با موفقیت و به صورت ناشناس انجام شد'
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
