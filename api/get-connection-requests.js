// api/get-connection-requests.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = 'data/requests';

  try {
    const listResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!listResponse.ok) {
      return res.status(200).json({ requests: [] });
    }

    const files = await listResponse.json();
    const requestFiles = files.filter(f => f.name.startsWith('request-') && f.name.endsWith('.json'));

    const requests = [];

    for (const file of requestFiles) {
      try {
        const fileRes = await fetch(file.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        const fileData = await fileRes.json();
        const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
        const requestData = JSON.parse(jsonString);
        
        // ===== تغییر: خواندن همه درخواست‌ها (فقط connection) =====
        if (requestData.type === 'connection' || !requestData.type) {
          requests.push({
            ...requestData,
            fileName: file.name,
            // ===== تغییر: استفاده از senderCode و senderEmail =====
            senderCode: requestData.senderCode || requestData.cardCode,
            senderEmail: requestData.senderEmail || requestData.requesterEmail || '',
            reason: requestData.reason || requestData.description || ''
          });
        }
      } catch (e) {
        console.error('Error reading request file:', e);
      }
    }

    // مرتب‌سازی بر اساس تاریخ (جدیدترین اول)
    requests.sort((a, b) => new Date(b.createdAt || b.requestDate) - new Date(a.createdAt || a.requestDate));

    return res.status(200).json({ requests });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
