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

    const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    const files = await listRes.json();
    const jsonFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.json')) : [];

    const usersWithDates = [];
    for (const f of jsonFiles) {
      try {
        const res = await fetch(f.download_url);
        const d = await res.json();
        usersWithDates.push({ name: f.name, date: new Date(d.registrationDate || 0).getTime() });
      } catch (e) {}
    }

    usersWithDates.sort((a, b) => a.date - b.date);
    const userIndex = usersWithDates.findIndex(u => u.name === `${code}.json`);
    const rank = userIndex !== -1 ? userIndex + 1 : usersWithDates.length;
    
    let badge = 'bronze';
    if (rank <= 200) badge = 'golden';
    else if (rank <= 1000) badge = 'silver';

    // بازگرداندن فقط فیلدهای مورد نیاز کارت
    return res.status(200).json({ 
      user: {
        cardCode: userData.cardCode,
        country: userData.country,
        rank: rank,
        badge: badge,
        optionalCode: userData.optionalCode,
        values: Array.isArray(userData.values) ? userData.values : []
      } 
    });

  } catch (error) {
    console.error('Get User Error:', error);
    return res.status(500).json({ error: 'خطای داخلی سرور' });
  }
}
