// api/upload-achievement.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });

  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const { cardCode, achievement } = parsedBody;
    
    if (!cardCode || !achievement || !achievement.title) {
      return res.status(400).json({ error: 'اطلاعات ناقص است (کد کاربر یا عنوان اثر)' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const userPath = `data/active/${cardCode}.json`;

    const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!userRes.ok) {
      if (userRes.status === 404) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }
      return res.status(userRes.status).json({ error: 'خطا در دریافت اطلاعات کاربر' });
    }

    const userDataRaw = await userRes.json();
    const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

    if (userData.status !== 'approved') {
      return res.status(403).json({ error: 'حساب کاربری تایید نشده است.' });
    }

    let fileUrl = '';
    let finalFileName = achievement.fileName || 'no-file';

    // ===== اگر فایلی آپلود شده باشد =====
    if (achievement.fileData && achievement.fileData.length > 100) {
      // ===== آپلود مستقیم به گیت‌هاب (بدون نیاز به upload-file.js) =====
      const ext = (achievement.fileName || 'file').split('.').pop();
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
      const filePath = `uploads/${uniqueName}`;

      const base64Content = achievement.fileData.replace(/^data:[^;]+;base64,/, '');

      const uploadRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Upload media: ${uniqueName}`,
          content: base64Content,
          branch: 'main'
        })
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'خطا در آپلود فایل به گیت‌هاب');
      }

      fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
      finalFileName = uniqueName;
    }

    // ===== افزودن دستاورد =====
    if (!userData.achievements) userData.achievements = [];

    const newAchievement = {
      title: achievement.title,
      description: achievement.description || '',
      category: achievement.category || 'general',
      fileUrl: fileUrl,
      fileName: finalFileName,
      status: 'pending',
      uploadDate: new Date().toISOString(),
      section: achievement.section || 'identity-card'
    };

    userData.achievements.push(newAchievement);

    const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
    
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        message: `Achievement uploaded by ${cardCode}`, 
        content: newContent, 
        sha: userDataRaw.sha, 
        branch: 'main' 
      })
    });

    return res.status(200).json({ success: true, achievement: newAchievement });

  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
