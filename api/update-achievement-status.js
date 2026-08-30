// api/update-achievement-status.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const token = process.env.GH_TOKEN;
  // دریافت fileName به جای achIndex برای دقت بیشتر
  const { cardCode, fileName, status } = req.body;
  
  if (!token || !cardCode || !fileName) {
    return res.status(400).json({ error: 'اطلاعات ناقص است (نام فایل الزامی است)' });
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

    // ۲. پیدا کردن دستاورد مورد نظر بر اساس نام فایل
    const achIndex = userData.achievements ? userData.achievements.findIndex(a => a.fileName === fileName) : -1;

    if (achIndex !== -1 && userData.achievements[achIndex]) {
      const achievement = userData.achievements[achIndex];
      
      // اگر وضعیت "رد شده" باشد، فایل مدیا را هم از گیت‌هاب پاک کن
      if (status === 'rejected' && achievement.fileUrl) {
        // استخراج نام فایل از آدرس URL برای حذف از پوشه uploads
        const filePath = `uploads/${achievement.fileName}`;
        
        // دریافت sha فایل مدیا برای حذف
        const mediaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (mediaRes.ok) {
          const mediaData = await mediaRes.json();
          // درخواست حذف فایل مدیا
          await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'DELETE',
            headers: { 
              'Authorization': `Bearer ${token}`, 
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
              message: `Delete rejected media: ${achievement.fileName}`, 
              sha: mediaData.sha, 
              branch: 'main' 
            })
          });
        }
      }

      // تغییر وضعیت در JSON کاربر
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
          message: `Admin ${status} achievement: ${fileName}`, 
          content: newContent, 
          sha: fileData.sha, 
          branch: 'main' 
        })
      });
      
      return res.status(200).json({ success: true });
    } else {
      return res.status(404).json({ error: 'دستاورد با این نام فایل یافت نشد' });
    }

  } catch (error) {
    console.error('Update Achievement Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
