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
  const path = 'data/active';

  // نرمال‌سازی کد ورودی کاربر (حذف فاصله‌ها و تبدیل به حروف بزرگ برای مقایسه‌ی دقیق)
  const normalizedInput = code.replace(/[\s\-]/g, '').toUpperCase();

  try {
    // ۱. تلاش اول: جستجوی مستقیم نام فایل (سریع‌ترین حالت)
    const directPath = `${path}/${code}.json`;
    const directResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${directPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (directResponse.ok) {
      const fileData = await directResponse.json();
      const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
      return res.status(200).json({ user: JSON.parse(jsonString) });
    }

    // ۲. تلاش دوم: اگر نام فایل نبود، یعنی کاربر "کد نمایشی روی کارت" را وارد کرده است.
    // باید در بین تمام فایل‌ها جستجو کنیم تا فایل منطبق را پیدا کنیم.
    const listResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!listResponse.ok) {
      throw new Error('Failed to fetch directory');
    }

    const files = await listResponse.json();
    const jsonFiles = files.filter(f => f.name.endsWith('.json'));

    for (const file of jsonFiles) {
      try {
        const fileRes = await fetch(file.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        const fileData = await fileRes.json();
        const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
        const userData = JSON.parse(jsonString);

        // ساخت کد نمایشی بر اساس داده‌های داخل فایل
        const parts = userData.cardCode.split('-');
        const part1 = parts[1] || '0000';
        const part2 = parts[2] || '0000';
        const opt = userData.optionalCode ? userData.optionalCode.trim() : '';
        
        // کد نمایشی ترکیبی: CIM + part1 + part2 + optionalCode
        const constructedDisplayCode = `CIM${part1}${part2}${opt}`.toUpperCase();

        // اگر کد وارد شده توسط کاربر با کد ساخته‌شده از فایل یکی بود، این همان کاربر است!
        if (normalizedInput === constructedDisplayCode) {
          return res.status(200).json({ user: userData });
        }

      } catch (e) {
        console.error('Error parsing file:', file.name, e);
      }
    }

    // اگر هیچ‌کدام مطابقت نداشت
    return res.status(404).json({ error: 'کد کارت یافت نشد. لطفاً کد درج‌شده روی کارت خود را دقیقاً وارد کنید.' });

  } catch (error) {
    console.error('API Get User Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
