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

    const { cardCode, type, description, observations, text, language } = parsedBody;

    const owner = 'ghrezaei1399-code';
    const repo = 'cultural-id';

    // ============================================================
    // ===== بخش تحلیل هوش مصنوعی =====
    // ============================================================
    if (type === 'ai-analyze') {
      try {
        // ===== تشخیص زبان =====
        const isPersian = /[\u0600-\u06FF]/.test(text);
        const lang = isPersian ? 'fa' : 'en';
        
        // ===== پرامپت فارسی =====
        const promptFa = `شما تحلیلگر ارشد سپهر خردمندی هستید. متن زیر را دقیقاً تحلیل کنید و فقط یک JSON معتبر برگردانید. هیچ توضیح اضافی ننویسید.

متن: "${text}"

قوانین سختگیرانه برای رد (REJECT):
1. محتوای سیاسی مخرب، توهین‌آمیز، نژادپرستانه، جنگ‌طلبانه، تشویق به خشونت یا مرگ
2. محتوای تجاری، تبلیغاتی، بازاریابی، فروش، خرید، قیمت، تخفیف
3. درخواست راهنمایی عملی، آموزش گام‌به‌گام، پیشنهاد روش
4. محتوای توهین‌آمیز به فرهنگ، مذهب، قومیت، ملیت
5. هر چیزی که به فرهنگ، جامعه، انسان، دانش، حکمرانی یا بقا مرتبط نباشد

قوانین تأیید (APPROVE):
1. یک پدیده فرهنگی، اجتماعی یا انسانی را توصیف کند (نه سوال بپرسد)
2. شامل مشاهده عینی باشد (نه نظر یا قضاوت شخصی)
3. به یکی از خوشه‌های چهارگانه مرتبط باشد

خوشه‌ها:
- human: هویت، سلامت روان، آموزش، فقرزدایی، مهارت‌های سنتی
- knowledge: شکاف علمی، بومی‌سازی فناوری، نوآوری مسئولانه، انحصار دانش
- governance: عدالت نهادی، شفافیت، بحران اعتماد، مشارکت مدنی، مدیریت منابع
- survival: امنیت غذایی، بحران آب، پایداری اکولوژیک، تاب‌آوری محیط زیست

خروجی را دقیقاً به این صورت JSON برگردانید (همه فیلدها را پر کنید):
{
    "status": "approved",
    "rejection_reason": null,
    "cluster": "human",
    "score_suggestion": 3,
    "analysis_note": "تحلیل عمیق بر اساس متن",
    "guide_individual": "راهنمای سطح فردی",
    "guide_network": "راهنمای سطح شبکه‌ای",
    "guide_policy": "راهنمای سطح سیاستی"
}

اگر متن رد شد، status را "rejected" کنید و rejection_reason را توضیح دهید.

فقط JSON برگردانید.`;

        // ===== پرامپت انگلیسی =====
        const promptEn = `You are the Senior Analyst of the Sphere of Wisdom. Analyze the text below and return ONLY a valid JSON. No extra explanation.

Text: "${text}"

Strict rules for REJECT:
1. Destructive political content, offensive, racist, warmongering, encouraging violence or death
2. Commercial, promotional, marketing, sales, buying, pricing, discounts
3. Request for practical guidance, step-by-step training, method suggestions
4. Offensive content against culture, religion, ethnicity, nationality
5. Anything not related to culture, society, humanity, knowledge, governance, or survival

Rules for APPROVE:
1. Describes a cultural, social, or human phenomenon (not asking questions)
2. Includes objective observation (not opinion or personal judgment)
3. Related to one of the four clusters

Clusters:
- human: Identity, mental health, education, poverty alleviation, traditional skills
- knowledge: Scientific gap, technology localization, responsible innovation, knowledge monopoly
- governance: Institutional justice, transparency, trust crisis, civil participation, resource management
- survival: Food security, water crisis, ecological sustainability, environmental resilience

Output must be exactly this JSON structure (fill all fields):
{
    "status": "approved",
    "rejection_reason": null,
    "cluster": "human",
    "score_suggestion": 3,
    "analysis_note": "Deep analysis based on text",
    "guide_individual": "Individual level guidance",
    "guide_network": "Network level guidance",
    "guide_policy": "Policy level guidance"
}

If text is rejected, set status to "rejected" and explain rejection_reason.

Return ONLY JSON.`;

        const prompt = isPersian ? promptFa : promptEn;
        
        const response = await fetch(`https://text.pollinations.ai/${encodeURIComponent(prompt)}`);
        const aiText = await response.text();
        
        // استخراج JSON
        let jsonStr = aiText;
        const s = aiText.indexOf('{');
        const e = aiText.lastIndexOf('}');
        if (s !== -1 && e !== -1) {
          jsonStr = aiText.substring(s, e + 1);
        }
        
        // پارس کردن JSON
        const analysis = JSON.parse(jsonStr);
        
        // اطمینان از وجود همه فیلدها
       // اطمینان از وجود همه فیلدها (بدون مقدار پیش‌فرض کلیشه‌ای)
const result = {
  status: analysis.status,
  rejection_reason: analysis.rejection_reason || null,
  cluster: analysis.cluster,
  score_suggestion: analysis.score_suggestion,
  analysis_note: analysis.analysis_note,
  guide_individual: analysis.guide_individual,
  guide_network: analysis.guide_network,
  guide_policy: analysis.guide_policy
};

// اگر هرکدام از فیلدهای ضروری وجود نداشت، خطا بده
if (!result.status || !result.cluster || !result.score_suggestion || 
    !result.analysis_note || !result.guide_individual || 
    !result.guide_network || !result.guide_policy) {
  throw new Error('AI response is missing required fields');
}
        
        return res.status(200).json({ success: true, analysis: result });
        
      } catch (error) {
        console.error('AI Analysis Error:', error);
        // خطای واقعی را برگردان
        return res.status(500).json({ 
          success: false, 
          error: 'خطا در تحلیل هوش مصنوعی: ' + error.message 
        });
      }
    }

    // ============================================================
    // ===== بخش ۱: ثبت مشاهدات =====
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
        if (!obs.text || obs.text.length < 10) {
          continue;
        }

        const selectedModule = obs.module ? moduleNames[obs.module] || obs.module : 'هیچ‌کدام';
        
        // ===== تشخیص زبان =====
        const isPersian = /[\u0600-\u06FF]/.test(obs.text);
        
        // ===== ساخت بخش تحلیل AI =====
        let aiSection = '';
        if (obs.aiAnalysis) {
          const ai = obs.aiAnalysis;
          const statusText = ai.status === 'approved' ? '✅ تایید شده' : '❌ رد شده';
          const statusTextEn = ai.status === 'approved' ? '✅ Approved' : '❌ Rejected';
          
          const statusLabel = isPersian ? statusText : statusTextEn;
          const clusterLabel = isPersian ? 
            (ai.cluster === 'human' ? 'انسان' : 
             ai.cluster === 'knowledge' ? 'دانش و فناوری' : 
             ai.cluster === 'governance' ? 'حکمرانی و تمدن' : 
             ai.cluster === 'survival' ? 'بقا و آینده' : 'نامشخص') :
            (ai.cluster || 'Unknown');
          
          const analysisLabel = isPersian ? 'تحلیل' : 'Analysis';
          const scoreLabel = isPersian ? 'امتیاز پیشنهادی' : 'Suggested Score';
          const guideTitle = isPersian ? '📋 بسته راهنمای اقدام عملی' : '📋 Action Guide Package';
          const individualLabel = isPersian ? 'فردی' : 'Individual';
          const networkLabel = isPersian ? 'شبکه‌ای' : 'Network';
          const policyLabel = isPersian ? 'سیاستی' : 'Policy';
          
          aiSection = `
**🤖 AI Analysis:**
- **Status:** ${statusLabel}
- **Cluster:** ${clusterLabel}
- **${scoreLabel}:** ${ai.score_suggestion || '---'}
- **${analysisLabel}:** ${ai.analysis_note || '---'}

**${guideTitle}**
- **${individualLabel}:** ${ai.guide_individual || '---'}
- **${networkLabel}:** ${ai.guide_network || '---'}
- **${policyLabel}:** ${ai.guide_policy || '---'}
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

    // ============================================================
    // ===== بخش ۲: درخواست حذف =====
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
    // ===== بخش ۳: درخواست ارتباط =====
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

    // ===== درخواست نامشخص =====
    return res.status(400).json({ error: 'Invalid request type.' });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
