// api/delete-user.js
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
    const { cardCode, reason } = req.body;

    if (!cardCode) {
      return res.status(400).json({ error: 'کد کارت الزامی است' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const userPath = `data/active/${cardCode}.json`;
    const indexPath = 'data/index.json';

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
    const userSha = userDataRaw.sha;
    const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

    // ===== ۲. انتقال به آرشیو (قبل از حذف) =====
    const archivePath = `data/archive/${cardCode}-${Date.now()}.json`;
    const archiveContent = Buffer.from(JSON.stringify({
      ...userData,
      deletedAt: new Date().toISOString(),
      deleteReason: reason || 'حذف توسط کاربر',
      deletedBy: 'user'
    }, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${archivePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `User ${cardCode} deleted by self`,
        content: archiveContent,
        branch: 'main'
      })
    });

    // ===== ۳. حذف فایل کاربر از active =====
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `User ${cardCode} deleted by self`,
        sha: userSha,
        branch: 'main'
      })
    });

    // ===== ۴. حذف از index.json =====
    const indexRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (indexRes.ok) {
      const indexFile = await indexRes.json();
      const indexSha = indexFile.sha;
      const indexData = JSON.parse(Buffer.from(indexFile.content, 'base64').toString('utf8'));

      const newIndex = indexData.filter(entry => entry.cardCode !== cardCode);

      const newIndexContent = Buffer.from(JSON.stringify(newIndex, null, 2), 'utf8').toString('base64');

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${indexPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Remove user ${cardCode} from index`,
          content: newIndexContent,
          sha: indexSha,
          branch: 'main'
        })
      });
    }

    return res.status(200).json({
      success: true,
      message: 'حساب کاربری شما با موفقیت حذف شد.'
    });

  } catch (error) {
    console.error('Delete User Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
