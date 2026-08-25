export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'کد کارت الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/active/${code}.json`;

  try {
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!fileRes.ok) {
      return res.status(404).json({ error: 'کارت با این کد یافت نشد' });
    }

    const fileData = await fileRes.json();
    const content = Buffer.from(fileData.content, 'base64').toString('utf8');
    const userData = JSON.parse(content);

    // محاسبه نشان بر اساس رتبه ذخیره‌شده
    const rank = userData.rank || 1;
    let badge = 'bronze';
    if (rank <= 200) badge = 'golden';
    else if (rank <= 1000) badge = 'silver';

    // بازگرداندن فقط فیلدهای ضروری
    return res.status(200).json({ 
      user: {
        cardCode: userData.cardCode,
        country: userData.country || 'Global',
        rank: rank,
        badge: badge,
        optionalCode: userData.optionalCode || '',
        values: Array.isArray(userData.values) ? userData.values : []
      } 
    });

  } catch (error) {
    console.error('Get User Error:', error);
    return res.status(500).json({ error: 'خطای داخلی سرور' });
  }
}
