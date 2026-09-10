// api/update-achievement-status.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'Token is not configured' });

  // ===== دریافت و پارس بدنه درخواست =====
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }

  const { cardCode, fileName, status, type, issueNumber, trackingCode } = parsedBody;
  
  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  // ============================================================
  // بخش مدیریت وضعیت مشاهدات (Observations)
  // ============================================================
  if (type === 'observation') {
    if (!issueNumber) {
      return res.status(400).json({ error: 'شماره Issue برای مشاهده الزامی است' });
    }

    try {
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

      const statusLabels = ['pending-review', 'approved', 'rejected', 'pending'];
      const moduleLabels = currentLabels.filter(l => l.startsWith('module-'));
      const otherLabels = currentLabels.filter(l => !statusLabels.includes(l) && !l.startsWith('module-'));

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
        newLabels.push(status);
      }

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

      if (status === 'approved') {
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
  // بخش مدیریت وضعیت دستاوردها (Achievements) - با کد رهگیری
  // ============================================================
  if (type === 'achievement') {
    if (!trackingCode) {
      return res.status(400).json({ error: 'کد رهگیری دستاورد الزامی است' });
    }

    try {
      // ===== پیدا کردن فایل درخواست دستاورد =====
      const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!listRes.ok) {
        return res.status(404).json({ error: 'درخواستی یافت نشد' });
      }

      const files = await listRes.json();
      let targetFile = null;
      let targetData = null;

      for (const file of files) {
        if (!file.name.startsWith('achievement-') || !file.name.endsWith('.json')) continue;
        
        try {
          const fileRes = await fetch(file.url, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!fileRes.ok) continue;
          
          const fileData = await fileRes.json();
          const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
          const requestData = JSON.parse(jsonString);
          
          if (requestData.trackingCode === trackingCode) {
            targetFile = file;
            targetData = requestData;
            break;
          }
        } catch (e) { continue; }
      }

      if (!targetData) {
        return res.status(404).json({ error: 'دستاوردی با این کد رهگیری یافت نشد' });
      }

      // ===== به‌روزرسانی وضعیت در فایل درخواست =====
      targetData.status = status;
      targetData.updatedAt = new Date().toISOString();
      if (status === 'approved') targetData.approvedAt = new Date().toISOString();
      if (status === 'rejected') targetData.rejectedAt = new Date().toISOString();

      const updatedContent = Buffer.from(JSON.stringify(targetData, null, 2), 'utf8').toString('base64');

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${targetFile.path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Admin ${status} achievement: ${trackingCode}`,
          content: updatedContent,
          sha: targetFile.sha,
          branch: 'main'
        })
      });

      // ===== به‌روزرسانی وضعیت در فایل کاربر =====
      const senderCode = (targetData.senderCode || targetData.cardCode || '').trim();
      const userPath = `data/active/${senderCode}.json`;
      
      const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (userRes.ok) {
        const userDataRaw = await userRes.json();
        const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

        if (userData.achievements) {
          const achIndex = userData.achievements.findIndex(a => 
            a.id === trackingCode || 
            a.trackingCode === trackingCode ||
            a.id === targetData.achievementId
          );
          
          if (achIndex !== -1) {
            userData.achievements[achIndex].status = status;
            if (status === 'approved') {
              userData.achievements[achIndex].approvedAt = new Date().toISOString();
            }
            if (status === 'rejected') {
              userData.achievements[achIndex].rejectedAt = new Date().toISOString();
            }
          }
        }

        const newUserContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');

        await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: `Update achievement status in user file: ${trackingCode}`,
            content: newUserContent,
            sha: userDataRaw.sha,
            branch: 'main'
          })
        });
      }

      return res.status(200).json({
        success: true,
        message: status === 'approved' ? '✅ دستاورد تایید شد.' : '❌ دستاورد رد شد.',
        trackingCode: trackingCode
      });

    } catch (error) {
      console.error('Update Achievement Status Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ============================================================
  // بخش قدیمی: مدیریت دستاوردها با cardCode و fileName
  // ============================================================
  if (!cardCode || !fileName) {
    return res.status(400).json({ error: 'اطلاعات ناقص است (کد کاربر و نام فایل الزامی است)' });
  }

  const userPath = `data/active/${cardCode}.json`;

  try {
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!fileRes.ok) return res.status(404).json({ error: 'فایل کاربر یافت نشد' });
    
    const fileData = await fileRes.json();
    const userData = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf8'));

    const achIndex = userData.achievements ? userData.achievements.findIndex(a => a.id === fileName) : -1;

    if (achIndex === -1) {
      return res.status(404).json({ error: 'دستاورد با این نام فایل یافت نشد' });
    }

    userData.achievements[achIndex].status = status;
    
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
