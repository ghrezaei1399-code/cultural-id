export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  const { cardCode, type, description } = req.body;
  if (!cardCode || !type) {
    return res.status(400).json({ error: 'کد کارت و نوع درخواست الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  try {
    // ۱. خواندن index.json
    const indexPath = 'data/index.json';
    const indexResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!indexResponse.ok) throw new Error('فایل فهرست یافت نشد');

    const indexFile = await indexResponse.json();
    const jsonString = Buffer.from(indexFile.content, 'base64').toString('utf8');
    const indexData = JSON.parse(jsonString);

    // پیدا کردن کاربر درخواست‌دهنده
    const normalizedInput = cardCode.replace(/[\s\-]/g, '').toUpperCase();
    let userEntry = null;
    for (const entry of indexData) {
      if (entry.cardCode.replace(/[\s\-]/g, '').toUpperCase() === normalizedInput) {
        userEntry = entry;
        break;
      }
    }

    if (!userEntry) return res.status(404).json({ error: 'کاربر یافت نشد' });

    // ۲. خواندن فایل کامل کاربر (برای گرفتن ایمیل و اولویت‌ها)
    const userPath = `data/active/${userEntry.cardCode}.json`;
    const userResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!userResponse.ok) return res.status(404).json({ error: 'فایل کاربر یافت نشد' });

    const userFile = await userResponse.json();
    const userJsonString = Buffer.from(userFile.content, 'base64').toString('utf8');
    const userData = JSON.parse(userJsonString);

    // ⭐ بررسی تکراری نبودن درخواست (جلوگیری از مشکل ۱)
    const requestsPath = 'data/requests';
    const requestsListResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestsPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (requestsListResponse.ok) {
      const requestFiles = await requestsListResponse.json();
      if (Array.isArray(requestFiles)) {
        for (const file of requestFiles) {
          if (!file.name.endsWith('.json')) continue;
          try {
            const fileRes = await fetch(file.url, {
              headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
            });
            const fileData = await fileRes.json();
            const contentStr = Buffer.from(fileData.content, 'base64').toString('utf8');
            const existingReq = JSON.parse(contentStr);
            
            // اگر همین کاربر، همین نوع درخواست، و وضعیت pending دارد → رد کن
            if (existingReq.cardCode === userEntry.cardCode && 
                existingReq.type === type && 
                existingReq.status === 'pending') {
              return res.status(400).json({ 
                error: 'شما قبلاً این درخواست را ثبت کرده‌اید و در انتظار بررسی است.' 
              });
            }
          } catch (e) { /* ignore */ }
        }
      }
    }

    // ۳. پیدا کردن هم‌فرهنگان با الگوریتم انعطاف‌پذیر (حل مشکل ۲)
    const approvedUsers = indexData.filter(u => 
      u.status === 'approved' && 
      u.rank <= 200 && 
      u.cardCode !== userEntry.cardCode
    );

    const culturalMatches = [];

    for (const otherEntry of approvedUsers) {
      try {
        const otherPath = `data/active/${otherEntry.cardCode}.json`;
        const otherResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${otherPath}`, {
          headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!otherResponse.ok) continue;

        const otherFile = await otherResponse.json();
        const otherJsonString = Buffer.from(otherFile.content, 'base64').toString('utf8');
        const otherData = JSON.parse(otherJsonString);

        const similarityScore = calculatePrioritySimilarity(userData.priorities, otherData.priorities);

        // ⭐ آستانه را به ۲٪ کاهش دادیم (انعطاف‌پذیرتر)
        if (similarityScore >= 20) {
          culturalMatches.push({
            cardCode: otherEntry.cardCode,
            displayCode: otherEntry.displayCode || otherEntry.cardCode,
            similarityScore: similarityScore,
            country: otherEntry.country,
            rank: otherEntry.rank,
            hasEmail: !!otherData.communicationEmail,
            email: otherData.communicationEmail || null
          });
        }
      } catch (e) {
        console.error('Error reading user:', otherEntry.cardCode, e);
      }
    }

    culturalMatches.sort((a, b) => b.similarityScore - a.similarityScore);

    // ۴. ذخیره درخواست
    const fileName = `request-${Date.now()}.json`;
    const path = `data/requests/${fileName}`;

    const requestData = {
      cardCode: userEntry.cardCode,
      displayCode: userEntry.displayCode || userEntry.cardCode,
      // ⭐ ایمیل را مستقیماً از فایل کاربر می‌خوانیم (حل مشکل ۳)
      requesterEmail: userData.communicationEmail || null,
      requesterPriorities: userData.priorities || [],
      type,
      description: description || '',
      requestDate: new Date().toISOString(),
      status: 'pending',
      culturalMatches: culturalMatches.slice(0, 10)
    };

    const content = Buffer.from(JSON.stringify(requestData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `New connection request from ${userEntry.cardCode}`,
        content,
        branch: 'main'
      })
    });

    return res.status(200).json({ 
      success: true, 
      message: 'درخواست با موفقیت ثبت شد',
      matchesFound: culturalMatches.length
    });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

//  الگوریتم انعطاف‌پذیر تطابق اولویت‌ها
function calculatePrioritySimilarity(p1, p2) {
  // اگر هر کدام اولویت ندارند، امتیاز 
  if (!p1 || !p2 || p1.length === 0 || p2.length === 0) return 0;
  
  // پیدا کردن ارزش‌هایی که هر دو کاربر به آن‌ها اولویت داده‌اند (غیر از ۰ یا null)
  const validIndices = [];
  for (let i = 0; i < 7; i++) {
    if (p1[i] && p2[i] && p1[i] > 0 && p2[i] > 0) {
      validIndices.push(i);
    }
  }
  
  // اگر هیچ ارزش مشترکی ندارند که هر دو اولویت داده باشند
  if (validIndices.length === 0) return 0;
  
  let score = 0;
  
  // برای هر ارزش مشترک، اختلاف رتبه را محاسبه کن
  for (const idx of validIndices) {
    const diff = Math.abs(p1[idx] - p2[idx]);
    if (diff === 0) score += 15;        // تطابق کامل
    else if (diff === 1) score += 10;   // نزدیک
    else if (diff === 2) score += 5;    // نسبتاً نزدیک
    // diff >= 3: امتیازی نمی‌گیرد
  }
  
  // نرمال‌سازی بر اساس تعداد ارزش‌های مشترک
  const maxPossible = validIndices.length * 15;
  const normalizedScore = Math.round((score / maxPossible) * 100);
  
  return Math.min(normalizedScore, 100);
}
