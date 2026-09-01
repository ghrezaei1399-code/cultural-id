// api/submit-request.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const { cardCode, type, observations, description, targetCardCode } = parsedBody;

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // ===== اگر درخواست از نوع "observations" باشد =====
    if (type === 'observations' && observations && observations.length > 0) {
      if (!cardCode) {
        return res.status(400).json({ error: 'کد کارت الزامی است' });
      }

      // ایجاد یک Issue برای هر مشاهده
      const createdIssues = [];
      for (const obs of observations) {
        if (!obs.text || obs.text.length < 10) {
          continue; // رد کردن مشاهدات خیلی کوتاه
        }

        const issueTitle = `مشاهده خام: ${cardCode}`;
        const issueBody = `
**کد کارت:** ${cardCode}

**مشاهده خام:**
${obs.text}

**ماژول‌های انتخاب‌شده:**
${obs.modules && obs.modules.length > 0 ? obs.modules.join('، ') : 'هیچ‌کدام'}

---
*این مشاهده توسط کاربر ثبت شده و در انتظار بررسی است.*
        `;

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            title: issueTitle,
            body: issueBody,
            labels: ['observation', 'pending-review']
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'خطا در ایجاد Issue در گیت‌هاب');
        }

        const issueData = await response.json();
        createdIssues.push({
          number: issueData.number,
          url: issueData.html_url,
          observation: obs.text.substring(0, 50) + '...'
        });
      }

      if (createdIssues.length === 0) {
        return res.status(400).json({ error: 'هیچ مشاهده‌ی معتبری ثبت نشد.' });
      }

      const trackingCodes = createdIssues.map(i => `#${i.number}`).join('، ');
      return res.status(200).json({
        success: true,
        trackingCode: trackingCodes,
        issues: createdIssues,
        message: `${createdIssues.length} مشاهده با موفقیت ثبت شد.`
      });
    }

    // ===== درخواست‌های معمولی (ارتباط یا حذف) =====
    if (!cardCode || !type) {
      return res.status(400).json({ error: 'کد کارت و نوع درخواست الزامی است' });
    }

    // ... (بقیه کدهای قبلی برای connection و delete)
    return res.status(200).json({ success: true, message: 'درخواست ثبت شد' });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
