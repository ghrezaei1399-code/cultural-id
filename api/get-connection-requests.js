// api/get-connection-requests.js
module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  const { type, issueNumber } = req.query;
  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  try {
    // ===== دریافت پاسخ‌های هم‌فرهنگ برای یک Issue خاص =====
    if (type === 'peer-responses' && issueNumber) {
      const commentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!commentsRes.ok) {
        throw new Error('خطا در دریافت کامنت‌ها از گیت‌هاب');
      }

      const comments = await commentsRes.json();
      const peerResponses = [];

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

      return res.status(200).json({ 
        issueNumber: parseInt(issueNumber),
        peerResponses: peerResponses,
        count: peerResponses.length
      });
    }

    // ===== دریافت نتیجه ماژول برای یک Issue خاص =====
    if (type === 'module-result' && issueNumber) {
      const issueRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!issueRes.ok) {
        throw new Error('خطا در دریافت اطلاعات Issue');
      }

      const issue = await issueRes.json();
      const body = issue.body || '';
      const labels = issue.labels.map(l => l.name);
      
      let moduleStatus = 'pending';
      for (const label of labels) {
        if (label.startsWith('module-')) {
          moduleStatus = label.replace('module-', '');
          break;
        }
      }

      const parsed = parseIssueBody(body);

      return res.status(200).json({
        issueNumber: parseInt(issueNumber),
        moduleStatus: moduleStatus,
        moduleType: parsed.moduleType,
        moduleData: parsed.moduleData,
        moduleAnalysis: parsed.moduleAnalysis,
        modulePeers: parsed.modulePeers
      });
    }

    // ===== دریافت مشاهدات (Observations) =====
    if (type === 'observations') {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?labels=observation&state=all&per_page=100`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('خطا در دریافت مشاهدات از گیت‌هاب');
      }

      const issues = await response.json();
      const observations = [];

      for (const issue of issues) {
        const labels = issue.labels.map(l => l.name);
        let status = 'pending';
        let score = null;
        
        if (labels.includes('approved')) status = 'approved';
        else if (labels.includes('rejected')) status = 'rejected';
        
        let moduleStatus = 'pending';
        for (const label of labels) {
          if (label.startsWith('module-')) {
            moduleStatus = label.replace('module-', '');
            break;
          }
        }

        const parsed = parseIssueBody(issue.body || '');

        observations.push({
          number: issue.number,
          cardCode: parsed.cardCode || 'ناشناس',
          observation: parsed.observation,
          module: parsed.module,
          status: status,
          score: parsed.score || score,
          cluster: parsed.cluster,
          analysis: parsed.analysis,
          matrix_emergence: parsed.matrix_emergence,
          matrix_layers: parsed.matrix_layers,
          matrix_connections: parsed.matrix_connections,
          matrix_scale: parsed.matrix_scale,
          matrix_capacity: parsed.matrix_capacity,
          guide: parsed.guide,
          ai3Final: parsed.ai3Final,
          ai3Error: parsed.ai3Error,
          aiErrors: parsed.aiErrors,
          moduleStatus: moduleStatus,
          moduleType: parsed.moduleType,
          moduleData: parsed.moduleData,
          moduleAnalysis: parsed.moduleAnalysis,
          modulePeers: parsed.modulePeers,
          createdAt: issue.created_at,
          issueUrl: issue.html_url
        });
      }

      return res.status(200).json({ observations });
    }

    // ===== دریافت درخواست‌های دستاورد (Achievements) =====
    if (type === 'achievements') {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('خطا در دریافت درخواست‌های دستاورد');
      }

      const files = await response.json();
      const achievements = [];

      for (const file of files) {
        if (!file.name.startsWith('achievement-') || !file.name.endsWith('.json')) continue;
        
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
          
          achievements.push({
            fileName: file.name,
            trackingCode: requestData.trackingCode,
            senderCode: requestData.senderCode,
            title: requestData.title,
            description: requestData.description,
            category: requestData.category,
            status: requestData.status || 'pending',
            fileUrl: requestData.fileUrl,
            createdAt: requestData.createdAt,
            approvedAt: requestData.approvedAt || null,
            rejectedAt: requestData.rejectedAt || null
          });
        } catch (e) {
          console.error('Error reading achievement file:', file.name, e);
          continue;
        }
      }

      return res.status(200).json({ achievements });
    }

    // ===== دریافت درخواست‌های ارتباط =====
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/requests`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('خطا در دریافت درخواست‌ها از گیت‌هاب');
    }

    const files = await response.json();
    const requests = [];

    for (const file of files) {
      if (!file.name.endsWith('.json') || file.name === 'index.json') continue;
      
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
        
        if (requestData.type === 'connection' || requestData.type === 'connection_request') {
          requests.push({
            fileName: file.name,
            senderCode: requestData.senderCode || requestData.cardCode || '---',
            status: requestData.status || 'pending',
            reason: requestData.reason || requestData.description || '',
            senderEmail: requestData.senderEmail || '',
            connections: requestData.connections || [],
            connectionDetails: requestData.connectionDetails || [],
            totalFound: requestData.totalFound || 0,
            createdAt: requestData.createdAt || requestData.requestDate || new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('Error reading request file:', file.name, e);
        continue;
      }
    }

    return res.status(200).json({ requests });

  } catch (error) {
    console.error('Get Connection Requests Error:', error);
    return res.status(500).json({ error: error.message });
  }
};


// ============================================================
// تابع کمکی: نرمال‌سازی یک خط (حذف ** و فاصله اضافه)
// ============================================================
function normalizeLine(line) {
  return (line || '')
    .replace(/\*\*/g, '')
    .replace(/^[-•*]\s+/, '')
    .trim();
}

// ============================================================
// تابع کمکی: بررسی اینکه یک خط با یک تیتر شروع می‌شود
// ============================================================
function startsWithLabel(line, label) {
  const normalized = normalizeLine(line);
  return normalized.startsWith(label);
}

// ============================================================
// تابع کمکی: استخراج مقدار بعد از یک تیتر
// ============================================================
function extractValue(line, label) {
  const normalized = normalizeLine(line);
  if (!normalized.startsWith(label)) return null;
  return normalized.substring(label.length).trim();
}

// ============================================================
// تابع اصلی: پارس کردن بدنه Issue
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
      if (norm && !norm.startsWith('⚠️') && !norm.includes('AI3_FAILED') && !norm.startsWith('Error Code:')) {
        ai3Lines.push(norm);
      } else if (norm.includes('AI3_FAILED') || norm.startsWith('⚠️')) {
        result.ai3Error = 'AI3_FAILED';
      }
    }
    result.ai3Final = ai3Lines.join(' ').trim();
  }

  // ===== مرحله ۲: استخراج خط به خط بقیه فیلدها =====
  let inObservation = false;
  let inModuleSection = false;

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

    // --- AI Analysis (بخش AI-1) ---
    if (norm.startsWith('🤖 AI Analysis:') || norm === 'AI Analysis:') {
      inObservation = false;
      continue;
    }

    // --- Status ---
    if (norm.startsWith('Status:')) {
      // فقط برای نمایش — نادیده می‌گیریم
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

    // --- Action Guide ---
    if (norm === 'Action Guide:' || norm.startsWith('Action Guide:')) {
      continue;
    }

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

    // --- 5 Matrices ---
    if (norm === '5 Matrices:' || norm.startsWith('5 Matrices:') || norm === '5 Matrices') {
      continue;
    }

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
    if (norm.startsWith('📌') || norm.includes('Module Result:')) {
      inModuleSection = true;
      inObservation = false;
      continue;
    }

    if (inModuleSection) {
      if (norm.startsWith('Type:')) {
        result.moduleType = norm.substring('Type:'.length).trim();
        continue;
      }
      if (norm.startsWith('Status:')) {
        continue;
      }
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
    if (inObservation && norm && !norm.startsWith('---') && !norm.includes(':')) {
      result.observation += norm + ' ';
    }

    // --- توقف در جداکننده اصلی ---
    if (norm === '---' && !inModuleSection) {
      inObservation = false;
    }
  }

  result.observation = result.observation.trim();
  if (!result.observation) {
    result.observation = body.substring(0, 200);
  }

  return result;
}
