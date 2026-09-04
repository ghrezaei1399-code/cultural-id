module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  try {
    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // ===== بخش ۱: دریافت و پردازش index.json =====
    const usersPath = 'data/index.json';
    const usersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${usersPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let users = [];
    
    if (usersRes.ok) {
      const usersDataRaw = await usersRes.json();
      const parsedContent = JSON.parse(Buffer.from(usersDataRaw.content, 'base64').toString('utf8'));
      
      if (Array.isArray(parsedContent)) {
        users = parsedContent;
      } else {
        users = parsedContent.users || [];
      }
    }

    // ===== بخش ۲: غنی‌سازی داده‌ها از پوشه data/active =====
    const enrichedUsers = [];
    for (const user of users) {
      let userProfile = { ...user };
      try {
        const fileName = `${user.cardCode}.json`;
        const profileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active/${fileName}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const fullProfile = JSON.parse(Buffer.from(profileData.content, 'base64').toString('utf8'));
          userProfile = { ...userProfile, ...fullProfile };
        }
      } catch (e) {
        // اگر فایل تکی وجود نداشت، ادامه می‌دهیم
      }
      enrichedUsers.push(userProfile);
    }

    // مرتب‌سازی بر اساس rank برای تعیین دقیق نشان‌ها
    enrichedUsers.sort((a, b) => a.rank - b.rank);

    // ===== بخش ۳: اعمال قوانین نشان‌ها و آمار =====
    let stats = { total: enrichedUsers.length, golden: 0, silver: 0, bronze: 0 };
    const galleryAllowedIds = new Set();

    enrichedUsers.forEach((u, index) => {
      const rank = index + 1; // رتبه واقعی بر اساس ترتیب لیست
      
      if (rank <= 200) {
        u.badge = 'golden';
        stats.golden++;
        galleryAllowedIds.add(u.cardCode); // فقط ۲۰۰ نفر اول مجاز به نمایش در گالری
      } else if (rank <= 1000) {
        u.badge = 'silver';
        stats.silver++;
      } else if (rank <= 10000) {
        u.badge = 'bronze';
        stats.bronze++;
      } else {
        u.badge = 'member'; // یا هر عنوان دیگری برای ranks بالاتر
      }
    });

    // محاسبه آمار کشورها
    const countryMap = {};
    enrichedUsers.forEach(u => {
      if (u.country) {
        if (!countryMap[u.country]) countryMap[u.country] = { country: u.country, count: 0, users: [] };
        countryMap[u.country].count++;
        countryMap[u.country].users.push({ cardCode: u.cardCode, rank: u.rank, badge: u.badge });
      }
    });
    const countries = Object.values(countryMap).sort((a, b) => b.count - a.count);

    // ===== بخش ۴: دریافت درخواست‌ها =====
    let requests = [];
    const requestsPath = 'data/requests';
    try {
      const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestsPath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (listRes.ok) {
        const files = await listRes.json();
        const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));
        for (const file of jsonFiles.slice(-50)) {
          const contentRes = await fetch(file.url, { headers: { 'Authorization': `Bearer ${token}` } });
          if (contentRes.ok) {
            const fileData = await contentRes.json();
            requests.push(JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8')));
          }
        }
      }
    } catch (e) { console.error('Requests error:', e); }

    // ===== ارسال نهایی =====
    return res.status(200).json({
      users: enrichedUsers,
      stats, // آمار اصلاح شده با قوانین جدید
      countries,
      requests,
      achievements: enrichedUsers.flatMap(u => {
        // فقط دستاوردهای تایید شده‌ی ۲۰۰ نفر اول را برمی‌گرداند
        if (galleryAllowedIds.has(u.cardCode) && u.achievements) {
          return u.achievements.filter(a => a.status === 'approved');
        }
        return [];
      })
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
