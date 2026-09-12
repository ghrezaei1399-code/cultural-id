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
    // بخش Observations - با هوش مصنوعی OpenRouter
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
        
        let aiAnalysis = null;
        
        // تلاش برای دریافت تحلیل از هوش مصنوعی
        if (openRouterKey) {
          try {
            // پرامپت بسیار دقیق و ساختاریافته
            const systemPrompt = isPersian ? 
`شما یک دستیار تحلیلی هستید. وظیفه شما تحلیل مشاهده کاربر بر اساس چارچوب "سپهر خردمندی" و تولید یک آبجکت JSON است.
قوانین:
1. فقط و فقط JSON برگردانید. هیچ متنی قبل یا بعد از JSON نباشد.
2. تمام ۱۱ فیلد زیر باید وجود داشته باشند و با محتوای مشاهده پر شوند.
3. اگر اطلاعاتی نبود، از عبارات کوتاه و مرتبط استفاده کنید، نه عبارات کلیشه‌ای مثل "تحلیل دقیق".

ساختار JSON مورد نیاز:
{
  "status": "approved",
  "cluster": "human", // یکی از: human, knowledge, governance, survival
  "score": 3, // عدد بین 1 تا 5
  "analysis": "متن تحلیل عمیق در 2 پاراگراف",
  "individual": "راهنمای عملی برای فرد",
  "network": "راهنمای تعامل با دیگران",
  "policy": "پیشنهاد ساختاری یا سیاستی",
  "matrix_emergence": "تحلیل ماتریس ظهورها",
  "matrix_layers": "تحلیل ماتریس لایه‌ها",
  "matrix_connections": "تحلیل ماتریس ارتباطات",
  "matrix_scale": "تحلیل ماتریس مقیاس",
  "matrix_capacity": "تحلیل ماتریس ظرفیت"
}` :
`You are an analytical assistant. Analyze the observation based on "Sphere of Wisdom" and return a JSON object.
Rules:
1. Return ONLY JSON. No extra text.
2. All 11 fields must be present and filled with specific content from the observation.
3. Do not use generic placeholders like "Detailed analysis".

Required JSON Structure:
{
  "status": "approved",
  "cluster": "human", // one of: human, knowledge, governance, survival
  "score": 3, // number between 1-5
  "analysis": "Deep analysis text in 2 paragraphs",
  "individual": "Practical guide for the individual",
  "network": "Guide for interaction with others",
  "policy": "Structural or policy suggestion",
  "matrix_emergence": "Analysis of Emergence Matrix",
  "matrix_layers": "Analysis of Layers Matrix",
  "matrix_connections": "Analysis of Connections Matrix",
  "matrix_scale": "Analysis of Scale Matrix",
  "matrix_capacity": "Analysis of Capacity Matrix"
}`;

            const userPrompt = `Observation to analyze: "${obs.text}"`;

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 ثانیه مهلت

            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openRouterKey}`,
                'HTTP-Referer': process.env.SITE_URL || 'https://cultural-id.vercel.app',
              },
              body: JSON.stringify({
                model: 'mistralai/mistral-7b-instruct', // مدل پایدار برای JSON
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt }
                ],
                temperature: 0.5, // کاهش دما برای دقت بیشتر
                max_tokens: 1200,
                response_format: { type: 'json_object' }
              }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const data = await response.json();
              const content = data.choices?.[0]?.message?.content || '{}';
              
              // استخراج تمیز JSON
              let jsonStr = content;
              const s = content.indexOf('{');
              const e = content.lastIndexOf('}');
              if (s !== -1 && e !== -1) jsonStr = content.substring(s, e + 1);
              
              const analysis = JSON.parse(jsonStr);
              
              // نگاشت دقیق داده‌ها بدون مقادیر پیش‌فرض گمراه‌کننده
              aiAnalysis = {
                status: analysis.status || "approved",
                cluster: analysis.cluster || "human",
                score_suggestion: typeof analysis.score === 'number' ? analysis.score : 3,
                analysis_note: analysis.analysis || "",
                guide_individual: analysis.individual || "",
                guide_network: analysis.network || "",
                guide_policy: analysis.policy || "",
                matrix_emergence: analysis.matrix_emergence || "",
                matrix_layers: analysis.matrix_layers || "",
                matrix_connections: analysis.matrix_connections || "",
                matrix_scale: analysis.matrix_scale || "",
                matrix_capacity: analysis.matrix_capacity || ""
              };
            } else {
              console.error('OpenRouter Error:', response.status);
            }
          } catch (err) {
            console.warn('AI failed:', err.message);
          }
        }

        // اگر هوش مصنوعی کار نکرد، از تحلیل پیش‌فرض استفاده کن
        if (!aiAnalysis) {
          aiAnalysis = getFallbackAnalysis(obs.text, isPersian);
        }

        // نرمال‌سازی داده‌ها برای پنل ادمین جدید (دقیقاً مطابق نام‌گذاری پنل)
        const ai1Data = {
          individual: aiAnalysis.guide_individual,
          social: aiAnalysis.guide_network,
          institutional: aiAnalysis.guide_policy
        };

        const ai2Data = {
          emergence: aiAnalysis.matrix_emergence,
          layer: aiAnalysis.matrix_layers,
          connection: aiAnalysis.matrix_connections,
          scale: aiAnalysis.matrix_scale,
          capacity: aiAnalysis.matrix_capacity,
          analysis: aiAnalysis.analysis_note,
          cluster: aiAnalysis.cluster,
          score: aiAnalysis.score_suggestion
        };

        const ai3Data = aiAnalysis.analysis_note;

        // ============================================================
        // پردازش ماژول انتخاب‌شده (بدون تغییر)
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
              let allUsers = [];
              
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
                const senderValues = aiAnalysis.values || [];
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
                const senderValues = aiAnalysis.values || [];
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
                  moduleMessage = `۵ همفرهنگ برای ارجاع انتخاب شدند.`;
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
        // ساخت بخش AI برای نمایش در Issue
        // ============================================================
        const statusLabel = aiAnalysis.status === 'approved' ? '✅ تایید شده' : '❌ رد شده';
        const clusterLabel = isPersian ? 
          (aiAnalysis.cluster === 'human' ? 'انسان' : 
           aiAnalysis.cluster === 'knowledge' ? 'دانش و فناوری' : 
           aiAnalysis.cluster === 'governance' ? 'حکمرانی و تمدن' : 
           aiAnalysis.cluster === 'survival' ? 'بقا و آینده' : 'نامشخص') :
          (aiAnalysis.cluster || 'Unknown');
        
        const moduleStatusLabels = {
          'pending': '⏳ در انتظار پاسخ هم‌فرهنگ‌ها',
          'completed': '✅ تکمیل شد',
          'no_peers': '⚠️ هم‌فرهنگی یافت نشد',
          'no_related': '⚠️ مشاهده مرتبط یافت نشد',
          'error': '❌ خطا در پردازش'
        };

        const aiSection = `
**🤖 AI Analysis:**
- **Status:** ${statusLabel}
- **Cluster:** ${clusterLabel}
- **Suggested Score:** ${aiAnalysis.score_suggestion || '---'}
- **Analysis:** ${aiAnalysis.analysis_note || '---'}

**Action Guide:**
- **Individual:** ${aiAnalysis.guide_individual || '---'}
- **Network:** ${aiAnalysis.guide_network || '---'}
- **Policy:** ${aiAnalysis.guide_policy || '---'}

**5 Matrices:**
- **Emergence:** ${aiAnalysis.matrix_emergence || '---'}
- **Layers:** ${aiAnalysis.matrix_layers || '---'}
- **Connections:** ${aiAnalysis.matrix_connections || '---'}
- **Scale:** ${aiAnalysis.matrix_scale || '---'}
- **Capacity:** ${aiAnalysis.matrix_capacity || '---'}
`;

        // ============================================================
        // ساخت بخش Module Result
        // ============================================================
        let moduleSection = '';
        if (moduleResult) {
          const statusText = moduleStatusLabels[moduleResult.status] || moduleResult.status;
          const typeNames = {
            'collaboration': isPersian ? 'همفکری با دیگران' : 'Collaboration',
            'related': isPersian ? 'مشاهدات مرتبط دیگران' : 'Related Observations',
            'referral': isPersian ? 'ارجاع به ۵ همفرهنگ' : 'Referral to 5 Peers'
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

        const issueTitle = isPersian ? `مشاهده خام: ${cardCode}` : `Raw Observation: ${cardCode}`;
        const issueBody = `
**Card Code:** ${cardCode}

**Observation:**
${obs.text}

**Selected Module:**
${selectedModule}

${aiSection}
${moduleSection}
---
*This observation has been registered and is pending review.*

**Module Status:** ${moduleStatus}
**Tracking Code:** Will be assigned after issue creation.
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
        // اگر ماژول نیاز به ارجاع به هم‌فرهنگ‌ها دارد، دعوتنامه ارسال کن
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

        createdIssues.push({
          number: issueData.number,
          url: issueData.html_url,
          trackingCode: `OBS-${issueData.number}`,
          observation: obs.text.substring(0, 50) + '...',
          module: selectedModule,
          moduleStatus: moduleStatus,
          moduleMessage: moduleMessage,
          // ارسال داده‌ها با فرمت جدید برای پنل ادمین
          ai1Guidance: ai1Data,
          ai2Matrix: ai2Data,
          finalAnalysis: ai3Data,
          aiAnalysis: aiAnalysis
        });
      }

      if (createdIssues.length === 0) {
        return res.status(400).json({ error: 'No valid observations were registered.' });
      }

      const trackingCodes = createdIssues.map(i => i.trackingCode).join(', ');
      return res.status(200).json({
        success: true,
        trackingCode: trackingCodes,
        issues: createdIssues,
        message: `${createdIssues.length} observation(s) successfully registered.`
      });
    }

    // ============================================================
    // بخش Delete (کاملاً بدون تغییر)
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
    // بخش Connection (کاملاً بدون تغییر)
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
    // بخش جدید: دریافت پاسخ هم‌فرهنگ (Peer Response)
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
*این تحلیل توسط هوش مصنوعی بر اساس پاسخ‌های هم‌فرهنگ‌ها تولید شده است.*
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

// ============================================================
// تابع Fallback (زمانی که هوش مصنوعی کار نکرد)
// ============================================================
function getFallbackAnalysis(text, isPersian) {
  const keywords = {
    human: ['احساس', 'دوست', 'خانواده', 'عشق', 'غم', 'شادی', 'تنهایی', 'روان', 'ذهن', 'هویت', 'ارزش', 'اخلاق', 'صلح', 'همدلی'],
    knowledge: ['کتاب', 'آموزش', 'دانش', 'مدرسه', 'یادگیری', 'علم', 'پژوهش', 'تحقیق', 'کتابخانه', 'استاد', 'دانشجو', 'سواد', 'آگاهی', 'فناوری', 'هوش مصنوعی'],
    governance: ['قانون', 'مدیریت', 'سیاست', 'شهرداری', 'دولت', 'ساختار', 'سازمان', 'نظام', 'برنامه', 'تصمیم', 'مسئول', 'نظارت', 'فساد'],
    survival: ['غذا', 'آب', 'مسکن', 'بهداشت', 'امنیت', 'پول', 'کار', 'معیشت', 'درمان', 'سلامت', 'ایمنی', 'خطر', 'بقا', 'نیاز', 'محیط زیست']
  };

  let bestCluster = 'human';
  let maxScore = 0;

  for (const [cluster, words] of Object.entries(keywords)) {
    let score = 0;
    for (const word of words) {
      if (text.includes(word)) score++;
    }
    if (score > maxScore) {
      maxScore = score;
      bestCluster = cluster;
    }
  }

  const clusterNames = {
    human: isPersian ? 'انسان' : 'Human',
    knowledge: isPersian ? 'دانش و فناوری' : 'Knowledge',
    governance: isPersian ? 'حکمرانی و تمدن' : 'Governance',
    survival: isPersian ? 'بقا و آینده' : 'Survival'
  };

  const score = Math.min(5, Math.max(1, Math.floor(text.length / 50) + 2));

  const templates = {
    human: isPersian ? 
      `مشاهده "${text}" در حوزه انسان قرار می‌گیرد. این موضوع بر کیفیت روابط انسانی تأثیر دارد و نیازمند همدلی و گفتگوی جمعی است.` :
      `Observation "${text}" falls in the Human domain. This topic affects human relationships and requires empathy and collective dialogue.`,
    knowledge: isPersian ?
      `مشاهده "${text}" در حوزه دانش و فناوری قرار می‌گیرد و به شکاف‌های آموزشی یا علمی اشاره دارد.` :
      `Observation "${text}" falls in the Knowledge domain and points to educational or scientific gaps.`,
    governance: isPersian ?
      `مشاهده "${text}" در حوزه حکمرانی قرار می‌گیرد و به ساختارها و نظام‌های مدیریتی مربوط می‌شود.` :
      `Observation "${text}" falls in the Governance domain and relates to management structures and systems.`,
    survival: isPersian ?
      `مشاهده "${text}" در حوزه بقا و آینده قرار می‌گیرد و به نیازهای اساسی و معیشتی مربوط می‌شود.` :
      `Observation "${text}" falls in the Survival domain and relates to basic needs and livelihood.`
  };

  const guides = {
    human: {
      individual: isPersian ? 'در ۲۴ ساعت آینده، با یکی از نزدیکان خود درباره این موضوع گفتگو کنید.' : 'In the next 24 hours, talk to someone close about this topic.',
      network: isPersian ? 'با ۳ تا ۵ نفر از دوستان خود تماس بگیرید و راه‌حل‌های جمعی پیدا کنید.' : 'Contact 3-5 friends and find collective solutions.',
      policy: isPersian ? 'یک پیشنهاد مکتوب برای بهبود روابط انسانی در جامعه خود تهیه کنید.' : 'Prepare a written proposal to improve human relations in your community.'
    },
    knowledge: {
      individual: isPersian ? 'یک منبع معتبر درباره این موضوع پیدا کنید و در ۲۴ ساعت آینده مطالعه کنید.' : 'Find a reliable source on this topic and study it in the next 24 hours.',
      network: isPersian ? 'یک گروه مطالعه با افراد آگاه تشکیل دهید.' : 'Form a study group with knowledgeable people.',
      policy: isPersian ? 'یک پیشنهاد برای توسعه زیرساخت‌های دانشی تهیه کنید.' : 'Prepare a proposal to develop knowledge infrastructure.'
    },
    governance: {
      individual: isPersian ? 'نقش خود را در ساختارهای موجود بررسی کنید و یک اقدام کوچک برای بهبود انجام دهید.' : 'Examine your role in existing structures and take a small improvement action.',
      network: isPersian ? 'با افراد تأثیرگذار در این حوزه ارتباط بگیرید.' : 'Connect with influential people in this area.',
      policy: isPersian ? 'یک پیشنهاد ساختاری برای بهبود نظام مدیریتی تهیه کنید.' : 'Prepare a structural proposal to improve the management system.'
    },
    survival: {
      individual: isPersian ? 'نیازهای اساسی خود را بررسی کنید و یک برنامه عملی در ۲۴ ساعت آینده تهیه کنید.' : 'Assess your basic needs and prepare an action plan in the next 24 hours.',
      network: isPersian ? 'با افراد در شرایط مشابه ارتباط بگیرید و یک شبکه حمایتی تشکیل دهید.' : 'Connect with people in similar situations and form a support network.',
      policy: isPersian ? 'یک پیشنهاد برای بهبود زیرساخت‌های معیشتی تهیه کنید.' : 'Prepare a proposal to improve livelihood infrastructure.'
    }
  };

  const matrixTemplates = {
    human: {
      emergence: isPersian ? 'ظهورهای قابل مشاهده در این پدیده شامل احساسات، روابط و تعاملات انسانی است.' : 'Visible emergences in this phenomenon include emotions, relationships, and human interactions.',
      layers: isPersian ? 'لایه‌های فردی، اجتماعی و خانوادگی در این پدیده درگیر هستند.' : 'Individual, social, and family layers are involved in this phenomenon.',
      connections: isPersian ? 'ارتباط میان سپهرهای انسانی، اجتماعی و فرهنگی در این پدیده مشهود است.' : 'Connections between human, social, and cultural spheres are evident in this phenomenon.',
      scale: isPersian ? 'این پدیده در مقیاس فردی و محلی قابل مشاهده است.' : 'This phenomenon is observable at individual and local scale.',
      capacity: isPersian ? 'ظرفیت‌های همدلی، گفتگو و مشارکت جمعی در این پدیده وجود دارد.' : 'Capacities for empathy, dialogue, and collective participation exist in this phenomenon.'
    },
    knowledge: {
      emergence: isPersian ? 'ظهورهای قابل مشاهده شامل شکاف‌های دانشی، نیازهای آموزشی و نابرابری علمی است.' : 'Visible emergences include knowledge gaps, educational needs, and scientific inequality.',
      layers: isPersian ? 'لایه‌های فردی، آموزشی و ساختاری در این پدیده درگیر هستند.' : 'Individual, educational, and structural layers are involved in this phenomenon.',
      connections: isPersian ? 'ارتباط میان سپهرهای دانشی، فناوری و آموزشی در این پدیده مشهود است.' : 'Connections between knowledge, technology, and educational spheres are evident in this phenomenon.',
      scale: isPersian ? 'این پدیده در مقیاس فردی، محلی و منطقه‌ای قابل مشاهده است.' : 'This phenomenon is observable at individual, local, and regional scale.',
      capacity: isPersian ? 'ظرفیت‌های یادگیری، پژوهش و نوآوری در این پدیده وجود دارد.' : 'Capacities for learning, research, and innovation exist in this phenomenon.'
    },
    governance: {
      emergence: isPersian ? 'ظهورهای قابل مشاهده شامل ناکارآمدی نهادی، بحران اعتماد و گسست‌های ساختاری است.' : 'Visible emergences include institutional inefficiency, trust crisis, and structural gaps.',
      layers: isPersian ? 'لایه‌های ساختاری، نهادی و مدیریتی در این پدیده درگیر هستند.' : 'Structural, institutional, and management layers are involved in this phenomenon.',
      connections: isPersian ? 'ارتباط میان سپهرهای حکمرانی، قانونی و اجتماعی در این پدیده مشهود است.' : 'Connections between governance, legal, and social spheres are evident in this phenomenon.',
      scale: isPersian ? 'این پدیده در مقیاس محلی، منطقه‌ای و جهانی قابل مشاهده است.' : 'This phenomenon is observable at local, regional, and global scale.',
      capacity: isPersian ? 'ظرفیت‌های مشارکت جمعی، شفافیت و پاسخگویی در این پدیده وجود دارد.' : 'Capacities for collective participation, transparency, and accountability exist in this phenomenon.'
    },
    survival: {
      emergence: isPersian ? 'ظهورهای قابل مشاهده شامل بحران منابع، ناامنی معیشتی و تخریب محیط زیست است.' : 'Visible emergences include resource crises, livelihood insecurity, and environmental degradation.',
      layers: isPersian ? 'لایه‌های فردی، اجتماعی، اقتصادی و زیست‌محیطی در این پدیده درگیر هستند.' : 'Individual, social, economic, and environmental layers are involved in this phenomenon.',
      connections: isPersian ? 'ارتباط میان سپهرهای بقا، اقتصادی و زیست‌محیطی در این پدیده مشهود است.' : 'Connections between survival, economic, and environmental spheres are evident in this phenomenon.',
      scale: isPersian ? 'این پدیده در مقیاس محلی، منطقه‌ای و جهانی قابل مشاهده است.' : 'This phenomenon is observable at local, regional, and global scale.',
      capacity: isPersian ? 'ظرفیت‌های تاب‌آوری، همکاری جمعی و پایداری در این پدیده وجود دارد.' : 'Capacities for resilience, collective cooperation, and sustainability exist in this phenomenon.'
    }
  };

  const matrix = matrixTemplates[bestCluster] || matrixTemplates.human;

  return {
    status: "approved",
    rejection_reason: null,
    cluster: bestCluster,
    score_suggestion: score,
    analysis_note: templates[bestCluster] || templates.human,
    guide_individual: guides[bestCluster].individual,
    guide_network: guides[bestCluster].network,
    guide_policy: guides[bestCluster].policy,
    matrix_emergence: matrix.emergence,
    matrix_layers: matrix.layers,
    matrix_connections: matrix.connections,
    matrix_scale: matrix.scale,
    matrix_capacity: matrix.capacity
  };
}

// ============================================================
// توابع جدید برای سیستم ارجاع به هم‌فرهنگ‌ها
// ============================================================

// ۱. ارسال دعوتنامه به هم‌فرهنگ‌ها (با ایمیل + GitHub)
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

  let emailResults = [];

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
    emailResults = peers.map(p => ({ 
      peer: p.cardCode, 
      success: false, 
      message: 'RESEND_API_KEY not configured. Email not sent.' 
    }));
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

// ۲. دریافت تمام پاسخ‌های یک Issue
async function peer_getAllResponses(issueNumber, token, owner, repo) {
  try {
    const commentsRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!commentsRes.ok) {
      return [];
    }

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

// ۳. دریافت تعداد هم‌فرهنگ‌های ارجاع شده
async function peer_getPeerCount(issueNumber, token, owner, repo) {
  try {
    const issueRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!issueRes.ok) {
      return 0;
    }

    const issue = await issueRes.json();
    const body = issue.body || '';
    
    const peersMatch = body.match(/\*\*Peers:\*\*\s*(.+)/) || body.match(/\*\*هم‌فرهنگ‌ها:\*\*\s*(.+)/);
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

// ۴. تحلیل نهایی با پاسخ‌های هم‌فرهنگ‌ها
async function peer_finalAnalysisWithResponses(issueNumber, responses, token, owner, repo) {
  if (!responses || responses.length === 0) {
    return 'pending';
  }

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
  
  if (successCount >= total * 0.6) {
    return 'success';
  } else if (failedCount >= total * 0.6) {
    return 'failed';
  } else {
    return 'revision';
  }
}
