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

    const { cardCode, field, newValue, communicationEmail, values, priorities } = parsedBody;

    if (!cardCode) {
      return res.status(400).json({ error: 'کد کارت الزامی است' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const userPath = `data/active/${cardCode}.json`;

    // ===== ۱. دریافت اطلاعات کاربر =====
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

    // ===== ۲. بررسی محدودیت ویرایش =====
    if (userData.editLocked === true) {
      return res.status(403).json({ 
        error: '⚠️ شما قبلاً درخواست ویرایش داده‌اید که تأیید شده است. امکان ویرایش مجدد وجود ندارد.' 
      });
    }

    if (userData.lastEditRequest) {
      return res.status(403).json({ 
        error: '⚠️ شما قبلاً درخواست ویرایش داده‌اید که هنوز بررسی نشده است. لطفاً صبر کنید.' 
      });
    }

    // ===== ۳. ذخیره نسخه پشتیبان (previousValues) =====
    userData.previousValues = {
      values: userData.values || [],
      priorities: userData.priorities || [],
      optionalCode: userData.optionalCode || '',
      communicationEmail: userData.communicationEmail || ''
    };

    // ===== ۴. ایجاد pendingChanges به صورت آبجکت =====
    if (!userData.pendingChanges) {
      userData.pendingChanges = {};
    }

    // ===== ۵. ذخیره تغییرات =====
    if (field && newValue !== undefined) {
      // حالت تکی (ویرایش یک فیلد)
      userData.pendingChanges[field] = newValue;
    } else {
      // حالت کلی (ویرایش چند فیلد همزمان)
      if (communicationEmail !== undefined) {
        userData.pendingChanges.communicationEmail = communicationEmail;
      }
      if (values) {
        userData.pendingChanges.values = values;
      }
      if (priorities) {
        userData.pendingChanges.priorities = priorities;
      }
    }

    // ===== ۶. تولید کد پیگیری =====
    const trackingCode = `EDIT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    userData.lastEditRequest = new Date().toISOString();
    userData.status = 'pending_edit';
    userData.editTrackingCode = trackingCode;

    // ===== ۷. ذخیره در گیت‌هاب =====
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

    // ===== ۸. بازگشت نتیجه =====
    const fieldLabels = {
      'communicationEmail': 'ایمیل ارتباطی',
      'values': 'ارزش‌های فرهنگی',
      'priorities': 'اولویت‌ها'
    };

    const changedFields = Object.keys(userData.pendingChanges).map(key => 
      fieldLabels[key] || key
    ).join('، ');

    return res.status(200).json({
      success: true,
      message: '✅ درخواست ویرایش با موفقیت ثبت شد.',
      trackingCode: trackingCode,
      changedFields: changedFields,
      pendingChanges: userData.pendingChanges,
      status: 'pending_edit'
    });

  } catch (error) {
    console.error('Update User Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
