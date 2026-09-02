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

      for (const line of bodyLines) {
        if (line.includes('**کد کارت:**')) {
          continue;
        }
        if (line.includes('**مشاهده خام:**')) {
          inObservation = true;
          continue;
        }
        if (line.includes('**ماژول انتخاب‌شده:**')) {
          const mods = line.replace('**ماژول انتخاب‌شده:**', '').trim();
          if (mods && mods !== 'هیچ‌کدام') {
            modules = mods.split('،').map(m => m.trim());
          }
          continue;
        }
        if (inObservation && line.trim() && !line.includes('---')) {
          observation += line.trim() + ' ';
        }
        if (line.includes('---')) break;
      }
      observation = observation.trim() || issueData.body.substring(0, 200);

      // ===== خواندن moduleResult از پوشه data/module-results/ =====
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

      // ===== استخراج بسته راهنما از کامنت‌ها =====
      let guide = null;
      if (status === 'approved') {
        try {
          const commentsResponse = await fetch(issueData.comments_url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/vnd.github.v3+json'
            }
          });
          if (commentsResponse.ok) {
            const comments = await commentsResponse.json();
            for (const comment of comments) {
              if (comment.body && comment.body.includes('### بسته راهنمای اقدام عملی')) {
                const lines = comment.body.split('\n');
                let currentLevel = '';
                const levels = { individual: '', network: '', policy: '' };
                
                for (const line of lines) {
                  const trimmedLine = line.trim();
                  if (trimmedLine.includes('سطح فردی') || trimmedLine.includes('اقدام شخصی')) {
                    currentLevel = 'individual';
                    continue;
                  } else if (trimmedLine.includes('سطح شبکه‌ای') || trimmedLine.includes('کنشگری جمعی')) {
                    currentLevel = 'network';
                    continue;
                  } else if (trimmedLine.includes('سطح سیاستی') || trimmedLine.includes('تأثیر ساختاری')) {
                    currentLevel = 'policy';
                    continue;
                  } else if (trimmedLine.startsWith('---') && currentLevel) {
                    continue;
                  } else if (currentLevel && trimmedLine && !trimmedLine.startsWith('*') && !trimmedLine.startsWith('📍')) {
                    if (levels[currentLevel]) {
                      levels[currentLevel] += ' ' + trimmedLine;
                    } else {
                      levels[currentLevel] = trimmedLine;
                    }
                  }
                }
                
                for (const key of ['individual', 'network', 'policy']) {
                  if (levels[key]) {
                    levels[key] = levels[key].trim();
                  }
                }
                
                guide = levels;
                break;
              }
            }
          }
        } catch (e) {
          console.error('Error fetching comments:', e);
        }
      }

      return res.status(200).json({
        status: status,
        observation: observation,
        modules: modules,
        moduleResult: moduleResult,
        guide: guide,
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
