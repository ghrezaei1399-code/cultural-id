export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
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
    
    // ⭐ decode صحیح با Buffer (حذف unescape که باعث خرابی می‌شد)
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const userData = JSON.parse(jsonString);

    // بروزرسانی اطلاعات
    if (updates.values) userData.values = updates.values;
    if (updates.optionalCode !== undefined) userData.optionalCode = updates.optionalCode;
    if (updates.communicationEmail !== undefined) userData.communicationEmail = updates.communicationEmail;
    
    userData.status = 'pending_edit';
    userData.lastEditRequest = new Date().toISOString();

    //  encode صحیح با Buffer (حذف unescape که باعث خرابی می‌شد)
    const newJsonString = JSON.stringify(userData, null, 2);
    const newContent = Buffer.from(newJsonString, 'utf8').toString('base64');

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
