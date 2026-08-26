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

    // خواندن فایل کامل کاربر برای گرفتن اولویت‌ها و ایمیل
    const userPath = `data/active/${userEntry.cardCode}.json`;
    const userResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });

    if (!userResponse.ok) return res.status(404).json({ error: 'فایل کاربر یافت نشد' });

    const userFile = await userResponse.json();
    const userJsonString = Buffer.from(userFile.content, 'base64').toString('utf8');
    const userData = JSON.parse(userJsonString);

    // ۲. پیدا کردن هم‌فرهنگان بر اساس FIRST ONLY اولویت‌ها (نه متن)
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

        //  محاسبه شباهت فقط بر اساس آرایه priorities
        const similarityScore = calculatePrioritySimilarity(userData.priorities, otherData.priorities);

        if (similarityScore >= 40) { // حداقل ۰ درصد تطابق در اولویت‌ها
          culturalMatches.push({
            cardCode: otherEntry.cardCode,
            displayCode: otherEntry.displayCode || otherEntry.cardCode,
            similarityScore: similarityScore,
            country: otherEntry.country,
            rank: otherEntry.rank,
            // ⭐ بررسی وضعیت ایمیل برای ادمین
            hasEmail: !!otherData.communicationEmail, 
            email: otherData.communicationEmail || null // ایمیل فقط در سمت سرور/ادمین دیده می‌شود
          });
        }
      } catch (e) {
        console.error('Error reading user:', otherEntry.cardCode, e);
      }
    }

    // مرتب‌سازی بر اساس بیشترین شباهت اولویت‌ها
    culturalMatches.sort((a, b) => b.similarityScore - a.similarityScore);

    // ۳. ذخیره درخواست
    const fileName = `request-${Date.now()}.json`;
    const path = `data/requests/${fileName}`;

    const requestData = {
      cardCode: userEntry.cardCode,
      displayCode: userEntry.displayCode || userEntry.cardCode,
      requesterEmail: userData.communicationEmail || null, // ایمیل درخواست‌دهنده
      type,
      description: description || '',
      requestDate: new Date().toISOString(),
      status: 'pending',
      culturalMatches: culturalMatches.slice(0, 10) // ۱۰ هم‌فرهنگ برتر از نظر اولویت
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

// ⭐ الگوریتم هوشمند تطابق اولویت‌ها (بدون توجه به متن)
function calculatePrioritySimilarity(p1, p2) {
  if (!p1 || !p2 || p1.length !== 7 || p2.length !== 7) return 0;
  
  let score = 0;
  
  // ۱. پیدا کردن ۳ اولویت برتر هر کاربر (اعداد ۱، ۲ و ۳ در آرایه)
  const getTop3 = (arr) => arr.map((rank, index) => ({index, rank}))
                               .sort((a,b) => a.rank - b.rank)
                               .slice(0,3)
                               .map(x => x.index);
                               
  const top3_p1 = getTop3(p1);
  const top3_p2 = getTop3(p2);
  
  // ۲. بررسی اشتراک در ۳ اولویت اصلی (بسیار مهم - ۶ امتیاز)
  const overlap = top3_p1.filter(x => top3_p2.includes(x)).length;
  score += overlap * 20; // اگر هر ۳ تا یکی باشد = ۶۰ امتیاز

  // ۳. بررسی تطابق دقیق رتبه‌ها در کل ۷ ارزش (۴۰ امتیاز)
  for(let i = 0; i < 7; i++) {
    if(p1[i] === p2[i]) score += 5; // تطابق دقیق رتبه
    else if(Math.abs(p1[i] - p2[i]) === 1) score += 2; // رتبه‌های نزدیک
  }
  
  return Math.min(Math.round(score), 100);
}
