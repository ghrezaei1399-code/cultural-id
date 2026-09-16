// api/cleanup-deployments.js
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = process.env.VERCEL_API_TOKEN || process.env.VERCEL_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'VERCEL_TOKEN is not configured' });
  }

  const PROJECT_ID = 'prj_J8A2yawhcZGotCY3DjHykfH9yR6b';

  try {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let totalFetched = 0;
    let totalDeleted = 0;
    let until = null;
    let page = 0;

    while (page < 20) {
      let url = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=100`;
      if (until) url += `&until=${until}`;

      const listRes = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!listRes.ok) {
        const errText = await listRes.text();
        return res.status(500).json({ error: `Vercel API error: ${listRes.status} - ${errText.substring(0, 200)}` });
      }

      const data = await listRes.json();
      const deployments = data.deployments || [];
      if (deployments.length === 0) break;

      totalFetched += deployments.length;

      const oldOnes = deployments.filter(d => d.created < sevenDaysAgo);

      for (const d of oldOnes) {
        const delRes = await fetch(`https://api.vercel.com/v13/deployments/${d.uid}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (delRes.ok) totalDeleted++;
      }

      const lastDeployment = deployments[deployments.length - 1];
      if (!lastDeployment) break;
      until = lastDeployment.created;
      page++;
    }

    return res.status(200).json({
      success: true,
      message: 'پاکسازی با موفقیت انجام شد.',
      total: totalFetched,
      deleted: totalDeleted
    });

  } catch (error) {
    console.error('Cleanup Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
