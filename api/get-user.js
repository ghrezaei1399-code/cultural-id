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

  // نرمال‌سازی کد ورودی (حذف فاصله و خط تیره)
  const normalizedInput = code.replace(/[\s\-]/g, '').toUpperCase();

  try {
    // ⭐ مرحله ۱: خواندن index.json (فقط ۱ درخواست)
    const indexPath = 'data/index.json';
    const indexResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!indexResponse.ok) {
      throw new Error('فایل فهرست یافت نشد');
    }

    const indexFile = await indexResponse.json();
    const jsonString = Buffer.from(indexFile.content, 'base64').toString('utf8');
    const indexData = JSON.parse(jsonString);

    // جستجو در فهرست
    let matchedUser = null;

    for (const entry of indexData) {
      // بررسی تطابق با cardCode اصلی
      if (entry.cardCode.replace(/[\s\-]/g, '').toUpperCase() === normalizedInput) {
        matchedUser = entry;
        break;
      }
      
      // بررسی تطابق با displayCode (کد روی کارت)
      if (entry.displayCode && entry.displayCode.replace(/[\s\-]/g, '').toUpperCase() === normalizedInput) {
        matchedUser = entry;
        break;
      }
    }

    if (!matchedUser) {
      return res.status(404).json({ error: 'کد کارت یافت نشد. لطفاً کد درج‌شده روی کارت خود را دقیقاً وارد کنید.' });
    }

    // ⭐ مرحله : خواندن فایل کامل کاربر (فقط  درخواست دیگر)
    const userPath = `data/active/${matchedUser.cardCode}.json`;
    const userResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!userResponse.ok) {
      throw new Error('فایل کاربر یافت نشد');
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
