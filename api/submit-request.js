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

    const { cardCode, type, description, observations, text, feedback } = parsedBody;
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
          // ----- AI-1: راهنمای سه‌سطحی -----
          try {
            ai1Result = await callAI1(obs.text, isPersian, openRouterKey);
          } catch (err) {
            console.warn('AI-1 failed:', err.message);
            aiErrors.push('AI1');
          }

          // ----- AI-2: ماتریس ۵ سطحی + خوشه + امتیاز -----
          try {
            ai2Result = await callAI2(obs.text, ai1Result, isPersian, openRouterKey);
          } catch (err) {
            console.warn('AI-2 failed:', err.message);
            aiErrors.push('AI2');
          }

          // ----- AI-3: تحلیل نهایی -----
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
        // ساخت بخش AI برای Issue (دوزبانه)
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

        // ---------- AI-1 ----------
        const ai1Title = isPersian ? '**🤖 تحلیل هوش مصنوعی اول — راهنمای سه‌سطحی:**' : '**🤖 AI-1 Guidance — Three Levels:**';
        let ai1Section;
        if (ai1Result) {
          const lIndividual = isPersian ? '**سطح فردی:**' : '**Individual:**';
          const lSocial = isPersian ? '**سطح اجتماعی:**' : '**Social:**';
          const lInstitutional = isPersian ? '**سطح نهادی:**' : '**Institutional:**';
          ai1Section = `
${ai1Title}
- ${lIndividual} ${ai1Result.individual || '---'}
- ${lSocial} ${ai1Result.social || '---'}
- ${lInstitutional} ${ai1Result.institutional || '---'}
`;
        } else {
          const errMsg = isPersian
            ? '- **وضعیت:** ⚠️ تحلیل هوش مصنوعی اول دریافت نشد\n- **کد خطا:** AI1_FAILED\n- **اقدام پیشنهادی:** ادمین باید تحلیل را دستی بررسی کند یا مشاهده را دوباره ثبت کند.'
            : '- **Status:** ⚠️ AI-1 analysis not received\n- **Error Code:** AI1_FAILED\n- **Suggested Action:** Admin should review manually or resubmit.';
          ai1Section = `
${ai1Title}
${errMsg}
- **Individual:** ---
- **Social:** ---
- **Institutional:** ---
`;
        }

        // ---------- AI-2 ----------
        const ai2Title = isPersian ? '**🧠 تحلیل هوش مصنوعی دوم — ماتریس ۵ سطحی:**' : '**🧠 AI-2 Matrix — Five Levels:**';
        let ai2Section;
        if (ai2Result) {
          const lStatus = isPersian ? '**وضعیت:**' : '**Status:**';
          const lCluster = isPersian ? '**خوشه:**' : '**Cluster:**';
          const lScore = isPersian ? '**امتیاز پیشنهادی:**' : '**Suggested Score:**';
          const lEmergence = isPersian ? '**ظهورها:**' : '**Emergence:**';
          const lLayers = isPersian ? '**لایه‌ها:**' : '**Layers:**';
          const lConnections = isPersian ? '**ارتباطات:**' : '**Connections:**';
          const lScale = isPersian ? '**مقیاس:**' : '**Scale:**';
          const lCapacity = isPersian ? '**ظرفیت:**' : '**Capacity:**';
          const lAnalysis = isPersian ? '**تحلیل:**' : '**Analysis:**';
          ai2Section = `
${ai2Title}
- ${lStatus} ${isPersian ? '✅ تایید شده' : '✅ Approved'}
- ${lCluster} ${clusterLabel}
- ${lScore} ${suggestedScore || '---'}
- ${lEmergence} ${ai2Result.emergence || '---'}
- ${lLayers} ${ai2Result.layer || '---'}
- ${lConnections} ${ai2Result.connection || '---'}
- ${lScale} ${ai2Result.scale || '---'}
- ${lCapacity} ${ai2Result.capacity || '---'}
- ${lAnalysis} ${ai2Result.analysis || '---'}
`;
        } else {
          const errMsg = isPersian
            ? '- **وضعیت:** ⚠️ تحلیل هوش مصنوعی دوم دریافت نشد\n- **کد خطا:** AI2_FAILED\n- **اقدام پیشنهادی:** ادمین باید ماتریس را دستی بررسی کند.'
            : '- **Status:** ⚠️ AI-2 analysis not received\n- **Error Code:** AI2_FAILED\n- **Suggested Action:** Admin should review the matrix manually.';
          ai2Section = `
${ai2Title}
${errMsg}
- **Cluster:** ${clusterLabel}
- **Suggested Score:** ---
- **Emergence:** ---
- **Layers:** ---
- **Connections:** ---
- **Scale:** ---
- **Capacity:** ---
- **Analysis:** ---
`;
        }

        // ---------- AI-3 ----------
        const ai3Title = isPersian ? '**💎 تحلیل هوش مصنوعی سوم — جمع‌بندی نهایی:**' : '**💎 AI-3 Final Synthesis:**';
        let ai3Section;
        if (ai3Result && ai3Result.final) {
          ai3Section = `
${ai3Title}
${ai3Result.final}
`;
        } else {
          const errMsg = isPersian
            ? '- **وضعیت:** ⚠️ تحلیل نهایی دریافت نشد\n- **کد خطا:** AI3_FAILED'
            : '- **Status:** ⚠️ Final synthesis not received\n- **Error Code:** AI3_FAILED';
          ai3Section = `
${ai3Title}
${errMsg}
`;
        }

        // ============================================================
        // پردازش ماژول (بدون تغییر)
        // ============================================================
        let moduleResult = null;
        let peerInvites = null;
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
                  peerInvites = await peer_sendInvites({
                    observation: obs.text,
                    observerCode: cardCode,
                    peers: selected.map(u => ({ cardCode: u.cardCode, email: u.communicationEmail })),
                    issueNumber: null,
                    isPersian: isPersian,
                    token: token,
                    owner: owner,
                    repo: repo
                  });
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
                  peerInvites = await peer_sendInvites({
                    observation: obs.text,
                    observerCode: cardCode,
                    peers: referrals.map(u => ({ cardCode: u.cardCode, email: u.communicationEmail })),
                    issueNumber: null,
                    isPersian: isPersian,
                    token: token,
                    owner: owner,
                    repo: repo
                  });
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
        // ساخت Module Section
        // ============================================================
        let moduleSection = '';
        if (moduleResult) {
          const moduleStatusLabels = isPersian ? {
            'pending': '⏳ در انتظار پاسخ هم‌فرهنگ‌ها',
            'completed': '✅ تکمیل شد',
            'no_peers': '⚠️ هم‌فرهنگی یافت نشد',
            'no_related': '⚠️ مشاهده مرتبط یافت نشد',
            'error': '❌ خطا در پردازش'
          } : {
            'pending': '⏳ Awaiting peer responses',
            'completed': '✅ Completed',
            'no_peers': '⚠️ No peers found',
            'no_related': '⚠️ No related observations',
            'error': '❌ Processing error'
          };
          const statusText = moduleStatusLabels[moduleResult.status] || moduleResult.status;
          const typeNames = {
            'collaboration': isPersian ? 'همفکری با دیگران' : 'Collaboration',
            'related': isPersian ? 'مشاهدات مرتبط دیگران' : 'Related Observations',
            'referral': isPersian ? 'ارجاع به ۵ همفرهنگ' : 'Referral to 5 Peers'
          };
          const modTitle = isPersian ? '**📌 نتیجه ماژول:**' : '**📌 Module Result:**';
          const lType = isPersian ? '**نوع:**' : '**Type:**';
          const lStatus = isPersian ? '**وضعیت:**' : '**Status:**';
          const lResults = isPersian ? '**نتایج:**' : '**Results:**';
          const lAnalysis = isPersian ? '**تحلیل:**' : '**Analysis:**';
          const lPeers = isPersian ? '**هم‌فرهنگان:**' : '**Peers:**';
          moduleSection = `
${modTitle}
- ${lType} ${typeNames[moduleResult.type] || moduleResult.type}
- ${lStatus} ${statusText}
- ${lResults} ${moduleResult.data && moduleResult.data.length > 0 ? moduleResult.data.join(', ') : '---'}
${moduleResult.analysis ? `- ${lAnalysis} ${moduleResult.analysis}` : ''}
${moduleResult.peers && moduleResult.peers.length > 0 ? `- ${lPeers} ${moduleResult.peers.map(p => p.cardCode).join(', ')}` : ''}
`;
        }

        // ============================================================
        // ساخت بدنه Issue
        // ============================================================
        const issueTitle = isPersian
          ? `مشاهده خام: ${cardCode}`
          : `Raw Observation: ${cardCode}`;

        const bodyLabels = isPersian ? {
          cardCode: '**کد کارت:**',
          observation: '**مشاهده:**',
          selectedModule: '**ماژول انتخاب‌شده:**',
          footer: '*این مشاهده ثبت شده و در انتظار بررسی است.*',
          moduleStatus: '**وضعیت ماژول:**',
          aiErrors: '**خطاهای هوش مصنوعی:**',
          tracking: '**کد رهگیری:** بعد از ساخت Issue تخصیص می‌یابد.'
        } : {
          cardCode: '**Card Code:**',
          observation: '**Observation:**',
          selectedModule: '**Selected Module:**',
          footer: '*This observation has been registered and is pending review.*',
          moduleStatus: '**Module Status:**',
          aiErrors: '**AI Errors:**',
          tracking: '**Tracking Code:** Will be assigned after issue creation.'
        };

        const issueBody = `
${bodyLabels.cardCode} ${cardCode}

${bodyLabels.observation}
${obs.text}

${bodyLabels.selectedModule}
${selectedModule}

${ai1Section}
${ai2Section}
${ai3Section}
${moduleSection}
---
${bodyLabels.footer}

${bodyLabels.moduleStatus} ${moduleStatus}
${bodyLabels.aiErrors} ${aiErrors.length > 0 ? aiErrors.join(', ') : 'None'}
${bodyLabels.tracking}
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

        // ============================================================
        // ارسال دعوتنامه به هم‌فرهنگان
        // ============================================================
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

        // ============================================================
        // داده خروجی سازگار با normalizeAi1/Ai2/Ai3
        // ============================================================
        const ai1Guidance = {
          individual: ai1Result?.individual || '',
          social: ai1Result?.social || '',
          institutional: ai1Result?.institutional || '',
          _error: !ai1Result ? 'AI1_FAILED' : null
        };

        const ai2Matrix = {
          emergence: ai2Result?.emergence || '',
          layer: ai2Result?.layer || '',
          connection: ai2Result?.connection || '',
          scale: ai2Result?.scale || '',
          capacity: ai2Result?.capacity || '',
          analysis: ai2Result?.analysis || '',
          cluster: cluster,
          score: suggestedScore,
          _error: !ai2Result ? 'AI2_FAILED' : null
        };

        const ai3Final = ai3Result?.final || '';
        const ai3Error = !ai3Result?.final ? 'AI3_FAILED' : null;

        createdIssues.push({
          number: issueData.number,
          url: issueData.html_url,
          trackingCode: `OBS-${issueData.number}`,
          observation: obs.text.substring(0, 50) + '...',
          module: selectedModule,
          moduleStatus: moduleStatus,
          moduleMessage: moduleMessage,
          ai1Guidance: ai1Guidance,
          ai2Matrix: ai2Matrix,
          finalAnalysis: ai3Final,
          ai3Error: ai3Error,
          aiErrors: aiErrors
        });
      }

      if (createdIssues.length === 0) {
        return res.status(400).json({ error: 'No valid observations were registered.' });
      }

      const trackingCodes = createdIssues.map(i => i.trackingCode).join(', ');
      const anyAiFailed = createdIssues.some(i => i.aiErrors && i.aiErrors.length > 0);
      
      return res.status(200).json({
        success: true,
        trackingCode: trackingCodes,
        issues: createdIssues,
        aiWarning: anyAiFailed
          ? 'بعضی از تحلیل‌های هوش مصنوعی دریافت نشد. مشاهده ثبت شد اما ممکن است تحلیل ناقص باشد. ادمین می‌تواند وضعیت را بررسی کند.'
          : null,
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
- **تحلیل:** ${moduleResult === 'success' ? 'هم‌فرهنگ‌ها این مشاهده را موفق ارزیابی کردند.' : moduleResult === 'revision' ? 'هم‌فرهنگ‌ها نیاز به اصلاح را پیشنهاد کردند.' : 'هم‌فرهنگ‌ها این مشاهده را ناموفق ارزیابی کردند.'}

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
const AI_MODEL = 'openai/gpt-4o-mini'; // مدل پایدار برای JSON

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

    // استخراج تمیز JSON
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


/* ================================================================
   AI-1 — راهنمای سه‌سطحی
   آموزش روش: مشاهده خام، بدون تحمیل نظریه، ظرفیت‌محوری اصلاح‌شده
   ================================================================ */
async function callAI1(observationText, isPersian, apiKey) {
  const systemPrompt = isPersian ? AI1_PROMPT_FA : AI1_PROMPT_EN;
  const userPrompt = isPersian
    ? `مشاهده‌ای که ثبت شده این است:\n\n"""${observationText}"""\n\nحالا بر اساس روشی که در دستورالعمل آمده، سه راهنمای سه‌سطحی برای همین مشاهده بنویس. خروجی فقط JSON معتبر باشد.`
    : `The registered observation is:\n\n"""${observationText}"""\n\nNow, following the methodology in the instructions, write the three-level guidance for this specific observation. Output only valid JSON.`;

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


/* ================================================================
   AI-2 — ماتریس ۵ سطحی + خوشه + امتیاز
   ================================================================ */
async function callAI2(observationText, ai1Result, isPersian, apiKey) {
  const systemPrompt = isPersian ? AI2_PROMPT_FA : AI2_PROMPT_EN;
  const ai1Context = ai1Result
    ? (isPersian
        ? `\n\nراهنمای سه‌سطحی که هوش مصنوعی اول برای همین مشاهده نوشته:\n- فردی: ${ai1Result.individual}\n- اجتماعی: ${ai1Result.social}\n- نهادی: ${ai1Result.institutional}`
        : `\n\nAI-1 three-level guidance for the same observation:\n- Individual: ${ai1Result.individual}\n- Social: ${ai1Result.social}\n- Institutional: ${ai1Result.institutional}`)
    : '';

  const userPrompt = isPersian
    ? `مشاهده‌ای که ثبت شده این است:\n\n"""${observationText}"""${ai1Context}\n\nحالا بر اساس روشی که در دستورالعمل آمده، ماتریس ۵ سطحی را برای همین مشاهده پر کن، خوشه مناسب را انتخاب کن، و امتیاز پیشنهادی بده. خروجی فقط JSON معتبر باشد.`
    : `The registered observation is:\n\n"""${observationText}"""${ai1Context}\n\nNow, following the methodology in the instructions, fill in the 5-level matrix for this specific observation, choose the appropriate cluster, and give a suggested score. Output only valid JSON.`;

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


/* ================================================================
   AI-3 — تحلیل نهایی یکپارچه
   ================================================================ */
async function callAI3(observationText, ai1Result, ai2Result, isPersian, apiKey) {
  const systemPrompt = isPersian ? AI3_PROMPT_FA : AI3_PROMPT_EN;

  const contextParts = [];
  if (ai1Result) {
    contextParts.push(isPersian
      ? `راهنمای سه‌سطحی AI-1:\n- فردی: ${ai1Result.individual}\n- اجتماعی: ${ai1Result.social}\n- نهادی: ${ai1Result.institutional}`
      : `AI-1 three-level guidance:\n- Individual: ${ai1Result.individual}\n- Social: ${ai1Result.social}\n- Institutional: ${ai1Result.institutional}`);
  }
  if (ai2Result) {
    contextParts.push(isPersian
      ? `ماتریس ۵ سطحی AI-2:\n- ظهورها: ${ai2Result.emergence}\n- لایه‌ها: ${ai2Result.layer}\n- ارتباطات: ${ai2Result.connection}\n- مقیاس: ${ai2Result.scale}\n- ظرفیت: ${ai2Result.capacity}\n- تحلیل: ${ai2Result.analysis}\n- خوشه: ${ai2Result.cluster}\n- امتیاز پیشنهادی: ${ai2Result.score}`
      : `AI-2 five-level matrix:\n- Emergence: ${ai2Result.emergence}\n- Layers: ${ai2Result.layer}\n- Connections: ${ai2Result.connection}\n- Scale: ${ai2Result.scale}\n- Capacity: ${ai2Result.capacity}\n- Analysis: ${ai2Result.analysis}\n- Cluster: ${ai2Result.cluster}\n- Suggested Score: ${ai2Result.score}`);
  }

  const context = contextParts.length > 0
    ? (isPersian ? `\n\nاطلاعات قبلی:\n${contextParts.join('\n\n')}` : `\n\nPrevious context:\n${contextParts.join('\n\n')}`)
    : '';

  const userPrompt = isPersian
    ? `مشاهده اصلی:\n\n"""${observationText}"""${context}\n\nحالا بر اساس روشی که در دستورالعمل آمده، یک تحلیل نهایی یکپارچه بنویس. خروجی فقط JSON معتبر باشد.`
    : `Original observation:\n\n"""${observationText}"""${context}\n\nNow, following the methodology in the instructions, write a unified final synthesis. Output only valid JSON.`;

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
   ===== پرامپت‌های آموزشی (دوزبانه) =====
   هر پرامپت «روش» را آموزش می‌دهد، نه محتوای کلیشه‌ای.
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

۴. معیار نهایی: کرامت انسانی. هر راهنما باید در جهت گسترش یا حفاظت از کرامت انسانی باشد.

۵. سه سطح راهنما را با مشخصات زیر بنویس:

   سطح فردی: مشاهده‌گر در ۲۴ تا ۷۲ ساعت آینده چه اقدام مشخص، کوچک و قابل انجامی می‌تواند انجام دهد؟ نباید کلیشه‌ای یا انتزاعی باشد. باید مستقیماً به متن مشاهده گره خورده باشد.

   سطح اجتماعی: این فرد با چه کسانی، با چه کیفیتی، و با چه هدف مشخصی می‌تواند تعامل کند؟ تعامل باید واقعی و قابل اجرا باشد، نه انتزاعی.

   سطح نهادی: چه پیشنهاد ساختاری، سیاستی یا نهادی از دل همین مشاهده قابل استخراج است؟ پیشنهاد باید متناسب با همان پدیده باشد، نه یک توصیه عمومی.

۶. از عبارات کلیشه‌ای مثل «گفتگو کنید»، «آگاهی‌بخشی کنید»، «همکاری جمعی» بدون مصداق مشخص پرهیز کن. هر راهنما باید یک اقدام قابل ردیابی و مشخص باشد.

خروجی: فقط یک آبجکت JSON معتبر با این ساختار:
{
  "individual": "راهنمای سطح فردی — مشخص، عملی، گره‌خورده به مشاهده",
  "social": "راهنمای سطح اجتماعی — با کی، چطور، با چه هدفی",
  "institutional": "راهنمای سطح نهادی — پیشنهاد مشخص ساختاری یا سیاستی"
}

هیچ متن اضافه‌ای قبل یا بعد از JSON ننویس.`;

const AI1_PROMPT_EN = `You are a "Spherical Observer" working within the "Sphere of Wisdom Laboratory" framework. Your task is to write "Three-Level Guidance" for an observation.

Your methodology:

1. First, read the observation carefully. Notice what has "emerged" in the text. Look for:
   - Capacities that are hidden or visible in the text
   - Obstacles that have prevented capacities from manifesting
   - Fractures between spheres (individual, social, institutional)
   - Asymmetries visible in the text
   - Spheres that are involved and spheres that are absent

2. Begin from the phenomenon itself — not from the problem, not from the capacity. Let the text itself determine the shape of the analysis.

3. Do not impose any predefined definition, interpretation, theory, or framework on the observation. If the observation is ambiguous, give guidance cautiously and based only on what is visible.

4. Final criterion: human dignity. Every guidance must expand or protect human dignity.

5. Write three levels of guidance with these specifications:

   Individual level: What specific, small, actionable step can the observer take in the next 24-72 hours? It must not be cliché or abstract. It must be tied directly to the text of the observation.

   Social level: With whom, with what quality, and for what specific purpose can this person interact? The interaction must be real and executable, not abstract.

   Institutional level: What structural, policy, or institutional proposal can be extracted from this specific observation? The proposal must fit the specific phenomenon, not a generic recommendation.

6. Avoid clichés like "have a dialogue", "raise awareness", "collective cooperation" without specific reference. Every guidance must be a traceable, specific action.

Output: only a valid JSON object with this structure:
{
  "individual": "Individual-level guidance — specific, actionable, tied to the observation",
  "social": "Social-level guidance — with whom, how, for what purpose",
  "institutional": "Institutional-level guidance — specific structural or policy proposal"
}

Do not write any text before or after the JSON.`;

const AI2_PROMPT_FA = `تو یک «تحلیل‌گر سپهری» هستی که در چارچوب «آزمایشگاه سپهر خردمندی» کار می‌کند. وظیفه‌ات پر کردن «ماتریس ۵ سطحی» برای یک مشاهده، انتخاب خوشه مناسب، و پیشنهاد امتیاز است.

روش کار تو:

۱. پنج ماتریس را پر کن. هر ماتریس باید بر اساس همین مشاهده باشد، نه یک توصیف کلی:

   ماتریس ظهورها: چه چیزهایی در این مشاهده «ظاهر» شده‌اند؟ ظهورهای عینی، رفتاری، ساختاری. به دنبال چیزهایی باش که تاکنون کمتر دیده شده‌اند.

   ماتریس لایه‌ها: این پدیده در چه لایه‌هایی درگیر است؟ لایه فردی، خانوادگی، محلی، اجتماعی، نهادی، ملی، جهانی. کدام لایه‌ها حاضرند و کدام لایه‌ها غایب؟

   ماتریس ارتباطات: این پدیده با چه سپهرهای دیگری ارتباط دارد؟ ارتباط‌ها را با مصداق مشخص کن، نه به صورت کلی.

   ماتریس مقیاس: این پدیده در چه مقیاسی قابل مشاهده است؟ محلی، منطقه‌ای، ملی، جهانی. ظهور در چه مقیاسی حرکت می‌کند؟

   ماتریس ظرفیت: چه ظرفیت‌هایی در این پدیده وجود دارد؟ ظرفیت‌های آشکار و ظرفیت‌های مغفول.

۲. خوشه مناسب را از بین این چهار انتخاب کن:
   - human (انسان): فقر، آموزش، سلامت، سلامت روان، اعتیاد، جوانان، خانواده
   - knowledge (دانش و فناوری): هوش مصنوعی، دسترسی به فناوری، شکاف دانشی، نابرابری علمی، انحصار دانش
   - governance (حکمرانی و تمدن): فساد، مهاجرت نخبگان، ناکارآمدی نهادی، بحران اعتماد، جنگ، نابرابری جهانی
   - survival (بقا و آینده): امنیت غذایی، بحران آب، بحران انرژی، تغییرات اقلیمی، تخریب محیط زیست، پایداری تمدنی

۳. امتیاز پیشنهادی از ۱ تا ۵ بده بر اساس این معیارها:
   - ۱: ظهور بسیار محدود یا منفی
   - ۲: ظهور ضعیف
   - ۳: ظهور متوسط و قابل تامل
   - ۴: ظهور قوی و سازنده
   - ۵: ظهور بسیار قوی، الگو‌ساز، قابل انتشار در اطلس

۴. یک «تحلیل» دو پاراگرافی بنویس که:
   - پاراگراف اول: توصیف دقیق آنچه در این مشاهده دیده می‌شود (بدون قضاوت).
   - پاراگراف دوم: آنچه در این مشاهده کمتر دیده شده یا نادیده مانده (کشف نادیده‌ها).

۵. از عبارات کلیشه‌ای پرهیز کن. هر جمله باید مستقیماً به متن مشاهده گره خورده باشد.

خروجی: فقط یک آبجکت JSON معتبر با این ساختار:
{
  "emergence": "تحلیل ظهورها — عینی، مرتبط با همین مشاهده",
  "layer": "تحلیل لایه‌ها — کدام لایه‌ها حاضر و کدام غایب",
  "connection": "تحلیل ارتباطات — با کدام سپهرها و چگونه",
  "scale": "تحلیل مقیاس — در چه مقیاسی ظهور می‌کند",
  "capacity": "تحلیل ظرفیت — آشکار و مغفول",
  "analysis": "تحلیل دو پاراگرافی: پاراگراف اول توصیف، پاراگراف دوم کشف نادیده‌ها",
  "cluster": "human | knowledge | governance | survival",
  "score": 3
}

هیچ متن اضافه‌ای قبل یا بعد از JSON ننویس.`;

const AI2_PROMPT_EN = `You are a "Spherical Analyst" working within the "Sphere of Wisdom Laboratory" framework. Your task is to fill the "Five-Level Matrix" for an observation, choose the appropriate cluster, and suggest a score.

Your methodology:

1. Fill the five matrices. Each matrix must be based on this specific observation, not a general description:

   Emergence Matrix: What has "emerged" in this observation? Objective, behavioral, structural emergences. Look for things that have been less visible so far.

   Layers Matrix: In which layers is this phenomenon involved? Individual, family, local, social, institutional, national, global. Which layers are present and which are absent?

   Connections Matrix: With which other spheres is this phenomenon connected? Specify the connections with concrete references, not generalities.

   Scale Matrix: At what scale is this phenomenon observable? Local, regional, national, global. In what direction is the emergence moving?

   Capacity Matrix: What capacities exist in this phenomenon? Visible capacities and neglected capacities.

2. Choose the appropriate cluster from these four:
   - human: poverty, education, health, mental health, addiction, youth, family
   - knowledge: AI, technology access, knowledge gap, scientific inequality, knowledge monopoly
   - governance: corruption, elite migration, institutional inefficiency, trust crisis, war, global inequality
   - survival: food security, water crisis, energy crisis, climate change, environmental degradation, civilizational sustainability

3. Give a suggested score from 1 to 5 based on these criteria:
   - 1: Very limited or negative emergence
   - 2: Weak emergence
   - 3: Moderate and noteworthy emergence
   - 4: Strong and constructive emergence
   - 5: Very strong emergence, exemplary, publishable in the Atlas

4. Write a two-paragraph "analysis":
   - First paragraph: precise description of what is seen in this observation (without judgment).
   - Second paragraph: what has been less seen or ignored (discovery of the unseen).

5. Avoid clichés. Every sentence must be tied directly to the text of the observation.

Output: only a valid JSON object with this structure:
{
  "emergence": "Emergence analysis — concrete, tied to this observation",
  "layer": "Layers analysis — which layers are present and which are absent",
  "connection": "Connections analysis — with which spheres and how",
  "scale": "Scale analysis — at what scale it emerges",
  "capacity": "Capacity analysis — visible and neglected",
  "analysis": "Two-paragraph analysis: first paragraph description, second paragraph discovery of the unseen",
  "cluster": "human | knowledge | governance | survival",
  "score": 3
}

Do not write any text before or after the JSON.`;

const AI3_PROMPT_FA = `تو یک «تحلیل‌گر نهایی سپهری» هستی که در چارچوب «آزمایشگاه سپهر خردمندی» کار می‌کند. وظیفه‌ات نوشتن «تحلیل نهایی یکپارچه» برای یک مشاهده است، با استفاده از متن مشاهده و تحلیل‌های قبلی.

روش کار تو:

۱. ابتدا متن مشاهده را بخوان. سپس راهنمای سه‌سطحی (AI-1) و ماتریس ۵ سطحی (AI-2) را که در اختیارت قرار می‌گیرد، مرور کن.

۲. وظیفه اصلی تو پاسخ به دو پرسش بنیادین است:
   - «ظهور در چه جهتی حرکت می‌کند؟» — آیا در جهت تجلی ظرفیت‌ها، یا در جهت انسداد و فرسایش؟
   - «تأثیر این ظهور بر کرامت انسانی چیست؟» — آیا کرامت انسانی را گسترش می‌دهد، تضعیف می‌کند، یا در وضعیت نامعلوم نگه می‌دارد؟

۳. یک تحلیل نهایی بنویس که:
   - یکپارچه باشد (نه تکرار بخش‌های قبلی)
   - عمیق باشد (به لایه‌های زیرین پدیده نفوذ کند)
   - صریح باشد (بدون ابهام و تعارف)
   - به «کشف نادیده‌ها» کمک کند — آنچه در تحلیل‌های قبلی کمتر دیده شد
   - از تعمیم‌های کلی پرهیز کند — مستقیماً به همین مشاهده گره خورده باشد

۴. از عبارات کلیشه‌ای پرهیز کن. تحلیل نهایی باید حاصل جمع‌بندی واقعی متن مشاهده و تحلیل‌های قبلی باشد، نه یک متن عمومی درباره موضوع.

۵. طول تحلیل: یک تا دو پاراگراف فشرده (حدود ۱۵۰ تا ۲۵۰ کلمه).

خروجی: فقط یک آبجکت JSON معتبر با این ساختار:
{
  "final": "تحلیل نهایی یکپارچه — یک تا دو پاراگراف فشرده"
}

هیچ متن اضافه‌ای قبل یا بعد از JSON ننویس.`;

const AI3_PROMPT_EN = `You are a "Final Spherical Analyst" working within the "Sphere of Wisdom Laboratory" framework. Your task is to write a "Unified Final Synthesis" for an observation, using the observation text and the previous analyses.

Your methodology:

1. First read the observation text. Then review the three-level guidance (AI-1) and the five-level matrix (AI-2) provided to you.

2. Your main task is to answer two fundamental questions:
   - "In what direction is the emergence moving?" — Toward manifestation of capacities, or toward blockage and erosion?
   - "What is the impact of this emergence on human dignity?" — Does it expand human dignity, weaken it, or leave it in an uncertain state?

3. Write a final synthesis that:
   - Is unified (not a repetition of previous sections)
   - Is deep (penetrates the underlying layers of the phenomenon)
   - Is explicit (without ambiguity or flattery)
   - Contributes to "discovery of the unseen" — what was less seen in the previous analyses
   - Avoids generalizations — tied directly to this specific observation

4. Avoid clichés. The final synthesis must be a genuine summary of the observation text and previous analyses, not a generic text about the topic.

5. Length: one to two compact paragraphs (about 150-250 words).

Output: only a valid JSON object with this structure:
{
  "final": "Unified final synthesis — one to two compact paragraphs"
}

Do not write any text before or after the JSON.`;


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
          <hr style="border: 1px solid #d4af37; opacity: 0.3;">
          <p style="text-align: center; font-size: 14px; color: #6a5a3a;">این پیام به صورت خودکار ارسال شده است. لطفاً به آن پاسخ ندهید.</p>
        </div>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html lang="en">
      <head><meta charset="UTF-8"><title>Invitation to Collaborate</title></head>
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
          <hr style="border: 1px solid #d4af37; opacity: 0.3;">
          <p style="text-align: center; font-size: 14px; color: #6a5a3a;">This message was sent automatically. Please do not reply.</p>
        </div>
      </body>
      </html>
    `;

    for (const peer of peers) {
      if (!peer.email || peer.email.length < 5) {
        emailResults.push({ peer: peer.cardCode, success: false, message: 'No email address' });
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
          const error = await response.text();
          emailResults.push({ peer: peer.cardCode, success: false, message: error });
        }
      } catch (error) {
        emailResults.push({ peer: peer.cardCode, success: false, message: error.message });
      }
    }
  } else {
    emailResults.push(...peers.map(p => ({ 
      peer: p.cardCode, 
      success: false, 
      message: 'RESEND_API_KEY not configured. Email not sent.' 
    })));
  }

  return {
    success: emailResults.some(r => r.success),
    message: `${emailResults.filter(r => r.success).length} از ${emailResults.length} ایمیل با موفقیت ارسال شد.`,
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
      const peers = peersMatch[1].split(',').map(p => p.trim());
      return peers.length;
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

  let successCount = 0;
  let revisionCount = 0;
  let failedCount = 0;

  for (const r of responses) {
    const result = r.result || 'success';
    if (result.includes('موفق') || result.includes('success') || result === 'success') {
      successCount++;
    } else if (result.includes('اصلاح') || result.includes('revision') || result === 'revision') {
      revisionCount++;
    } else if (result.includes('شکست') || result.includes('failed') || result === 'failed') {
      failedCount++;
    }
  }

  const total = responses.length;
  if (total === 0) return 'pending';
  
  if (successCount >= total * 0.6) return 'success';
  if (failedCount >= total * 0.6) return 'failed';
  return 'revision';
}
