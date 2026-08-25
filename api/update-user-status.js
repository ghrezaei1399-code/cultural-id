export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'توکن گیت‌هاب (GH_TOKEN) تنظیم نشده است' });
  }

  const { cardCode, status } = req.body;
  if (!cardCode || !status) {
    return res.status(400).json({ error: 'کد کارت و وضعیت جدید الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/active/${cardCode}.json`;

  try {
    // ۱. دریافت اطلاعات فعلی فایل و SHA آن (برای آپدیت در گیت‌هاب الزامی است)
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!fileResponse.ok) {
      throw new Error('فایل کاربر یافت نشد');
    }

    const fileData = await fileResponse.json();
    const contentDecoded = atob(fileData.content);
    const userData = JSON.parse(contentDecoded);

    // ۲. بروزرسانی وضعیت در داده‌ها
    userData.status = status;
    userData.statusUpdatedAt = new Date().toISOString();

    // ۳. کدگذاری مجدد محتوا
    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(userData, null, 2))));

    // ۴. ارسال درخواست آپدیت به گیت‌هاب
    const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update user status to ${status} for ${cardCode}`,
        content: newContent,
        sha: fileData.sha
      })
    });

    if (!updateResponse.ok) {
      throw new Error('خطا در ذخیره‌سازی تغییرات در گیت‌هاب');
    }

    return res.status(200).json({ success: true, message: 'وضعیت با موفقیت بروزرسانی شد' });

  } catch (error) {
    console.error('API Update Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
