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
        if (!obs.text || obs.text.length < 10) {
          continue;
        }

        const selectedModule = obs.module ? moduleNames[obs.module] || obs.module : 'هیچ‌کدام';
        const isPersian = /[\u0600-\u06FF]/.test(obs.text);
        
        // ============================================================
        // تحلیل هوش مصنوعی با OpenRouter (Gemini)
        // ============================================================
        let aiAnalysis = null;
        
        // اگر از قبل تحلیل وجود نداشت، از هوش مصنوعی بگیر
        if (!obs.aiAnalysis) {
          try {
            const openRouterKey = process.env.OPENROUTER_API_KEY;
            
            if (openRouterKey) {
              // پرامپت سیستم بر اساس سپهر خردمندی
              const systemPrompt = isPersian ? 
`شما یک تحلیلگر فرهنگی بر اساس چارچوب "سپهر خردمندی" هستید.

**وظیفه:** تحلیل عمیق مشاهده کاربر و تولید یک JSON با ۱۱ بخش.

**قوانین:**
۱. فقط JSON برگردانید. هیچ توضیح اضافی.
۲. تحلیل شما باید بر اساس متن کاربر باشد.
۳. هر بخش باید کامل و دقیق باشد.

**خوشه‌ها (۴ خوشه اطلس ظهور):**
- human: انسان (مسائل فردی، روانشناختی، خانواده، روابط)
- knowledge: دانش و فناوری (آموزش، علم، پژوهش، فناوری)
- governance: حکمرانی و تمدن (مدیریت، قانون، ساختارها)
- survival: بقا و آینده (معیشت، آب، غذا، محیط زیست، امنیت)

**۵ ماتریس سپهر خردمندی:**
۱. ماتریس ظهورها: چه چیزهایی در این پدیده ظاهر شده و دیده می‌شود؟
۲. ماتریس لایه‌ها: چه لایه‌هایی از این پدیده وجود دارد (فردی، اجتماعی، ساختاری، تمدنی)؟
۳. ماتریس ارتباطات: روابط میان سپهرهای درگیر چگونه است؟
۴. ماتریس مقیاس: این پدیده در چه مقیاسی است (فردی، محلی، منطقه‌ای، جهانی)؟
۵. ماتریس ظرفیت: چه ظرفیت‌هایی وجود دارد و کدام مغفول مانده است؟

**ساختار خروجی (فقط این JSON را برگردانید):**
{
  "status": "approved",
  "cluster": "human",
  "score": 3,
  "analysis": "تحلیل عمیق و دقیق بر اساس متن کاربر در ۳ پاراگراف",
  "individual": "راهنمای عملی که کاربر در ۲۴ ساعت آینده انجام دهد",
  "network": "راهنمای هماهنگی با ۳ تا ۵ نفر دیگر",
  "policy": "پیشنهاد یا سوال ساختاری برای تغییر",
  "matrix_emergence": "تحلیل ماتریس ظهورها بر اساس متن کاربر",
  "matrix_layers": "تحلیل ماتریس لایه‌ها بر اساس متن کاربر",
  "matrix_connections": "تحلیل ماتریس ارتباطات بر اساس متن کاربر",
  "matrix_scale": "تحلیل ماتریس مقیاس بر اساس متن کاربر",
  "matrix_capacity": "تحلیل ماتریس ظرفیت بر اساس متن کاربر"
}` :
`You are a cultural analyst based on the "Sphere of Wisdom" framework.

**Task:** Deep analysis of a raw observation, return a JSON with 11 fields.

**Strict Rules:**
1. Return ONLY JSON. No extra text.
2. Your analysis must be based on the user's text.
3. Each field must be complete and precise.

**Clusters (4 Atlas of Emergence clusters):**
- human: Human (individual, psychological, family, relationships)
- knowledge: Knowledge and Technology (education, science, research)
- governance: Governance and Civilization (management, law, structures)
- survival: Survival and Future (livelihood, water, food, environment, security)

**5 Sphere of Wisdom Matrices:**
1. Emergence Matrix: What has emerged and is visible in this phenomenon?
2. Layers Matrix: What layers exist (individual, social, structural, civilizational)?
3. Connections Matrix: How are the involved spheres connected?
4. Scale Matrix: What is the scale (individual, local, regional, global)?
5. Capacity Matrix: What capacities exist and which have been neglected?

**Output Structure (return ONLY this JSON):**
{
  "status": "approved",
  "cluster": "human",
  "score": 3,
  "analysis": "Deep and precise analysis based on user text in 3 paragraphs",
  "individual": "Practical guide the user should do in the next 24 hours",
  "network": "Guide for coordinating with 3-5 other people",
  "policy": "Structural suggestion or question for change",
  "matrix_emergence": "Analysis of Emergence Matrix based on user text",
  "matrix_layers": "Analysis of Layers Matrix based on user text",
  "matrix_connections": "Analysis of Connections Matrix based on user text",
  "matrix_scale": "Analysis of Scale Matrix based on user text",
  "matrix_capacity": "Analysis of Capacity Matrix based on user text"
}`;

              const userPrompt = isPersian ?
`مشاهده کاربر: "${obs.text}"

تحلیل عمیق بر اساس چارچوب سپهر خردمندی با ۵ ماتریس. فقط JSON برگردان.` :
`User observation: "${obs.text}"

Deep analysis based on the Sphere of Wisdom framework with 5 matrices. Return ONLY JSON.`;

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
                  max_tokens: 1200,
                  response_format: { type: 'json_object' }
                })
              });

              if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '{}';
                
                let jsonStr = content;
                const s = content.indexOf('{');
                const e = content.lastIndexOf('}');
                if (s !== -1 && e !== -1) {
                  jsonStr = content.substring(s, e + 1);
                }
                
                const analysis = JSON.parse(jsonStr);
                
                aiAnalysis = {
                  status: analysis.status || "approved",
                  rejection_reason: analysis.rejection_reason || null,
                  cluster: analysis.cluster || "human",
                  score_suggestion: typeof analysis.score === 'number' ? analysis.score : 3,
                  analysis_note: analysis.analysis || (isPersian ? "تحلیل دقیق" : "Detailed analysis"),
                  guide_individual: analysis.individual || (isPersian ? "راهنمای فردی" : "Individual guide"),
                  guide_network: analysis.network || (isPersian ? "راهنمای شبکه‌ای" : "Network guide"),
                  guide_policy: analysis.policy || (isPersian ? "راهنمای سیاستی" : "Policy guide"),
                  matrix_emergence: analysis.matrix_emergence || (isPersian ? "تحلیل ماتریس ظهورها" : "Emergence Matrix Analysis"),
                  matrix_layers: analysis.matrix_layers || (isPersian ? "تحلیل ماتریس لایه‌ها" : "Layers Matrix Analysis"),
                  matrix_connections: analysis.matrix_connections || (isPersian ? "تحلیل ماتریس ارتباطات" : "Connections Matrix Analysis"),
                  matrix_scale: analysis.matrix_scale || (isPersian ? "تحلیل ماتریس مقیاس" : "Scale Matrix Analysis"),
                  matrix_capacity: analysis.matrix_capacity || (isPersian ? "تحلیل ماتریس ظرفیت" : "Capacity Matrix Analysis")
                };
              } else {
                console.error('OpenRouter Error:', response.status);
              }
            }
          } catch (aiError) {
            console.error('AI Analysis Error:', aiError);
          }
        } else {
          aiAnalysis = obs.aiAnalysis;
        }

        // اگر هوش مصنوعی کار نکرد، از تحلیل ساده استفاده کن
        if (!aiAnalysis) {
          aiAnalysis = getFallbackAnalysis(obs.text, isPersian);
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

**📌 Module Result:**
${moduleResult ? `
- **Type:** ${moduleResult.type === 'collaboration' ? 'همفکری' : moduleResult.type === 'related' ? 'مشاهدات مرتبط' : 'ارجاع به ۵ همفرهنگ'}
- **Status:** ${moduleResult.status === 'completed' ? '✅ تکمیل شد' : '⏳ در انتظار'}
${moduleResult.data && moduleResult.data.length > 0 ? `- **Results:** ${moduleResult.data.map(d => d.cardCode || d.text).join(', ')}` : ''}
${moduleResult.analysis ? `- **Additional Analysis:** ${moduleResult.analysis}` : ''}
` : '⏳ در حال پردازش...'}
`;
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
          module: selectedModule,
          aiAnalysis: aiAnalysis
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
    // نوع درخواست نامعتبر
    // ============================================================
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
