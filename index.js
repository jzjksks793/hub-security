#!/usr/bin/env node
const readline = require("readline");
const crypto = require("crypto");
const fs = require("fs");
const c = require("./colors");
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
  const rawInput = await ask(c.bold_("Masukkan URL target (contoh: https://domain-anda.com): "));
  if (!rawInput) process.exit(0);

  const domain = rawInput.replace(/^https?:\/\//, "").replace(/\/+$/, "").toLowerCase();
  const targetUrl = `https://${domain}`;

  // === MODE LOKAL: Bikin token sendiri tanpa server ===
  console.log(c.cyan(`\n[*] Membuat token verifikasi LOKAL untuk: ${domain}...`));
  const token = "pt-sec-" + crypto.randomBytes(6).toString("hex");

  console.log(c.green("\n[+] Token berhasil dibuat."));
  console.log(c.bold_("\nLangkah verifikasi kepemilikan domain:"));
  console.log(`  1. Buat file bernama ${c.cyan("security-pem.txt")} di root website Anda.`);
  console.log(`  2. Isi file tersebut dengan token berikut (tanpa spasi):\n`);
  console.log(`     ${c.neonGreen(token)}\n`);
  console.log(`  3. Pastikan file bisa diakses publik di: ${c.gray(`${targetUrl}/security-pem.txt`)}`);

  await ask(c.bold_("\nTekan ENTER setelah file sudah diunggah untuk memulai verifikasi..."));

  console.log(c.cyan("\n[*] Memverifikasi kepemilikan domain..."));
  let verified = false;
  try {
    const res = await fetch(`${targetUrl}/security-pem.txt`, { cf: { cacheTtl: 0 } });
    if (res.ok) {
      const text = (await res.text()).trim();
      if (text === token) verified = true;
    }
  } catch (e) {
    console.log(c.red(`[ERROR] Gagal mengambil file verifikasi: ${e.message}`));
  }

  if (!verified) {
    console.log(c.red(`\n[GAGAL] Verifikasi tidak berhasil. Pastikan file security-pem.txt ada dan isinya benar.`));
    rl.close();
    return;
  }

  console.log(c.green("\n[OK] Domain terverifikasi! Memulai pemindaian keamanan...\n"));
  console.log(c.gray("=".repeat(62)));

  const headerResults = await scanHeaders(targetUrl);
  const pathResults = await scanPaths(targetUrl);
  
  // Crawler & Scan
  const urlsToScan = [targetUrl, ...(await crawl(targetUrl))];
  const findings = [];
  for (const url of urlsToScan) {
    const sqliRes = await scanSqli(url);
    const xssRes = await scanXss(url);
    if (sqliRes.length) findings.push(...sqliRes.map(r => ({ ...r, url, category: "sqli" })));
    if (xssRes.length) findings.push(...xssRes.map(r => ({ ...r, url, category: "xss" })));
  }

  const missingHeaders = headerResults.filter((h) => !h.present).length;
  const exposedPaths = pathResults.filter((p) => p.exposed).length;
  let riskScore = (missingHeaders * 2) + (exposedPaths * 5) + (findings.length * 10);

  console.log(c.gray("\n" + "=".repeat(62)));
  console.log(c.bold_("\nRINGKASAN HASIL PEMINDAIAN"));
  console.log(c.gray("-".repeat(62)));
  console.log(`  Header keamanan hilang   : ${missingHeaders > 0 ? c.red(missingHeaders) : c.green(0)}`);
  console.log(`  Path/file sensitif bocor : ${exposedPaths > 0 ? c.red(exposedPaths) : c.green(0)}`);
  console.log(`  Total Celah (SQLi/XSS)   : ${findings.length > 0 ? c.red(findings.length) : c.green(0)}`);
  console.log(`  Risk Score               : ${riskScore > 30 ? c.red(riskScore + "/100") : c.yellow(riskScore + "/100")}`);

  const reportId = `report-${domain}-${Date.now()}`;
  const reportData = { domain, scannedAt: new Date().toISOString(), riskScore, findings };
  fs.writeFileSync(`${reportId}.json`, JSON.stringify(reportData, null, 2));
  console.log(c.green(`\n[OK] Laporan disimpan ke: ${reportId}.json`));

  rl.close();
}

main().catch((err) => {
  console.error(c.red(err.message));
  rl.close();
  process.exit(1);
});