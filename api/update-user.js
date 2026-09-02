// api/update-user.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN not configured' });
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

    const { cardCode, communicationEmail, values, priorities, updateIndex } = parsedBody;

    if (!cardCode) {
      return res.status(400).json({ error: 'کد کارت الزامی است' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const userPath = `data/active/${cardCode}.json`;

    // دریافت اطلاعات کاربر
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

    // ============================================================
    // ===== اصلاح: ذخیره تغییرات به صورت آبجکت با مقدار جدید =====
    // ============================================================
    if (!userData.pendingChanges) {
      userData.pendingChanges = {};
    }

    // ۱. تغییر ایمیل - ذخیره مقدار جدید
    if (communicationEmail !== undefined) {
      // ذخیره مقدار جدید در pendingChanges
      userData.pendingChanges.communicationEmail = communicationEmail;
    }

    // ۲. تغییر ارزش‌ها - ذخیره مقدار جدید
    if (values && priorities) {
      if (updateIndex !== undefined) {
        // تغییر تکی - ذخیره مقدار جدید
        const newValue = values[updateIndex];
        const newPriority = priorities[updateIndex];
        
        userData.pendingChanges[`value_${updateIndex}`] = newValue;
        userData.pendingChanges[`priority_${updateIndex}`] = newPriority;
        
      } else {
        // تغییر کامل
        userData.pendingChanges.values = values;
        userData.pendingChanges.priorities = priorities;
      }
    }

    // ثبت زمان درخواست
    userData.lastEditRequest = new Date().toISOString();
    userData.status = 'pending_edit';

    const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Edit request for ${cardCode}`,
        content: newContent,
        sha: userDataRaw.sha,
        branch: 'main'
      })
    });

    return res.status(200).json({
      success: true,
      message: 'تغییرات با موفقیت ثبت شد و منتظر تأیید ادمین است.',
      pendingChanges: userData.pendingChanges
    });

  } catch (error) {
    console.error('Update User Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
