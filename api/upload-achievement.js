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

    const { title, description, category, fileData, fileName } = achievement;

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

    // ===== ساخت Issue (به جای data/requests) =====
    const isPersian = /[\u0600-\u06FF]/.test(title + ' ' + description);
    const categoryLabels = {
      'art': 'هنری', 'science': 'علمی', 'cultural': 'فرهنگی',
      'media': 'رسانه', 'other': 'سایر'
    };
    const categoryLabel = isPersian
      ? (categoryLabels[category] || 'سایر')
      : (category || 'other');

    const issueTitle = isPersian
      ? `دستاورد نام‌آوران: ${userData.cardCode || cardCode} - ${achievementId}`
      : `Notable Achievement: ${userData.cardCode || cardCode} - ${achievementId}`;

    const issueBody = `
**Card Code:** ${userData.cardCode || cardCode}
**Tracking Code:** ${achievementId}
**Type:** achievement
**Category:** ${categoryLabel}
**Title:** ${title}
**Description:** ${description}
**File URL:** ${fileUrl || '---'}

---
*این دستاورد توسط عضو ثبت شده و در انتظار تأیید ادمین است.*
*This achievement has been submitted by a member and is pending admin approval.*
    `;

    const issueRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        title: issueTitle,
        body: issueBody,
        labels: ['achievement', 'pending-review']
      })
    });

    if (!issueRes.ok) {
      const errData = await issueRes.json().catch(() => ({}));
      throw new Error(errData.message || 'خطا در ثبت درخواست');
    }

    const issueData = await issueRes.json();

    // ===== ذخیره دستاورد در فایل کاربر (برای گالری) =====
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
      section: 'emergence',
      issueNumber: issueData.number
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
      issueNumber: issueData.number,
      message: 'دستاورد با موفقیت ثبت شد و برای بررسی به ادمین ارسال گردید.'
    });

  } catch (error) {
    console.error('Upload Achievement Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
