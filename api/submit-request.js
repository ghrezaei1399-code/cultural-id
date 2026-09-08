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

    // ============================================================
    // بخش AI Analyze - با پرامپت جدید و مؤثر
    // ============================================================
    if (type === 'ai-analyze') {
      try {
        const isPersian = /[\u0600-\u06FF]/.test(text);
        
        // ============================================================
        // پرامپت جدید و دقیق برای Gemini
        // ============================================================
        const systemPrompt = isPersian ? 
`شما یک تحلیلگر فرهنگی بر اساس چارچوب "سپهر خردمندی" هستید.

وظیفه شما: تحلیل عمیق یک مشاهده خام و تولید یک JSON با ۶ بخش.

**قوانین سختگیرانه:**
۱. فقط JSON برگردانید. هیچ توضیح اضافی.
۲. تحلیل شما باید بر اساس متن کاربر باشد، نه کلیشه‌ها.
۳. هر بخش باید حداقل ۱ پاراگراف (۵۰ کلمه) باشد.

**خوشه‌ها:**
- human: مسائل فردی، روانشناختی، خانواده، روابط
- knowledge: آموزش، علم، پژوهش، فناوری، کتاب
- governance: مدیریت، قانون، سیاست، ساختار، نهادها
- survival: معیشت، آب، غذا، مسکن، محیط زیست، امنیت

**امتیاز (۱ تا ۵):**
بر اساس شدت، دامنه تأثیر، ارتباط با کرامت انسانی، و عمق مشاهده

**ساختار خروجی (فقط این JSON را برگردانید):**
{
  "status": "approved",
  "cluster": "human",
  "score": 3,
  "analysis": "تحلیل عمیق و دقیق بر اساس متن کاربر در ۳ پاراگراف",
  "individual": "راهنمای عملی که کاربر در ۲۴ ساعت آینده انجام دهد",
  "network": "راهنمای هماهنگی با ۳ تا ۵ نفر دیگر",
  "policy": "پیشنهاد یا سوال ساختاری برای تغییر"
}` :
`You are a cultural analyst based on the "Sphere of Wisdom" framework.

**Task:** Deep analysis of a raw observation, return a JSON with 6 fields.

**Strict Rules:**
1. Return ONLY JSON. No extra text.
2. Your analysis must be based on the user's text, not clichés.
3. Each field must be at least 1 paragraph (50 words).

**Clusters:**
- human: Individual, psychological, family, relationships
- knowledge: Education, science, research, technology, books
- governance: Management, law, politics, structures, institutions
- survival: Livelihood, water, food, housing, environment, security

**Score (1 to 5):**
Based on intensity, scope of impact, connection to human dignity, and depth of observation

**Output Structure (return ONLY this JSON):**
{
  "status": "approved",
  "cluster": "human",
  "score": 3,
  "analysis": "Deep and precise analysis based on user text in 3 paragraphs",
  "individual": "Practical guide the user should do in the next 24 hours",
  "network": "Guide for coordinating with 3-5 other people",
  "policy": "Structural suggestion or question for change"
}`;

        const userPrompt = isPersian ?
`مشاهده کاربر: "${text}"

تحلیل عمیق بر اساس چارچوب سپهر خردمندی. فقط JSON برگردان.` :
`User observation: "${text}"

Deep analysis based on the Sphere of Wisdom framework. Return ONLY JSON.`;

        // ============================================================
        // درخواست به OpenRouter
        // ============================================================
        const openRouterKey = process.env.OPENROUTER_API_KEY;
        
        if (!openRouterKey) {
          console.warn('OPENROUTER_API_KEY not found, using fallback');
          return res.status(200).json({
            success: true,
            analysis: getFallbackAnalysis(text, isPersian)
          });
        }

        console.log('Sending request to OpenRouter...');
        
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKey}`,
            'HTTP-Referer': process.env.SITE_URL || 'https://cultural-id.vercel.app',
            'X-Title': process.env.SITE_NAME || 'Global Smart Cultural Identity',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.0-flash-exp:free',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.8,
            max_tokens: 800,
            response_format: { type: 'json_object' }
          })
        });

        if (!response.ok) {
          console.error('OpenRouter Error:', response.status);
          const errorText = await response.text();
          console.error('OpenRouter Response:', errorText);
          return res.status(200).json({
            success: true,
            analysis: getFallbackAnalysis(text, isPersian)
          });
        }

        const data = await response.json();
        console.log('OpenRouter Response received:', data.choices?.[0]?.message?.content?.substring(0, 100));
        
        const content = data.choices?.[0]?.message?.content || '{}';
        
        // استخراج JSON
        let jsonStr = content;
        const s = content.indexOf('{');
        const e = content.lastIndexOf('}');
        if (s !== -1 && e !== -1) {
          jsonStr = content.substring(s, e + 1);
        }
        
        const analysis = JSON.parse(jsonStr);
        
        // اعتبارسنجی و تکمیل مقادیر
        const result = {
          status: analysis.status || "approved",
          rejection_reason: analysis.rejection_reason || null,
          cluster: analysis.cluster || "human",
          score_suggestion: typeof analysis.score === 'number' ? analysis.score : 3,
          analysis_note: analysis.analysis || (isPersian ? "تحلیل دقیق" : "Detailed analysis"),
          guide_individual: analysis.individual || (isPersian ? "راهنمای فردی" : "Individual guide"),
          guide_network: analysis.network || (isPersian ? "راهنمای شبکه‌ای" : "Network guide"),
          guide_policy: analysis.policy || (isPersian ? "راهنمای سیاستی" : "Policy guide")
        };
        
        return res.status(200).json({ success: true, analysis: result });
        
      } catch (error) {
        console.error('AI Analysis Error:', error);
        const isPersian = /[\u0600-\u06FF]/.test(text);
        return res.status(200).json({
          success: true,
          analysis: getFallbackAnalysis(text, isPersian)
        });
      }
    }

    // ============================================================
    // بخش Observations (تغییر نکرده)
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

    // ============================================================
    // بخش Delete (تغییر نکرده)
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
    // بخش Connection (تغییر نکرده)
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

    return res.status(400).json({ error: 'Invalid request type.' });

  } catch (error) {
    console.error('Submit Request Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ============================================================
// تابع Fallback (زمانی که API کار نکرد)
// ============================================================
function getFallbackAnalysis(text, isPersian) {
  // تشخیص خوشه با کلمات کلیدی
  const keywords = {
    human: ['احساس', 'دوست', 'خانواده', 'عشق', 'غم', 'شادی', 'تنهایی', 'روان', 'ذهن', 'هویت', 'ارزش', 'اخلاق', 'صلح', 'همدلی'],
    knowledge: ['کتاب', 'آموزش', 'دانش', 'مدرسه', 'یادگیری', 'علم', 'پژوهش', 'تحقیق', 'کتابخانه', 'استاد', 'دانشجو', 'سواد', 'آگاهی'],
    governance: ['قانون', 'مدیریت', 'سیاست', 'شهرداری', 'دولت', 'ساختار', 'سازمان', 'نظام', 'برنامه', 'تصمیم', 'مسئول', 'نظارت'],
    survival: ['غذا', 'آب', 'مسکن', 'بهداشت', 'امنیت', 'پول', 'کار', 'معیشت', 'درمان', 'سلامت', 'ایمنی', 'خطر', 'بقا', 'نیاز']
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

  return {
    status: "approved",
    rejection_reason: null,
    cluster: bestCluster,
    score_suggestion: score,
    analysis_note: templates[bestCluster] || templates.human,
    guide_individual: guides[bestCluster].individual,
    guide_network: guides[bestCluster].network,
    guide_policy: guides[bestCluster].policy
  };
}
