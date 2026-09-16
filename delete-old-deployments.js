// delete-old-deployments.js
// این اسکریپت دیپلوی‌های قدیمی Vercel را پاک می‌کند
// فقط دیپلوی‌های قدیمی‌تر از ۷ روز را پاک می‌کند

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = 'prj_J8A2yawhcZGotCY3DjHykfH9yR6b';

if (!VERCEL_TOKEN) {
  console.error('VERCEL_TOKEN is missing');
  process.exit(1);
}

async function fetchDeployments(until) {
  let url = `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=100`;
  if (until) url += `&until=${until}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
  });
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
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  let totalDeleted = 0;
  let totalFetched = 0;
  let until = null;
  let page = 0;

  while (page < 20) {
    const data = await fetchDeployments(until);
    const deployments = data.deployments || [];

    if (deployments.length === 0) break;

    totalFetched += deployments.length;
    console.log(`Page ${page + 1}: fetched ${deployments.length} deployments`);

    const oldOnes = deployments.filter(d => d.created < sevenDaysAgo);
    console.log(`Old ones in this page: ${oldOnes.length}`);

    for (const d of oldOnes) {
      const ok = await deleteDeployment(d.uid);
      if (ok) {
        totalDeleted++;
        console.log(`Deleted: ${d.uid}`);
      }
    }

    // صفحه بعد را از قدیمی‌ترین این صفحه شروع کن
    const lastDeployment = deployments[deployments.length - 1];
    if (!lastDeployment) break;
    until = lastDeployment.created;

    // اگر همه در این صفحه جدید بودند، یک صفحه جلوتر برو
    page++;
  }

  console.log(`\nTotal fetched: ${totalFetched}`);
  console.log(`Total deleted: ${totalDeleted}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
