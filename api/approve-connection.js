module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GH_TOKEN is not configured' });
  }

  const { fileName, action } = req.body;
  if (!fileName || !action) {
    return res.status(400).json({ error: 'نام فایل و نوع عملیات الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/requests/${fileName}`;

  try {
    // خواندن درخواست
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!fileResponse.ok) {
      return res.status(404).json({ error: 'درخواست یافت نشد' });
    }

    const fileData = await fileResponse.json();
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const requestData = JSON.parse(jsonString);

    if (action === 'approve') {
      requestData.status = 'approved';
      requestData.approvedAt = new Date().toISOString();
      
      // ===== اضافه شدن: ذخیره لیست ایمیل‌ها در فایل کاربر =====
      if (requestData.connections && requestData.connections.length > 0) {
        try {
          const userPath = `data/active/${requestData.senderCode}.json`;
          
          const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (userRes.ok) {
            const userDataRaw = await userRes.json();
            const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));
            
            // ذخیره لیست ایمیل‌ها در فایل کاربر
            userData.connectionsList = requestData.connections;
            userData.connectionsUpdatedAt = new Date().toISOString();
            
            const newUserContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
            
            await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Connection list delivered to ${requestData.senderCode}`,
                content: newUserContent,
                sha: userDataRaw.sha,
                branch: 'main'
              })
            });
          }
        } catch (userError) {
          console.error('Error updating user file:', userError);
          // ادامه می‌دهیم حتی اگر ذخیره‌سازی لیست با مشکل مواجه شود
        }
      }
      
    } else if (action === 'reject') {
      requestData.status = 'rejected';
      requestData.rejectedAt = new Date().toISOString();
    }

    // ذخیره تغییرات در فایل درخواست
    const newContent = Buffer.from(JSON.stringify(requestData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `${action === 'approve' ? 'Approved' : 'Rejected'} connection request: ${requestData.senderCode}`,
        content: newContent,
        sha: fileData.sha,
        branch: 'main'
      })
    });

    // ===== اضافه شدن: پیام موفقیت با جزئیات بیشتر =====
    const responseMessage = action === 'approve' 
      ? `✅ درخواست تایید شد. ${requestData.connections ? requestData.connections.length : 0} ایمیل به کاربر ارسال شد.` 
      : '❌ درخواست رد شد.';

    return res.status(200).json({ 
      success: true, 
      message: responseMessage,
      connectionsCount: requestData.connections ? requestData.connections.length : 0
    });

  } catch (error) {
    console.error('Approve Connection Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
