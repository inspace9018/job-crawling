// 채용 URL DNS·HTTP 접속 확인 (회사당 새 요청, 순차)
import { readFile } from "node:fs/promises";
import dns from "node:dns/promises";
import { URL } from "node:url";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
// 200을 주면서 내용은 오류인 페이지를 걸러내기 위한 제목 신호
const ERROR_PAGE = /올바르지 않은 곳|페이지를 찾을 수 없|찾을 수 없습니다|not found|404|error/i;

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
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml,*/*" },
    });
    if (res.status >= 400) {
      results.fail.push({ name: e.name, url: e.url, err: `HTTP ${res.status}` });
    } else {
      // 200을 주면서 실제로는 오류 페이지인 곳이 있다(예: *.recruit.roundhr.com 은
      // 존재하지 않는 회사 이름에도 200 + "올바르지 않은 곳에 접근했습니다"를 돌려준다).
      const html = await res.text();
      const title = ((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
      if (ERROR_PAGE.test(title)) {
        results.fail.push({ name: e.name, url: e.url, err: `오류 페이지(200): ${title.slice(0, 40)}` });
      } else if (html.length < 500) {
        results.fail.push({ name: e.name, url: e.url, err: `내용 거의 없음(${html.length}자)` });
      } else {
        results.ok.push(e.name);
      }
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
