// api/update-achievement-status.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token is not configured' });

  const { cardCode, fileName, status } = req.body;
  
  if (!cardCode || !fileName) {
    return res.status(400).json({ error: 'اطلاعات ناقص است (کد کاربر و نام فایل الزامی است)' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const userPath = `data/active/${cardCode}.json`;

  try {
    // ۱. دریافت فایل کاربر
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!fileRes.ok) return res.status(404).json({ error: 'فایل کاربر یافت نشد' });
    
    const fileData = await fileRes.json();
    const userData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

    // ۲. پیدا کردن دستاورد بر اساس fileName
    const achIndex = userData.achievements ? userData.achievements.findIndex(a => a.fileName === fileName) : -1;

    if (achIndex === -1) {
      return res.status(404).json({ error: 'دستاورد با این نام فایل یافت نشد' });
    }

    // ۳. تغییر وضعیت
    userData.achievements[achIndex].status = status;
    
    // ۴. ذخیره مجدد
    const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
    
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({ 
        message: `Admin ${status} achievement: ${fileName}`, 
        content: newContent, 
        sha: fileData.sha, 
        branch: 'main' 
      })
    });
    
    return res.status(200).json({ 
      success: true, 
      message: `✅ دستاورد با موفقیت ${status === 'approved' ? 'تایید' : 'رد'} شد.` 
    });

  } catch (error) {
    console.error('Update Achievement Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
