export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'کد کارت الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  // نرمال‌سازی کد ورودی (حذف فاصله و خط تیره، تبدیل به حروف بزرگ)
  const normalizedInput = code.replace(/[\s\-]/g, '').toUpperCase();

  try {
    // ===== مرحله ۱: جستجوی مستقیم فایل کاربر =====
    // این سریع‌ترین روش است و همیشه کار می‌کند
    const directPath = `data/active/${code}.json`;
    const directResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${directPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (directResponse.ok) {
      const fileData = await directResponse.json();
      const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
      const userData = JSON.parse(jsonString);
      return res.status(200).json({ user: userData });
    }

    // ===== مرحله ۲: اگر نام فایل نبود، در index.json جستجو کن =====
    const indexPath = 'data/index.json';
    const indexResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache' // جلوگیری از کش
      }
    });

    if (!indexResponse.ok) {
      return res.status(404).json({ error: 'فایل فهرست یافت نشد. لطفاً با ادمین تماس بگیرید.' });
    }

    const indexFile = await indexResponse.json();
    const jsonString = Buffer.from(indexFile.content, 'base64').toString('utf8');
    const indexData = JSON.parse(jsonString);

    // جستجو در index.json
    let matchedEntry = null;

    for (const entry of indexData) {
      // بررسی تطابق با cardCode اصلی
      if (entry.cardCode && entry.cardCode.replace(/[\s\-]/g, '').toUpperCase() === normalizedInput) {
        matchedEntry = entry;
        break;
      }
      
      // بررسی تطابق با displayCode (کد روی کارت)
      if (entry.displayCode && entry.displayCode.replace(/[\s\-]/g, '').toUpperCase() === normalizedInput) {
        matchedEntry = entry;
        break;
      }
    }

    if (!matchedEntry) {
      return res.status(404).json({ 
        error: 'کد کارت یافت نشد. لطفاً کد درج‌شده روی کارت خود را دقیقاً وارد کنید.',
        hint: 'مثال: CIM-1234-5678-AB'
      });
    }

    // ===== مرحله ۳: خواندن فایل کامل کاربر =====
    const userPath = `data/active/${matchedEntry.cardCode}.json`;
    const userResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Cache-Control': 'no-cache'
      }
    });

    if (!userResponse.ok) {
      return res.status(404).json({ error: 'فایل کاربر یافت نشد.' });
    }

    const userFile = await userResponse.json();
    const userJsonString = Buffer.from(userFile.content, 'base64').toString('utf8');
    const userData = JSON.parse(userJsonString);

    return res.status(200).json({ user: userData });

  } catch (error) {
    console.error('API Get User Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
