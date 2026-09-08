// api/get-request-by-tracking.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  const { trackingCode, type } = req.query;
  if (!trackingCode) {
    return res.status(400).json({ error: 'کد پیگیری الزامی است' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  // ===== اگر درخواست از نوع مشاهده (observation) باشد =====
  if (type === 'observation') {
    try {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${trackingCode}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: 'مشاهده‌ای با این کد پیدا نشد' });
        }
        throw new Error('خطا در ارتباط با گیت‌هاب');
      }

      const issueData = await response.json();

      const labels = issueData.labels.map(l => l.name);
      let status = 'pending';
      if (labels.includes('approved')) status = 'approved';
      else if (labels.includes('rejected')) status = 'rejected';

      const bodyLines = issueData.body.split('\n');
      let observation = '';
      let modules = [];
      let inObservation = false;
      let isPersian = false;
      
      // =============================================
      // استخراج اطلاعات از متن Issue
      // =============================================
      let cluster = 'human';
      let score = 3;
      let analysis = '';
      let guide = { individual: '', network: '', policy: '' };
      let matrix_emergence = '';
      let matrix_layers = '';
      let matrix_connections = '';
      let matrix_scale = '';
      let matrix_capacity = '';
      let aiStatus = 'pending';

      for (const line of bodyLines) {
        const trimmedLine = line.trim();
        
        // تشخیص زبان
        if (/[\u0600-\u06FF]/.test(trimmedLine)) {
          isPersian = true;
        }
        
        // استخراج متن مشاهده
        if (line.includes('**Observation:**') || line.includes('**مشاهده خام:**')) {
          inObservation = true;
          continue;
        }
        
        // استخراج ماژول
        if (line.includes('**Selected Module:**') || line.includes('**ماژول انتخاب‌شده:**')) {
          const mods = line.replace(/\\*\\*Selected Module:\\*\\*|\\*\\*ماژول انتخاب‌شده:\\*\\*/g, '').trim();
          if (mods && mods !== 'هیچ‌کدام' && mods !== 'None') {
            modules = mods.split(/[،,]/).map(m => m.trim());
          }
          continue;
        }
        
        // =============================================
        // استخراج AI Analysis
        // =============================================
        if (trimmedLine.includes('**🤖 AI Analysis:**') || trimmedLine.includes('**AI Analysis:**')) {
          let readingAI = true;
          // ادامه خطوط را می‌خوانیم تا به بخش بعدی برسیم
          continue;
        }
        
        // استخراج Status از AI Analysis
        if (trimmedLine.includes('**Status:**')) {
          const statusText = trimmedLine.replace('**Status:**', '').trim();
          if (statusText.includes('✅') || statusText.includes('تایید')) {
            aiStatus = 'approved';
          } else if (statusText.includes('❌') || statusText.includes('رد')) {
            aiStatus = 'rejected';
          }
          continue;
        }
        
        // استخراج Cluster
        if (trimmedLine.includes('**Cluster:**')) {
          const clusterText = trimmedLine.replace('**Cluster:**', '').trim();
          if (clusterText.includes('انسان') || clusterText.includes('Human')) cluster = 'human';
          else if (clusterText.includes('دانش') || clusterText.includes('Knowledge')) cluster = 'knowledge';
          else if (clusterText.includes('حکمرانی') || clusterText.includes('Governance')) cluster = 'governance';
          else if (clusterText.includes('بقا') || clusterText.includes('Survival')) cluster = 'survival';
          continue;
        }
        
        // استخراج Suggested Score
        if (trimmedLine.includes('**Suggested Score:**')) {
          const scoreMatch = trimmedLine.match(/\\d+/);
          if (scoreMatch) score = parseInt(scoreMatch[0]);
          continue;
        }
        
        // استخراج Analysis
        if (trimmedLine.includes('**Analysis:**')) {
          const analysisText = trimmedLine.replace('**Analysis:**', '').trim();
          if (analysisText && analysisText !== '---' && analysisText !== 'تحلیل' && analysisText !== 'Analysis') {
            analysis = analysisText;
          }
          continue;
        }
        
        // =============================================
        // استخراج ۵ ماتریس
        // =============================================
        if (trimmedLine.includes('**5 Matrices:**') || trimmedLine.includes('**۵ ماتریس:**')) {
          continue;
        }
        
        if (trimmedLine.includes('**Emergence:**') || trimmedLine.includes('**ظهورها:**')) {
          matrix_emergence = trimmedLine.replace(/\\*\\*Emergence:\\*\\*|\\*\\*ظهورها:\\*\\*/g, '').trim();
          if (matrix_emergence === '---') matrix_emergence = '';
          continue;
        }
        
        if (trimmedLine.includes('**Layers:**') || trimmedLine.includes('**لایه‌ها:**')) {
          matrix_layers = trimmedLine.replace(/\\*\\*Layers:\\*\\*|\\*\\*لایه‌ها:\\*\\*/g, '').trim();
          if (matrix_layers === '---') matrix_layers = '';
          continue;
        }
        
        if (trimmedLine.includes('**Connections:**') || trimmedLine.includes('**ارتباطات:**')) {
          matrix_connections = trimmedLine.replace(/\\*\\*Connections:\\*\\*|\\*\\*ارتباطات:\\*\\*/g, '').trim();
          if (matrix_connections === '---') matrix_connections = '';
          continue;
        }
        
        if (trimmedLine.includes('**Scale:**') || trimmedLine.includes('**مقیاس:**')) {
          matrix_scale = trimmedLine.replace(/\\*\\*Scale:\\*\\*|\\*\\*مقیاس:\\*\\*/g, '').trim();
          if (matrix_scale === '---') matrix_scale = '';
          continue;
        }
        
        if (trimmedLine.includes('**Capacity:**') || trimmedLine.includes('**ظرفیت:**')) {
          matrix_capacity = trimmedLine.replace(/\\*\\*Capacity:\\*\\*|\\*\\*ظرفیت:\\*\\*/g, '').trim();
          if (matrix_capacity === '---') matrix_capacity = '';
          continue;
        }
        
        // =============================================
        // استخراج Action Guide
        // =============================================
        if (trimmedLine.includes('**Action Guide:**') || trimmedLine.includes('**راهنما:**')) {
          continue;
        }
        
        if (trimmedLine.includes('**Individual:**') || trimmedLine.includes('**فردی:**')) {
          const guideText = trimmedLine.replace(/\\*\\*Individual:\\*\\*|\\*\\*فردی:\\*\\*/g, '').trim();
          if (guideText !== '---') guide.individual = guideText;
          continue;
        }
        
        if (trimmedLine.includes('**Network:**') || trimmedLine.includes('**شبکه‌ای:**')) {
          const guideText = trimmedLine.replace(/\\*\\*Network:\\*\\*|\\*\\*شبکه‌ای:\\*\\*/g, '').trim();
          if (guideText !== '---') guide.network = guideText;
          continue;
        }
        
        if (trimmedLine.includes('**Policy:**') || trimmedLine.includes('**سیاستی:**')) {
          const guideText = trimmedLine.replace(/\\*\\*Policy:\\*\\*|\\*\\*سیاستی:\\*\\*/g, '').trim();
          if (guideText !== '---') guide.policy = guideText;
          continue;
        }
        
        // ادامه جمع‌آوری متن مشاهده
        if (inObservation && trimmedLine && !trimmedLine.includes('---') && !trimmedLine.includes('**')) {
          observation += trimmedLine + ' ';
        }
        if (line.includes('---')) break;
      }
      
      observation = observation.trim() || issueData.body.substring(0, 200);

      // =============================================
      // خواندن moduleResult از پوشه data/module-results/
      // =============================================
      let moduleResult = null;
      try {
        const modulePath = `data/module-results/${trackingCode}.json`;
        const moduleRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${modulePath}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (moduleRes.ok) {
          const moduleData = await moduleRes.json();
          const moduleContent = JSON.parse(Buffer.from(moduleData.content, 'base64').toString('utf8'));
          moduleResult = moduleContent.moduleResult;
        }
      } catch (e) {
        console.error('Error reading module result:', e);
      }

      // =============================================
      // خروجی نهایی با تمام اطلاعات
      // =============================================
      return res.status(200).json({
        status: status,
        aiStatus: aiStatus,
        observation: observation,
        modules: modules,
        moduleResult: moduleResult,
        guide: guide,
        // ===== اطلاعات کامل AI =====
        cluster: cluster,
        score: score,
        analysis: analysis,
        matrix_emergence: matrix_emergence,
        matrix_layers: matrix_layers,
        matrix_connections: matrix_connections,
        matrix_scale: matrix_scale,
        matrix_capacity: matrix_capacity,
        issueUrl: issueData.html_url,
        createdAt: issueData.created_at
      });

    } catch (error) {
      console.error('Get Observation Status Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ===== منطق قبلی: دریافت وضعیت درخواست‌های ارتباط =====
  try {
    const listResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/requests`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!listResponse.ok) {
      return res.status(404).json({ error: 'درخواستی با این کد پیدا نشد' });
    }

    const files = await listResponse.json();
    
    if (!Array.isArray(files)) {
      return res.status(500).json({ error: 'خطا در ساختار فایل‌های درخواست' });
    }

    for (const file of files) {
      if (!file.name || !file.name.startsWith('request-') || !file.name.endsWith('.json')) continue;
      
      try {
        const fileRes = await fetch(file.url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        
        if (!fileRes.ok) continue;
        
        const fileData = await fileRes.json();
        const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
        const requestData = JSON.parse(jsonString);
        
        if (requestData.trackingCode === trackingCode) {
          return res.status(200).json({
            request: {
              status: requestData.status || 'pending',
              trackingCode: requestData.trackingCode || trackingCode,
              connections: requestData.connections || [],
              connectionsCount: (requestData.connections || []).length,
              createdAt: requestData.createdAt || requestData.requestDate || new Date().toISOString(),
              approvedAt: requestData.approvedAt || null,
              rejectedAt: requestData.rejectedAt || null
            }
          });
        }
      } catch (e) {
        console.error('Error reading request file:', file.name, e);
        continue;
      }
    }

    return res.status(404).json({ error: 'درخواستی با این کد پیدا نشد' });

  } catch (error) {
    console.error('Get Request By Tracking Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
