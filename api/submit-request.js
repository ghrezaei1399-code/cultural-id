// api/submit-request.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
    }
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON in request body' });
    }

    const { cardCode, type, description, observations } = parsedBody;
    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // ============================================================
    // بخش Observations - سه هوش مصنوعی جداگانه
    // ============================================================
    if (type === 'observations' && observations && observations.length > 0) {
      if (!cardCode) {
        return res.status(400).json({ error: 'کد کارت الزامی است' });
      }

      const moduleNames = {
        'collaboration': 'همفکری با دیگران',
        'related': 'مشاهدات مرتبط دیگران',
        'referral': 'ارجاع به ۵ همفرهنگ'
      };

      const createdIssues = [];
      
      for (const obs of observations) {
        if (!obs.text || obs.text.length < 10) continue;

        const selectedModule = obs.module ? moduleNames[obs.module] || obs.module : 'هیچ‌کدام';
        const isPersian = /[\u0600-\u06FF]/.test(obs.text);

        // ============================================================
        // اجرای سه هوش مصنوعی جداگانه
        // ============================================================
        let ai1Result = null;
        let ai2Result = null;
        let ai3Result = null;
        const aiErrors = [];

        if (openRouterKey) {
          try {
            ai1Result = await callAI1(obs.text, isPersian, openRouterKey);
          } catch (err) {
            console.warn('AI-1 failed:', err.message);
            aiErrors.push('AI1');
          }

          try {
            ai2Result = await callAI2(obs.text, ai1Result, isPersian, openRouterKey);
          } catch (err) {
            console.warn('AI-2 failed:', err.message);
            aiErrors.push('AI2');
          }

          try {
            ai3Result = await callAI3(obs.text, ai1Result, ai2Result, isPersian, openRouterKey);
          } catch (err) {
            console.warn('AI-3 failed:', err.message);
            aiErrors.push('AI3');
          }
        } else {
          aiErrors.push('AI1', 'AI2', 'AI3');
        }

        const cluster = ai2Result?.cluster || 'human';
        const suggestedScore = ai2Result?.score || null;

        // ============================================================
        // ساخت بخش‌های AI با تیترهای سازگار با regexهای موجود
        // ============================================================
        const clusterLabel = isPersian ?
          (cluster === 'human' ? 'انسان' :
           cluster === 'knowledge' ? 'دانش و فناوری' :
           cluster === 'governance' ? 'حکمرانی و تمدن' :
           cluster === 'survival' ? 'بقا و آینده' : 'نامشخص') :
          (cluster === 'human' ? 'Human' :
           cluster === 'knowledge' ? 'Knowledge & Technology' :
           cluster === 'governance' ? 'Governance & Civilization' :
           cluster === 'survival' ? 'Survival & Future' : 'Unknown');

        // ---------- AI-1 Section (تیترهای قدیمی: Individual / Network / Policy) ----------
        // مهم: Network و Policy (نه Social و Institutional) تا regexهای موجود کار کنند
        const ai1Section = ai1Result ? `
**🤖 AI Analysis:**
- **Status:** ✅ ${isPersian ? 'تایید شده' : 'Approved'}
- **Cluster:** ${clusterLabel}
- **Suggested Score:** ${suggestedScore || '---'}

**Action Guide:**
- **Individual:** ${ai1Result.individual || '---'}
- **Network:** ${ai1Result.social || '---'}
- **Policy:** ${ai1Result.institutional || '---'}
` : `
**🤖 AI Analysis:**
- **Status:** ⚠️ ${isPersian ? 'تحلیل هوش مصنوعی اول دریافت نشد' : 'AI-1 analysis not received'}
- **Error Code:** AI1_FAILED
- **Cluster:** ${clusterLabel}
- **Suggested Score:** ---

**Action Guide:**
- **Individual:** ---
- **Network:** ---
- **Policy:** ---
`;

        // ---------- AI-2 Section (تیترهای قدیمی: Emergence / Layers / Connections / Scale / Capacity / Analysis) ----------
        const ai2Section = ai2Result ? `
**5 Matrices:**
- **Emergence:** ${ai2Result.emergence || '---'}
- **Layers:** ${ai2Result.layer || '---'}
- **Connections:** ${ai2Result.connection || '---'}
- **Scale:** ${ai2Result.scale || '---'}
- **Capacity:** ${ai2Result.capacity || '---'}
- **Analysis:** ${ai2Result.analysis || '---'}
` : `
**5 Matrices:**
- **Status:** ⚠️ ${isPersian ? 'تحلیل هوش مصنوعی دوم دریافت نشد' : 'AI-2 analysis not received'}
- **Error Code:** AI2_FAILED
- **Emergence:** ---
- **Layers:** ---
- **Connections:** ---
- **Scale:** ---
- **Capacity:** ---
- **Analysis:** ---
`;

        // ---------- AI-3 Section (تیتر جدید که با هیچ regex موجودی تضاد ندارد) ----------
        const ai3Section = (ai3Result && ai3Result.final) ? `
**💎 AI-3 Final Synthesis:**
${ai3Result.final}
` : `
**💎 AI-3 Final Synthesis:**
⚠️ ${isPersian ? 'تحلیل نهایی دریافت نشد' : 'Final synthesis not received'}
- **Error Code:** AI3_FAILED
`;

        // ============================================================
        // پردازش ماژول (بدون تغییر)
        // ============================================================
        let moduleResult = null;
        let moduleStatus = 'pending';
        let moduleMessage = '';

        if (obs.module && obs.module !== 'none' && obs.module !== 'هیچ‌کدام') {
          try {
            const allUsersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (allUsersRes.ok) {
              const files = await allUsersRes.json();
              const allUsers = [];
              
              for (const file of files) {
                if (file.name.endsWith('.json') && file.name !== `${cardCode}.json`) {
                  try {
                    const fRes = await fetch(file.download_url);
                    const uData = await fRes.json();
                    if (uData.status === 'approved') {
                      allUsers.push(uData);
                    }
                  } catch (e) { continue; }
                }
              }
              
              moduleResult = { type: obs.module, status: 'pending', data: [], analysis: '' };
              
              if (obs.module === 'collaboration') {
                const senderValues = ai2Result?.values || [];
                const matchedUsers = allUsers.filter(user => {
                  const userValues = user.values || [];
                  const common = senderValues.filter(v => userValues.includes(v));
                  return common.length >= 3;
                });
                const selected = matchedUsers.slice(0, 5);
                moduleResult.data = selected.map(u => u.cardCode);
                moduleResult.peers = selected.map(u => ({ cardCode: u.cardCode, email: u.communicationEmail }));
                if (selected.length > 0) {
                  moduleResult.analysis = `همفکری با ${selected.length} نفر از هم‌فرهنگان آغاز شد.`;
                  moduleMessage = `همفکری با ${selected.length} نفر از هم‌فرهنگان آغاز شد.`;
                  moduleStatus = 'pending';
                } else {
                  moduleResult.analysis = 'هیچ هم‌فرهنگی با اولویت‌های مشترک یافت نشد.';
                  moduleMessage = 'هیچ هم‌فرهنگی با اولویت‌های مشترک یافت نشد.';
                  moduleStatus = 'no_peers';
                }
              } else if (obs.module === 'related') {
                const allIssuesRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues?labels=observation`, {
                  headers: { 'Authorization': `Bearer ${token}` }
                });
                if (allIssuesRes.ok) {
                  const issues = await allIssuesRes.json();
                  const similar = issues.filter(issue => 
                    issue.body && issue.body.includes(obs.text.substring(0, 20))
                  );
                  moduleResult.data = similar.slice(0, 5).map(i => `#${i.number}`);
                  if (similar.length > 0) {
                    moduleResult.analysis = `${similar.length} مشاهده مرتبط با این موضوع وجود دارد.`;
                    moduleMessage = `${similar.length} مشاهده مرتبط با این موضوع وجود دارد.`;
                    moduleStatus = 'completed';
                  } else {
                    moduleResult.analysis = 'هیچ مشاهده مرتبطی یافت نشد.';
                    moduleMessage = 'هیچ مشاهده مرتبطی یافت نشد.';
                    moduleStatus = 'no_related';
                  }
                }
              } else if (obs.module === 'referral') {
                const senderValues = ai2Result?.values || [];
                const scoredUsers = allUsers.map(user => {
                  const userValues = user.values || [];
                  const common = senderValues.filter(v => userValues.includes(v));
                  return { ...user, matchCount: common.length };
                });
                const referrals = scoredUsers
                  .filter(u => u.matchCount >= 3)
                  .sort((a, b) => b.matchCount - a.matchCount)
                  .slice(0, 5);
                moduleResult.data = referrals.map(u => u.cardCode);
                moduleResult.peers = referrals.map(u => ({ cardCode: u.cardCode, email: u.communicationEmail }));
                if (referrals.length > 0) {
                  moduleResult.analysis = `۵ همفرهنگ (${referrals.map(u => u.cardCode).join('، ')}) برای ارجاع انتخاب شدند.`;
                  moduleMessage = '۵ همفرهنگ برای ارجاع انتخاب شدند.';
                  moduleStatus = 'pending';
                } else {
                  moduleResult.analysis = 'هیچ هم‌فرهنگی برای ارجاع یافت نشد.';
                  moduleMessage = 'هیچ هم‌فرهنگی برای ارجاع یافت نشد.';
                  moduleStatus = 'no_peers';
                }
              }
            }
          } catch (moduleError) {
            console.error('Module processing failed:', moduleError);
            moduleResult = { type: obs.module, status: 'error', data: [], analysis: 'خطا در پردازش ماژول' };
            moduleMessage = 'خطا در پردازش ماژول';
            moduleStatus = 'error';
          }
        }

        // ============================================================
        // Module Section
        // ============================================================
        let moduleSection = '';
        if (moduleResult) {
          const moduleStatusLabels = {
            'pending': '⏳ در انتظار پاسخ هم‌فرهنگ‌ها',
            'completed': '✅ تکمیل شد',
            'no_peers': '⚠️ هم‌فرهنگی یافت نشد',
            'no_related': '⚠️ مشاهده مرتبط یافت نشد',
            'error': '❌ خطا در پردازش'
          };
          const statusText = moduleStatusLabels[moduleResult.status] || moduleResult.status;
          const typeNames = {
            'collaboration': 'همفکری با دیگران',
            'related': 'مشاهدات مرتبط دیگران',
            'referral': 'ارجاع به ۵ همفرهنگ'
          };
          moduleSection = `
**📌 Module Result:**
- **Type:** ${typeNames[moduleResult.type] || moduleResult.type}
- **Status:** ${statusText}
- **Results:** ${moduleResult.data && moduleResult.data.length > 0 ? moduleResult.data.join(', ') : '---'}
${moduleResult.analysis ? `- **Analysis:** ${moduleResult.analysis}` : ''}
${moduleResult.peers && moduleResult.peers.length > 0 ? `- **Peers:** ${moduleResult.peers.map(p => p.cardCode).join(', ')}` : ''}
`;
        }

        // ============================================================
        // بدنه Issue (سازگار با regexهای موجود)
        // ============================================================
        const issueTitle = isPersian
          ? `مشاهده خام: ${cardCode}`
          : `Raw Observation: ${cardCode}`;

        const issueBody = `
**Card Code:** ${cardCode}

**Observation:**
${obs.text}

**Selected Module:**
${selectedModule}

${ai1Section}
${ai2Section}
${ai3Section}
${moduleSection}
---
*This observation has been registered and is pending review.*

**Module Status:** ${moduleStatus}
**AI Errors:** ${aiErrors.length > 0 ? aiErrors.join(', ') : 'None'}
**Tracking Code:** OBS-{pending}
        `;

        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            title: issueTitle,
            body: issueBody,
            labels: ['observation', 'pending-review', `module-${moduleStatus}`]
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error creating GitHub issue');
        }

        const issueData = await response.json();

        // ارسال دعوت‌نامه به هم‌فرهنگان (بدون تغییر ساختار)
        if (moduleResult && moduleResult.peers && moduleResult.peers.length > 0 && 
            (obs.module === 'collaboration' || obs.module === 'referral')) {
          const trackingCode = `OBS-${issueData.number}`;
          const peerLink = `${process.env.SITE_URL || 'https://cultural-id.vercel.app'}/peer-response.html?code=${trackingCode}&issue=${issueData.number}`;
          
          await peer_sendInvites({
            observation: obs.text,
            observerCode: cardCode,
            peers: moduleResult.peers,
            issueNumber: issueData.number,
            trackingCode: trackingCode,
            peerLink: peerLink,
            isPersian: isPersian,
            token: token,
            owner: owner,
            repo: repo
          });
        }

        createdIssues.push({
          number: issueData.number,
          url: issueData.html_url,
          trackingCode: `OBS-${issueData.number}`,
          observation: obs.text.substring(0, 50) + '...',
          module: selectedModule,
          moduleStatus: moduleStatus,
          moduleMessage: moduleMessage
        });
      }

      if (createdIssues.length === 0) {
        return res.status(400).json({ error: 'No valid observations were registered.' });
      }

      const trackingCodes = createdIssues.map(i => i.trackingCode).join(', ');
      const anyAiFailed = createdIssues.some((_, i) => false); // placeholder
      const aiFailedCount = createdIssues.filter(x => x.aiErrors && x.aiErrors.length > 0).length;
      
      return res.status(200).json({
        success: true,
        trackingCode: trackingCodes,
        issues: createdIssues,
        message: `${createdIssues.length} observation(s) successfully registered.`
      });
    }

    // ============================================================
    // بخش Delete (بدون تغییر)
    // ============================================================
    if (type === 'delete') {
      if (!cardCode) {
        return res.status(400).json({ error: 'Card code is required' });
      }

      const trackingCode = `DEL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const fileName = `delete-${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
      const requestPath = `data/requests/${fileName}`;

      const requestData = {
        fileName: fileName,
        trackingCode: trackingCode,
        senderCode: cardCode,
        type: 'delete',
        description: description || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newContent = Buffer.from(JSON.stringify(requestData, null, 2), 'utf8').toString('base64');

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Delete request from ${cardCode} - ${trackingCode}`,
          content: newContent,
          branch: 'main'
        })
      });

      return res.status(200).json({
        success: true,
        trackingCode: trackingCode,
        message: 'Delete request successfully registered.'
      });
    }

    // ============================================================
    // بخش Connection (بدون تغییر)
    // ============================================================
    if (type === 'connection') {
      if (!cardCode) {
        return res.status(400).json({ error: 'Card code is required' });
      }

      const userPath = `data/active/${cardCode}.json`;
      const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userRes.ok) {
        if (userRes.status === 404) {
          return res.status(404).json({ error: 'User not found' });
        }
        return res.status(userRes.status).json({ error: 'Error fetching user data' });
      }

      const userDataRaw = await userRes.json();
      const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

      if (!userData.communicationEmail || userData.communicationEmail.length < 5) {
        return res.status(400).json({ 
          error: 'To use connection feature, please register your email first.',
          redirect: 'edit-en.html',
          emailRequired: true
        });
      }

      const allUsersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!allUsersRes.ok) {
        return res.status(500).json({ error: 'Error fetching user list' });
      }

      const files = await allUsersRes.json();
      const allUsers = [];

      for (const file of files) {
        if (file.name.endsWith('.json') && file.name !== `${cardCode}.json`) {
          try {
            const fRes = await fetch(file.download_url);
            const uData = await fRes.json();
            if (uData.status === 'approved' && uData.communicationEmail && uData.communicationEmail.length > 5) {
              allUsers.push(uData);
            }
          } catch (e) { continue; }
        }
      }

      const senderValues = userData.values || [];
      const senderPriorities = userData.priorities || [];

      const scoredUsers = allUsers.map(user => {
        const userValues = user.values || [];
        const userPriorities = user.priorities || [];
        let matchCount = 0;
        let score = 0;

        senderValues.forEach((value, idx) => {
          const userIndex = userValues.indexOf(value);
          if (userIndex !== -1) {
            matchCount++;
            const priorityDiff = Math.abs((senderPriorities[idx] || 999) - (userPriorities[userIndex] || 999));
            score += Math.max(0, 10 - priorityDiff);
          }
        });

        return {
          cardCode: user.cardCode,
          email: user.communicationEmail || '',
          matchCount: matchCount,
          matchScore: score,
          similarityScore: Math.round((matchCount / Math.min(senderValues.length || 1, userValues.length || 1)) * 100) || 0
        };
      });

      const MIN_MATCH_COUNT = 5;
      const MAX_RESULTS = 10;

      const matched = scoredUsers
        .filter(u => u.matchCount >= MIN_MATCH_COUNT)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, MAX_RESULTS);

      const trackingCode = `CON-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const fileName = `connection-${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
      const requestPath = `data/requests/${fileName}`;

      const requestData = {
        fileName: fileName,
        trackingCode: trackingCode,
        senderCode: cardCode,
        senderEmail: userData.communicationEmail,
        type: 'connection',
        description: description || '',
        status: 'completed',
        connections: matched.map(u => u.email),
        connectionDetails: matched,
        totalFound: matched.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newContent = Buffer.from(JSON.stringify(requestData, null, 2), 'utf8').toString('base64');

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Connection request from ${cardCode} - ${trackingCode}`,
          content: newContent,
          branch: 'main'
        })
      });

      return res.status(200).json({
        success: true,
        trackingCode: trackingCode,
        message: matched.length > 0 
          ? `${matched.length} like-minded people found with shared values.` 
          : 'No like-minded people found with shared values. Please try again later.',
        connections: matched.map(u => u.email),
        connectionDetails: matched,
        totalFound: matched.length,
        minMatchRequired: MIN_MATCH_COUNT,
        status: 'completed'
      });
    }

    // ============================================================
    // بخش Peer Response (بدون تغییر)
    // ============================================================
    if (type === 'peer-response') {
      const { issueNumber, peerCode, response, result, trackingCode } = parsedBody;
      
      if (!issueNumber || !peerCode || !response) {
        return res.status(400).json({ error: 'اطلاعات ناقص است (issueNumber, peerCode, response الزامی است)' });
      }

      const resultLabels = {
        'success': '✅ موفق',
        'revision': '⚠️ نیاز به اصلاح',
        'failed': '❌ شکست'
      };

      const commentBody = `
**📝 پاسخ هم‌فرهنگ**

- **هم‌فرهنگ:** ${peerCode}
- **نتیجه:** ${resultLabels[result] || result || 'نظر'}
- **پاسخ:** ${response}
- **زمان:** ${new Date().toISOString()}

---
*این پاسخ به صورت خودکار ثبت شده است.*
      `;

      const commentRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({ body: commentBody })
      });

      if (!commentRes.ok) {
        const errorData = await commentRes.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error adding comment to issue');
      }

      const commentData = await commentRes.json();

      const responseFileName = `peer-response-${issueNumber}-${peerCode}-${Date.now()}.json`;
      const responsePath = `data/peer-responses/${responseFileName}`;
      
      const responseData = {
        issueNumber: issueNumber,
        trackingCode: trackingCode || `OBS-${issueNumber}`,
        peerCode: peerCode,
        response: response,
        result: result || 'success',
        timestamp: new Date().toISOString(),
        commentId: commentData.id
      };

      const responseContent = Buffer.from(JSON.stringify(responseData, null, 2), 'utf8').toString('base64');

      await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${responsePath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Peer response from ${peerCode} for issue #${issueNumber}`,
          content: responseContent,
          branch: 'main'
        })
      });

      const allResponses = await peer_getAllResponses(issueNumber, token, owner, repo);
      const peerCount = await peer_getPeerCount(issueNumber, token, owner, repo);
      
      let moduleStatus = 'pending';
      let moduleResult = 'pending';
      
      if (allResponses.length >= peerCount) {
        moduleStatus = 'completed';
        moduleResult = await peer_finalAnalysisWithResponses(issueNumber, allResponses, token, owner, repo);
        
        const resultComment = `
**📊 نتیجه نهایی ماژول ارجاع**

- **تعداد پاسخ‌ها:** ${allResponses.length}/${peerCount}
- **نتیجه نهایی:** ${moduleResult === 'success' ? '✅ موفق' : moduleResult === 'revision' ? '⚠️ نیاز به اصلاح' : '❌ شکست'}

---
*این تحلیل بر اساس پاسخ‌های هم‌فرهنگ‌ها تولید شده است.*
        `;
        
        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({ body: resultComment })
        });

        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/labels`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            labels: ['observation', 'pending-review', `module-${moduleResult}`]
          })
        });
      }

      return res.status(200).json({
        success: true,
        message: 'پاسخ شما با موفقیت ثبت شد.',
        issueNumber: issueNumber,
        peerCode: peerCode,
        allResponsesReceived: allResponses.length >= peerCount,
        moduleResult: moduleResult
      });
    }
    // ============================================================
    // بخش Observation Feedback (بازخورد عضو بر اساس راهنمای دریافتی)
    // ============================================================
    if (type === 'observation_feedback') {
      const { cardCode, feedback } = parsedBody;
      
      if (!cardCode || !feedback) {
        return res.status(400).json({ error: 'کد کارت و متن بازخورد الزامی است' });
      }
      
      if (feedback.trim().length < 10) {
        return res.status(400).json({ error: 'متن بازخورد بسیار کوتاه است' });
      }

      const isPersian = /[\u0600-\u06FF]/.test(feedback);
      const trackingCode = `FB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const fileName = `observation-feedback-${Date.now()}-${Math.random().toString(36).substring(7)}.json`;
      const requestPath = `data/feedback/${fileName}`;

      const feedbackData = {
        fileName: fileName,
        trackingCode: trackingCode,
        senderCode: cardCode,
        type: 'observation_feedback',
        feedback: feedback.trim(),
        isPersian: isPersian,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const newContent = Buffer.from(JSON.stringify(feedbackData, null, 2), 'utf8').toString('base64');

      const uploadRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestPath}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Observation feedback from ${cardCode} - ${trackingCode}`,
          content: newContent,
          branch: 'main'
        })
      });

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        // اگر پوشه وجود ندارد، اول یک فایل placeholder بساز تا پوشه ایجاد شود
        if (uploadRes.status === 404 || (errData.message && errData.message.includes('Not Found'))) {
          // تلاش برای ساخت پوشه با یک فایل .gitkeep
          try {
            const placeholderContent = Buffer.from('{}', 'utf8').toString('base64');
            await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/feedback/.gitkeep`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: 'Create feedback folder',
                content: placeholderContent,
                branch: 'main'
              })
            });
            // دوباره تلاش کن
            const retryRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestPath}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Observation feedback from ${cardCode} - ${trackingCode}`,
                content: newContent,
                branch: 'main'
              })
            });
            if (!retryRes.ok) {
              const retryErr = await retryRes.json().catch(() => ({}));
              throw new Error(retryErr.message || 'خطا در ذخیره بازخورد');
            }
          } catch (folderErr) {
            throw new Error('خطا در ساخت پوشه بازخورد: ' + folderErr.message);
          }
        } else {
          throw new Error(errData.message || 'خطا در ذخیره بازخورد');
        }
      }

      // ===== ثبت بازخورد به عنوان یک Issue جدید برای ادمین =====
      let feedbackIssueNumber = null;
      try {
        const issueTitle = isPersian
          ? `📝 بازخورد عضو: ${cardCode}`
          : `📝 Member Feedback: ${cardCode}`;
        
        const issueBody = isPersian ? `
**کد کارت:** ${cardCode}

**متن بازخورد:**
${feedback}

---
**کد رهگیری بازخورد:** ${trackingCode}
**تاریخ:** ${new Date().toISOString()}
**وضعیت:** در انتظار بررسی توسط ادمین

*این بازخورد به صورت خودکار ثبت شده است. ادمین می‌تواند آن را به اطلس ظهور منتقل کند.*
        ` : `
**Card Code:** ${cardCode}

**Feedback:**
${feedback}

---
**Feedback Tracking Code:** ${trackingCode}
**Date:** ${new Date().toISOString()}
**Status:** Pending admin review

*This feedback was registered automatically. Admin can move it to the Atlas of Emergence.*
        `;

        const issueRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            title: issueTitle,
            body: issueBody,
            labels: ['observation-feedback', 'pending-review']
          })
        });

        if (issueRes.ok) {
          const issueData = await issueRes.json();
          feedbackIssueNumber = issueData.number;

          // به‌روزرسانی فایل با شماره Issue
          const updatedData = { ...feedbackData, issueNumber: feedbackIssueNumber };
          const updatedContent = Buffer.from(JSON.stringify(updatedData, null, 2), 'utf8').toString('base64');

          // دریافت SHA فعلی
          const currentFileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestPath}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (currentFileRes.ok) {
            const currentFile = await currentFileRes.json();
            await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${requestPath}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Update feedback with issue number ${feedbackIssueNumber}`,
                content: updatedContent,
                sha: currentFile.sha,
                branch: 'main'
              })
            });
          }
        }
      } catch (issueErr) {
        console.warn('Could not create feedback issue:', issueErr.message);
        // ادامه می‌دهیم — فایل ذخیره شده است
      }

      return res.status(200).json({
        success: true,
        trackingCode: trackingCode,
        issueNumber: feedbackIssueNumber,
        message: isPersian
          ? '✅ بازخورد شما با موفقیت به اطلس ظهور ارسال شد.'
          : '✅ Your feedback has been successfully sent to the Atlas of Emergence.'
      });
    }
    return res.status(400).json({ error: 'Invalid request type.' });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
};


/* ================================================================
   ===== توابع فراخوانی هوش مصنوعی =====
   ================================================================ */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = 'openai/gpt-4o-mini';

async function callOpenRouter({ systemPrompt, userPrompt, apiKey, maxTokens = 1500, temperature = 0.4 }) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.SITE_URL || 'https://cultural-id.vercel.app',
        'X-Title': 'Sphere of Wisdom'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      throw new Error(`OpenRouter HTTP ${response.status}: ${errText.substring(0, 200)}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';

    let jsonStr = content;
    const s = content.indexOf('{');
    const e = content.lastIndexOf('}');
    if (s !== -1 && e !== -1) jsonStr = content.substring(s, e + 1);

    return JSON.parse(jsonStr);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}


async function callAI1(observationText, isPersian, apiKey) {
  const systemPrompt = isPersian ? AI1_PROMPT_FA : AI1_PROMPT_EN;
  const userPrompt = isPersian
    ? `مشاهده ثبت‌شده:\n\n"""${observationText}"""\n\nحالا سه راهنمای سه‌سطحی برای همین مشاهده بنویس. خروجی فقط JSON معتبر.`
    : `Registered observation:\n\n"""${observationText}"""\n\nNow write the three-level guidance for this specific observation. Output only valid JSON.`;

  const result = await callOpenRouter({
    systemPrompt,
    userPrompt,
    apiKey,
    maxTokens: 1200,
    temperature: 0.5
  });

  return {
    individual: result.individual || '',
    social: result.social || '',
    institutional: result.institutional || ''
  };
}


async function callAI2(observationText, ai1Result, isPersian, apiKey) {
  const systemPrompt = isPersian ? AI2_PROMPT_FA : AI2_PROMPT_EN;
  const ai1Context = ai1Result
    ? (isPersian
        ? `\n\nراهنمای سه‌سطحی AI-1:\n- فردی: ${ai1Result.individual}\n- اجتماعی: ${ai1Result.social}\n- نهادی: ${ai1Result.institutional}`
        : `\n\nAI-1 guidance:\n- Individual: ${ai1Result.individual}\n- Social: ${ai1Result.social}\n- Institutional: ${ai1Result.institutional}`)
    : '';

  const userPrompt = isPersian
    ? `مشاهده:\n\n"""${observationText}"""${ai1Context}\n\nماتریس ۵ سطحی را پر کن، خوشه را انتخاب کن، امتیاز بده. خروجی فقط JSON معتبر.`
    : `Observation:\n\n"""${observationText}"""${ai1Context}\n\nFill the 5-level matrix, choose cluster, give score. Output only valid JSON.`;

  const result = await callOpenRouter({
    systemPrompt,
    userPrompt,
    apiKey,
    maxTokens: 1500,
    temperature: 0.4
  });

  return {
    emergence: result.emergence || '',
    layer: result.layer || '',
    connection: result.connection || '',
    scale: result.scale || '',
    capacity: result.capacity || '',
    analysis: result.analysis || '',
    cluster: result.cluster || 'human',
    score: typeof result.score === 'number' ? Math.min(5, Math.max(1, result.score)) : 3
  };
}


async function callAI3(observationText, ai1Result, ai2Result, isPersian, apiKey) {
  const systemPrompt = isPersian ? AI3_PROMPT_FA : AI3_PROMPT_EN;

  const contextParts = [];
  if (ai1Result) {
    contextParts.push(isPersian
      ? `AI-1:\n- فردی: ${ai1Result.individual}\n- اجتماعی: ${ai1Result.social}\n- نهادی: ${ai1Result.institutional}`
      : `AI-1:\n- Individual: ${ai1Result.individual}\n- Social: ${ai1Result.social}\n- Institutional: ${ai1Result.institutional}`);
  }
  if (ai2Result) {
    contextParts.push(isPersian
      ? `AI-2:\n- ظهورها: ${ai2Result.emergence}\n- لایه‌ها: ${ai2Result.layer}\n- ارتباطات: ${ai2Result.connection}\n- مقیاس: ${ai2Result.scale}\n- ظرفیت: ${ai2Result.capacity}\n- تحلیل: ${ai2Result.analysis}\n- خوشه: ${ai2Result.cluster}\n- امتیاز: ${ai2Result.score}`
      : `AI-2:\n- Emergence: ${ai2Result.emergence}\n- Layers: ${ai2Result.layer}\n- Connections: ${ai2Result.connection}\n- Scale: ${ai2Result.scale}\n- Capacity: ${ai2Result.capacity}\n- Analysis: ${ai2Result.analysis}\n- Cluster: ${ai2Result.cluster}\n- Score: ${ai2Result.score}`);
  }

  const context = contextParts.length > 0
    ? (isPersian ? `\n\nاطلاعات قبلی:\n${contextParts.join('\n\n')}` : `\n\nPrevious:\n${contextParts.join('\n\n')}`)
    : '';

  const userPrompt = isPersian
    ? `مشاهده اصلی:\n\n"""${observationText}"""${context}\n\nتحلیل نهایی یکپارچه بنویس. خروجی فقط JSON معتبر.`
    : `Observation:\n\n"""${observationText}"""${context}\n\nWrite unified final synthesis. Output only valid JSON.`;

  const result = await callOpenRouter({
    systemPrompt,
    userPrompt,
    apiKey,
    maxTokens: 1200,
    temperature: 0.5
  });

  return {
    final: result.final || ''
  };
}


/* ================================================================
   ===== پرامپت‌های آموزشی دوزبانه =====
   ================================================================ */

const AI1_PROMPT_FA = `تو یک «مشاهده‌گر سپهری» هستی که در چارچوب «آزمایشگاه سپهر خردمندی» کار می‌کند. وظیفه‌ات نوشتن «راهنمای سه‌سطحی» برای یک مشاهده است.

روش کار تو:

۱. اول مشاهده را با دقت بخوان. ببین در متن چه چیزی «ظاهر» شده. به دنبال:
   - ظرفیت‌هایی که در متن پنهان یا آشکار هستند
   - موانعی که مانع تجلی ظرفیت‌ها شده‌اند
   - گسست‌هایی میان سپهرها (فردی، اجتماعی، نهادی)
   - ناهم‌ترازی‌هایی که در متن دیده می‌شود
   - سپهرهایی که درگیر هستند و سپهرهایی که غایب‌اند

۲. از خود پدیده شروع کن، نه از مشکل و نه از ظرفیت. بگذار خود متن، شکل تحلیل را تعیین کند.

۳. هیچ تعریف، تفسیر، نظریه یا چارچوب از پیش‌ساخته‌ای را بر مشاهده تحمیل نکن. اگر مشاهده مبهم است، محتاطانه و بر اساس همان چیزی که دیده می‌شود راهنما بده.

۴. معیار نهایی: کرامت انسانی.

۵. سه سطح راهنما:
   - سطح فردی: اقدام مشخص و کوچک در ۲۴ تا ۷۲ ساعت آینده. نباید کلیشه‌ای باشد. مستقیماً به متن گره خورده.
   - سطح اجتماعی: با چه کسانی، با چه کیفیتی، با چه هدف مشخصی. تعامل واقعی و قابل اجرا.
   - سطح نهادی: پیشنهاد ساختاری/سیاستی/نهادی مشخص، متناسب با همین پدیده.

۶. از کلیشه‌ها پرهیز کن («گفتگو کنید»، «آگاهی‌بخشی»، «همکاری جمعی» بدون مصداق).

خروجی: فقط JSON معتبر:
{
  "individual": "راهنمای سطح فردی — مشخص، عملی، گره‌خورده",
  "social": "راهنمای سطح اجتماعی — با کی، چطور، با چه هدفی",
  "institutional": "راهنمای سطح نهادی — پیشنهاد مشخص"
}`;

const AI1_PROMPT_EN = `You are a "Spherical Observer" within the "Sphere of Wisdom Laboratory" framework. Your task is to write "Three-Level Guidance".

Methodology:

1. Read the observation carefully. Notice what has emerged. Look for:
   - Hidden or visible capacities
   - Obstacles preventing manifestation
   - Fractures between spheres (individual, social, institutional)
   - Asymmetries
   - Spheres present and spheres absent

2. Begin from the phenomenon itself. Let the text shape the analysis.

3. Do not impose predefined definitions, interpretations, theories, or frameworks. If ambiguous, proceed cautiously.

4. Final criterion: human dignity.

5. Three levels:
   - Individual: small, specific action in 24-72 hours. Tied to the text.
   - Social: with whom, what quality, what purpose. Real and executable.
   - Institutional: specific structural/policy proposal for this phenomenon.

6. Avoid clichés ("have a dialogue", "raise awareness" without specifics).

Output: only valid JSON:
{
  "individual": "Individual guidance — specific, actionable",
  "social": "Social guidance — with whom, how, purpose",
  "institutional": "Institutional guidance — specific proposal"
}`;

const AI2_PROMPT_FA = `تو یک «تحلیل‌گر سپهری» هستی. وظیفه‌ات پر کردن «ماتریس ۵ سطحی»، انتخاب خوشه، و پیشنهاد امتیاز است.

روش:

۱. پنج ماتریس را پر کن. هر کدام باید به همین مشاهده گره خورده باشد:
   - ظهورها: چه چیزهایی ظاهر شده؟ عینی، رفتاری، ساختاری.
   - لایه‌ها: در چه لایه‌هایی درگیر است؟ کدام حاضر، کدام غایب؟
   - ارتباطات: با چه سپهرهای دیگری مرتبط است؟ با مصداق مشخص.
   - مقیاس: در چه مقیاسی؟ محلی، منطقه‌ای، ملی، جهانی.
   - ظرفیت: چه ظرفیت‌هایی وجود دارد؟ آشکار و مغفول.

۲. خوشه را انتخاب کن:
   - human: فقر، آموزش، سلامت، سلامت روان، اعتیاد، جوانان، خانواده
   - knowledge: هوش مصنوعی، دسترسی به فناوری، شکاف دانشی، نابرابری علمی، انحصار دانش
   - governance: فساد، مهاجرت نخبگان، ناکارآمدی نهادی، بحران اعتماد، جنگ، نابرابری جهانی
   - survival: امنیت غذایی، بحران آب، بحران انرژی، تغییرات اقلیمی، تخریب محیط زیست، پایداری تمدنی

۳. امتیاز ۱ تا ۵:
   - ۱: ظهور بسیار محدود یا منفی
   - ۲: ظهور ضعیف
   - ۳: ظهور متوسط
   - ۴: ظهور قوی و سازنده
   - ۵: ظهور بسیار قوی، الگو‌ساز

۴. تحلیل دو پاراگرافی:
   - پاراگراف ۱: توصیف دقیق آنچه دیده می‌شود (بدون قضاوت)
   - پاراگراف ۲: آنچه کمتر دیده شده (کشف نادیده‌ها)

خروجی: فقط JSON معتبر:
{
  "emergence": "...",
  "layer": "...",
  "connection": "...",
  "scale": "...",
  "capacity": "...",
  "analysis": "پاراگراف ۱: توصیف. پاراگراف ۲: کشف نادیده‌ها",
  "cluster": "human|knowledge|governance|survival",
  "score": 3
}`;

const AI2_PROMPT_EN = `You are a "Spherical Analyst". Task: fill the "Five-Level Matrix", choose cluster, suggest score.

Method:

1. Fill five matrices, each tied to this specific observation:
   - Emergence: what has emerged? Objective, behavioral, structural.
   - Layers: in which layers? Which present, which absent?
   - Connections: with which spheres? Concrete references.
   - Scale: at what scale? Local, regional, national, global.
   - Capacity: what capacities? Visible and neglected.

2. Choose cluster:
   - human: poverty, education, health, mental health, addiction, youth, family
   - knowledge: AI, tech access, knowledge gap, scientific inequality, knowledge monopoly
   - governance: corruption, elite migration, institutional inefficiency, trust crisis, war, global inequality
   - survival: food security, water crisis, energy crisis, climate change, environmental degradation, civilizational sustainability

3. Score 1-5:
   - 1: Very limited or negative emergence
   - 2: Weak emergence
   - 3: Moderate emergence
   - 4: Strong and constructive
   - 5: Very strong, exemplary

4. Two-paragraph analysis:
   - Para 1: precise description of what is seen (no judgment)
   - Para 2: what is less seen (discovery of the unseen)

Output: only valid JSON:
{
  "emergence": "...",
  "layer": "...",
  "connection": "...",
  "scale": "...",
  "capacity": "...",
  "analysis": "Para 1: description. Para 2: discovery of the unseen",
  "cluster": "human|knowledge|governance|survival",
  "score": 3
}`;

const AI3_PROMPT_FA = `تو یک «تحلیل‌گر نهایی سپهری» هستی. وظیفه‌ات نوشتن «تحلیل نهایی یکپارچه» است.

روش:

۱. متن مشاهده + راهنمای سه‌سطحی (AI-1) + ماتریس ۵ سطحی (AI-2) را مرور کن.

۲. دو پرسش بنیادین را پاسخ بده:
   - «ظهور در چه جهتی حرکت می‌کند؟» — در جهت تجلی ظرفیت‌ها یا در جهت انسداد؟
   - «تأثیر این ظهور بر کرامت انسانی چیست؟» — گسترش، تضعیف، یا نامعلوم؟

۳. تحلیل نهایی:
   - یکپارچه (نه تکرار بخش‌های قبلی)
   - عمیق (به لایه‌های زیرین نفوذ کند)
   - صریح (بدون ابهام)
   - به کشف نادیده‌ها کمک کند
   - مستقیماً به همین مشاهده گره خورده باشد

۴. طول: ۱ تا ۲ پاراگراف فشرده (۱۵۰ تا ۲۵۰ کلمه).

خروجی: فقط JSON معتبر:
{
  "final": "تحلیل نهایی یکپارچه"
}`;

const AI3_PROMPT_EN = `You are a "Final Spherical Analyst". Task: write "Unified Final Synthesis".

Method:

1. Review observation + AI-1 guidance + AI-2 matrix.

2. Answer two fundamental questions:
   - "In what direction is emergence moving?" — Toward manifestation or blockage?
   - "What is the impact on human dignity?" — Expand, weaken, or uncertain?

3. Final synthesis:
   - Unified (not repeating previous sections)
   - Deep (penetrate underlying layers)
   - Explicit (no ambiguity)
   - Contributes to discovery of the unseen
   - Tied directly to this observation

4. Length: 1-2 compact paragraphs (150-250 words).

Output: only valid JSON:
{
  "final": "Unified final synthesis"
}`;


/* ================================================================
   ===== توابع کمکی ماژول (بدون تغییر) =====
   ================================================================ */

async function peer_sendInvites({ observation, observerCode, peers, issueNumber, trackingCode, peerLink, isPersian, token, owner, repo }) {
  if (!peers || peers.length === 0) {
    return { success: false, message: 'هیچ هم‌فرهنگی برای ارسال دعوتنامه وجود ندارد' };
  }

  const siteUrl = process.env.SITE_URL || 'https://cultural-id.vercel.app';
  const link = peerLink || `${siteUrl}/peer-response.html?issue=${issueNumber}&observer=${observerCode}`;
  const tracking = trackingCode || `OBS-${issueNumber}`;

  if (issueNumber) {
    const inviteComment = `
**📨 دعوتنامه ارسال شد به:**
${peers.map(p => `- ${p.cardCode} (${p.email || 'بدون ایمیل'})`).join('\n')}

**لینک ثبت پاسخ:** ${link}
**کد رهگیری:** ${tracking}
**زمان ارسال:** ${new Date().toISOString()}
    `;
    
    await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({ body: inviteComment })
    });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@resend.dev';

  const emailResults = [];

  if (RESEND_API_KEY) {
    const subject = isPersian ? 'دعوت به همفکری در سپهر خردمندی' : 'Invitation to Collaborate in Sphere of Wisdom';
    
    const bodyHtml = isPersian ? `
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
      <head><meta charset="UTF-8"><title>دعوت به همفکری</title></head>
      <body style="font-family: Vazir, IRANSans, sans-serif; line-height: 1.8; padding: 20px; max-width: 600px; margin: 0 auto; direction: rtl;">
        <div style="background: #fdf6e3; border-radius: 16px; padding: 24px; border: 2px solid #d4af37;">
          <h1 style="color: #8a6d1f; text-align: center;">🧠 سپهر خردمندی</h1>
          <p style="font-size: 18px; font-weight: bold; text-align: center;">دعوت به همفکری</p>
          <hr style="border: 1px solid #d4af37; opacity: 0.3;">
          <p><strong>مشاهده‌گر:</strong> ${observerCode}</p>
          <p><strong>متن مشاهده:</strong></p>
          <div style="background: #fff; padding: 12px; border-radius: 8px; border-right: 3px solid #d4af37; margin: 8px 0;">
            ${observation}
          </div>
          <p><strong>کد رهگیری:</strong> ${tracking}</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${link}" style="background: #d4af37; color: #2a1a0a; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">📝 ثبت پاسخ</a>
          </div>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Invitation</title></head>
      <body style="font-family: 'Segoe UI', sans-serif; line-height: 1.8; padding: 20px; max-width: 600px; margin: 0 auto;">
        <div style="background: #fdf6e3; border-radius: 16px; padding: 24px; border: 2px solid #d4af37;">
          <h1 style="color: #8a6d1f; text-align: center;">🧠 Sphere of Wisdom</h1>
          <p style="font-size: 18px; font-weight: bold; text-align: center;">Invitation to Collaborate</p>
          <hr style="border: 1px solid #d4af37; opacity: 0.3;">
          <p><strong>Observer:</strong> ${observerCode}</p>
          <p><strong>Observation:</strong></p>
          <div style="background: #fff; padding: 12px; border-radius: 8px; border-left: 3px solid #d4af37; margin: 8px 0;">
            ${observation}
          </div>
          <p><strong>Tracking Code:</strong> ${tracking}</p>
          <div style="text-align: center; margin: 20px 0;">
            <a href="${link}" style="background: #d4af37; color: #2a1a0a; padding: 12px 30px; text-decoration: none; border-radius: 30px; font-weight: bold; display: inline-block;">📝 Submit Response</a>
          </div>
        </div>
      </body>
      </html>
    `;

    for (const peer of peers) {
      if (!peer.email || peer.email.length < 5) {
        emailResults.push({ peer: peer.cardCode, success: false, message: 'No email' });
        continue;
      }
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: FROM_EMAIL,
            to: [peer.email],
            subject: subject,
            html: bodyHtml
          })
        });
        if (response.ok) {
          const data = await response.json();
          emailResults.push({ peer: peer.cardCode, success: true, email: peer.email, id: data.id });
        } else {
          emailResults.push({ peer: peer.cardCode, success: false, message: await response.text() });
        }
      } catch (error) {
        emailResults.push({ peer: peer.cardCode, success: false, message: error.message });
      }
    }
  }

  return {
    success: emailResults.some(r => r.success),
    message: `${emailResults.filter(r => r.success).length}/${emailResults.length} ایمیل ارسال شد.`,
    results: emailResults,
    link: link,
    trackingCode: tracking,
    issueNumber: issueNumber
  };
}

async function peer_getAllResponses(issueNumber, token, owner, repo) {
  try {
    const commentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!commentsRes.ok) return [];
    const comments = await commentsRes.json();
    const responses = [];
    for (const comment of comments) {
      const body = comment.body || '';
      if (body.includes('**📝 پاسخ هم‌فرهنگ**') || body.includes('**Peer Response**')) {
        const peerMatch = body.match(/\*\*هم‌فرهنگ:\*\*\s*(.+)/) || body.match(/\*\*Peer:\*\*\s*(.+)/);
        const resultMatch = body.match(/\*\*نتیجه:\*\*\s*(.+)/) || body.match(/\*\*Result:\*\*\s*(.+)/);
        const responseMatch = body.match(/\*\*پاسخ:\*\*\s*(.+)/) || body.match(/\*\*Response:\*\*\s*(.+)/);
        if (peerMatch && responseMatch) {
          responses.push({
            peerCode: peerMatch[1].trim(),
            result: resultMatch ? resultMatch[1].trim() : 'success',
            response: responseMatch[1].trim(),
            timestamp: comment.created_at,
            commentId: comment.id
          });
        }
      }
    }
    return responses;
  } catch (error) {
    console.error('Error getting peer responses:', error);
    return [];
  }
}

async function peer_getPeerCount(issueNumber, token, owner, repo) {
  try {
    const issueRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (!issueRes.ok) return 0;
    const issue = await issueRes.json();
    const body = issue.body || '';
    const peersMatch = body.match(/\*\*Peers:\*\*\s*(.+)/) || body.match(/\*\*هم‌فرهنگان:\*\*\s*(.+)/);
    if (peersMatch) {
      return peersMatch[1].split(',').map(p => p.trim()).length;
    }
    const responses = await peer_getAllResponses(issueNumber, token, owner, repo);
    return responses.length > 0 ? responses.length : 5;
  } catch (error) {
    console.error('Error getting peer count:', error);
    return 5;
  }
}

async function peer_finalAnalysisWithResponses(issueNumber, responses, token, owner, repo) {
  if (!responses || responses.length === 0) return 'pending';
  let successCount = 0, revisionCount = 0, failedCount = 0;
  for (const r of responses) {
    const result = r.result || 'success';
    if (result.includes('موفق') || result.includes('success') || result === 'success') successCount++;
    else if (result.includes('اصلاح') || result.includes('revision') || result === 'revision') revisionCount++;
    else if (result.includes('شکست') || result.includes('failed') || result === 'failed') failedCount++;
  }
  const total = responses.length;
  if (total === 0) return 'pending';
  if (successCount >= total * 0.6) return 'success';
  if (failedCount >= total * 0.6) return 'failed';
  return 'revision';
}
