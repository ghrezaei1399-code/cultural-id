// api/fix-achievements.js
module.exports = async function handler(req, res) {
  // فقط با متد POST اجرا شود
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN missing' });

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const dirPath = 'data/active';

  try {
    // 1. لیست کردن تمام فایل‌های کاربران
    const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${dirPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!listRes.ok) throw new Error('Failed to list files');
    const files = await listRes.json();

    let fixedCount = 0;

    for (const file of files) {
      if (!file.name.endsWith('.json')) continue;

      // 2. خواندن محتوای فایل کاربر
      const contentRes = await fetch(file.url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!contentRes.ok) continue;
      
      const rawData = await contentRes.json();
      const contentStr = Buffer.from(rawData.content, 'base64').toString('utf8');
      const userData = JSON.parse(contentStr);

      let needsUpdate = false;

      // 3. بررسی دستاوردها و پاکسازی Base64
      if (userData.achievements && Array.isArray(userData.achievements)) {
        userData.achievements.forEach(ach => {
          // اگر fileData وجود دارد ولی fileUrl هم هست (یا باید ساخته شود)، fileData را حذف کن
          if (ach.fileData && ach.fileData.length > 1000) {
            // اگر لینک نداریم، سعی کنیم لینک را از نام فایل بسازیم (فقط برای مواردی که قبلا آپلود شده‌اند)
            if (!ach.fileUrl && ach.fileName) {
               // فرض بر این است که فایل در پوشه uploads است
               ach.fileUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/uploads/${ach.fileName}`;
            }
            
            delete ach.fileData; // حذف کد سنگین Base64
            needsUpdate = true;
          }
        });
      }

      // 4. اگر تغییری ایجاد شد، فایل را آپدیت کن
      if (needsUpdate) {
        const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
        
        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, {
          method: 'PUT',
          headers: { 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            message: `Fix: Remove heavy Base64 from ${file.name}`,
            content: newContent,
            sha: rawData.sha,
            branch: 'main'
          })
        });
        
        fixedCount++;
        console.log(`Fixed: ${file.name}`);
      }
    }

    res.status(200).json({ success: true, message: `Successfully fixed ${fixedCount} files.` });

  } catch (error) {
    console.error('Fix Error:', error);
    res.status(500).json({ error: error.message });
  }
}
