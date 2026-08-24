export default async function handler(req, res) {
    // ===== CORS Headers =====
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userData = req.body;

        if (!userData.values || userData.values.length !== 7) {
            return res.status(400).json({ error: 'لطفاً تمام ۷ ارزش فرهنگی را وارد کنید.' });
        }

        // تولید کد کارت با رعایت کد اختیاری کاربر
        const part1 = Math.floor(1000 + Math.random() * 9000);
        const part2 = Math.floor(1000 + Math.random() * 9000);
        const optionalCode = userData.optionalCode || '-----';
        const finalOptionalCode = userData.optionalCode ? userData.optionalCode : '-----';
        const cardId = `CIM-${part1}-${part2}-${finalOptionalCode}`;

        const userRecord = {
            cardCode: cardId,
            optionalCode: userData.optionalCode || '',
            values: userData.values,
            communicationEmail: userData.communicationEmail || '',
            registrationDate: new Date().toISOString(),
            status: 'active',
            referrals: 0,
            achievements: []
        };

        const GITHUB_TOKEN = process.env.GH_TOKEN;
        if (!GITHUB_TOKEN) {
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const filePath = `data/active/${cardId}.json`;
        const jsonString = JSON.stringify(userRecord, null, 2);
        const encodedContent = encodeURIComponent(jsonString);
        const fileContent = Buffer.from(encodedContent).toString('base64');

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
            message: 'ثبت‌نام با موفقیت انجام شد!'
        });

    } catch (error) {
        return res.status(500).json({
            error: 'خطای داخلی سرور',
            details: error.message
        });
    }
}
