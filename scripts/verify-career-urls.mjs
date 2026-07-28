// 채용 URL DNS·HTTP 접속 확인 (회사당 새 요청, 순차)
import { readFile } from "node:fs/promises";
import dns from "node:dns/promises";
import { URL } from "node:url";

const file = process.argv[2] || "config/korea-top100-careers.json";
const data = JSON.parse(await readFile(file, "utf8"));
const entries = (data.entries || []).filter((e) => e.url);

const results = { ok: [], fail: [] };

for (const e of entries) {
  const u = new URL(e.url);
  let hostOk = false;
  try {
    await dns.lookup(u.hostname);
    hostOk = true;
  } catch (err) {
    results.fail.push({ name: e.name, url: e.url, err: `DNS: ${err.code || err.message}` });
    continue;
  }
  try {
    const res = await fetch(e.url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) job_crawling-verify" },
    });
    if (res.status >= 400) {
      results.fail.push({ name: e.name, url: e.url, err: `HTTP ${res.status}` });
    } else {
      results.ok.push(e.name);
    }
  } catch (err) {
    results.fail.push({ name: e.name, url: e.url, err: err.message?.slice(0, 80) || String(err) });
  }
  await new Promise((r) => setTimeout(r, 200));
}

console.log(`OK ${results.ok.length} / ${entries.length}`);
for (const f of results.fail) {
  console.log(`FAIL\t${f.name}\t${f.url}\t${f.err}`);
}
