// 공식 채용 페이지(HTML) — 링크·JSON-LD에서 디자인 관련 공고 추출
import { fetchText, stripTags, decodeEntities } from "../../util.mjs";

const DEFAULT_KW = [
  "디자인",
  "design",
  "designer",
  "industrial",
  "product",
  "cmf",
  "ux",
  "ui",
  "creative",
  "브랜드",
];

function absUrl(href, base) {
  try {
    return new URL(href, base).href;
  } catch {
    return "";
  }
}

function looksLikeJobLink(href, title) {
  const s = `${href} ${title}`.toLowerCase();
  if (/login|signin|sign-in|privacy|policy|javascript:|mailto:/.test(s)) return false;
  return /recruit|career|job|채용|posting|position|공고|vacancy|apply|지원|announce|opening|req\//i.test(s);
}

function matchesKeywords(text, keywords) {
  const hay = text.toLowerCase();
  return keywords.some((k) => hay.includes(String(k).toLowerCase()));
}

function parseJsonLdJobs(html, company, baseUrl, keywords) {
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch {
      continue;
    }
    const nodes = Array.isArray(data) ? data : [data];
    for (const node of nodes) {
      const list = node["@graph"] || [node];
      for (const item of list) {
        if (item["@type"] !== "JobPosting") continue;
        const title = item.title || "";
        if (!title || !matchesKeywords(title + (item.description || ""), keywords)) continue;
        const url = absUrl(item.url || item.hiringOrganization?.sameAs || "", baseUrl);
        const id = url || `corpweb:${company}:${title}`;
        if (seen.has(id)) continue;
        seen.add(id);
        out.push({
          source: "corporate_web",
          id: `corpweb:${id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 56)}`,
          title: decodeEntities(title),
          company,
          url: url || baseUrl,
          location: item.jobLocation?.address?.addressLocality || "",
          experience: "",
          education: "",
          etype: item.employmentType || "",
          deadline: item.validThrough || "",
          description: String(item.description || "").slice(0, 1500),
          region: "KR",
          keyword: "official-careers",
        });
      }
    }
  }
  return out;
}

function parseAnchorJobs(html, company, baseUrl, keywords) {
  const out = [];
  const seen = new Set();
  for (const m of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = m[1].trim();
    const title = stripTags(m[2]);
    if (!title || title.length < 4 || title.length > 160) continue;
    if (!looksLikeJobLink(href, title)) continue;
    if (!matchesKeywords(`${title} ${href}`, keywords)) continue;
    const url = absUrl(href, baseUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push({
      source: "corporate_web",
      id: `corpweb:${url.replace(/[^a-zA-Z0-9]/g, "").slice(0, 56)}`,
      title: decodeEntities(title),
      company,
      url,
      location: "",
      experience: "",
      education: "",
      etype: "",
      deadline: "",
      description: "",
      region: "KR",
      keyword: "official-careers",
    });
  }
  return out;
}

/** @param {{ name: string, url: string }} entry */
export async function fetchGenericCorporateCareers(entry, { keywords } = {}) {
  const kws = keywords?.length ? keywords : DEFAULT_KW;
  let html;
  try {
    html = await fetchText(entry.url, { timeoutMs: 22000, retries: 1 });
  } catch {
    html = await fetchHtmlViaPlaywright(entry.url);
  }
  if (!html) return [];
  const fromLd = parseJsonLdJobs(html, entry.name, entry.url, kws);
  const fromA = parseAnchorJobs(html, entry.name, entry.url, kws);
  const seen = new Set();
  const out = [];
  for (const j of [...fromLd, ...fromA]) {
    if (seen.has(j.url)) continue;
    seen.add(j.url);
    out.push(j);
  }
  return out;
}

async function fetchHtmlViaPlaywright(url) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error("Playwright 없음");
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 70000 });
    await page.waitForTimeout(2000);
    return await page.content();
  } finally {
    await browser.close();
  }
}
