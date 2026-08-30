// api/upload-achievement.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });

  try {
    const { cardCode, achievement } = req.body;
    if (!cardCode || !achievement) return res.status(400).json({ error: 'اطلاعات ناقص است' });

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const userPath = `data/active/${cardCode}.json`;

    // ۱. دریافت اطلاعات کاربر
    const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!userRes.ok) return res.status(404).json({ error: 'کاربر یافت نشد' });

    const userDataRaw = await userRes.json();
    const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

    // ۲. بررسی امنیتی
    if (userData.status !== 'approved') return res.status(403).json({ error: 'حساب کاربری تایید نشده است.' });

    let fileUrl = '';
    // ۳. اگر فایلی آپلود شده باشد، آن را در پوشه uploads ذخیره کن
    if (achievement.fileData && achievement.fileName) {
      // فراخوانی داخلی API آپلود فایل
      // نکته: در محیط Vercel باید از آدرس کامل یا نسبی صحیح استفاده شود
    const baseUrl = 'https://cultural-id.vercel.app/?utm_source=chatgpt.com'; // آدرس سایت خودتان را اینجا بگذارید
      
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
      } else {
        throw new Error(uploadResult.error || 'خطا در آپلود فایل');
      }
    }

    // ۴. افزودن دستاورد به لیست (فقط لینک فایل ذخیره می‌شود)
    if (!userData.achievements) userData.achievements = [];
    
    userData.achievements.push({
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      fileUrl: fileUrl, // لینک فایل به جای کد Base64
      fileName: achievement.fileName,
      status: 'pending',
      uploadDate: new Date().toISOString(),
      section: achievement.section || 'identity-card' // برای تفکیک بخش کارت هویت و مجتمع ظهور
    });

    const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
    
    // ۵. ذخیره نهایی در گیت‌هاب
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
