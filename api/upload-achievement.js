// api/upload-achievement.js
module.exports = async function handler(req, res) {
  // ۱. بررسی متد درخواست
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN not configured' });
  }

  try {
    // ۲. بررسی حجم درخواست (جلوگیری از کرش سرور با فایل‌های خیلی بزرگ)
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 5000000) { // محدودیت ۵ مگابایت
      return res.status(413).json({ error: 'حجم فایل آپلودی بسیار زیاد است. لطفاً از فایل‌های کم‌حجم‌تر استفاده کنید.' });
    }

    const body = req.body;
    const cardCode = body.cardCode;
    const achievement = body.achievement;

    if (!cardCode || !achievement) {
      return res.status(400).json({ error: 'اطلاعات ناقص است' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const userPath = `data/active/${cardCode}.json`;

    // ۳. دریافت اطلاعات کاربر از گیت‌هاب
    const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Accept': 'application/vnd.github.v3+json' 
      }
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error('GitHub User Fetch Error:', errText);
      return res.status(404).json({ error: 'کاربر یافت نشد یا دسترسی محدود است.' });
    }

    const userDataRaw = await userRes.json();
    const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

    // ⭐ بررسی امنیتی
    if (userData.status !== 'approved') {
      return res.status(403).json({ error: 'حساب کاربری شما هنوز توسط ادمین تایید نشده است.' });
    }
    
    if (userData.rank && userData.rank > 200) {
      return res.status(403).json({ error: 'امکان آپلود دستاورد فقط برای ۲۰۰ سفیر اول فعال است.' });
    }

    // ۴. افزودن دستاورد
    if (!userData.achievements) userData.achievements = [];
    
    achievement.status = 'pending';
    achievement.uploadDate = new Date().toISOString();
    userData.achievements.push(achievement);

    const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
    
    // ۵. ذخیره در گیت‌هاب
    const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Accept': 'application/vnd.github.v3+json', 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        message: `Achievement uploaded by ${cardCode}`, 
        content: newContent, 
        sha: userDataRaw.sha, 
        branch: 'main' 
      })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('GitHub Update Error:', errText);
      throw new Error('خطا در ذخیره‌سازی فایل در گیت‌هاب');
    }

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
