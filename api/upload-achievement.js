// api/upload-achievement.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });

  try {
    const { cardCode, achievement } = req.body;
    
    // اعتبارسنجی دقیق‌تر ورودی‌ها
    if (!cardCode || !achievement || !achievement.title) {
      return res.status(400).json({ error: 'اطلاعات ناقص است (کد کاربر یا عنوان اثر)' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const userPath = `data/active/${cardCode}.json`;

    // دریافت اطلاعات کاربر
    const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!userRes.ok) return res.status(404).json({ error: 'کاربر یافت نشد' });

    const userDataRaw = await userRes.json();
    const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

    if (userData.status !== 'approved') return res.status(403).json({ error: 'حساب کاربری تایید نشده است.' });

    let fileUrl = '';
    let finalFileName = achievement.fileName || 'no-file';

    // اگر فایلی آپلود شده باشد (دارای data و نام)، ابتدا آن را در پوشه uploads ذخیره کن
    if (achievement.fileData && achievement.fileData.length > 100) { // بررسی حداقل طول برای اطمینان از وجود داده
      const baseUrl = 'https://cultural-id.vercel.app'; 
      
      const uploadRes = await fetch(`${baseUrl}/api/upload-file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: achievement.fileData,
          fileName: achievement.fileName
        })
      });
      
      const uploadResult = await uploadRes.json();
      if (uploadResult.success) {
        fileUrl = uploadResult.url;
        finalFileName = uploadResult.fileName; // استفاده از نام یکتای ساخته شده توسط سرور
      } else {
        // اگر آپلود فایل شکست خورد، اجازه ندهیم دستاورد ثبت شود مگر اینکه فایل اختیاری باشد
        // اما معمولاً در این سیستم فایل مهم است.
        throw new Error(uploadResult.error || 'خطا در آپلود فایل');
      }
    }

    // افزودن دستاورد به لیست
    if (!userData.achievements) userData.achievements = [];
    
    userData.achievements.push({
      title: achievement.title,
      description: achievement.description || '',
      category: achievement.category || 'general',
      fileUrl: fileUrl, // لینک فایل جدید
      fileName: finalFileName,
      status: 'pending',
      uploadDate: new Date().toISOString(),
      section: achievement.section || 'identity-card'
    });

    const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
    
    // ذخیره نهایی در گیت‌هاب
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: `Achievement uploaded by ${cardCode}`, 
        content: newContent, 
        sha: userDataRaw.sha, 
        branch: 'main' 
      })
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
