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
    // ۱. دریافت اطلاعات فعلی فایل
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
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const userData = JSON.parse(jsonString);

    // ۲. بروزرسانی اطلاعات
    if (updates.values) userData.values = updates.values;
    if (updates.optionalCode !== undefined) userData.optionalCode = updates.optionalCode;
    if (updates.communicationEmail !== undefined) userData.communicationEmail = updates.communicationEmail;
    
    // ۳. ⭐ تغییر وضعیت به "در انتظار تایید ویرایش"
    userData.status = 'pending_edit';
    userData.lastEditRequest = new Date().toISOString();

    // ۴. کدگذاری مجدد محتوا با حفظ حروف فارسی
    const newJsonString = JSON.stringify(userData, null, 2);
    const newContent = Buffer.from(newJsonString, 'utf8').toString('base64');

    // ۵. ارسال درخواست آپدیت به گیت‌هاب
    const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Edit request for user: ${code} - Pending admin approval`,
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
