export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN is not configured' });

  const { code } = req.query;
  const updates = req.body;
  if (!code) return res.status(400).json({ error: 'کد کارت الزامی است' });

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/active/${code}.json`;

  try {
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!fileResponse.ok) throw new Error('کاربر یافت نشد');

    const fileData = await fileResponse.json();
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const userData = JSON.parse(jsonString);

    // ⭐ جلوگیری از ویرایش مجدد اگر قبلاً قفل شده است
    if (userData.editLocked) {
      return res.status(403).json({ error: 'شما قبلاً از حق ویرایش خود استفاده کرده‌اید و امکان تغییر مجدد وجود ندارد.' });
    }

    // ⭐ ذخیره نسخه پشتیبان قبل از اعمال تغییرات
    userData.previousValues = {
      values: userData.values,
      optionalCode: userData.optionalCode,
      communicationEmail: userData.communicationEmail
    };

    // اعمال تغییرات جدید
    if (updates.values) userData.values = updates.values;
    if (updates.optionalCode !== undefined) {
      userData.optionalCode = updates.optionalCode;
      const parts = userData.cardCode.split('-');
      const opt = updates.optionalCode.trim();
      userData.displayCode = opt ? `CIM - ${parts[1]} - ${parts[2]} - ${opt}` : `CIM - ${parts[1]} - ${parts[2]}`;
    }
    if (updates.communicationEmail !== undefined) userData.communicationEmail = updates.communicationEmail;
    
    userData.status = 'pending_edit';
    userData.lastEditRequest = new Date().toISOString();

    const newJsonString = JSON.stringify(userData, null, 2);
    const newContent = Buffer.from(newJsonString, 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Edit request for ${code}`, content: newContent, sha: fileData.sha, branch: 'main' })
    });

    return res.status(200).json({ success: true, message: 'درخواست ویرایش ثبت شد.' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
