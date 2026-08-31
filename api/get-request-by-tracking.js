// api/get-request-by-tracking.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  const { trackingCode } = req.query;
  if (!trackingCode) {
    return res.status(400).json({ error: 'کد پیگیری الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  try {
    const listResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/requests`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!listResponse.ok) {
      return res.status(404).json({ error: 'درخواستی با این کد پیدا نشد' });
    }

    const files = await listResponse.json();
    
    // اطمینان از اینکه files یک آرایه است
    if (!Array.isArray(files)) {
      return res.status(500).json({ error: 'خطا در ساختار فایل‌های درخواست' });
    }

    const requestFiles = files.filter(f => f.name && f.name.startsWith('request-') && f.name.endsWith('.json'));

    for (const file of requestFiles) {
      try {
        const fileRes = await fetch(file.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!fileRes.ok) continue;
        
        const fileData = await fileRes.json();
        const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
        const requestData = JSON.parse(jsonString);
        
        if (requestData.trackingCode === trackingCode) {
          return res.status(200).json({
            request: {
              status: requestData.status || 'pending',
              trackingCode: requestData.trackingCode || trackingCode,
              connections: requestData.connections || [],
              connectionsCount: (requestData.connections || []).length,
              createdAt: requestData.createdAt || requestData.requestDate || new Date().toISOString(),
              approvedAt: requestData.approvedAt || null,
              rejectedAt: requestData.rejectedAt || null
            }
          });
        }
      } catch (e) {
        console.error('Error reading request file:', e);
        continue;
      }
    }

    return res.status(404).json({ error: 'درخواستی با این کد پیدا نشد' });

  } catch (error) {
    console.error('Get Request By Tracking Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
