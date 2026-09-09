// api/upload-achievement.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  try {
    // ===== در Vercel، داده از req.body می‌آید، نه req.json() =====
    const { cardCode, achievement } = req.body;

    if (!cardCode || !achievement) {
      return res.status(400).json({ error: 'کد کارت و اطلاعات دستاورد الزامی است' });
    }

    const { title, description, category, fileData, fileName } = achievement;

    if (!title || !description) {
      return res.status(400).json({ error: 'عنوان و شرح دستاورد الزامی است' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const userPath = `data/active/${cardCode}.json`;

    // ===== دریافت اطلاعات کاربر =====
    const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!userRes.ok) {
      return res.status(404).json({ error: 'کاربر با این کد کارت یافت نشد' });
    }

    const userDataRaw = await userRes.json();
    const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

    // ===== ایجاد شناسه منحصربه‌فرد برای دستاورد =====
    const achievementId = `ach-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const newAchievement = {
      id: achievementId,
      title: title,
      description: description,
      category: category || 'other',
      status: 'pending',
      createdAt: new Date().toISOString(),
      fileName: fileName || null,
      fileData: fileData || null,
      fileUrl: null,
      section: achievement.section || 'identity-card'
    };

    // ===== اگر فایل آپلود شده، آن را در گیت‌هاب ذخیره کن =====
    if (fileData && fileName) {
      const filePath = `uploads/${achievementId}-${fileName}`;
      const fileContent = fileData.split(',')[1] || fileData;
      
      const uploadRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Upload: ${fileName} for ${cardCode}`,
          content: fileContent,
          branch: 'main'
        })
      });

      if (uploadRes.ok) {
        newAchievement.fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
      }
    }

    // ===== اضافه کردن دستاورد به کاربر =====
    if (!userData.achievements) {
      userData.achievements = [];
    }
    userData.achievements.push(newAchievement);

    // ===== ذخیره مجدد فایل کاربر =====
    const updatedContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add achievement for ${cardCode}`,
        content: updatedContent,
        sha: userDataRaw.sha,
        branch: 'main'
      })
    });

    return res.status(200).json({
      success: true,
      trackingCode: achievementId,
      message: 'دستاورد با موفقیت ثبت شد'
    });

  } catch (error) {
    console.error('Upload Achievement Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
