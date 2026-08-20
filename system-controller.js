// ===== مدیریت آپلود اثر (دو زبانه) =====
function saveAchievement(userCode, achievementData) {
    // achievementData شامل فیلدهای زیر است:
    // {
    //   type, titleFa, titleEn, authorFa, authorEn,
    //   descriptionFa, descriptionEn, mediaType, mediaUrl
    // }
    const fs = require('fs');
    const path = require('path');
    const folder = './data/achievements';
    if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    const filePath = path.join(folder, `${userCode}.json`);
    fs.writeFileSync(filePath, JSON.stringify(achievementData, null, 2));
}

function getAchievements(lang = 'fa') {
    const fs = require('fs');
    const path = require('path');
    const folder = './data/achievements';
    if (!fs.existsSync(folder)) return [];
    const files = fs.readdirSync(folder);
    const achievements = [];
    files.forEach(file => {
        if (file.endsWith('.json')) {
            const content = fs.readFileSync(path.join(folder, file), 'utf8');
            const data = JSON.parse(content);
            achievements.push({
                userCode: data.userCode,
                type: data.type,
                title: lang === 'fa' ? data.titleFa : data.titleEn,
                author: lang === 'fa' ? data.authorFa : data.authorEn,
                description: lang === 'fa' ? data.descriptionFa : data.descriptionEn,
                mediaType: data.mediaType,
                mediaUrl: data.mediaUrl,
                uploadedAt: data.uploadedAt
            });
        }
    });
    return achievements.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}