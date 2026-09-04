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

    // ===== دریافت index.json =====
    const usersPath = 'data/index.json';
    const usersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${usersPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let baseUsers = [];
    if (usersRes.ok) {
      const usersDataRaw = await usersRes.json();
      const parsedContent = JSON.parse(Buffer.from(usersDataRaw.content, 'base64').toString('utf8'));
      baseUsers = Array.isArray(parsedContent) ? parsedContent : (parsedContent.users || []);
    }

    // ===== غنی‌سازی داده‌ها از data/active =====
    const allUsersForAdmin = [];
    const activeUsers = [];

    for (const user of baseUsers) {
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
      } catch (e) { /* ignore */ }

      allUsersForAdmin.push(userProfile);
      if (userProfile.status === 'active' || userProfile.status === 'approved') {
        activeUsers.push(userProfile);
      }
    }

    // مرتب‌سازی برای ادمین: جدیدترین‌ها اول
    allUsersForAdmin.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
    
    // مرتب‌سازی فعال‌ها برای تعیین نشان: قدیمی‌ترین‌ها اول (بر اساس rank)
    activeUsers.sort((a, b) => a.rank - b.rank);

    // ===== محاسبه آمار و نشان‌ها =====
    let stats = { total: activeUsers.length, golden: 0, silver: 0, bronze: 0 };
    const galleryAllowedIds = new Set();

    activeUsers.forEach((u, index) => {
      const rank = index + 1;
      if (rank <= 200) {
        u.badge = 'golden';
        stats.golden++;
        galleryAllowedIds.add(u.cardCode);
      } else if (rank <= 1000) {
        u.badge = 'silver';
        stats.silver++;
      } else if (rank <= 10000) {
        u.badge = 'bronze';
        stats.bronze++;
      }
    });

    // آمار کشورها
    const countryMap = {};
    activeUsers.forEach(u => {
      if (u.country && u.country !== 'Unknown') {
        if (!countryMap[u.country]) countryMap[u.country] = { country: u.country, count: 0 };
        countryMap[u.country].count++;
      }
    });
    const countries = Object.values(countryMap).sort((a, b) => b.count - a.count);

    // ===== دریافت درخواست‌ها =====
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

    return res.status(200).json({
      users: allUsersForAdmin,
      activeUsers: activeUsers,
      stats,
      countries,
      requests,
      achievements: activeUsers.flatMap(u => {
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
