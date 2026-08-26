export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  const { cardCode, status } = req.body;
  if (!cardCode || !status) {
    return res.status(400).json({ error: 'Card code and status are required' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/active/${cardCode}.json`;

  try {
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!fileResponse.ok) throw new Error('User file not found');

    const fileData = await fileResponse.json();
    
    // ⭐ decode صحیح
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const userData = JSON.parse(jsonString);

    userData.status = status;
    userData.statusUpdatedAt = new Date().toISOString();

    // ⭐ اگر ادمین ویرایش را تایید کرد، قفل ویرایش فعال شود
    if (status === 'approved' && userData.previousStatus === 'pending_edit') {
      userData.editLocked = true;
      userData.editLockedAt = new Date().toISOString();
    }

    // اگر ادمین ویرایش را رد کرد، به pending برمی‌گردد
    if (status === 'pending') {
      userData.lastEditRejectedAt = new Date().toISOString();
    }

    // ⭐ encode صحیح
    const newJsonString = JSON.stringify(userData, null, 2);
    const newContent = Buffer.from(newJsonString, 'utf8').toString('base64');

    const updateResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Admin action: Status changed to ${status} for ${cardCode}`,
        content: newContent,
        sha: fileData.sha
      })
    });

    if (!updateResponse.ok) throw new Error('Failed to update file in GitHub');

    return res.status(200).json({ success: true, message: 'Status updated successfully' });

  } catch (error) {
    console.error('API Update Status Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
