#!/usr/bin/env node
const fs = require("fs");
const readline = require("readline");
const c = require("./colors");
const { requestToken, checkVerification } = require("./api");
const { scanHeaders } = require("./scanner/headers");
const { scanPaths } = require("./scanner/paths");
const { scanSqli } = require("./scanner/sqli");
const { scanXss } = require("./scanner/xss");
const { crawl } = require("./scanner/crawler");

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((r) => rl.question(q, (a) => r(a.trim())));

function printBanner() {
  console.log(`
${c.neonBlue("  _    _ _    _ ____     ___  _____")}
${c.neonBlue(" | |  | | |  | |  _ \\   / _ \\|_   _|")}
${c.neonBlue(" | |__| | |  | | |_) | | |_| | | |  ")}
${c.neonBlue(" |  __  | |  | |  _ <  |  _  | | |  ")}
${c.neonBlue(" | |  | | |__| | |_) | | | | | | |  ")}
${c.neonBlue(" |_|  |_|\\____/|____/  |_| |_| |_|  ")}
${c.neonGreen("        A I   S E C U R I T Y")}
${c.gray("             (PT STORE)")}
`);
  console.log(c.yellow("  PERINGATAN: Gunakan HANYA pada domain yang Anda miliki!\n"));
}

async function main() {
  printBanner();
  const rawInput = await ask(c.bold_("Masukkan URL target: "));
  if (!rawInput) process.exit(0);

  const domain = rawInput.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
  const targetUrl = `https://${domain}`;

  console.log(c.cyan(`\n[*] Meminta token untuk: ${domain}...`));
  const tokenResp = await requestToken(domain);
  if (!tokenResp.success) { console.log(c.red(`Error: ${tokenResp.message}`)); process.exit(1); }

  console.log(c.green("\n[+] Token dibuat. Ikuti instruksi ini:"));
  console.log(`  1. Buat file ${c.cyan("security-pem.txt")} di root web kamu.`);
  console.log(`  2. Isi dengan: ${c.neonGreen(tokenResp.token)}`);
  console.log(`  3. Upload ke: ${targetUrl}/security-pem.txt`);
  
  await ask(c.bold_("\nTekan ENTER jika sudah diunggah..."));
  const verify = await checkVerification(domain);
  if (!verify.verified) { console.log(c.red(`Gagal: ${verify.message}`)); process.exit(1); }

  console.log(c.green("\n[OK] Domain terverifikasi. Memulai Deep Scan...\n"));
  
  const findings = [];
  const headerRes = await scanHeaders(targetUrl);
  const pathRes = await scanPaths(targetUrl);
  
  // Crawl dulu, baru scan SQLi/XSS di URL hasil crawl
  const urlsToScan = [targetUrl, ...(await crawl(targetUrl))];
  for (const url of urlsToScan) {
    const sqliRes = await scanSqli(url);
    const xssRes = await scanXss(url);
    if (sqliRes.length) findings.push(...sqliRes.map(r => ({ ...r, url, category: "sqli" })));
    if (xssRes.length) findings.push(...xssRes.map(r => ({ ...r, url, category: "xss" })));
  }

  // Hitung skor risiko
  const missedHeaders = headerRes.filter(h => !h.present).length;
  const exposedPaths = pathRes.filter(p => p.exposed).length;
  let riskScore = (missedHeaders * 2) + (exposedPaths * 5) + (findings.length * 10);
  
  console.log(c.gray("\n" + "=".repeat(62)));
  console.log(c.bold_("\nRINGKASAN HASIL"));
  console.log(`  Header hilang      : ${missedHeaders > 0 ? c.red(missedHeaders) : c.green(0)}`);
  console.log(`  File sensitif bocor: ${exposedPaths > 0 ? c.red(exposedPaths) : c.green(0)}`);
  console.log(`  Total Celah (SQLi/XSS): ${findings.length > 0 ? c.red(findings.length) : c.green(0)}`);
  console.log(`  Risk Score         : ${riskScore > 30 ? c.red(riskScore + "/100") : c.yellow(riskScore + "/100")}`);

  // Simpan Laporan
  const reportId = `report-${domain}-${Date.now()}`;
  const reportData = { domain, scannedAt: new Date().toISOString(), riskScore, missedHeaders, exposedPaths, findings };
  
  fs.writeFileSync(`${reportId}.json`, JSON.stringify(reportData, null, 2));
  console.log(c.green(`\n[OK] Laporan detail disimpan ke: ${reportId}.json`));
  
  rl.close();
}

main().catch(err => { console.error(c.red(err.message)); process.exit(1); });