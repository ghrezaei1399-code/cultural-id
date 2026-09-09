// api/update-achievement-status.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token is not configured' });

  const { cardCode, fileName, status, type, issueNumber } = req.body;
  
  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  // ============================================================
  // بخش جدید: مدیریت وضعیت مشاهدات (Observations)
  // ============================================================
  if (type === 'observation') {
    if (!issueNumber) {
      return res.status(400).json({ error: 'شماره Issue برای مشاهده الزامی است' });
    }

    try {
      // دریافت Issue فعلی
      const issueRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!issueRes.ok) {
        return res.status(404).json({ error: 'مشاهده با این شماره پیدا نشد' });
      }

      const issueData = await issueRes.json();
      const currentLabels = issueData.labels.map(l => l.name);

      // حذف لیبل‌های قدیمی وضعیت
      const statusLabels = ['pending-review', 'approved', 'rejected', 'pending'];
      const moduleLabels = currentLabels.filter(l => l.startsWith('module-'));
      const otherLabels = currentLabels.filter(l => !statusLabels.includes(l) && !l.startsWith('module-'));

      // تعیین لیبل‌های جدید
      let newLabels = [...otherLabels, ...moduleLabels];
      
      if (status === 'approved') {
        newLabels.push('approved');
        newLabels = newLabels.filter(l => l !== 'pending-review' && l !== 'pending');
      } else if (status === 'rejected') {
        newLabels.push('rejected');
        newLabels = newLabels.filter(l => l !== 'pending-review' && l !== 'pending');
      } else if (status === 'pending') {
        newLabels.push('pending-review');
        newLabels = newLabels.filter(l => l !== 'approved' && l !== 'rejected');
      } else {
        // وضعیت‌های دیگر (مثلاً module-success, module-revision, module-failed)
        newLabels.push(status);
      }

      // به‌روزرسانی Issue
      const updateRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          labels: newLabels,
          state: status === 'approved' ? 'closed' : 'open'
        })
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'خطا در به‌روزرسانی Issue');
      }

      // اگر تایید شد، در گالری اطلس ظهور نمایش داده شود
      if (status === 'approved') {
        // اضافه کردن به data/active/ برای گالری
        const atlasPath = `data/active/obs-${issueNumber}.json`;
        const atlasData = {
          issueNumber: issueNumber,
          approvedAt: new Date().toISOString(),
          status: 'active',
          source: 'observation'
        };

        const atlasContent = Buffer.from(JSON.stringify(atlasData, null, 2), 'utf8').toString('base64');
        
        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${atlasPath}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Observation #${issueNumber} approved and added to Atlas`,
            content: atlasContent,
            branch: 'main'
          })
        }).catch(e => console.error('Error adding to atlas:', e));
      }

      return res.status(200).json({
        success: true,
        message: status === 'approved' ? '✅ مشاهده تایید و به اطلس ظهور اضافه شد.' :
                  status === 'rejected' ? '❌ مشاهده رد شد.' :
                  '⏳ وضعیت مشاهده بروزرسانی شد.',
        status: status,
        issueNumber: issueNumber
      });

    } catch (error) {
      console.error('Update Observation Status Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // بخش اصلی: مدیریت دستاوردها (Achievements) - بدون تغییر
  // ============================================================
  if (!cardCode || !fileName) {
    return res.status(400).json({ error: 'اطلاعات ناقص است (کد کاربر و نام فایل الزامی است)' });
  }

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
    const achIndex = userData.achievements ? userData.achievements.findIndex(a => a.id === fileName) : -1;

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
