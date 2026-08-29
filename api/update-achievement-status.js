// api/update-achievement-status.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const token = process.env.GH_TOKEN;
  const { cardCode, achIndex, status } = req.body;
  
  if (!token || !cardCode || achIndex === undefined) {
    return res.status(400).json({ error: 'اطلاعات ناقص است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const userPath = `data/active/${cardCode}.json`;

  try {
    // ۱. دریافت فایل کاربر از گیت‌هاب
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!fileRes.ok) return res.status(404).json({ error: 'فایل کاربر یافت نشد' });
    
    const fileData = await fileRes.json();
    const userData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

    // ۲. تغییر وضعیت دستاورد مورد نظر
    if (userData.achievements && userData.achievements[achIndex]) {
      userData.achievements[achIndex].status = status;
      
      // ۳. ذخیره مجدد فایل آپدیت شده در گیت‌هاب
      const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
      
      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ 
          message: `Admin ${status} achievement #${achIndex}`, 
          content: newContent, 
          sha: fileData.sha, 
          branch: 'main' 
        })
      });
      
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ error: 'دستاورد یافت نشد' });
    }

  } catch (error) {
    console.error('Update Achievement Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
