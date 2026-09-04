// api/get-users.js
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

    // ===== ۱. دریافت index.json =====
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

    // ===== ۲. غنی‌سازی داده‌ها از data/active =====
    const allUsers = [];
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

      allUsers.push(userProfile);
      
      // ===== کاربران فعال (approved یا active) =====
      if (userProfile.status === 'active' || userProfile.status === 'approved') {
        activeUsers.push(userProfile);
      }
    }

    // ===== ۳. مرتب‌سازی =====
    allUsers.sort((a, b) => new Date(b.registrationDate) - new Date(a.registrationDate));
    
    // مرتب‌سازی فعال‌ها برای تعیین نشان
    activeUsers.sort((a, b) => {
      const dateA = new Date(a.registrationDate || 0);
      const dateB = new Date(b.registrationDate || 0);
      return dateA - dateB;
    });

    // ===== ۴. محاسبه آمار و نشان‌ها =====
    let stats = { total: activeUsers.length, golden: 0, silver: 0, bronze: 0 };
    const galleryAllowedIds = new Set();

    activeUsers.forEach((u, index) => {
      const rank = index + 1;
      u.rank = rank;
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
      } else {
        u.badge = 'bronze';
        stats.bronze++;
      }
    });

    // ===== ۵. آمار کشورها =====
    const countryMap = {};
    activeUsers.forEach(u => {
      const country = u.country || 'Unknown';
      if (!countryMap[country]) {
        countryMap[country] = { country: country, count: 0, users: [] };
      }
      countryMap[country].count++;
      countryMap[country].users.push({
        cardCode: u.cardCode,
        rank: u.rank,
        badge: u.badge
      });
    });
    const countries = Object.values(countryMap).sort((a, b) => b.count - a.count);

    // ===== ۶. دریافت درخواست‌ها =====
    let requests = [];
    const requestsPath = 'data/requests';
    try {
      const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestsPath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (listRes.ok) {
        const files = await listRes.json();
        const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));
        for (const file of jsonFiles.slice(-100)) {
          try {
            const contentRes = await fetch(file.url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (contentRes.ok) {
              const fileData = await contentRes.json();
              const requestData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
              requests.push(requestData);
            }
          } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }

    // ===== ۷. دریافت دستاوردهای تاییدشده =====
    const achievements = [];
    activeUsers.forEach(u => {
      if (galleryAllowedIds.has(u.cardCode) && u.achievements && Array.isArray(u.achievements)) {
        u.achievements.forEach(ach => {
          if (ach.status === 'approved') {
            achievements.push({
              ...ach,
              owner: u.cardCode,
              ownerRank: u.rank,
              ownerBadge: u.badge
            });
          }
        });
      }
    });

    // ===== ۸. دریافت مشاهدات =====
    let observations = [];
    try {
      const obsRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?labels=observation&state=all&per_page=100`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      if (obsRes.ok) {
        const issues = await obsRes.json();
        observations = issues.map(issue => {
          const labels = issue.labels.map(l => l.name);
          let status = 'pending';
          if (labels.includes('approved')) status = 'approved';
          else if (labels.includes('rejected')) status = 'rejected';
          
          // استخراج کد کارت از body
          let cardCode = 'ناشناس';
          const bodyLines = issue.body?.split('\n') || [];
          for (const line of bodyLines) {
            if (line.includes('**کد کارت:**')) {
              cardCode = line.replace('**کد کارت:**', '').trim();
              break;
            }
          }
          
          return {
            number: issue.number,
            cardCode: cardCode,
            status: status,
            title: issue.title,
            body: issue.body,
            createdAt: issue.created_at,
            url: issue.html_url
          };
        });
      }
    } catch (e) { /* ignore */ }

    // ===== ۹. بازگشت پاسخ =====
    return res.status(200).json({
      users: allUsers,
      activeUsers: activeUsers,
      stats: {
        total: stats.total,
        golden: stats.golden,
        silver: stats.silver,
        bronze: stats.bronze,
        pending: allUsers.filter(u => u.status === 'pending' || u.status === 'pending_edit').length,
        approved: allUsers.filter(u => u.status === 'approved' || u.status === 'active').length,
        rejected: allUsers.filter(u => u.status === 'rejected').length
      },
      countries: countries,
      requests: requests,
      achievements: achievements,
      observations: observations
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
