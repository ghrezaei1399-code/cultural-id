// api/register.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'توکن گیت‌هاب تنظیم نشده است' });
  }

  try {
    const data = req.body;
    
    // ===== تشخیص کشور از IP =====
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    let country = 'نامشخص';
    let countryCode = 'XX';
    
    try {
      const ipResponse = await fetch(`https://ipapi.co/${ip}/json/`);
      if (ipResponse.ok) {
        const ipData = await ipResponse.json();
        country = ipData.country_name || 'نامشخص';
        countryCode = ipData.country_code || 'XX';
      }
    } catch (e) {
      console.error('Error fetching IP location:', e);
    }

    // ===== تولید کد کارت 3 بخشی =====
    const part1 = Math.floor(1000 + Math.random() * 9000); // 4 رقم
    const part2 = Math.floor(1000 + Math.random() * 9000); // 4 رقم
    const part3 = Math.floor(10000 + Math.random() * 90000); // 5 رقم
    const cardCode = `CIM-${part1}-${part2}-${part3}`;

    // ===== ساخت داده کاربر (فقط اطلاعات فرهنگی) =====
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
      allowAchievements: false, // بعداً توسط ادمین تعیین می‌شود
      culturalInfo: data.culturalInfo || ''
    };

    // ===== Commit به گیت‌هاب =====
    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const path = `data/active/${cardCode}.json`;
    const content = Buffer.from(JSON.stringify(userData, null, 2)).toString('base64');

    // دریافت SHA فایل (اگر وجود داشته باشد)
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
      // فایل وجود ندارد، مشکلی نیست
    }

    // ساخت Commit
    const commitData = {
      message: `Register new user: ${cardCode}`,
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
      message: 'ثبت‌نام با موفقیت انجام شد'
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
