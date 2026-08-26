export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
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

    if (!listResponse.ok) throw new Error(`GitHub API Error: ${listResponse.status}`);

    const files = await listResponse.json();
    const jsonFiles = files.filter(f => f.name.endsWith('.json'));

    const rawUsers = [];

    for (const file of jsonFiles) {
      try {
        // ⭐ خواندن مستقیم از Contents API برای دور زدن کش و حفظ حروف فارسی
        const fileRes = await fetch(file.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        const fileData = await fileRes.json();
        const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
        const userData = JSON.parse(jsonString);
        rawUsers.push(userData);
      } catch (e) {
        console.error('Error parsing file:', file.name, e);
      }
    }

    rawUsers.sort((a, b) => new Date(a.registrationDate || 0) - new Date(b.registrationDate || 0));

    const activeUsers = rawUsers.filter(user => user.status !== 'rejected');

    const users = activeUsers.map((user, index) => {
      const rank = index + 1;
      let badge = 'bronze';
      if (rank <= 200) badge = 'golden';
      else if (rank <= 1000) badge = 'silver';
      return { ...user, rank: rank, badge: badge };
    });

    const stats = {
      total: users.length,
      golden: users.filter(u => u.badge === 'golden').length,
      silver: users.filter(u => u.badge === 'silver').length,
      bronze: users.filter(u => u.badge === 'bronze').length,
      approved: users.filter(u => u.status === 'approved').length,
      rejected: rawUsers.filter(u => u.status === 'rejected').length,
      pending: users.filter(u => u.status === 'pending' || u.status === 'pending_edit' || !u.status).length
    };

    const countryStats = {};
    users.forEach(user => {
      const country = user.country || 'Unknown';
      if (!countryStats[country]) {
        countryStats[country] = { country: country, countryCode: user.countryCode || 'XX', count: 0, users: [] };
      }
      countryStats[country].count++;
      countryStats[country].users.push({ cardCode: user.cardCode, badge: user.badge, rank: user.rank });
    });

    const countries = Object.values(countryStats).sort((a, b) => b.count - a.count);

    return res.status(200).json({ users, stats, countries });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
