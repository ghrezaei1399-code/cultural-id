module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  try {
    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const { cardCode, achievement } = await req.json();

    if (!cardCode || !achievement) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ===== ۱. دریافت اطلاعات کاربر از index.json =====
    const usersPath = 'data/index.json';
    const usersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${usersPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    let users = [];
    let userIndex = -1;
    
    if (usersRes.ok) {
      const usersDataRaw = await usersRes.json();
      const parsedContent = JSON.parse(Buffer.from(usersDataRaw.content, 'base64').toString('utf8'));
      users = Array.isArray(parsedContent) ? parsedContent : (parsedContent.users || []);
      userIndex = users.findIndex(u => u.cardCode === cardCode);
    }

    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = users[userIndex];

    // ===== ۲. بررسی شرایط مجاز بودن آپلود =====
    // فقط ۲۰۰ نفر اول و کسانی که هنوز دستاوردی ثبت نکرده‌اند
    if (currentUser.rank > 200) {
      return res.status(403).json({ error: 'Only the first 200 members are allowed to upload achievements.' });
    }

    // ===== ۳. بررسی تکراری نبودن دستاورد (اصلاحیه جدید) =====
    // اگر کاربر قبلاً حتی یک دستاورد داشته باشد، اجازه آپلود مجدد داده نمی‌شود
    if (currentUser.achievements && currentUser.achievements.length > 0) {
      return res.status(403).json({ error: 'You have already registered a cultural achievement. Each member is allowed only one submission.' });
    }

    // ===== ۴. آماده‌سازی داده‌های دستاورد =====
    const newAchievement = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      title: achievement.title,
      description: achievement.description,
      category: achievement.category,
      fileUrl: achievement.fileUrl || '', // اگر فایل جداگانه آپلود شده باشد
      fileData: achievement.fileData || '', // یا داده base64 مستقیم
      fileName: achievement.fileName || '',
      status: 'pending', // وضعیت اولیه در انتظار تایید ادمین
      submittedAt: new Date().toISOString()
    };

    // ===== ۵. بروزرسانی فایل پروفایل کاربر در data/active =====
    const profilePath = `data/active/${cardCode}.json`;
    let userProfile = {};
    
    try {
      const profileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${profilePath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        userProfile = JSON.parse(Buffer.from(profileData.content, 'base64').toString('utf8'));
      }
    } catch (e) { /* ignore if not exists */ }

    // افزودن دستاورد به پروفایل کاربر
    if (!userProfile.achievements) userProfile.achievements = [];
    userProfile.achievements.push(newAchievement);

    // آپلود فایل پروفایل بروزرسانی شده
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${profilePath}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Achievement uploaded by ${cardCode}`,
        content: Buffer.from(JSON.stringify(userProfile, null, 2)).toString('base64'),
        sha: userProfile.sha // اگر نیاز به sha باشد، باید از هدرباکی بگیریم، اما معمولا در PUT گیت‌هاب اختیاری است اگر branch اصلی باشد
      })
    });

    // ===== ۶. بروزرسانی آرایه اصلی در index.json =====
    if (!users[userIndex].achievements) users[userIndex].achievements = [];
    users[userIndex].achievements.push(newAchievement);

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${usersPath}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `User ${cardCode} uploaded an achievement`,
        content: Buffer.from(JSON.stringify(users, null, 2)).toString('base64')
      })
    });

    return res.status(200).json({ 
      message: 'Achievement submitted successfully and is pending admin approval.',
      achievementId: newAchievement.id 
    });

  } catch (error) {
    console.error('Upload Achievement Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
