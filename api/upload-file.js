// api/upload-file.js (نسخه بدون نیاز به پکیج اضافی)
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });

  try {
    // خواندن بدنه درخواست به صورت دستی
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    const parsedBody = JSON.parse(body);
    const { fileData, fileName } = parsedBody;

    if (!fileData || !fileName) {
      return res.status(400).json({ error: 'Missing fileData or fileName in request body' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    
    const ext = fileName.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `uploads/${uniqueName}`;

    const base64Content = fileData.replace(/^data:[^;]+;base64,/, '');

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Upload media: ${uniqueName}`,
        content: base64Content,
        branch: 'main'
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to upload to GitHub');
    }

    const publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
    return res.status(200).json({ success: true, url: publicUrl, fileName: uniqueName });

  } catch (error) {
    console.error('Upload File Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
