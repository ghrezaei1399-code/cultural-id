// api/get-connection-requests.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  const { type } = req.query;
  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  // ===== اگر درخواست برای دریافت مشاهدات (observations) باشد =====
  if (type === 'observations') {
    try {
      // دریافت Issues از گیت‌هاب
      const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?labels=observation&state=all&per_page=100`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('خطا در دریافت Issues از گیت‌هاب');
      }

      const issues = await response.json();

      // دریافت لیست تحلیل‌ها از پوشه data/analyses/
      let analysesMap = {};
      try {
        const analysesRes = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/data/analyses`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        if (analysesRes.ok) {
          const files = await analysesRes.json();
          for (const file of files) {
            if (file.name.endsWith('.json')) {
              try {
                const fileRes = await fetch(file.download_url);
                const data = await fileRes.json();
                analysesMap[data.issueNumber] = data;
              } catch (e) {
                console.error('Error reading analysis file:', file.name);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error fetching analyses:', e);
      }

      const observations = issues.map(issue => {
        const bodyLines = issue.body.split('\n');
        let cardCode = 'ناشناس';
        let observation = '';
        let selectedModule = '';
        let inObservation = false;

        for (const line of bodyLines) {
          if (line.includes('**کد کارت:**')) {
            cardCode = line.replace('**کد کارت:**', '').trim();
          }
          if (line.includes('**مشاهده خام:**')) {
            inObservation = true;
            continue;
          }
          if (line.includes('**ماژول انتخاب‌شده:**')) {
            const mod = line.replace('**ماژول انتخاب‌شده:**', '').trim();
            if (mod && mod !== 'هیچ‌کدام') {
              selectedModule = mod;
            }
            continue;
          }
          if (inObservation && line.trim() && !line.includes('---')) {
            observation += line.trim() + ' ';
          }
          if (line.includes('---')) break;
        }

        observation = observation.trim() || issue.body.substring(0, 200);

        const labels = issue.labels.map(l => l.name);
        let status = 'pending';
        if (labels.includes('approved')) status = 'approved';
        else if (labels.includes('rejected')) status = 'rejected';

        // ===== دریافت تحلیل و امتیاز =====
        const analysisData = analysesMap[issue.number] || null;
        const analysis = analysisData ? analysisData.analysis : null;
        const score = analysisData ? analysisData.score : 0;

        return {
          number: issue.number,
          cardCode: cardCode,
          observation: observation,
          module: selectedModule,
          status: status,
          score: score,
          analysis: analysis,
          createdAt: issue.created_at,
          issueUrl: issue.html_url
        };
      });

      observations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return res.status(200).json({ observations });

    } catch (error) {
      console.error('Get Observations Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ===== منطق قبلی: دریافت درخواست‌های ارتباط =====
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
        
        if (requestData.type === 'connection' || !requestData.type) {
          requests.push({
            ...requestData,
            fileName: file.name,
            senderCode: requestData.senderCode || requestData.cardCode,
            senderEmail: requestData.senderEmail || requestData.requesterEmail || '',
            reason: requestData.reason || requestData.description || ''
          });
        }
      } catch (e) {
        console.error('Error reading request file:', e);
      }
    }

    requests.sort((a, b) => new Date(b.createdAt || b.requestDate) - new Date(a.createdAt || a.requestDate));

    return res.status(200).json({ requests });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
