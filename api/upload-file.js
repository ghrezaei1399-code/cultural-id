// api/upload-file.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN not configured' });

  try {
    // خواندن صحیح داده‌های JSON از بدنه درخواست
    const body = await req.json();
    const { fileData, fileName } = body;

    // اعتبارسنجی ورودی‌ها
    if (!fileData || !fileName) {
      return res.status(400).json({ error: 'Missing fileData or fileName in request body' });
    }

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';
    
    // ساخت نام یکتا برای جلوگیری از تداخل
    const ext = fileName.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    const filePath = `uploads/${uniqueName}`;

    // حذف هدر Base64 برای ذخیره خالص باینری
    const base64Content = fileData.replace(/^data:[^;]+;base64,/, '');

    // آپلود به گیت‌هاب
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

    // برگرداندن آدرس عمومی فایل
    const publicUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`;
    return res.status(200).json({ success: true, url: publicUrl, fileName: uniqueName });

  } catch (error) {
    console.error('Upload File Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
