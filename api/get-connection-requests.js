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
        if (body.includes('**📝 پاسخ هم‌فرهنگ**') || body.includes('**Peer Response**')) {
          const peerMatch = body.match(/\*\*هم‌فرهنگ:\*\*\s*(.+)/) || body.match(/\*\*Peer:\*\*\s*(.+)/);
          const resultMatch = body.match(/\*\*نتیجه:\*\*\s*(.+)/) || body.match(/\*\*Result:\*\*\s*(.+)/);
          const responseMatch = body.match(/\*\*پاسخ:\*\*\s*(.+)/) || body.match(/\*\*Response:\*\*\s*(.+)/);
          
          if (peerMatch && responseMatch) {
            peerResponses.push({
              peerCode: peerMatch[1].trim(),
              result: resultMatch ? resultMatch[1].trim() : 'success',
              response: responseMatch[1].trim(),
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
      
      // استخراج وضعیت ماژول از لیبل‌ها
      let moduleStatus = 'pending';
      for (const label of labels) {
        if (label.startsWith('module-')) {
          moduleStatus = label.replace('module-', '');
          break;
        }
      }

      // استخراج اطلاعات ماژول از متن Issue
      let moduleType = '';
      let moduleData = [];
      let moduleAnalysis = '';
      let modulePeers = [];

      const bodyLines = body.split('\n');
      let inModuleSection = false;

      for (const line of bodyLines) {
        const trimmedLine = line.trim();
        
        if (trimmedLine.includes('**📌 Module Result:**') || trimmedLine.includes('**Module Result:**')) {
          inModuleSection = true;
          continue;
        }

        if (inModuleSection) {
          if (trimmedLine.includes('**Type:**')) {
            const match = trimmedLine.match(/\*\*Type:\*\*\s*(.+)/);
            if (match) moduleType = match[1].trim();
            continue;
          }
          if (trimmedLine.includes('**Status:**')) {
            // قبلاً از لیبل استخراج شده
            continue;
          }
          if (trimmedLine.includes('**Results:**')) {
            const match = trimmedLine.match(/\*\*Results:\*\*\s*(.+)/);
            if (match) {
              moduleData = match[1].trim().split(',').map(s => s.trim()).filter(s => s && s !== '---');
            }
            continue;
          }
          if (trimmedLine.includes('**Analysis:**')) {
            const match = trimmedLine.match(/\*\*Analysis:\*\*\s*(.+)/);
            if (match) moduleAnalysis = match[1].trim();
            continue;
          }
          if (trimmedLine.includes('**Peers:**')) {
            const match = trimmedLine.match(/\*\*Peers:\*\*\s*(.+)/);
            if (match) {
              modulePeers = match[1].trim().split(',').map(s => s.trim()).filter(s => s && s !== '---');
            }
            continue;
          }
          if (trimmedLine.includes('---')) {
            inModuleSection = false;
          }
        }
      }

      return res.status(200).json({
        issueNumber: parseInt(issueNumber),
        moduleStatus: moduleStatus,
        moduleType: moduleType,
        moduleData: moduleData,
        moduleAnalysis: moduleAnalysis,
        modulePeers: modulePeers
      });
    }

    // ===== دریافت مشاهدات (Observations) =====
    if (type === 'observations') {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?labels=observation&state=all`, {
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
        let cluster = 'other';
        let analysis = '';
        let guide = {};
        let matrix_emergence = '';
        let matrix_layers = '';
        let matrix_connections = '';
        let matrix_scale = '';
        let matrix_capacity = '';
        
        // استخراج وضعیت از لیبل‌ها
        if (labels.includes('approved')) status = 'approved';
        else if (labels.includes('rejected')) status = 'rejected';
        else if (labels.includes('score-5')) score = 5;
        
        // استخراج وضعیت ماژول از لیبل‌ها
        let moduleStatus = 'pending';
        for (const label of labels) {
          if (label.startsWith('module-')) {
            moduleStatus = label.replace('module-', '');
            break;
          }
        }
        
        // استخراج اطلاعات از متن Issue
        const bodyLines = issue.body.split('\n');
        let observationText = '';
        let cardCode = '';
        let module = '';
        let inObservation = false;
        let moduleType = '';
        let moduleData = [];
        let moduleAnalysisText = '';
        let modulePeers = [];
        let inModuleSection = false;
        
        for (const line of bodyLines) {
          const trimmedLine = line.trim();
          
          if (trimmedLine.includes('**Card Code:**')) {
            const match = trimmedLine.match(/\*\*Card Code:\*\*\s*(.+)/);
            if (match) cardCode = match[1].trim();
            continue;
          }
          
          if (trimmedLine.includes('**Observation:**')) {
            inObservation = true;
            continue;
          }
          
          if (trimmedLine.includes('**Selected Module:**')) {
            const match = trimmedLine.match(/\*\*Selected Module:\*\*\s*(.+)/);
            if (match) module = match[1].trim();
            continue;
          }
          
          // ===== استخراج AI Analysis =====
          if (trimmedLine.includes('**Cluster:**')) {
            const match = trimmedLine.match(/\*\*Cluster:\*\*\s*(.+)/);
            if (match) {
              const clusterText = match[1].trim();
              if (clusterText.includes('Human') || clusterText.includes('انسان')) cluster = 'human';
              else if (clusterText.includes('Knowledge') || clusterText.includes('دانش')) cluster = 'knowledge';
              else if (clusterText.includes('Governance') || clusterText.includes('حکمرانی')) cluster = 'governance';
              else if (clusterText.includes('Survival') || clusterText.includes('بقا')) cluster = 'survival';
            }
            continue;
          }
          
          if (trimmedLine.includes('**Suggested Score:**')) {
            const match = trimmedLine.match(/\d+/);
            if (match) score = parseInt(match[0]);
            continue;
          }
          
          if (trimmedLine.includes('**Analysis:**') && !trimmedLine.includes('Module')) {
            const match = trimmedLine.match(/\*\*Analysis:\*\*\s*(.+)/);
            if (match) {
              const analysisText = match[1].trim();
              if (analysisText !== '---' && analysisText !== 'تحلیل' && analysisText !== 'Analysis') {
                analysis = analysisText;
              }
            }
            continue;
          }
          
          // ===== استخراج ۵ ماتریس =====
          if (trimmedLine.includes('**Emergence:**')) {
            const match = trimmedLine.match(/\*\*Emergence:\*\*\s*(.+)/);
            if (match) matrix_emergence = match[1].trim();
            if (matrix_emergence === '---') matrix_emergence = '';
            continue;
          }
          
          if (trimmedLine.includes('**Layers:**')) {
            const match = trimmedLine.match(/\*\*Layers:\*\*\s*(.+)/);
            if (match) matrix_layers = match[1].trim();
            if (matrix_layers === '---') matrix_layers = '';
            continue;
          }
          
          if (trimmedLine.includes('**Connections:**')) {
            const match = trimmedLine.match(/\*\*Connections:\*\*\s*(.+)/);
            if (match) matrix_connections = match[1].trim();
            if (matrix_connections === '---') matrix_connections = '';
            continue;
          }
          
          if (trimmedLine.includes('**Scale:**')) {
            const match = trimmedLine.match(/\*\*Scale:\*\*\s*(.+)/);
            if (match) matrix_scale = match[1].trim();
            if (matrix_scale === '---') matrix_scale = '';
            continue;
          }
          
          if (trimmedLine.includes('**Capacity:**')) {
            const match = trimmedLine.match(/\*\*Capacity:\*\*\s*(.+)/);
            if (match) matrix_capacity = match[1].trim();
            if (matrix_capacity === '---') matrix_capacity = '';
            continue;
          }
          
          // ===== استخراج Module Result =====
          if (trimmedLine.includes('**📌 Module Result:**') || trimmedLine.includes('**Module Result:**')) {
            inModuleSection = true;
            continue;
          }

          if (inModuleSection) {
            if (trimmedLine.includes('**Type:**')) {
              const match = trimmedLine.match(/\*\*Type:\*\*\s*(.+)/);
              if (match) moduleType = match[1].trim();
              continue;
            }
            if (trimmedLine.includes('**Results:**')) {
              const match = trimmedLine.match(/\*\*Results:\*\*\s*(.+)/);
              if (match) {
                moduleData = match[1].trim().split(',').map(s => s.trim()).filter(s => s && s !== '---');
              }
              continue;
            }
            if (trimmedLine.includes('**Analysis:**')) {
              const match = trimmedLine.match(/\*\*Analysis:\*\*\s*(.+)/);
              if (match) moduleAnalysisText = match[1].trim();
              continue;
            }
            if (trimmedLine.includes('**Peers:**')) {
              const match = trimmedLine.match(/\*\*Peers:\*\*\s*(.+)/);
              if (match) {
                modulePeers = match[1].trim().split(',').map(s => s.trim()).filter(s => s && s !== '---');
              }
              continue;
            }
            if (trimmedLine.includes('---')) {
              inModuleSection = false;
            }
          }
          
          // جمع‌آوری متن مشاهده
          if (inObservation && trimmedLine && !trimmedLine.includes('---') && !trimmedLine.includes('**')) {
            observationText += trimmedLine + ' ';
          }
          if (line.includes('---') && !inModuleSection) break;
        }
        
        observationText = observationText.trim() || issue.body.substring(0, 200);
        
        observations.push({
          number: issue.number,
          cardCode: cardCode || 'ناشناس',
          observation: observationText,
          module: module,
          status: status,
          score: score,
          cluster: cluster,
          analysis: analysis,
          // ===== ۵ ماتریس =====
          matrix_emergence: matrix_emergence,
          matrix_layers: matrix_layers,
          matrix_connections: matrix_connections,
          matrix_scale: matrix_scale,
          matrix_capacity: matrix_capacity,
          // ===== اطلاعات ماژول =====
          moduleStatus: moduleStatus,
          moduleType: moduleType,
          moduleData: moduleData,
          moduleAnalysis: moduleAnalysisText,
          modulePeers: modulePeers,
          createdAt: issue.created_at,
          issueUrl: issue.html_url
        });
      }

      return res.status(200).json({ observations });

    // ===== دریافت درخواست‌های ارتباط =====
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
    } else {
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
    }

  } catch (error) {
    console.error('Get Connection Requests Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
