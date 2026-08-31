// api/submit-request.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  try {
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

    const { cardCode, type, description } = parsedBody;

    if (!cardCode) {
      return res.status(400).json({ error: 'کد کارت الزامی است' });
    }

    if (!description) {
      return res.status(400).json({ error: 'توضیح درخواست الزامی است' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // ===== 1. دریافت اطلاعات کاربر درخواست‌دهنده =====
    const userPath = `data/active/${cardCode}.json`;
    const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!userRes.ok) {
      if (userRes.status === 404) {
        return res.status(404).json({ error: 'کاربر یافت نشد' });
      }
      return res.status(userRes.status).json({ error: 'خطا در دریافت اطلاعات کاربر' });
    }

    const userDataRaw = await userRes.json();
    const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

    // ===== 2. دریافت لیست همه کاربران =====
    const allUsersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!allUsersRes.ok) {
      return res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
    }

    const allUsersList = await allUsersRes.json();
    
    // اطمینان از اینکه allUsersList یک آرایه است
    if (!Array.isArray(allUsersList)) {
      return res.status(500).json({ error: 'خطا در ساختار لیست کاربران' });
    }

    const allUsers = [];

    for (const file of allUsersList) {
      if (file.name && file.name.endsWith('.json')) {
        try {
          const userFileRes = await fetch(file.download_url);
          if (!userFileRes.ok) continue;
          const userData = await userFileRes.json();
          if (userData.status === 'approved' && userData.cardCode !== cardCode) {
            allUsers.push(userData);
          }
        } catch (e) {
          console.error('Error reading user file:', file.name, e);
          continue;
        }
      }
    }

    // ===== 3. پیدا کردن هم‌فکران بر اساس اولویت‌ها =====
    const senderValues = userData.values || [];
    const senderPriorities = userData.priorities || [];
    const senderEmail = userData.communicationEmail || '';

    const senderPriorityList = senderValues.map((value, index) => ({
      value: value,
      priority: (senderPriorities && senderPriorities[index]) || 999
    })).sort((a, b) => a.priority - b.priority);

    const scoredUsers = allUsers.map(user => {
      const userValues = user.values || [];
      const userPriorities = user.priorities || [];
      
      let score = 0;
      let matchCount = 0;
      
      senderPriorityList.forEach((senderItem) => {
        const userIndex = userValues.indexOf(senderItem.value);
        if (userIndex !== -1) {
          const userPriority = (userPriorities && userPriorities[userIndex]) || 999;
          const priorityDiff = Math.abs(senderItem.priority - userPriority);
          score += Math.max(0, 10 - priorityDiff);
          matchCount++;
        }
      });
      
      return {
        cardCode: user.cardCode || '---',
        displayCode: user.displayCode || user.cardCode || '---',
        country: user.country || 'نامشخص',
        rank: user.rank || 0,
        email: user.communicationEmail || '',
        hasEmail: !!(user.communicationEmail && user.communicationEmail.length > 5),
        matchScore: score,
        matchCount: matchCount,
        similarityScore: Math.round((matchCount / Math.max(1, Math.min(senderValues.length, userValues.length))) * 100) || 0
      };
    });

    // فیلتر کردن کاربرانی که حداقل ۳ ارزش مشترک دارند
    const likeMinded = scoredUsers
      .filter(u => u.matchCount >= 3)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 50);

    // استخراج ایمیل‌ها
    const connections = likeMinded
      .filter(u => u.hasEmail)
      .map(u => u.email);

    // ===== 4. ایجاد کد پیگیری =====
    const trackingCode = `TRK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // ===== 5. بررسی درخواست تکراری =====
    const requestsPath = 'data/requests';
    const requestsListResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestsPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (requestsListResponse.ok) {
      const requestFiles = await requestsListResponse.json();
      if (Array.isArray(requestFiles)) {
        for (const file of requestFiles) {
          if (!file.name || !file.name.endsWith('.json')) continue;
          try {
            const fileRes = await fetch(file.url, {
              headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
            });
            if (!fileRes.ok) continue;
            const fileData = await fileRes.json();
            const contentStr = Buffer.from(fileData.content, 'base64').toString('utf8');
            const existingReq = JSON.parse(contentStr);
            
            if (existingReq.senderCode === cardCode && 
                existingReq.type === (type || 'connection') && 
                existingReq.status === 'pending') {
              return res.status(400).json({ 
                error: 'شما قبلاً این درخواست را ثبت کرده‌اید و در انتظار بررسی است.' 
              });
            }
          } catch (e) { 
            console.error('Error checking existing request:', e);
            continue;
          }
        }
      }
    }

    // ===== 6. ذخیره درخواست =====
    const fileName = `request-${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
    const requestPath = `data/requests/${fileName}`;

    const requestData = {
      fileName: fileName,
      trackingCode: trackingCode,
      senderCode: cardCode,
      senderEmail: senderEmail,
      type: type || 'connection',
      reason: description,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      connections: connections,
      connectionsCount: connections.length,
      culturalMatches: likeMinded,
      totalMatches: likeMinded.length
    };

    const newContent = Buffer.from(JSON.stringify(requestData, null, 2), 'utf8').toString('base64');

    const saveRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Connection request from ${cardCode} - ${trackingCode}`,
        content: newContent,
        branch: 'main'
      })
    });

    if (!saveRes.ok) {
      const errorData = await saveRes.json().catch(() => ({}));
      throw new Error(errorData.message || 'خطا در ذخیره درخواست');
    }

    return res.status(200).json({
      success: true,
      trackingCode: trackingCode,
      requestId: fileName,
      connectionsCount: connections.length,
      matchesCount: likeMinded.length,
      message: 'درخواست شما با موفقیت ثبت شد'
    });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
