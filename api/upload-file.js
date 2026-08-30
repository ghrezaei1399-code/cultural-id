// api/upload-file.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });

  try {
    const { fileData, fileName } = req.body;
    if (!fileData || !fileName) return res.status(400).json({ error: 'اطلاعات فایل ناقص است' });

    // ساخت نام یکتا برای جلوگیری از تداخل
    const ext = fileName.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    const filePath = `uploads/${uniqueName}`;

    // حذف هدر Base64 برای ذخیره خالص
    const base64Content = fileData.replace(/^data:[^;]+;base64,/, '');

    // آپلود به گیت‌هاب
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
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

    // برگرداندن آدرس عمومی
    const publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
    return res.status(200).json({ success: true, url: publicUrl, fileName: uniqueName });

  } catch (error) {
    console.error('Upload Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
