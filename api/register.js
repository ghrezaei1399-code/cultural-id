module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    console.error('GH_TOKEN is missing');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // دریافت داده‌ها مستقیماً از req.body
    const { values, priorities, optionalCode, communicationEmail } = req.body;

    // اعتبارسنجی اولیه
    if (!values || !Array.isArray(values) || values.length < 7) {
      return res.status(400).json({ error: 'لطفاً تمام  ارزش فرهنگی را وارد کنید.' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // تولید کد کارت یکتا
    const part1 = Math.floor(1000 + Math.random() * 9000);
    const part2 = Math.floor(1000 + Math.random() * 9000);
    const part3 = Math.floor(10000 + Math.random() * 90000);
    const cardCode = `CIM-${part1}-${part2}-${part3}`;

    // پردازش کد اختیاری و ساخت displayCode
    const processedOptionalCode = optionalCode ? String(optionalCode).trim() : '';
    const displayCode = processedOptionalCode 
      ? `CIM - ${part1} - ${part2} - ${processedOptionalCode}` 
      : `CIM - ${part1} - ${part2}`;

    // ساخت آبجکت کامل کاربر
    const userData = {
      cardCode,
      displayCode,
      optionalCode: processedOptionalCode,
      values,
      priorities: priorities && Array.isArray(priorities) ? priorities.map(Number) : [1, 2, 3, 4, 5, 6, 7],
      communicationEmail: communicationEmail || null,
      registrationDate: new Date().toISOString(),
      status: 'pending',
      rank: 0,
      country: 'Unknown'
    };

    // ۱. ذخیره فایل اختصاصی کاربر در data/active/
    const userPath = `data/active/${cardCode}.json`;
    const userContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `New registration: ${cardCode}`,
        content: userContent,
        branch: 'main'
      })
    });

    // ۲. آپدیت index.json با مدیریت صحیح SHA
    const indexPath = 'data/index.json';
    let indexData = [];
    let sha = null;

    const indexRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (indexRes.ok) {
      const indexFile = await indexRes.json();
      sha = indexFile.sha;
      const jsonString = Buffer.from(indexFile.content, 'base64').toString('utf8');
      indexData = JSON.parse(jsonString);
    }

    // افزودن رکورد جدید به ایندکس
    indexData.push({
      cardCode,
      displayCode,
      optionalCode: processedOptionalCode,
      status: 'pending',
      rank: 0,
      country: 'Unknown',
      registrationDate: userData.registrationDate
    });

    const newIndexContent = Buffer.from(JSON.stringify(indexData, null, 2), 'utf8').toString('base64');

    const indexCommitBody = {
      message: `Add user ${cardCode} to index`,
      content: newIndexContent,
      branch: 'main'
    };

    if (sha) {
      indexCommitBody.sha = sha;
    }

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(indexCommitBody)
    });

    // پاسخ موفقیت‌آمیز با تمام فیلدهای لازم برای فرانت‌اند
    return res.status(200).json({
      success: true,
      cardCode,
      displayCode,
      optionalCode: processedOptionalCode,
      country: 'Unknown',
      rank: 0,
      message: 'ثبت‌نام با موفقیت انجام شد و در انتظار تأیید ادمین است.'
    });

  } catch (error) {
    console.error('Register Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
