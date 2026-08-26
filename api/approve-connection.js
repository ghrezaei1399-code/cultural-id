export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  const { fileName, action } = req.body;
  if (!fileName || !action) {
    return res.status(400).json({ error: 'نام فایل و نوع عملیات الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/requests/${fileName}`;

  try {
    // خواندن درخواست
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!fileResponse.ok) {
      return res.status(404).json({ error: 'درخواست یافت نشد' });
    }

    const fileData = await fileResponse.json();
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const requestData = JSON.parse(jsonString);

    if (action === 'approve') {
      // پیدا کردن کاربر درخواست‌دهنده
      const userPath = `data/active/${requestData.cardCode}.json`;
      const userResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!userResponse.ok) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }

      const userData = await userResponse.json();
      const userJsonString = Buffer.from(userData.content, 'base64').toString('utf8');
      const userDataObj = JSON.parse(userJsonString);

      // بررسی اینکه آیا ایمیل دارد
      if (!userDataObj.communicationEmail) {
        return res.status(400).json({ error: 'کاربر ایمیل ارتباطی ثبت نکرده است' });
      }

      // پیدا کردن هم‌فرهنگان (کاربرانی با ارزش‌های مشابه)
      // این بخش ساده‌سازی شده - در نسخه کامل باید الگوریتم تطابق پیچیده‌تری باشد
      const similarUsers = [];
      
      // ارسال ایمیل (در اینجا فقط شبیه‌سازی می‌کنیم)
      // در نسخه واقعی باید از سرویس ایمیل استفاده شود
      
      requestData.status = 'approved';
      requestData.approvedAt = new Date().toISOString();
      requestData.similarUsers = similarUsers;
    } else if (action === 'reject') {
      requestData.status = 'rejected';
      requestData.rejectedAt = new Date().toISOString();
    }

    // ذخیره تغییرات
    const newContent = Buffer.from(JSON.stringify(requestData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `${action === 'approve' ? 'Approved' : 'Rejected'} connection request: ${requestData.cardCode}`,
        content: newContent,
        sha: fileData.sha,
        branch: 'main'
      })
    });

    return res.status(200).json({ 
      success: true, 
      message: action === 'approve' ? 'درخواست تایید شد' : 'درخواست رد شد'
    });

  } catch (error) {
    console.error('Approve Connection Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
