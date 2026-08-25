// api/get-users.js
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'توکن گیت‌هاب تنظیم نشده است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = 'data/active';

  try {
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

    const rawUsers = [];

    // دریافت محتوای همه فایل‌ها
    for (const file of jsonFiles) {
      try {
        const fileRes = await fetch(file.download_url);
        const userData = await fileRes.json();
        rawUsers.push(userData);
      } catch (e) {
        console.error('Error parsing file:', file.name, e);
      }
    }

    // مرتب‌سازی بر اساس تاریخ ثبت‌نام (از قدیمی به جدید)
    rawUsers.sort((a, b) => {
      const dateA = new Date(a.registrationDate || 0);
      const dateB = new Date(b.registrationDate || 0);
      return dateA - dateB;
    });

    // محاسبه خودکار نشان بر اساس رتبه ثبت‌نام
    const users = rawUsers.map((user, index) => {
      const rank = index + 1;
      let badge = 'bronze';
      if (rank <= 200) badge = 'golden';
      else if (rank <= 1000) badge = 'silver';
      
      return {
        ...user,
        rank: rank,
        badge: badge // بازنویسی نشان بر اساس رتبه واقعی
      };
    });

    // محاسبه آمار
    const stats = {
      total: users.length,
      golden: users.filter(u => u.badge === 'golden').length,
      silver: users.filter(u => u.badge === 'silver').length,
      bronze: users.filter(u => u.badge === 'bronze').length,
      approved: users.filter(u => u.status === 'approved').length,
      rejected: users.filter(u => u.status === 'rejected').length,
      pending: users.filter(u => u.status === 'pending' || !u.status).length
    };

    // محاسبه آمار بر اساس کشور
    const countryStats = {};
    users.forEach(user => {
      const country = user.country || 'نامشخص';
      if (!countryStats[country]) {
        countryStats[country] = {
          country: country,
          countryCode: user.countryCode || 'XX',
          count: 0,
          users: []
        };
      }
      countryStats[country].count++;
      countryStats[country].users.push({
        cardCode: user.cardCode,
        name: user.nameFa || user.nameEn || '---',
        badge: user.badge
      });
    });

    // تبدیل به آرایه و مرتب‌سازی بر اساس تعداد
    const countries = Object.values(countryStats).sort((a, b) => b.count - a.count);

    return res.status(200).json({ users, stats, countries });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
