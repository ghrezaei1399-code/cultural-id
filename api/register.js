export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'تنظیمات سرور ناقص است (GH_TOKEN)' });
  }

  try {
    const data = req.body;

    // ۱. تشخیص کشور از IP (با Fallback)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress;
    let country = 'Global';
    let countryCode = 'XX';

    if (ip && ip !== '::1' && !ip.startsWith('127.0.0.1')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const ipResponse = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          if (ipData.success) {
            country = ipData.country || 'Global';
            countryCode = ipData.country_code || 'XX';
          }
        }
      } catch (e) {
        console.warn('IP detection failed, using fallback:', e.message);
        // ثبت‌نام متوقف نمی‌شود، فقط کشور پیش‌فرض ثبت می‌شود
      }
    }

    // ۲. تولید کد کارت ۳ بخشی امن
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    const part3 = Math.floor(10000 + Math.random() * 90000);
    const cardCode = `CIM-${part1}-${part2}-${part3}`;

    // ۳. محاسبه رتبه در زمان ثبت‌نام (نه در زمان نمایش)
    let rank = 1;
    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    try {
      const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (listRes.ok) {
        const files = await listRes.json();
        if (Array.isArray(files)) {
          rank = files.filter(f => f.name.endsWith('.json')).length + 1;
        }
      }
    } catch (e) {
      console.warn('Rank calculation failed, using default:', e.message);
    }

    // ۴. ساخت داده‌های کاربر (با ذخیره رتبه)
    const userData = {
      cardCode: cardCode,
      country: country,
      countryCode: countryCode,
      rank: rank,
      values: Array.isArray(data.values) ? data.values : [],
      optionalCode: data.optionalCode || '',
      communicationEmail: data.communicationEmail || '',
      registrationDate: new Date().toISOString(),
      status: 'active',
      allowConnection: !!data.communicationEmail,
      allowAchievements: false,
      culturalInfo: data.culturalInfo || ''
    };

    // ۵. ارسال به گیت‌هاب
    const path = `data/active/${cardCode}.json`;
    const content = Buffer.from(JSON.stringify(userData, null, 2)).toString('base64');

    const commitData = {
      message: `Register new user: ${cardCode} from ${country} (Rank #${rank})`,
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
      throw new Error(`GitHub Error: ${commitResponse.status}`);
    }

    return res.status(200).json({
      success: true,
      cardCode: cardCode,
      country: country,
      rank: rank,
      message: 'ثبت‌نام با موفقیت انجام شد'
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
