// api/get-users.js
export default async function handler(req, res) {
  // فقط درخواست‌های GET را قبول می‌کنیم
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'توکن گیت‌هاب در Vercel تنظیم نشده است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = 'data/active';

  try {
    // ۱. دریافت لیست فایل‌های پوشه active
    const listResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!listResponse.ok) {
      throw new Error(`GitHub API Error: ${listResponse.status}`);
    }

    const files = await listResponse.json();
    const jsonFiles = files.filter(f => f.name.endsWith('.json'));

    const users = [];
    let stats = { total: 0, golden: 0, silver: 0, bronze: 0 };

    // ۲. دریافت محتوای هر فایل JSON به صورت جداگانه (از طریق download_url)
    for (const file of jsonFiles) {
      try {
        const fileRes = await fetch(file.download_url);
        const userData = await fileRes.json();
        
        users.push(userData);
        stats.total++;
        
        if (userData.badge === 'golden') stats.golden++;
        else if (userData.badge === 'silver') stats.silver++;
        else if (userData.badge === 'bronze') stats.bronze++;
      } catch (e) {
        console.error('Error parsing file:', file.name, e);
      }
    }

    // ۳. ارسال داده‌ها به admin.html
    return res.status(200).json({ users, stats });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
