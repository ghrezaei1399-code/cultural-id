// api/get-connection-requests.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  const { type, filter } = req.query;
  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  // ===== اگر درخواست برای دریافت مشاهدات (observations) باشد =====
  if (type === 'observations') {
    try {
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

      const observations = issues.map(issue => {
        const bodyLines = issue.body.split('\n');
        let cardCode = 'ناشناس';
        let observation = '';
        let modules = [];
        let inObservation = false;

        for (const line of bodyLines) {
          if (line.includes('**کد کارت:**')) {
            cardCode = line.replace('**کد کارت:**', '').trim();
          }
          if (line.includes('**مشاهده خام:**')) {
            inObservation = true;
            continue;
          }
          if (line.includes('**ماژول‌های انتخاب‌شده:**')) {
            const mods = line.replace('**ماژول‌های انتخاب‌شده:**', '').trim();
            if (mods && mods !== 'هیچ‌کدام') {
              modules = mods.split('،').map(m => m.trim());
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

        return {
          number: issue.number,
          cardCode: cardCode,
          observation: observation,
          modules: modules,
          status: status,
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
  // ... (بقیه کدهای قبلی)
};
