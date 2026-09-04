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

    // ===== بخش ۱: دریافت اطلاعات کاربران =====
    const usersPath = 'data/index.json';
    const usersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${usersPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let users = [];
    let stats = { total: 0, golden: 0, silver: 0, bronze: 0 };
    let countries = [];
    let originalData = {};

    if (usersRes.ok) {
      const usersDataRaw = await usersRes.json();
      originalData = JSON.parse(Buffer.from(usersDataRaw.content, 'base64').toString('utf8'));
      
      users = originalData.users || [];
      
      // محاسبه آمار دقیق
      stats.total = users.length;
      stats.golden = users.filter(u => u.badge === 'golden').length;
      stats.silver = users.filter(u => u.badge === 'silver').length;
      stats.bronze = users.filter(u => u.badge === 'bronze').length;

      // محاسبه آمار کشورها
      const countryMap = {};
      users.forEach(u => {
        if (u.country) {
          if (!countryMap[u.country]) countryMap[u.country] = { country: u.country, count: 0, users: [] };
          countryMap[u.country].count++;
          countryMap[u.country].users.push({ cardCode: u.cardCode, rank: u.rank, badge: u.badge });
        }
      });
      countries = Object.values(countryMap).sort((a, b) => b.count - a.count);
    }

    // ===== بخش ۲: دریافت لیست درخواست‌های حذف و ارتباط =====
    let requests = [];
    const requestsPath = 'data/requests';
    
    try {
      const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestsPath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (listRes.ok) {
        const files = await listRes.json();
        const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));
        const recentFiles = jsonFiles.slice(-50); 
        
        for (const file of recentFiles) {
          try {
            const contentRes = await fetch(file.url, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (contentRes.ok) {
              const fileData = await contentRes.json();
              const content = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));
              requests.push(content);
            }
          } catch (e) { 
            console.error(`Error reading request file ${file.name}:`, e); 
          }
        }
      }
    } catch (e) {
      console.error('Error accessing requests folder:', e);
    }

    // ===== ارسال نهایی =====
    return res.status(200).json({
      ...originalData,
      users,
      stats,
      countries,
      requests
    });

  } catch (error) {
    console.error('Get Users Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
