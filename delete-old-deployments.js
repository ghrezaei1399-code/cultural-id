// delete-old-deployments.js
// این اسکریپت دیپلوی‌های قدیمی Vercel را پاک می‌کند
// فقط دیپلوی‌های قدیمی‌تر از ۳۰ روز را پاک می‌کند

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_J8A2yawhcZGotCY3DjHykfH9yR6b';

if (!VERCEL_TOKEN) {
  console.error('VERCEL_TOKEN is missing');
  process.exit(1);
}

async function fetchDeployments() {
  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=100`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  );
  if (!res.ok) throw new Error('Failed to fetch deployments: ' + res.status);
  return res.json();
}

async function deleteDeployment(id) {
  const res = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
  return res.ok;
}

async function main() {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let totalDeleted = 0;
  let page = 0;

  while (page < 10) {
    const data = await fetchDeployments();
    const deployments = data.deployments || [];

    if (deployments.length === 0) break;

    const oldOnes = deployments.filter(d => d.created < thirtyDaysAgo);

    if (oldOnes.length === 0) break;

    for (const d of oldOnes) {
      const ok = await deleteDeployment(d.uid);
      if (ok) {
        totalDeleted++;
        console.log(`Deleted: ${d.uid}`);
      }
    }

    page++;
  }

  console.log(`\nTotal deleted: ${totalDeleted}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
