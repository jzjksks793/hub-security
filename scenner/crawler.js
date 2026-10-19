const c = require("../colors");

async function crawl(baseUrl, maxDepth = 2, maxUrls = 15) {
  console.log(c.cyan(`\n[*] Menjelajahi website (Crawler, kedalaman maks ${maxDepth})...`));
  const visited = new Set();
  const paramUrls = new Set();
  const queue = [{ url: baseUrl, depth: 0 }];
  
  while (queue.length > 0 && visited.size < 30) {
    const { url, depth } = queue.shift();
    if (visited.has(url)) continue;
    visited.add(url);
    
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const body = await res.text();
      
      if (url.includes("?")) paramUrls.add(url);
      
      if (depth < maxDepth) {
        const regex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']+)["']/gi;
        let match;
        while ((match = regex.exec(body)) !== null) {
          let href = match[1];
          if (href.startsWith('/')) href = new URL(href, baseUrl).href;
          
          if (href.startsWith(baseUrl) && !visited.has(href)) {
            queue.push({ url: href, depth: depth + 1 });
          }
        }
      }
    } catch (e) {
      // Abaikan error saat crawl
    }
  }
  
  const links = Array.from(paramUrls).slice(0, maxUrls);
  console.log(c.green(`  [OK] Crawler selesai. Ditemukan ${links.length} URL berparameter untuk di-scan.`));
  return links;
}

module.exports = { crawl };