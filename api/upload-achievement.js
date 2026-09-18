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
    const { cardCode, achievement } = req.body;

    if (!cardCode || !achievement) {
      return res.status(400).json({ error: 'کد کارت و اطلاعات دستاورد الزامی است' });
    }

    const { title, description, category, fileData, fileName, section } = achievement;

    if (!title || !description) {
      return res.status(400).json({ error: 'عنوان و شرح دستاورد الزامی است' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // ===== نرمال‌سازی کد کارت =====
    const normalizeCardCode = (s) => {
      return (s || '')
        .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d))
        .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
        .replace(/\s+/g, '')
        .toUpperCase();
    };

    const normalizedCode = normalizeCardCode(cardCode);

    // ===== پیدا کردن کاربر =====
    const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!listRes.ok) {
      return res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
    }

    const files = await listRes.json();
    let matchedFile = null;

    for (const file of files) {
      if (!file.name.endsWith('.json')) continue;
      const nameWithoutExt = file.name.replace('.json', '');
      if (normalizeCardCode(nameWithoutExt) === normalizedCode) {
        matchedFile = file;
        break;
      }
    }

    if (!matchedFile) {
      return res.status(404).json({ error: 'کاربر با این کد کارت یافت نشد' });
    }

    const userPath = matchedFile.path;

    // ===== خواندن اطلاعات کاربر =====
    const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!userRes.ok) {
      return res.status(404).json({ error: 'اطلاعات کاربر یافت نشد' });
    }

    const userDataRaw = await userRes.json();
    const userData = await (await fetch(userDataRaw.download_url)).json();

    // ===== ایجاد شناسه =====
    const achievementId = `ACH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // ===== آپلود فایل =====
    let fileUrl = null;
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
          message: `Upload: ${fileName} for ${userData.cardCode || cardCode}`,
          content: fileContent,
          branch: 'main'
        })
      });

      if (uploadRes.ok) {
        fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
      }
    }

    // ===== ذخیره دستاورد در data/requests/ =====
    // این فایل توسط admin-achievements.html خوانده می‌شود
    const achievementFileName = `achievement-${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
    const achievementPath = `data/requests/${achievementFileName}`;

    const achievementData = {
      fileName: achievementFileName,
      trackingCode: achievementId,
      senderCode: userData.cardCode || cardCode,
      title: title,
      description: description,
      category: category || 'other',
      status: 'pending',
      fileUrl: fileUrl,
      fileName: fileName || null,
      createdAt: new Date().toISOString(),
      approvedAt: null,
      rejectedAt: null,
      section: section || 'emergence'
    };

    const achievementContent = Buffer.from(JSON.stringify(achievementData, null, 2), 'utf8').toString('base64');

    const saveRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${achievementPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Achievement: ${title} for ${userData.cardCode || cardCode} - ${achievementId}`,
        content: achievementContent,
        branch: 'main'
      })
    });

    if (!saveRes.ok) {
      const errData = await saveRes.json().catch(() => ({}));
      throw new Error(errData.message || 'خطا در ذخیره دستاورد');
    }

    // ===== ذخیره دستاورد در فایل کاربر (برای گالری) =====
    // فقط متادیتا — نه fileData (که قبلاً فایل کاربر را آلوده می‌کرد)
    if (!userData.achievements) {
      userData.achievements = [];
    }

    userData.achievements.push({
      id: achievementId,
      title: title,
      description: description,
      category: category || 'other',
      status: 'pending',
      createdAt: new Date().toISOString(),
      fileName: fileName || null,
      fileUrl: fileUrl,
      section: section || 'emergence',
      trackingCode: achievementId
    });

    const updatedContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Add achievement for ${userData.cardCode || cardCode}`,
        content: updatedContent,
        sha: userDataRaw.sha,
        branch: 'main'
      })
    });

    return res.status(200).json({
      success: true,
      trackingCode: achievementId,
      message: 'دستاورد با موفقیت ثبت شد و برای بررسی به ادمین ارسال گردید.'
    });

  } catch (error) {
    console.error('Upload Achievement Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
