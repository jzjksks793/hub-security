const c = require("../colors");

const SENSITIVE_PATHS = [
  ".env", ".git/config", ".git/HEAD", "wp-config.php.bak", "config.php.bak",
  "backup.zip", "backup.sql", ".DS_Store", "composer.json", "package.json",
  "phpinfo.php", "admin/", "server-status", "swagger.json", "api-docs"
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function scanPaths(baseUrl) {
  console.log(c.cyan("\n[*] Memeriksa path sensitif (dengan deteksi Soft-404)..."));
  const results = [];
  const root = baseUrl.replace(/\/+$/, "");

  // 1. Baseline Soft 404
  let baselineLen = 0, baselineStatus = 404;
  try {
    const randRes = await fetch(`${root}/blablabla123xyz`, { redirect: "manual" });
    baselineLen = (await randRes.text()).length;
    baselineStatus = randRes.status;
  } catch {}

  for (const path of SENSITIVE_PATHS) {
    const fullUrl = `${root}/${path}`;
    try {
      const res = await fetch(fullUrl, { redirect: "manual" });
      const body = await res.text();

      const isSoft404 = (res.status === baselineStatus && body.length === baselineLen);

      if (res.status === 200 && !isSoft404) {
        console.log(`  ${c.red("[EXPOSED]")}  ${path} dapat diakses publik.`);
        results.push({ path, status: 200, exposed: true });
      } else {
        console.log(`  ${c.gray(`[${res.status}]`)}  ${path}`);
        results.push({ path, status: res.status, exposed: false });
      }
    } catch (err) {
      console.log(c.gray(`  [ERROR] ${path}`));
    }
    await delay(800);
  }
  return results;
}
module.exports = { scanPaths };