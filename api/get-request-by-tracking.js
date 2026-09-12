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

  // ===== اگر درخواست از نوع دستاورد (achievement) باشد =====
  if (type === 'achievement') {
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
        if (!file.name || !file.name.startsWith('achievement-') || !file.name.endsWith('.json')) continue;
        
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
                trackingCode: requestData.trackingCode,
                title: requestData.title,
                description: requestData.description,
                category: requestData.category,
                fileUrl: requestData.fileUrl,
                createdAt: requestData.createdAt,
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
      console.error('Get Achievement Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

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

      let moduleStatus = 'pending';
      for (const label of labels) {
        if (label.startsWith('module-')) {
          moduleStatus = label.replace('module-', '');
          break;
        }
      }

      // ===== پارس بدنه Issue با تابع مشترک =====
      const parsed = parseIssueBody(issueData.body || '');

      // ===== تشخیص زبان =====
      const isPersian = /[\u0600-\u06FF]/.test(issueData.body || '');

      // ===== دریافت پاسخ‌های هم‌فرهنگ =====
      const peerResponses = [];
      try {
        const commentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${trackingCode}/comments`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        });
        if (commentsRes.ok) {
          const comments = await commentsRes.json();
          for (const comment of comments) {
            const body = comment.body || '';
            if (body.includes('📝 پاسخ هم‌فرهنگ') || body.includes('Peer Response')) {
              const peerMatch = body.match(/هم‌فرهنگ:\s*(.+)/) || body.match(/Peer:\s*(.+)/);
              const resultMatch = body.match(/نتیجه:\s*(.+)/) || body.match(/Result:\s*(.+)/);
              const responseMatch = body.match(/پاسخ:\s*(.+)/) || body.match(/Response:\s*(.+)/);
              
              if (peerMatch && responseMatch) {
                peerResponses.push({
                  peerCode: peerMatch[1].trim().replace(/\*\*/g, ''),
                  result: resultMatch ? resultMatch[1].trim().replace(/\*\*/g, '') : 'success',
                  response: responseMatch[1].trim().replace(/\*\*/g, ''),
                  timestamp: comment.created_at,
                  commentId: comment.id
                });
              }
            }
          }
        }
      } catch (e) {
        console.error('Error reading peer responses:', e);
      }

      // ===== خروجی نهایی =====
      return res.status(200).json({
        status: status,
        aiStatus: 'approved',
        observation: parsed.observation,
        modules: parsed.module ? [parsed.module] : [],
        moduleResult: null,
        moduleStatus: moduleStatus,
        moduleType: parsed.moduleType,
        moduleData: parsed.moduleData,
        moduleAnalysis: parsed.moduleAnalysis,
        modulePeers: parsed.modulePeers,
        peerResponses: peerResponses,
        peerResponsesCount: peerResponses.length,
        guide: parsed.guide,
        cluster: parsed.cluster,
        score: parsed.score,
        analysis: parsed.analysis,
        matrix_emergence: parsed.matrix_emergence,
        matrix_layers: parsed.matrix_layers,
        matrix_connections: parsed.matrix_connections,
        matrix_scale: parsed.matrix_scale,
        matrix_capacity: parsed.matrix_capacity,
        ai3Final: parsed.ai3Final,
        ai3Error: parsed.ai3Error,
        aiErrors: parsed.aiErrors,
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


// ============================================================
// تابع کمکی: نرمال‌سازی خط
// حذف ** و - از ابتدا
// ============================================================
function normalizeLine(line) {
  return (line || '')
    .replace(/\*\*/g, '')
    .replace(/^[-•*]\s+/, '')
    .trim();
}


// ============================================================
// تابع اصلی: پارس بدنه Issue
// ============================================================
function parseIssueBody(body) {
  const result = {
    cardCode: '',
    observation: '',
    module: '',
    score: null,
    cluster: 'other',
    analysis: '',
    guide: { individual: '', network: '', policy: '' },
    matrix_emergence: '',
    matrix_layers: '',
    matrix_connections: '',
    matrix_scale: '',
    matrix_capacity: '',
    ai3Final: '',
    ai3Error: null,
    aiErrors: '',
    moduleType: '',
    moduleData: [],
    moduleAnalysis: '',
    modulePeers: []
  };

  if (!body) return result;

  const lines = body.split('\n');

  // ===== مرحله ۱: استخراج AI-3 (چند خطی) =====
  let ai3Start = -1;
  let ai3End = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const norm = normalizeLine(lines[i]);
    if (norm.includes('AI-3 Final Synthesis')) {
      ai3Start = i + 1;
      break;
    }
  }
  if (ai3Start !== -1) {
    for (let i = ai3Start; i < lines.length; i++) {
      const norm = normalizeLine(lines[i]);
      if (norm === '---' || 
          norm.startsWith('📌') ||
          norm.startsWith('Module Result') ||
          norm.startsWith('AI Errors:') ||
          norm.startsWith('Module Status:') ||
          norm.startsWith('Tracking Code:') ||
          norm.startsWith('Card Code:')) {
        ai3End = i;
        break;
      }
    }
    const ai3Lines = [];
    for (let i = ai3Start; i < ai3End; i++) {
      const norm = normalizeLine(lines[i]);
      if (!norm) continue;
      if (norm.includes('AI3_FAILED') || norm.startsWith('⚠️')) {
        result.ai3Error = 'AI3_FAILED';
      } else if (!norm.startsWith('Error Code:')) {
        ai3Lines.push(norm);
      }
    }
    result.ai3Final = ai3Lines.join(' ').trim();
  }

  // ===== مرحله ۲: استخراج بقیه فیلدها =====
  let inObservation = false;
  let inModuleSection = false;
  const observationLines = [];

  for (let i = 0; i < lines.length; i++) {
    const norm = normalizeLine(lines[i]);
    if (!norm) continue;

    // --- Card Code ---
    if (norm.startsWith('Card Code:')) {
      result.cardCode = norm.substring('Card Code:'.length).trim();
      continue;
    }

    // --- Observation ---
    if (norm === 'Observation:') {
      inObservation = true;
      continue;
    }

    // --- Selected Module ---
    if (norm.startsWith('Selected Module:')) {
      inObservation = false;
      result.module = norm.substring('Selected Module:'.length).trim();
      continue;
    }

    // --- شروع AI Analysis → پایان مشاهده ---
    if (norm.includes('AI Analysis:')) {
      inObservation = false;
      continue;
    }

    // --- Action Guide ---
    if (norm === 'Action Guide:') {
      continue;
    }

    // --- Individual / Network / Policy ---
    if (norm.startsWith('Individual:')) {
      const val = norm.substring('Individual:'.length).trim();
      if (val && val !== '---') result.guide.individual = val;
      continue;
    }
    if (norm.startsWith('Network:')) {
      const val = norm.substring('Network:'.length).trim();
      if (val && val !== '---') result.guide.network = val;
      continue;
    }
    if (norm.startsWith('Policy:')) {
      const val = norm.substring('Policy:'.length).trim();
      if (val && val !== '---') result.guide.policy = val;
      continue;
    }

    // --- Cluster ---
    if (norm.startsWith('Cluster:')) {
      const clusterText = norm.substring('Cluster:'.length).trim();
      if (clusterText.includes('انسان') || clusterText.includes('Human')) result.cluster = 'human';
      else if (clusterText.includes('دانش') || clusterText.includes('Knowledge')) result.cluster = 'knowledge';
      else if (clusterText.includes('حکمرانی') || clusterText.includes('Governance')) result.cluster = 'governance';
      else if (clusterText.includes('بقا') || clusterText.includes('Survival')) result.cluster = 'survival';
      continue;
    }

    // --- Suggested Score ---
    if (norm.startsWith('Suggested Score:')) {
      const match = norm.match(/\d+/);
      if (match) result.score = parseInt(match[0]);
      continue;
    }

    // --- 5 Matrices ---
    if (norm === '5 Matrices:') continue;

    if (norm.startsWith('Emergence:')) {
      const val = norm.substring('Emergence:'.length).trim();
      if (val && val !== '---') result.matrix_emergence = val;
      continue;
    }
    if (norm.startsWith('Layers:')) {
      const val = norm.substring('Layers:'.length).trim();
      if (val && val !== '---') result.matrix_layers = val;
      continue;
    }
    if (norm.startsWith('Connections:')) {
      const val = norm.substring('Connections:'.length).trim();
      if (val && val !== '---') result.matrix_connections = val;
      continue;
    }
    if (norm.startsWith('Scale:')) {
      const val = norm.substring('Scale:'.length).trim();
      if (val && val !== '---') result.matrix_scale = val;
      continue;
    }
    if (norm.startsWith('Capacity:')) {
      const val = norm.substring('Capacity:'.length).trim();
      if (val && val !== '---') result.matrix_capacity = val;
      continue;
    }

    // --- Analysis (AI-2) ---
    if (norm.startsWith('Analysis:') && !norm.includes('Module')) {
      const val = norm.substring('Analysis:'.length).trim();
      if (val && val !== '---' && val !== 'تحلیل') result.analysis = val;
      continue;
    }

    // --- AI Errors ---
    if (norm.startsWith('AI Errors:')) {
      result.aiErrors = norm.substring('AI Errors:'.length).trim();
      continue;
    }

    // --- Module Result ---
    if (norm.includes('Module Result:')) {
      inModuleSection = true;
      inObservation = false;
      continue;
    }

    if (inModuleSection) {
      if (norm.startsWith('Type:')) {
        result.moduleType = norm.substring('Type:'.length).trim();
        continue;
      }
      if (norm.startsWith('Status:')) continue;
      if (norm.startsWith('Results:')) {
        const val = norm.substring('Results:'.length).trim();
        result.moduleData = val.split(',').map(s => s.trim()).filter(s => s && s !== '---');
        continue;
      }
      if (norm.startsWith('Analysis:')) {
        result.moduleAnalysis = norm.substring('Analysis:'.length).trim();
        continue;
      }
      if (norm.startsWith('Peers:')) {
        const val = norm.substring('Peers:'.length).trim();
        result.modulePeers = val.split(',').map(s => s.trim()).filter(s => s && s !== '---');
        continue;
      }
      if (norm === '---') {
        inModuleSection = false;
        continue;
      }
    }

    // --- جمع‌آوری متن مشاهده ---
    if (inObservation && !norm.startsWith('---')) {
      observationLines.push(norm);
    }

    // --- توقف در جداکننده اصلی ---
    if (norm === '---' && !inModuleSection && !inObservation) {
      // ادامه می‌دهیم چون ممکن است بخش‌های بعدی هم باشد
    }
  }

  result.observation = observationLines.join(' ').trim();
  if (!result.observation) {
    result.observation = body.substring(0, 200);
  }

  return result;
}
