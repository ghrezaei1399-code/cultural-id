// api/register.js
function normalizeDigits(str) {
  return String(str)
    .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error('GH_TOKEN is missing');
    return res.status(500).json({
      error: 'در حال حاضر امکان ثبت‌نام وجود ندارد. لطفاً چند دقیقه دیگر دوباره تلاش کنید یا با پشتیبانی در تماس باشید.'
    });
  }

  try {
    const { values, priorities, optionalCode, communicationEmail } = req.body;

    if (!values || !Array.isArray(values) || values.length < 7) {
      return res.status(400).json({ error: 'لطفاً تمام ۷ ارزش فرهنگی را وارد کنید.' });
    }

    const countryCode = req.headers['x-vercel-ip-country'] || 'XX';
    const countryMap = {
      'IR': 'Iran', 'US': 'United States', 'GB': 'United Kingdom',
      'DE': 'Germany', 'FR': 'France', 'CA': 'Canada',
      'AE': 'UAE', 'SA': 'Saudi Arabia', 'TR': 'Turkey',
      'IQ': 'Iraq', 'AF': 'Afghanistan', 'PK': 'Pakistan',
      'IN': 'India', 'CN': 'China', 'RU': 'Russia',
      'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands',
      'SE': 'Sweden', 'NO': 'Norway', 'AU': 'Australia',
      'JP': 'Japan', 'KR': 'South Korea', 'BR': 'Brazil'
    };
    const detectedCountry = countryMap[countryCode] || 'Other';

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    const rawCode = optionalCode && optionalCode.trim().length > 0
      ? optionalCode.trim()
      : String(Math.floor(10000 + Math.random() * 90000));
    const part3 = normalizeDigits(rawCode);
    const cardCode = `CIM-${part1}-${part2}-${part3}`;

    const userData = {
      cardCode,
      optionalCode: part3,
      values,
      priorities: Array.isArray(priorities) ? priorities.map(Number) : [1, 2, 3, 4, 5, 6, 7],
      communicationEmail: communicationEmail || null,
      registrationDate: new Date().toISOString(),
      status: 'approved',
      rank: 0,
      country: detectedCountry
    };

    // ===== ۱. ساخت فایل کاربر =====
    const userPath = `data/active/${cardCode}.json`;
    const userContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');

    const userPut = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `New registration: ${cardCode}`,
        content: userContent,
        branch: 'main'
      })
    });

    if (!userPut.ok) {
      const errText = await userPut.text();
      console.error('USER FILE PUT FAILED:', userPut.status, errText);
      return res.status(503).json({
        error: 'در حال حاضر سرور شلوغ است. لطفاً چند دقیقه دیگر دوباره تلاش کنید. اگر مشکل ادامه داشت، به ادمین اطلاع دهید.'
      });
    }

    // ===== ۲. آپدیت index.json =====
    const indexPath = 'data/index.json';
    let indexData = [];
    let sha = null;

    const indexRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!indexRes.ok) {
      console.error('INDEX READ FAILED:', indexRes.status);
      return res.status(503).json({
        error: 'در حال حاضر سرور شلوغ است. لطفاً چند دقیقه دیگر دوباره تلاش کنید. اگر مشکل ادامه داشت، به ادمین اطلاع دهید.',
        cardCode
      });
    }

    const indexFile = await indexRes.json();
    sha = indexFile.sha;
    indexData = JSON.parse(Buffer.from(indexFile.content, 'base64').toString('utf8'));

    if (!Array.isArray(indexData)) indexData = [];

    indexData.push({
      cardCode,
      optionalCode: part3,
      status: 'approved',
      rank: 0,
      country: detectedCountry,
      registrationDate: userData.registrationDate
    });

    const newIndexContent = Buffer.from(JSON.stringify(indexData, null, 2), 'utf8').toString('base64');

    const indexBody = {
      message: `Add user ${cardCode} to index`,
      content: newIndexContent,
      branch: 'main'
    };
    if (sha) indexBody.sha = sha;

    const indexPut = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(indexBody)
    });

    if (!indexPut.ok) {
      const errText = await indexPut.text();
      console.error('INDEX PUT FAILED:', indexPut.status, errText);
      return res.status(503).json({
        error: 'در حال حاضر سرور شلوغ است. لطفاً چند دقیقه دیگر دوباره تلاش کنید. اگر مشکل ادامه داشت، به ادمین اطلاع دهید.',
        cardCode
      });
    }

    return res.status(200).json({
      success: true,
      cardCode,
      country: detectedCountry,
      rank: 0,
      message: 'ثبت‌نام با موفقیت انجام شد و کارت شما فعال است.'
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(503).json({
      error: 'در حال حاضر سرور شلوغ است. لطفاً چند دقیقه دیگر دوباره تلاش کنید. اگر مشکل ادامه داشت، به ادمین اطلاع دهید.'
    });
  }
};
