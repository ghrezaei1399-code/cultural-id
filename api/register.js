// api/register.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userData = req.body;

        if (!userData.fullName || !userData.country || !userData.city) {
            return res.status(400).json({ error: 'فیلدهای الزامی پر نشده‌اند' });
        }

        if (!userData.values || userData.values.length < 5) {
            return res.status(400).json({ error: 'حداقل ۵ ارزش فرهنگی انتخاب کنید' });
        }

        const cardId = 'CID-' + Math.random().toString(36).substring(2, 10).toUpperCase();
        const timestamp = new Date().toISOString();

        const userRecord = {
            cardId: cardId,
            fullName: userData.fullName,
            email: userData.email || '',
            country: userData.country,
            city: userData.city,
            values: userData.values,
            badge: userData.badge || 'normal',
            registeredAt: timestamp,
            lastUpdated: timestamp,
            isActive: true
        };

        const GITHUB_TOKEN = process.env.GH_TOKEN;
        if (!GITHUB_TOKEN) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const filePath = `data/active/${cardId}.json`;
        const fileContent = Buffer.from(JSON.stringify(userRecord, null, 2)).toString('base64');

        const response = await fetch(
            `https://api.github.com/repos/ghrezaei1399-code/cultural-id/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                },
                body: JSON.stringify({
                    message: `Register new user: ${cardId}`,
                    content: fileContent,
                    branch: 'main',
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            return res.status(response.status).json({
                error: 'خطا در ذخیره‌سازی در مخزن',
                details: errorData.message
            });
        }

        return res.status(200).json({
            success: true,
            cardId: cardId,
            badge: userRecord.badge
        });

    } catch (error) {
        return res.status(500).json({
            error: 'خطای داخلی سرور',
            details: error.message
        });
    }
}
