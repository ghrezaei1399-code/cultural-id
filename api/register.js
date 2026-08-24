export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const userData = req.body;

        if (!userData.values || userData.values.length !== 7) {
            return res.status(400).json({ error: 'Please fill in all 7 cultural values.' });
        }

        // تولید کد کارت
        const part1 = Math.floor(1000 + Math.random() * 9000);
        const part2 = Math.floor(1000 + Math.random() * 9000);
        const finalOptionalCode = userData.optionalCode ? userData.optionalCode : '-----';
        const cardId = `CIM-${part1}-${part2}-${finalOptionalCode}`;

        // شمارش کاربران فعلی برای تعیین نشان
        const countResponse = await fetch(
            `https://api.github.com/repos/ghrezaei1399-code/cultural-id/contents/data/active`,
            {
                headers: {
                    'Authorization': `token ${process.env.GH_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );

        let currentCount = 0;
        if (countResponse.ok) {
            const files = await countResponse.json();
            currentCount = files.filter(f => f.name.endsWith('.json')).length;
        }

        // تعیین نشان بر اساس شماره کاربر
        let badge = 'bronze';
        if (currentCount + 1 <= 200) {
            badge = 'golden';
        } else if (currentCount + 1 <= 1000) {
            badge = 'silver';
        } else {
            badge = 'bronze';
        }

        const userRecord = {
            cardCode: cardId,
            optionalCode: userData.optionalCode || '',
            values: userData.values,
            communicationEmail: userData.communicationEmail || '',
            registrationDate: new Date().toISOString(),
            status: 'active',
            badge: badge,
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
                error: 'Error saving to repository',
                details: errorData.message
            });
        }

        return res.status(200).json({
            success: true,
            cardId: cardId,
            badge: badge,
            message: 'Registration successful!'
        });

    } catch (error) {
        return res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
}
