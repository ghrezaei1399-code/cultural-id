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

  try {
    // ۱. پیدا کردن کاربر از index.json
    const indexPath = 'data/index.json';
    const indexResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!indexResponse.ok) throw new Error('فایل فهرست یافت نشد');

    const indexFile = await indexResponse.json();
    const indexSha = indexFile.sha;
    const indexJsonString = Buffer.from(indexFile.content, 'base64').toString('utf8');
    let indexData = JSON.parse(indexJsonString);

    const normalizedInput = code.replace(/[\s\-]/g, '').toUpperCase();
    let userEntry = null;

    for (const entry of indexData) {
      if (entry.cardCode.replace(/[\s\-]/g, '').toUpperCase() === normalizedInput ||
          (entry.displayCode && entry.displayCode.replace(/[\s\-]/g, '').toUpperCase() === normalizedInput)) {
        userEntry = entry;
        break;
      }
    }

    if (!userEntry) return res.status(404).json({ error: 'کاربر یافت نشد' });

    // ۲. خواندن فایل کامل کاربر
    const userPath = `data/active/${userEntry.cardCode}.json`;
    const userResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!userResponse.ok) throw new Error('فایل کاربر یافت نشد');

    const userFile = await userResponse.json();
    const userJsonString = Buffer.from(userFile.content, 'base64').toString('utf8');
    const userData = JSON.parse(userJsonString);

    // ۳. ⭐ تشخیص هوشمند تغییرات (Highlight Logic)
    const changedFields = [];
    
    if (updates.values && JSON.stringify(updates.values) !== JSON.stringify(userData.values)) {
      changedFields.push('values');
      userData.values = updates.values;
    }
    if (updates.optionalCode !== undefined && updates.optionalCode !== userData.optionalCode) {
      changedFields.push('optionalCode');
      userData.optionalCode = updates.optionalCode;
      
      // بروزرسانی displayCode
      const parts = userData.cardCode.split('-');
      const part1 = parts[1] || '0000';
      const part2 = parts[2] || '0000';
      const opt = updates.optionalCode.trim();
      userData.displayCode = opt ? `CIM - ${part1} - ${part2} - ${opt}` : `CIM - ${part1} - ${part2}`;
    }
    if (updates.communicationEmail !== undefined && updates.communicationEmail !== userData.communicationEmail) {
      changedFields.push('communicationEmail');
      userData.communicationEmail = updates.communicationEmail;
    }

    // اگر هیچ تغییری وجود نداشت
    if (changedFields.length === 0) {
      return res.status(400).json({ error: 'هیچ تغییری نسبت به اطلاعات قبلی ثبت نشده است.' });
    }

    // ۴. ذخیره تغییرات و لیست فیلدهای تغییر یافته
    userData.status = 'pending_edit';
    userData.pendingChanges = changedFields; // ⭐ این خط کلیدی است
    userData.lastEditRequest = new Date().toISOString();

    const newUserJsonString = JSON.stringify(userData, null, 2);
    const newUserContent = Buffer.from(newUserJsonString, 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Edit request for user: ${userEntry.cardCode} - Pending admin approval`,
        content: newUserContent,
        sha: userFile.sha,
        branch: 'main'
      })
    });

    // ۵. بروزرسانی index.json
    const userIndex = indexData.findIndex(e => e.cardCode === userEntry.cardCode);
    if (userIndex !== -1) {
      indexData[userIndex].optionalCode = userData.optionalCode;
      indexData[userIndex].displayCode = userData.displayCode;
      indexData[userIndex].status = 'pending_edit';
    }

    const newIndexContent = Buffer.from(JSON.stringify(indexData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Update user ${userEntry.cardCode} in index - Pending edit`,
        content: newIndexContent,
        sha: indexSha,
        branch: 'main'
      })
    });

    return res.status(200).json({ success: true, message: 'تغییرات با موفقیت ثبت شد و در انتظار تأیید ادمین است' });

  } catch (error) {
    console.error('API Update Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
