// 잡플래닛(JobPlanet) — 로그인 쿠키 + 필요 시 Playwright HTML 수집.
import { existsSync } from "node:fs";
import { fetchText, stripTags, decodeEntities, UA } from "../util.mjs";
import { jobplanetCookieHeader, DEFAULT_AUTH_PATH } from "../jobplanet-auth.mjs";
import { touchAuthExpiry, saveContextAuth, readSessionCookieDays } from "../session-store.mjs";

const BASE = "https://www.jobplanet.co.kr";

function parseJobplanetHtml(html, keyword) {
  const jobs = [];
  const seen = new Set();
  const patterns = [
    /\/companies\/(\d+)\/job_postings\/(\d+)/g,
    /\/job_postings\/(\d+)/g,
  ];
  for (const re of patterns) {
    for (const m of html.matchAll(re)) {
      const postingId = re === patterns[0] ? m[2] : m[1];
      const companyId = re === patterns[0] ? m[1] : "";
      if (!postingId || seen.has(postingId)) continue;
      seen.add(postingId);
      const idx = m.index ?? 0;
      const chunk = html.slice(Math.max(0, idx - 200), idx + 2500);
      let title = stripTags(
        chunk.match(/class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\//i)?.[1] ||
          chunk.match(/alt="([^"]{4,120})"/)?.[1] ||
          chunk.match(/"title"\s*:\s*"([^"]{4,200})"/)?.[1] ||
          ""
      );
      if (!title) {
        const t2 = chunk.match(/>([^<]{4,100})<\/a>/);
        title = t2 ? stripTags(t2[1]) : "채용공고";
      }
      const url = companyId
        ? `${BASE}/companies/${companyId}/job_postings/${postingId}`
        : `${BASE}/job_postings/${postingId}`;
      jobs.push({
        source: "jobplanet",
        id: `jobplanet:${postingId}`,
        title: decodeEntities(title),
        company: "",
        url,
        location: "",
        experience: "",
        education: "",
        etype: "",
        deadline: "",
        keyword,
      });
    }
  }
  return jobs;
}

export async function fetchJobplanet(keyword, { page = 1, cookieHeader } = {}) {
  const cookie = cookieHeader ?? (await jobplanetCookieHeader());
  const url = `${BASE}/job/search?query=${encodeURIComponent(keyword)}&page=${page}`;
  const headers = { Accept: "text/html", Referer: `${BASE}/job` };
  if (cookie) headers.Cookie = cookie;
  try {
    const html = await fetchText(url, { headers });
    return parseJobplanetHtml(html, keyword);
  } catch (e) {
    const msg = e.message || "";
    if (msg.includes("403")) {
      console.error(`  [jobplanet] "${keyword}" 실패: HTTP 403 — 로그인 필요`);
    } else {
      console.error(`  [jobplanet] "${keyword}" 실패: ${msg}`);
    }
    return [];
  }
}

async function fetchJobplanetViaPlaywright(keywords, { pages = 1, authPath = DEFAULT_AUTH_PATH } = {}) {
  if (!existsSync(authPath)) return [];
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  const out = [];
  const seen = new Set();
  try {
    const context = await browser.newContext({ storageState: authPath, userAgent: UA, locale: "ko-KR" });
    const page = await context.newPage();
    for (const kw of keywords) {
      for (let p = 1; p <= pages; p++) {
        const u = `${BASE}/job/search?query=${encodeURIComponent(kw)}&page=${p}`;
        try {
          await page.goto(u, { waitUntil: "domcontentloaded", timeout: 60000 });
          await page.waitForTimeout(2500);
          const html = await page.content();
          for (const j of parseJobplanetHtml(html, kw)) {
            if (!seen.has(j.id)) {
              seen.add(j.id);
              out.push(j);
            }
          }
        } catch (e) {
          console.error(`  [jobplanet] 브라우저 "${kw}" p${p}: ${e.message}`);
        }
      }
    }
    const days = await readSessionCookieDays();
    await saveContextAuth(context, authPath, { domainIncludes: "jobplanet", days });
  } finally {
    await browser.close();
  }
  return out;
}

export async function fetchJobplanetAll(keywords = [], { pages = 1, authPath = DEFAULT_AUTH_PATH } = {}) {
  const cookieHeader = await jobplanetCookieHeader(authPath);
  const hasAuth = existsSync(authPath) && cookieHeader.length >= 12;

  if (hasAuth) {
    console.log("  [jobplanet] 로그인 세션 → 브라우저로 검색합니다.");
    const via = await fetchJobplanetViaPlaywright(keywords, { pages, authPath });
    console.log(`  · 잡플래닛: ${via.length}건`);
    if (via.length > 0) await touchAuthExpiry(authPath, "jobplanet").catch(() => {});
    return via;
  }

  const out = [];
  const seen = new Set();
  for (const kw of keywords) {
    for (let p = 1; p <= pages; p++) {
      const items = await fetchJobplanet(kw, { page: p, cookieHeader });
      for (const j of items) {
        if (!seen.has(j.id)) {
          seen.add(j.id);
          out.push(j);
        }
      }
      if (!items.length && p === 1) break;
    }
  }

  console.log(`  · 잡플래닛: ${out.length}건`);
  if (out.length === 0) {
    console.log("  [jobplanet] 로그인 없음 → `잡플래닛로그인.cmd` 실행 후 다시 시도해 주세요.");
  }
  return out;
}
