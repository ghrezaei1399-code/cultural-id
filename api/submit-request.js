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
  const fileName = `request-${Date.now()}.json`;
  const path = `data/requests/${fileName}`;

  const requestData = {
    cardCode,
    type,
    description: description || '',
    requestDate: new Date().toISOString(),
    status: 'pending'
  };

  const content = Buffer.from(JSON.stringify(requestData, null, 2), 'utf8').toString('base64');

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `New request: ${type} from ${cardCode}`,
        content,
        branch: 'main'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'خطا در ذخیره درخواست');
    }

    return res.status(200).json({ success: true, message: 'درخواست با موفقیت ثبت شد' });
  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
