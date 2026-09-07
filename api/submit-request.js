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

    const { cardCode, type, description, observations } = parsedBody;

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // ===== بخش ۱: ثبت مشاهدات (با تحلیل هوش مصنوعی) =====
    if (type === 'observations' && observations && observations.length > 0) {
      if (!cardCode) {
        return res.status(400).json({ error: 'کد کارت الزامی است' });
      }

      // ===== تحلیل هوش مصنوعی قبل از ثبت =====
      const analyzedObservations = [];
      const rejectedObservations = [];
      
      for (const obs of observations) {
        if (!obs.text || obs.text.length < 10) {
          rejectedObservations.push({ text: obs.text, reason: 'متن خیلی کوتاه است' });
          continue;
        }
        
        // ارسال به AI برای تحلیل
        const prompt = `متن: "${obs.text}" را تحلیل کن. فقط JSON برگردان: {"status":"approved" یا "rejected","rejection_reason":"دلیل یا null","cluster":"human/knowledge/governance/survival یا null","score_suggestion":عدد 1-5,"analysis_note":"تحلیل","guide_individual":"راهنمای فردی","guide_network":"راهنمای شبکه‌ای","guide_policy":"راهنمای سیاستی"}`;
        
        try {
          const aiResponse = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
          const aiText = await aiResponse.text();
          
          let jsonStr = aiText;
          const s = aiText.indexOf('{');
          const e = aiText.lastIndexOf('}');
          if (s !== -1 && e !== -1) jsonStr = aiText.substring(s, e + 1);
          
          const analysis = JSON.parse(jsonStr);
          
          // اگر رد شد، این مشاهده را ثبت نکن
          if (analysis.status === 'rejected') {
            rejectedObservations.push({ 
              text: obs.text, 
              reason: analysis.rejection_reason || 'با اصول سپهر خردمندی همخوانی ندارد' 
            });
            continue;
          }
          
          analyzedObservations.push({
            ...obs,
            aiAnalysis: analysis
          });
        } catch (e) {
          // اگر AI خطا داد، مشاهده را بدون تحلیل ثبت کن (اما با برچسب error)
          analyzedObservations.push({
            ...obs,
            aiAnalysis: { 
              status: 'error', 
              message: 'خطا در تحلیل هوش مصنوعی: ' + e.message 
            }
          });
        }
      }

      // اگر همه مشاهدات رد شدند
      if (analyzedObservations.length === 0) {
        const reasons = rejectedObservations.map(r => `• ${r.text.substring(0, 30)}... (${r.reason})`).join('\n');
        return res.status(400).json({ 
          error: 'هیچ مشاهده‌ای با اصول سپهر خردمندی همخوانی نداشت.',
          details: reasons,
          rejected: rejectedObservations
        });
      }

      const moduleNames = {
        'collaboration': 'همفکری با دیگران',
        'related': 'مشاهدات مرتبط دیگران',
        'referral': 'ارجاع به ۵ همفرهنگ'
      };

      const createdIssues = [];
      for (const obs of analyzedObservations) {
        const selectedModule = obs.module ? moduleNames[obs.module] || obs.module : 'هیچ‌کدام';
        
        // ساخت متن Issue با تحلیل AI
        let aiSection = '';
        if (obs.aiAnalysis && obs.aiAnalysis.status !== 'error') {
          const ai = obs.aiAnalysis;
          aiSection = `
**🤖 تحلیل هوش مصنوعی:**
- **وضعیت:** ${ai.status === 'approved' ? '✅ تایید شده' : '❌ رد شده'}
- **خوشه:** ${ai.cluster || 'نامشخص'}
- **امتیاز پیشنهادی:** ${ai.score_suggestion || '---'}
- **تحلیل:** ${ai.analysis_note || '---'}

**📋 بسته راهنمای اقدام عملی:**
- **فردی:** ${ai.guide_individual || '---'}
- **شبکه‌ای:** ${ai.guide_network || '---'}
- **سیاستی:** ${ai.guide_policy || '---'}
`;
        } else if (obs.aiAnalysis) {
          aiSection = `
**⚠️ تحلیل هوش مصنوعی:** ${obs.aiAnalysis.message || 'خطا در تحلیل'}
`;
        }

        const issueTitle = `مشاهده خام: ${cardCode}`;
        const issueBody = `
**کد کارت:** ${cardCode}

**مشاهده خام:**
${obs.text}

**ماژول انتخاب‌شده:**
${selectedModule}

${aiSection}
---
*این مشاهده توسط کاربر ثبت شده و در انتظار بررسی است.*
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
          throw new Error(errorData.message || 'خطا در ایجاد Issue در گیت‌هاب');
        }

        const issueData = await response.json();
        createdIssues.push({
          number: issueData.number,
          url: issueData.html_url,
          observation: obs.text.substring(0, 50) + '...',
          module: selectedModule,
          aiStatus: obs.aiAnalysis?.status || 'unknown'
        });
      }

      if (createdIssues.length === 0) {
        return res.status(400).json({ error: 'هیچ مشاهده‌ی معتبری ثبت نشد.' });
      }

      const trackingCodes = createdIssues.map(i => `#${i.number}`).join('، ');
      
      // اطلاعات مشاهدات رد شده (برای نمایش به کاربر)
      const rejectedInfo = rejectedObservations.length > 0 ? {
        count: rejectedObservations.length,
        reasons: rejectedObservations.map(r => r.reason)
      } : null;

      return res.status(200).json({
        success: true,
        trackingCode: trackingCodes,
        issues: createdIssues,
        message: `${createdIssues.length} مشاهده با موفقیت ثبت شد.`,
        rejected: rejectedInfo,
        totalSubmitted: observations.length,
        totalApproved: createdIssues.length,
        totalRejected: rejectedObservations.length
      });
    }

    // ===== بخش ۲: درخواست حذف (delete) =====
    if (type === 'delete') {
      if (!cardCode) {
        return res.status(400).json({ error: 'کد کارت الزامی است' });
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
        message: 'درخواست حذف شما با موفقیت ثبت شد.'
      });
    }

    // ===== بخش ۳: درخواست ارتباط (connection) =====
    if (type === 'connection') {
      if (!cardCode) {
        return res.status(400).json({ error: 'کد کارت الزامی است' });
      }

      const userPath = `data/active/${cardCode}.json`;
      const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!userRes.ok) {
        if (userRes.status === 404) {
          return res.status(404).json({ error: 'کاربر یافت نشد' });
        }
        return res.status(userRes.status).json({ error: 'خطا در دریافت اطلاعات کاربر' });
      }

      const userDataRaw = await userRes.json();
      const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));

      if (!userData.communicationEmail || userData.communicationEmail.length < 5) {
        return res.status(400).json({ 
          error: 'برای استفاده از بخش ارتباط با هم‌فکران، ابتدا باید ایمیل خود را ثبت کنید.',
          redirect: 'edit-fa.html',
          emailRequired: true
        });
      }

      const allUsersRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/data/active`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!allUsersRes.ok) {
        return res.status(500).json({ error: 'خطا در دریافت لیست کاربران' });
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
          ? `${matched.length} هم‌فکر با ارزش‌های مشترک شما پیدا شد.` 
          : 'هیچ هم‌فکری با ارزش‌های مشترک شما پیدا نشد. لطفاً بعداً مجدداً تلاش کنید.',
        connections: matched.map(u => u.email),
        connectionDetails: matched,
        totalFound: matched.length,
        minMatchRequired: MIN_MATCH_COUNT,
        status: 'completed'
      });
    }

    // ===== درخواست نامشخص =====
    return res.status(400).json({ error: 'نوع درخواست نامعتبر است.' });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
