export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'تنظیمات سرور ناقص است (GH_TOKEN)' });
  }

  const { code } = req.query;
  const updates = req.body;

  if (!code) {
    return res.status(400).json({ error: 'کد کارت الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/active/${code}.json`;

  try {
    // 1. دریافت اطلاعات فعلی فایل
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!fileResponse.ok) {
      throw new Error('کاربر یافت نشد');
    }

    const fileData = await fileResponse.json();
    const contentDecoded = atob(fileData.content);
    const userData = JSON.parse(contentDecoded);

    // 2. بروزرسانی اطلاعات
    if (updates.values) userData.values = updates.values;
    if (updates.optionalCode !== undefined) userData.optionalCode = updates.optionalCode;
    if (updates.communicationEmail !== undefined) userData.communicationEmail = updates.communicationEmail;
    
    // 3. تغییر وضعیت به pending (در انتظار تأیید)
    userData.status = 'pending';
    userData.lastModified = new Date().toISOString();
    userData.pendingChanges = true;

    // 4. کدگذاری مجدد محتوا
    const newContent = btoa(unescape(encodeURIComponent(JSON.stringify(userData, null, 2))));

    // 5. ارسال درخواست آپدیت به گیت‌هاب
    const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update user data for ${code} - Pending admin approval`,
        content: newContent,
        sha: fileData.sha
      })
    });

    if (!updateResponse.ok) {
      throw new Error('خطا در ذخیره‌سازی تغییرات در گیت‌هاب');
    }

    return res.status(200).json({ 
      success: true, 
      message: 'تغییرات با موفقیت ثبت شد و در انتظار تأیید ادمین است' 
    });

  } catch (error) {
    console.error('API Update Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
