module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GH_TOKEN;
  if (!token) return res.status(500).json({ error: 'GH_TOKEN is not configured' });

  const { cardCode, status } = req.body;
  if (!cardCode || !status) return res.status(400).json({ error: 'اطلاعات ناقص است' });

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';
  const path = `data/active/${cardCode}.json`;

  try {
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!fileResponse.ok) throw new Error('فایل یافت نشد');

    const fileData = await fileResponse.json();
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const userData = JSON.parse(jsonString);

    // ============================================================
    // ===== منطق تایید یا رد ویرایش =====
    // ============================================================
    if (userData.status === 'pending_edit') {
      
      if (status === 'approved') {
        // ============================================================
        // ===== تأیید ویرایش: اعمال تغییرات از pendingChanges =====
        // ============================================================
        const pending = userData.pendingChanges || {};
        
        // ۱. اعمال تغییرات کامل ارزش‌ها
        if (pending.values) {
          userData.values = pending.values;
          userData.priorities = pending.priorities || userData.priorities;
        }
        
        // ۲. اعمال تغییرات تکی ارزش‌ها
        for (let i = 0; i < 7; i++) {
          const key = `value_${i}`;
          const priorityKey = `priority_${i}`;
          if (pending[key] !== undefined) {
            if (!userData.values) userData.values = [];
            userData.values[i] = pending[key];
          }
          if (pending[priorityKey] !== undefined) {
            if (!userData.priorities) userData.priorities = [];
            userData.priorities[i] = pending[priorityKey];
          }
        }
        
        // ۳. اعمال تغییر ایمیل
        if (pending.communicationEmail !== undefined) {
          userData.communicationEmail = pending.communicationEmail;
        }
        
        // ۴. پاک کردن pendingChanges
        userData.pendingChanges = {};
        userData.editLocked = true;
        userData.previousValues = undefined;
        
      } else if (status === 'pending') {
        // ============================================================
        // ===== رد ویرایش: برگشت به حالت قبل =====
        // ============================================================
        if (userData.previousValues) {
          userData.values = userData.previousValues.values;
          userData.optionalCode = userData.previousValues.optionalCode;
          userData.communicationEmail = userData.previousValues.communicationEmail;
          
          const parts = userData.cardCode.split('-');
          const opt = userData.previousValues.optionalCode?.trim() || '';
          userData.displayCode = opt ? `CIM - ${parts[1]} - ${parts[2]} - ${opt}` : `CIM - ${parts[1]} - ${parts[2]}`;
          
          userData.previousValues = undefined;
        }
        userData.pendingChanges = {};
      }
    }

    userData.status = status;
    userData.statusUpdatedAt = new Date().toISOString();

    const newJsonString = JSON.stringify(userData, null, 2);
    const newContent = Buffer.from(newJsonString, 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: `Admin action: ${status} for ${cardCode}`, 
        content: newContent, 
        sha: fileData.sha, 
        branch: 'main' 
      })
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
