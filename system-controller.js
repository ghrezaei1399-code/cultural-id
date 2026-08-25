// ===== مدیریت آپلود اثر (سازگار با Vercel و GitHub) =====

const GITHUB_OWNER = 'ghrezaei1399-code';
const GITHUB_REPO = 'cultural-id';
const GITHUB_TOKEN = process.env.GH_TOKEN;

// تابع کمکی برای دریافت اطلاعات فایل از گیت‌هاب
async function getFileFromGitHub(path) {
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    content: Buffer.from(data.content, 'base64').toString('utf8'),
    sha: data.sha
  };
}

// تابع کمکی برای ذخیره فایل در گیت‌هاب
async function saveFileToGitHub(path, content, message, sha = null) {
  const body = {
    message: message,
    content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
    branch: 'main'
  };
  if (sha) body.sha = sha;

  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.ok;
}

// ذخیره اثر فرهنگی
async function saveAchievement(userCode, achievementData) {
  if (!GITHUB_TOKEN) throw new Error('GH_TOKEN is not configured');
  const path = `data/achievements/${userCode}.json`;
  const message = `Add achievement for user: ${userCode}`;
  return await saveFileToGitHub(path, achievementData, message);
}

// دریافت لیست آثار (با پشتیبانی دوزبانه)
async function getAchievements(lang = 'fa') {
  if (!GITHUB_TOKEN) return [];
  
  const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/data/achievements`, {
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  
  if (!res.ok) return [];
  const files = await res.json();
  if (!Array.isArray(files)) return [];
  
  const achievements = [];
  for (const file of files) {
    if (!file.name.endsWith('.json')) continue;
    try {
      const fileRes = await fetch(file.download_url);
      const data = await fileRes.json();
      achievements.push({
        userCode: data.userCode || file.name.replace('.json', ''),
        type: data.type,
        title: lang === 'fa' ? data.titleFa : data.titleEn,
        author: lang === 'fa' ? data.authorFa : data.authorEn,
        description: lang === 'fa' ? data.descriptionFa : data.descriptionEn,
        mediaType: data.mediaType,
        mediaUrl: data.mediaUrl,
        uploadedAt: data.uploadedAt
      });
    } catch (e) {
      console.warn(`Failed to load achievement ${file.name}:`, e.message);
    }
  }
  
  return achievements.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

module.exports = { saveAchievement, getAchievements };
