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

    // ===== بخش ۱: دریافت و پردازش هوشمند index.json =====
    const usersPath = 'data/index.json';
    const usersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${usersPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let users = [];
    let originalData = {};

    if (usersRes.ok) {
      const usersDataRaw = await usersRes.json();
      const parsedContent = JSON.parse(Buffer.from(usersDataRaw.content, 'base64').toString('utf8'));
      
      // تشخیص ساختار: آیا فایل یک آرایه است یا یک آبجکت با کلید users؟
      if (Array.isArray(parsedContent)) {
        users = parsedContent;
        originalData = { users: parsedContent }; // نرمال‌سازی برای سازگاری با فرانت‌اند
      } else {
        users = parsedContent.users || [];
        originalData = parsedContent;
      }
    }

    // ===== بخش ۲: غنی‌سازی داده‌ها از پوشه data/active (برای یافتن دستاوردها) =====
    // این بخش حیاتی است چون index.json شما فعلاً achievements ندارد
    const enrichedUsers = [];
    for (const user of users) {
      let userProfile = { ...user };
      try {
        // تلاش برای خواندن پروفایل کامل از پوشه active بر اساس cardCode
        // نام فایل معمولاً cardCode.json است
        const fileName = `${user.cardCode}.json`;
        const profileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active/${fileName}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          const fullProfile = JSON.parse(Buffer.from(profileData.content, 'base64').toString('utf8'));
          // ادغام دستاوردها و سایر اطلاعات از فایل تکی
          userProfile = { ...userProfile, ...fullProfile };
        }
      } catch (e) {
        // اگر فایل تکی وجود نداشت، همان اطلاعات index.json استفاده می‌شود
      }
      enrichedUsers.push(userProfile);
    }

    // محاسبه آمار
    const stats = {
      total: enrichedUsers.length,
      golden: enrichedUsers.filter(u => u.badge === 'golden').length,
      silver: enrichedUsers.filter(u => u.badge === 'silver').length,
      bronze: enrichedUsers.filter(u => u.badge === 'bronze').length
    };

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

    // ===== بخش ۳: دریافت درخواست‌ها =====
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
      users: enrichedUsers, // ارسال کاربران غنی‌شده با دستاوردها
      stats,
      countries,
      requests,
      achievements: enrichedUsers.flatMap(u => u.achievements || []) // استخراج همه دستاوردها در یک آرایه مسطح
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
