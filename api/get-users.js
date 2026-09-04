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

    // ===== بخش ۱: دریافت index.json =====
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

    // ===== بخش ۲: غنی‌سازی و فیلتر کردن کاربران =====
    const activeUsers = [];
    const allUsersForAdmin = []; // شامل همه برای مدیریت ادمین

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

      // اضافه کردن به لیست کل برای ادمین (برای نمایش همه وضعیت‌ها)
      allUsersForAdmin.push(userProfile);

      // فقط کاربران active وارد محاسبات آماری و گالری می‌شوند
      if (userProfile.status === 'active') {
        activeUsers.push(userProfile);
      }
    }

    // مرتب‌سازی کاربران فعال بر اساس رتبه برای تعیین نشان
    activeUsers.sort((a, b) => a.rank - b.rank);

    // ===== بخش ۳: محاسبه آمار و تعیین نشان‌ها =====
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

    // محاسبه آمار کشورها (فقط برای کاربران فعال)
    const countryMap = {};
    activeUsers.forEach(u => {
      if (u.country) {
        if (!countryMap[u.country]) countryMap[u.country] = { country: u.country, count: 0, users: [] };
        countryMap[u.country].count++;
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

    // ===== بخش ۵: آماده‌سازی داده برای ادمین (مرتب‌سازی معکوس برای نمایش جدیدترین‌ها) =====
    // مرتب‌سازی بر اساس تاریخ ثبت نام (جدیدترین اول)
    allUsersForAdmin.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));

    // ===== ارسال نهایی =====
    return res.status(200).json({
      users: allUsersForAdmin, // لیست کامل برای ادمین (با آخرین وضعیت‌ها)
      activeUsers: activeUsers, // لیست فقط فعال‌ها برای گالری و کارت‌ها
      stats, // آمار دقیق فقط بر اساس فعال‌ها
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
