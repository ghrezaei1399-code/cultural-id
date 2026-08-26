export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN is not configured' });

  const { cardCode, status } = req.body;
  if (!cardCode || !status) return res.status(400).json({ error: 'اطلاعات ناقص است' });

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/active/${cardCode}.json`;

  try {
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!fileResponse.ok) throw new Error('فایل یافت نشد');

    const fileData = await fileResponse.json();
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const userData = JSON.parse(jsonString);

    // ⭐ منطق هوشمند تایید یا رد ویرایش
    if (userData.status === 'pending_edit') {
      if (status === 'approved') {
        userData.editLocked = true; // قفل کردن برای همیشه
        userData.previousValues = undefined; // حذف نسخه پشتیبان
      } else if (status === 'pending') { // یعنی ادمین "رد" کرده و باید به حالت قبل برگردد
        if (userData.previousValues) {
          userData.values = userData.previousValues.values;
          userData.optionalCode = userData.previousValues.optionalCode;
          userData.communicationEmail = userData.previousValues.communicationEmail;
          // بازسازی displayCode بر اساس کد قبلی
          const parts = userData.cardCode.split('-');
          const opt = userData.previousValues.optionalCode?.trim() || '';
          userData.displayCode = opt ? `CIM - ${parts[1]} - ${parts[2]} - ${opt}` : `CIM - ${parts[1]} - ${parts[2]}`;
          
          userData.previousValues = undefined;
        }
      }
    }

    userData.status = status;
    userData.statusUpdatedAt = new Date().toISOString();

    const newJsonString = JSON.stringify(userData, null, 2);
    const newContent = Buffer.from(newJsonString, 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Admin action: ${status} for ${cardCode}`, content: newContent, sha: fileData.sha, branch: 'main' })
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
