module.exports = async function handler(req, res) {
  const token = process.env.OBSERVER_TOKEN || process.env.GH_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Token not configured' });
  }

  const owner = 'ghrezaei1399-code';
  const repo = 'cultural-id';

  try {
    let closed = 0;
    let page = 1;

    while (page <= 10) {
      const listRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues?state=open&per_page=100&page=${page}`,
        { headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/vnd.github.v3+json' } }
      );

      if (!listRes.ok) {
        return res.status(500).json({ error: 'Failed to fetch issues' });
      }

      const issues = await listRes.json();
      if (!Array.isArray(issues) || issues.length === 0) break;

      for (const issue of issues) {
        if (issue.pull_request) continue;

        await fetch(
          `https://api.github.com/repos/${owner}/${repo}/issues/${issue.number}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({ state: 'closed' })
          }
        );
        closed++;
      }

      page++;
    }

    return res.status(200).json({ success: true, closed });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
