const c = require("../colors");

const IMPORTANT_HEADERS = [
  { name: "Strict-Transport-Security", why: "Memaksa HTTPS." },
  { name: "X-Frame-Options", why: "Anti clickjacking." },
  { name: "X-Content-Type-Options", why: "Anti MIME-sniffing." },
  { name: "Content-Security-Policy", why: "Mitigasi XSS." },
  { name: "Referrer-Policy", why: "Membatasi info referrer." },
  { name: "Permissions-Policy", why: "Membatasi fitur browser." },
];

async function scanHeaders(targetUrl) {
  console.log(c.cyan("\n[*] Memeriksa header keamanan..."));
  const results = [];
  try {
    const res = await fetch(targetUrl, { method: "GET", redirect: "follow" });
    for (const item of IMPORTANT_HEADERS) {
      const value = res.headers.get(item.name.toLowerCase());
      if (value) {
        console.log(`  ${c.green("[OK]")}  ${item.name}: ${c.gray(value)}`);
        results.push({ header: item.name, present: true, value });
      } else {
        console.log(`  ${c.red("[MISSING]")}  ${item.name}`);
        results.push({ header: item.name, present: false });
      }
    }
  } catch (err) {
    console.log(c.red(`  [ERROR] Gagal mengambil header: ${err.message}`));
  }
  return results;
}
module.exports = { scanHeaders };