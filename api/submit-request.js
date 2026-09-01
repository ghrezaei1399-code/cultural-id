// api/submit-request.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  // ===== توکن مخصوص Observer =====
  const OBSERVER_TOKEN = process.env.OBSERVER_TOKEN || token;

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

    const { cardCode, description, type, targetCardCode, observation } = parsedBody;

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // ===== اگر درخواست از نوع "observation" باشد =====
    if (type === 'observation') {
      if (!observation || observation.length < 20) {
        return res.status(400).json({ error: 'مشاهده باید حداقل ۲۰ کاراکتر باشد' });
      }

      const issueTitle = `مشاهده خام: ${cardCode || 'ناشناس'}`;
      const issueBody = `
**کد کارت:** ${cardCode || 'ناشناس'}

**مشاهده خام:**
${observation}

---
*این مشاهده توسط کاربر ثبت شده و در انتظار بررسی است.*
      `;

      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OBSERVER_TOKEN}`,
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

      return res.status(200).json({
        success: true,
        trackingCode: `#${issueData.number}`,
        issueUrl: issueData.html_url,
        message: 'مشاهده با موفقیت ثبت شد'
      });
    }

    // ===== درخواست‌های معمولی (ارتباط یا حذف) =====
    // ... (بقیه کدهای قبلی)
    return res.status(200).json({ success: true, message: 'درخواست ثبت شد' });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
