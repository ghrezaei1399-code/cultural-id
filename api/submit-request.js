// api/submit-request.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
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

    const { cardCode, type, description, observations, text } = parsedBody;

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    if (type === 'ai-analyze') {
      try {
        const isPersian = /[\u0600-\u06FF]/.test(text);
        
        // ===== استفاده از API جایگزین =====
        const prompt = isPersian ? 
`شما تحلیلگر سپهر خردمندی هستید. یک مشاهده فرهنگی را تحلیل کنید.

متن: "${text}"

بر اساس متن بالا، این موارد را مشخص کنید:
1. وضعیت: آیا متن تجاری، تبلیغاتی، سیاسی، نژادپرستانه یا خشونت‌آمیز است؟ (بله/خیر)
2. خوشه: human, knowledge, governance, survival
3. امتیاز: عدد 1 تا 5
4. تحلیل: یک تحلیل عمیق بنویسید
5. راهنمای فردی: یک اقدام عملی برای فرد
6. راهنمای شبکه‌ای: چگونه با دیگران هماهنگ شود
7. راهنمای سیاستی: یک پیشنهاد ساختاری

پاسخ را به صورت JSON برگردانید.` :
`You are Sphere of Wisdom analyst. Analyze a cultural observation.

Text: "${text}"

Based on the text above, specify:
1. Status: Is the text commercial, promotional, political, racist or violent? (yes/no)
2. Cluster: human, knowledge, governance, survival
3. Score: number 1 to 5
4. Analysis: write a deep analysis
5. Individual guide: a practical action for individual
6. Network guide: how to coordinate with others
7. Policy guide: a structural proposal

Return the response as JSON.`;

        const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
        const aiText = await response.text();
        
        // ===== بررسی محتوای پاسخ =====
        console.log('AI Response:', aiText);
        
        let analysis;
        try {
          let jsonStr = aiText;
          const s = aiText.indexOf('{');
          const e = aiText.lastIndexOf('}');
          if (s !== -1 && e !== -1) {
            jsonStr = aiText.substring(s, e + 1);
          }
          analysis = JSON.parse(jsonStr);
        } catch (e) {
          // ===== اگر JSON معتبر نبود، از پاسخ هوش مصنوعی به عنوان تحلیل استفاده کن =====
          return res.status(200).json({ 
            success: true, 
            analysis: {
              status: "approved",
              rejection_reason: null,
              cluster: "human",
              score_suggestion: 3,
              analysis_note: aiText.substring(0, 200) || (isPersian ? "تحلیل خودکار" : "Auto analysis"),
              guide_individual: isPersian ? "مشاهده خود را ثبت کنید." : "Register your observation.",
              guide_network: isPersian ? "با دیگران به اشتراک بگذارید." : "Share with others.",
              guide_policy: isPersian ? "در شبکه خود مطرح کنید." : "Raise in your network."
            }
          });
        }
        
        return res.status(200).json({ 
          success: true, 
          analysis: {
            status: analysis.status || "approved",
            rejection_reason: analysis.rejection_reason || null,
            cluster: analysis.cluster || "human",
            score_suggestion: analysis.score_suggestion || 3,
            analysis_note: analysis.analysis_note || (isPersian ? "تحلیل" : "Analysis"),
            guide_individual: analysis.guide_individual || (isPersian ? "راهنمای فردی" : "Individual guide"),
            guide_network: analysis.guide_network || (isPersian ? "راهنمای شبکه‌ای" : "Network guide"),
            guide_policy: analysis.guide_policy || (isPersian ? "راهنمای سیاستی" : "Policy guide")
          }
        });
        
      } catch (error) {
        console.error('AI Analysis Error:', error);
        const isPersian = /[\u0600-\u06FF]/.test(text);
        return res.status(200).json({ 
          success: true, 
          analysis: {
            status: "approved",
            rejection_reason: null,
            cluster: "human",
            score_suggestion: 3,
            analysis_note: isPersian ? "تحلیل خودکار" : "Auto analysis",
            guide_individual: isPersian ? "مشاهده خود را ثبت کنید." : "Register your observation.",
            guide_network: isPersian ? "با دیگران به اشتراک بگذارید." : "Share with others.",
            guide_policy: isPersian ? "در شبکه خود مطرح کنید." : "Raise in your network."
          }
        });
      }
    }

    // ===== بقیه کدها (observations, delete, connection) =====
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
        if (!obs.text || obs.text.length < 10) {
          continue;
        }

        const selectedModule = obs.module ? moduleNames[obs.module] || obs.module : 'هیچ‌کدام';
        const isPersian = /[\u0600-\u06FF]/.test(obs.text);
        
        let aiSection = '';
        if (obs.aiAnalysis) {
          const ai = obs.aiAnalysis;
          const statusLabel = ai.status === 'approved' ? '✅ تایید شده' : '❌ رد شده';
          const clusterLabel = isPersian ? 
            (ai.cluster === 'human' ? 'انسان' : 
             ai.cluster === 'knowledge' ? 'دانش و فناوری' : 
             ai.cluster === 'governance' ? 'حکمرانی و تمدن' : 
             ai.cluster === 'survival' ? 'بقا و آینده' : 'نامشخص') :
            (ai.cluster || 'Unknown');
          
          aiSection = `
**🤖 AI Analysis:**
- **Status:** ${statusLabel}
- **Cluster:** ${clusterLabel}
- **Suggested Score:** ${ai.score_suggestion || '---'}
- **Analysis:** ${ai.analysis_note || '---'}

**Action Guide:**
- **Individual:** ${ai.guide_individual || '---'}
- **Network:** ${ai.guide_network || '---'}
- **Policy:** ${ai.guide_policy || '---'}
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
---
*This observation has been registered and is pending review.*
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
            labels: ['observation', 'pending-review']
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Error creating GitHub issue');
        }

        const issueData = await response.json();
        createdIssues.push({
          number: issueData.number,
          url: issueData.html_url,
          observation: obs.text.substring(0, 50) + '...',
          module: selectedModule
        });
      }

      if (createdIssues.length === 0) {
        return res.status(400).json({ error: 'No valid observations were registered.' });
      }

      const trackingCodes = createdIssues.map(i => `#${i.number}`).join(', ');
      return res.status(200).json({
        success: true,
        trackingCode: trackingCodes,
        issues: createdIssues,
        message: `${createdIssues.length} observation(s) successfully registered.`
      });
    }

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

    return res.status(400).json({ error: 'Invalid request type.' });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
