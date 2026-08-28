module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });

  const { cardCode, achievement } = req.body;
  if (!cardCode || !achievement) return res.status(400).json({ error: 'اطلاعات ناقص است' });

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const userPath = `data/active/${cardCode}.json`;

  try {
    // ۱. بررسی وضعیت کاربر
    const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!userRes.ok) return res.status(404).json({ error: 'کاربر یافت نشد' });

    const userData = JSON.parse(Buffer.from((await userRes.json()).content, 'base64').toString('utf8'));

    // ⭐ بررسی امنیتی: فقط کاربران تایید شده و ۲۰۰ نفر اول
    if (userData.status !== 'approved') {
      return res.status(403).json({ error: 'حساب کاربری شما هنوز توسط ادمین تایید نشده است.' });
    }
    if (userData.rank > 200) {
      return res.status(403).json({ error: 'امکان آپلود دستاورد فقط برای ۲۰۰ سفیر اول فعال است.' });
    }

    // ۲. افزودن دستاورد
    if (!userData.achievements) userData.achievements = [];
    achievement.status = 'pending';
    achievement.uploadDate = new Date().toISOString();
    userData.achievements.push(achievement);

    const newContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
    
    // نیاز به sha برای آپدیت
    const currentFile = await userRes.json();
    
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `Achievement uploaded by ${cardCode}`, content: newContent, sha: currentFile.sha, branch: 'main' })
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
