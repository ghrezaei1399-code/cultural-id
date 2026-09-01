// api/approve-connection.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token is not configured' });
  }

  const { fileName, action, issueNumber, type, moduleType } = req.body;
  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  // ===== اگر درخواست از نوع مشاهده (observation) باشد =====
  if (type === 'observation' && issueNumber) {
    try {
      const issueRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!issueRes.ok) {
        return res.status(404).json({ error: 'Issue یافت نشد' });
      }

      const issueData = await issueRes.json();
      const currentLabels = issueData.labels.map(l => l.name);
      let newLabels = currentLabels.filter(l => l !== 'pending-review' && l !== 'observation');

      // ===== تایید/رد کل مشاهده =====
      if (action === 'approve_all' || action === 'reject_all') {
        if (action === 'approve_all') {
          newLabels.push('approved');
          newLabels.push('observation');
          
          // تولید بسته راهنما
          const guide = generateGuide(issueData.body);
          const commentBody = `
### بسته راهنمای اقدام عملی

**مشاهده شما تأیید شد.** بر اساس تحلیل سپهری، بسته‌ی راهنمای زیر برای شما تولید شده است:

---

**📍 سطح فردی (اقدام شخصی)**
${guide.individual}

---

**🌐 سطح شبکه‌ای (کنشگری جمعی)**
${guide.network}

---

**🏛️ سطح سیاستی/مدیریتی (تأثیر ساختاری)**
${guide.policy}

---

*این بسته بر اساس اصول آزمایشگاه سپهر خردمندی تولید شده است.*
          `;

          await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({ body: commentBody })
          });

          // ===== اجرای ماژول انتخاب‌شده =====
          const selectedModule = extractModuleFromIssue(issueData.body);
          
          if (selectedModule === 'ارجاع به ۵ همفرهنگ') {
            // دریافت ۱۰ هم‌فکر و ذخیره برای انتخاب ادمین
            const likeMinded = await getLikeMinded(issueData, token);
            if (likeMinded.length > 0) {
              const referralData = {
                issueNumber: issueNumber,
                cardCode: extractCardCode(issueData.body),
                likeMinded: likeMinded,
                selected: [],
                status: 'pending_admin_selection'
              };
              // ذخیره در data/referrals/
              await saveReferralData(referralData, token);
            }
          } else if (selectedModule === 'همفکری با دیگران') {
            // اضافه کردن برچسب همفکری
            newLabels.push('collaboration');
          } else if (selectedModule === 'مشاهدات مرتبط دیگران') {
            // اضافه کردن برچسب مرتبط
            newLabels.push('related');
          }

        } else {
          newLabels.push('rejected');
          newLabels.push('observation');
          
          await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
              body: '❌ این مشاهده با توجه به اصول آزمایشگاه سپهر خردمندی رد شد.'
            })
          });
        }

        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            labels: newLabels,
            state: action === 'approve_all' ? 'open' : 'closed'
          })
        });

        return res.status(200).json({
          success: true,
          message: action === 'approve_all' ? '✅ مشاهده تایید شد.' : '❌ مشاهده رد شد.'
        });
      }

      // ===== تایید ماژول جداگانه =====
      if (action === 'approve_module' && moduleType) {
        const moduleCommentBody = `
**${moduleType}** - ✅ تایید شد.

این ماژول توسط ادمین تایید شده است. کاربر می‌تواند از این قابلیت استفاده کند.
        `;
        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({ body: moduleCommentBody })
        });
        
        // اضافه کردن برچسب ماژول
        const moduleLabel = `module-${moduleType.replace(/\s/g, '-')}`;
        newLabels.push(moduleLabel);
        
        await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            labels: newLabels
          })
        });

        return res.status(200).json({
          success: true,
          message: `✅ ماژول "${moduleType}" تایید شد.`
        });
      }

      return res.status(400).json({ error: 'عملیات نامشخص است.' });

    } catch (error) {
      console.error('Update Observation Error:', error);
      return res.status(500).json({ error: error.message });
    }
  }

  // ===== منطق قبلی: تأیید/رد درخواست‌های ارتباط =====
  if (!fileName || !action) {
    return res.status(400).json({ error: 'نام فایل و نوع عملیات الزامی است' });
  }

  const path = `data/requests/${fileName}`;

  try {
    const fileResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!fileResponse.ok) {
      return res.status(404).json({ error: 'درخواست یافت نشد' });
    }

    const fileData = await fileResponse.json();
    const jsonString = Buffer.from(fileData.content, 'base64').toString('utf8');
    const requestData = JSON.parse(jsonString);

    if (action === 'approve') {
      requestData.status = 'approved';
      requestData.approvedAt = new Date().toISOString();

      if (requestData.connections && requestData.connections.length > 0) {
        try {
          const senderCode = requestData.senderCode || requestData.cardCode;
          const userPath = `data/active/${senderCode}.json`;
          
          const userRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (userRes.ok) {
            const userDataRaw = await userRes.json();
            const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));
            
            userData.connectionsList = requestData.connections;
            userData.connectionsUpdatedAt = new Date().toISOString();
            userData.connectionsTrackingCode = requestData.trackingCode || '---';
            
            const newUserContent = Buffer.from(JSON.stringify(userData, null, 2), 'utf8').toString('base64');
            
            await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${userPath}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                message: `Connection list delivered to ${senderCode} (${requestData.trackingCode})`,
                content: newUserContent,
                sha: userDataRaw.sha,
                branch: 'main'
              })
            });
          }
        } catch (userError) {
          console.error('Error updating user file:', userError);
        }
      }

    } else if (action === 'reject') {
      requestData.status = 'rejected';
      requestData.rejectedAt = new Date().toISOString();
    }

    const newContent = Buffer.from(JSON.stringify(requestData, null, 2), 'utf8').toString('base64');

    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `${action === 'approve' ? 'Approved' : 'Rejected'} connection request: ${requestData.senderCode || requestData.cardCode}`,
        content: newContent,
        sha: fileData.sha,
        branch: 'main'
      })
    });

    return res.status(200).json({
      success: true,
      message: action === 'approve' ? '✅ درخواست تایید شد.' : '❌ درخواست رد شد.',
      connectionsCount: requestData.connections ? requestData.connections.length : 0,
      trackingCode: requestData.trackingCode || '---'
    });

  } catch (error) {
    console.error('Approve Connection Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ===== توابع کمکی =====

function extractModuleFromIssue(body) {
  const lines = body.split('\n');
  for (const line of lines) {
    if (line.includes('**ماژول انتخاب‌شده:**')) {
      return line.replace('**ماژول انتخاب‌شده:**', '').trim();
    }
  }
  return '';
}

function extractCardCode(body) {
  const lines = body.split('\n');
  for (const line of lines) {
    if (line.includes('**کد کارت:**')) {
      return line.replace('**کد کارت:**', '').trim();
    }
  }
  return '';
}

async function getLikeMinded(issueData, token) {
  // این تابع از طریق GitHub API هم‌فکران را پیدا می‌کند
  // به دلیل محدودیت ۱۲ فایل، این منطق در اینجا پیاده‌سازی شده است
  try {
    const cardCode = extractCardCode(issueData.body);
    if (!cardCode) return [];
    
    // دریافت اطلاعات کاربر از گیت‌هاب
    const userRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/active/${cardCode}.json`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!userRes.ok) return [];
    
    const userDataRaw = await userRes.json();
    const userData = JSON.parse(Buffer.from(userDataRaw.content, 'base64').toString('utf8'));
    
    // دریافت لیست همه کاربران
    const allUsersRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/data/active`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!allUsersRes.ok) return [];
    
    const files = await allUsersRes.json();
    const allUsers = [];
    
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        try {
          const fRes = await fetch(file.download_url);
          const uData = await fRes.json();
          if (uData.status === 'approved' && uData.cardCode !== cardCode) {
            allUsers.push(uData);
          }
        } catch (e) { continue; }
      }
    }
    
    // محاسبه شباهت
    const senderValues = userData.values || [];
    const senderPriorities = userData.priorities || [];
    
    const scoredUsers = allUsers.map(user => {
      const userValues = user.values || [];
      const userPriorities = user.priorities || [];
      let score = 0;
      let matchCount = 0;
      
      senderValues.forEach((value, idx) => {
        const userIndex = userValues.indexOf(value);
        if (userIndex !== -1) {
          const priorityDiff = Math.abs((senderPriorities[idx] || 999) - (userPriorities[userIndex] || 999));
          score += Math.max(0, 10 - priorityDiff);
          matchCount++;
        }
      });
      
      return {
        cardCode: user.cardCode,
        rank: user.rank,
        email: user.communicationEmail || '',
        matchScore: score,
        matchCount: matchCount,
        similarityScore: Math.round((matchCount / Math.min(senderValues.length, userValues.length)) * 100) || 0
      };
    });
    
    return scoredUsers
      .filter(u => u.matchCount >= 2)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
  } catch (e) {
    console.error('Error getting like-minded:', e);
    return [];
  }
}

async function saveReferralData(data, token) {
  // ذخیره در پوشه data/referrals/
  try {
    const path = `data/referrals/${data.issueNumber}.json`;
    const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');
    
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Referral data for issue #${data.issueNumber}`,
        content: content,
        branch: 'main'
      })
    });
  } catch (e) {
    console.error('Error saving referral data:', e);
  }
}

// ===== تولید بسته راهنمای اقدام عملی =====
function generateGuide(issueBody) {
  const text = issueBody.toLowerCase();
  let cluster = 'انسان';
  
  const clusters = {
    'دانش و فناوری': ['هوش مصنوعی', 'فناوری', 'دانش', 'نوآوری', 'تحقیق', 'علم'],
    'حکمرانی و تمدن': ['فساد', 'جنگ', 'سیاست', 'حکمرانی', 'نهاد', 'قانون'],
    'بقا و آینده': ['آب', 'انرژی', 'اقلیم', 'محیط زیست', 'غذا', 'کشاورزی']
  };
  
  for (const [c, words] of Object.entries(clusters)) {
    if (words.some(w => text.includes(w))) {
      cluster = c;
      break;
    }
  }
  
  const guides = {
    'انسان': {
      individual: 'روزانه یک ظهور مرتبط با این موضوع را در دفترچه مشاهده خود یادداشت کنید و از قضاوت بپرهیزید.',
      network: 'این مشاهده را با ۳ نفر از هم‌فرهنگان دارای کارت به اشتراک بگذارید و بازخورد خام آنها را بگیرید.',
      policy: 'یک یادداشت کوتاه درباره گسست میان سپهر آموزش و سلامت در این پدیده تهیه کنید.'
    },
    'دانش و فناوری': {
      individual: 'ظرفیت‌های مغفول دانشی در این پدیده را فهرست کنید بدون اینکه راه‌حل فناورانه پیشنهاد دهید.',
      network: 'در شبکه مجتمع هم‌اندیشی، پرونده مشابهی جستجو کنید و الگوی تکرارشونده آن را گزارش دهید.',
      policy: 'خلأ نهادی در دسترسی به دانش مربوط به این ظهور را مستند کنید.'
    },
    'حکمرانی و تمدن': {
      individual: 'ناهم‌ترازی میان ظرفیت موجود و تجلی واقعی را در این پدیده توصیف کنید.',
      network: 'با اعضای خوشه حکمرانی در شبکه هم‌فرهنگان، ماتریس موانع این ظهور را تکمیل کنید.',
      policy: 'یک پیشنهاد سیاستی مبتنی بر کرامت انسانی برای رفع گسست سپهری این پدیده بنویسید.'
    },
    'بقا و آینده': {
      individual: 'ظرفیت‌های پنهان بقا در این بحران را شناسایی و ثبت کنید.',
      network: 'این ظهور را به عنوان یک ابرسپهر احتمالی در پنل نام‌آوران مطرح کنید.',
      policy: 'یادداشتی درباره ناهم‌ترازی میان منابع طبیعی و حکمرانی آب/انرژی تهیه نمایید.'
    }
  };
  
  return guides[cluster] || guides['انسان'];
}
