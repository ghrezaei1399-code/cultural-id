export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  try {
    const data = req.body;

    // تشخیص کشور از IP
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
        console.warn('IP detection failed:', e.message);
      }
    }

    // تولید کد کارت
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    const part3 = Math.floor(10000 + Math.random() * 90000);
    const cardCode = `CIM-${part1}-${part2}-${part3}`;

    // محاسبه رتبه
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
      console.warn('Rank calculation failed:', e.message);
    }

    // ساخت داده‌های کاربر
    const optionalCode = data.optionalCode ? String(data.optionalCode).trim() : '';
    const displayCode = optionalCode 
      ? `CIM - ${part1} - ${part2} - ${optionalCode}` 
      : `CIM - ${part1} - ${part2}`;

    const userData = {
      cardCode: cardCode,
      country: country,
      countryCode: countryCode,
      rank: rank,
      values: Array.isArray(data.values) ? data.values : [],
      priorities: Array.isArray(data.priorities) && data.priorities.length === 7 ? data.priorities : [],
      optionalCode: optionalCode,
      displayCode: displayCode,
      communicationEmail: data.communicationEmail ? String(data.communicationEmail).trim() : '',
      registrationDate: new Date().toISOString(),
      status: 'pending',
      allowConnection: !!data.communicationEmail,
      allowAchievements: false,
      culturalInfo: data.culturalInfo || ''
    };

    // ذخیره فایل کاربر در گیت‌هاب
    const userPath = `data/active/${cardCode}.json`;
    const userContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');

    const userCommit = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Register new user: ${cardCode} from ${country}`,
        content: userContent,
        branch: 'main'
      })
    });

    if (!userCommit.ok) {
      throw new Error(`GitHub Error: ${userCommit.status}`);
    }

    // ⭐ آپدیت خودکار index.json
    const indexPath = 'data/index.json';
    
    // خواندن index.json فعلی
    const indexResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    let indexData = [];
    let indexSha = null;

    if (indexResponse.ok) {
      const indexFile = await indexResponse.json();
      indexSha = indexFile.sha;
      const jsonString = Buffer.from(indexFile.content, 'base64').toString('utf8');
      indexData = JSON.parse(jsonString);
    }

    // اضافه کردن کاربر جدید به فهرست
    indexData.push({
      cardCode: cardCode,
      optionalCode: optionalCode,
      displayCode: displayCode,
      status: 'pending',
      rank: rank,
      country: country,
      registrationDate: userData.registrationDate
    });

    // ذخیره index.json جدید
    const newIndexContent = Buffer.from(JSON.stringify(indexData, null, 2), 'utf8').toString('base64');
    
    const indexCommitBody = {
      message: `Add user ${cardCode} to index`,
      content: newIndexContent,
      branch: 'main'
    };
    
    if (indexSha) {
      indexCommitBody.sha = indexSha;
    }

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(indexCommitBody)
    });

    return res.status(200).json({
      success: true,
      cardCode: cardCode,
      displayCode: displayCode,
      country: country,
      rank: rank,
      message: 'ثبت‌نام با موفقیت انجام شد و در انتظار تأیید ادمین است.'
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
