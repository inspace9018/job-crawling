// Instagram — 디자인 에이전시 프로필에서 채용·모집 게시물 수집 (Playwright + 선택 로그인 세션)
import { existsSync } from "node:fs";
import { readJson, UA, decodeEntities } from "../util.mjs";
import { DEFAULT_AUTH_PATH, isInstagramSessionValid } from "../instagram-auth.mjs";

const DEFAULT_CONFIG = "config/design-agencies-instagram.json";

const HIRING =
  /(채용|모집|구인|팀원\s*모집|디자이너\s*모집|함께\s*할|join\s*our\s*team|we['']?re\s*hiring|now\s*hiring|hiring|job\s*opening|open\s*role|recruit|careers?\s*@|포트폴리오\s*접수)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function titleFromCaption(caption, company) {
  const line = decodeEntities(String(caption || "").replace(/\s+/g, " ").trim());
  if (!line) return `${company} Instagram 채용 게시물`;
  const cut = line.split(/[.!?\n#]/)[0].trim();
  return (cut.length > 8 ? cut.slice(0, 120) : line.slice(0, 120)) || `${company} 채용`;
}

function postIdFromUrl(url) {
  const m = String(url).match(/\/(p|reel)\/([^/?#]+)/);
  return m ? m[2] : url.replace(/[^a-zA-Z0-9]/g, "").slice(0, 32);
}

async function scrapeProfile(page, agency, maxPosts) {
  const handle = agency.handle.replace(/^@/, "");
  const url = `https://www.instagram.com/${handle}/`;
  const company = agency.name_en ? `${agency.name} (${agency.name_en})` : agency.name;

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 55000 });
    await sleep(2500);
  } catch (e) {
    console.error(`  [instagram] @${handle} 페이지: ${e.message.split("\n")[0]}`);
    return [];
  }

  if (/accounts\/login|login\?/.test(page.url())) {
    console.error(`  [instagram] @${handle} — 로그인 필요 (인스타로그인.cmd 실행)`);
    return [];
  }

  const posts = await page.evaluate((limit) => {
    const out = [];
    const seen = new Set();
    for (const a of document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]')) {
      const href = a.href || "";
      if (!href || seen.has(href)) continue;
      seen.add(href);
      const label = a.getAttribute("aria-label") || a.textContent || "";
      out.push({ url: href.split("?")[0], caption: label.trim() });
      if (out.length >= limit) break;
    }
    return out;
  }, maxPosts);

  const jobs = [];
  for (const p of posts) {
    if (!HIRING.test(p.caption) && !HIRING.test(p.url)) continue;
    const pid = postIdFromUrl(p.url);
    jobs.push({
      source: "instagram_agency",
      id: `instagram:${handle}:${pid}`,
      title: titleFromCaption(p.caption, company),
      company,
      url: p.url,
      location: agency.region === "KR" ? "KR" : agency.region || "",
      experience: "",
      education: "",
      etype: "",
      deadline: "",
      description: p.caption.slice(0, 1500),
      region: agency.region === "GLOBAL" ? "GLOBAL" : "KR",
      keyword: `@${handle}`,
    });
  }
  return jobs;
}

/** domestic_only: true → region KR 만. region_scope: "KR" | "GLOBAL" | "all" */
export function filterInstagramAgencies(agencies, cfg = {}) {
  if (cfg.region_scope === "all" || cfg.domestic_only === false) return agencies;
  if (cfg.region_scope === "GLOBAL") return agencies.filter((a) => a.region === "GLOBAL");
  return agencies.filter((a) => (a.region || "KR") === "KR");
}

export async function fetchInstagramAgencyJobs(cfg = {}) {
  if (cfg.enabled === false) return [];

  const authPath = cfg.auth_path || DEFAULT_AUTH_PATH;
  if (!existsSync(authPath)) {
    console.log("  [instagram] 로그인 세션이 없습니다.");
    console.log("  → 공고 찾기 시작 전 `인스타로그인.cmd` 실행 또는 Y로 로그인 후 Enter 해 주세요.");
    return [];
  }
  if (!(await isInstagramSessionValid(authPath))) {
    console.log("  [instagram] 로그인 세션이 만료되었거나 확인되지 않습니다.");
    console.log("  → `인스타로그인.cmd` 실행 후 다시 공고 찾기를 해 주세요.");
    return [];
  }

  const configPath = cfg.config_file || DEFAULT_CONFIG;
  const file = await readJson(configPath, { agencies: [] });
  const allAgencies = file.agencies || [];
  const agencies = filterInstagramAgencies(allAgencies, cfg);
  if (!agencies.length) return [];

  const scope =
    cfg.region_scope === "all" || cfg.domestic_only === false
      ? "국내+해외"
      : cfg.region_scope === "GLOBAL"
        ? "해외"
        : "국내";

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log("  [instagram] Playwright 없음 — 건너뜀");
    return [];
  }

  const maxPosts = cfg.max_posts_per_account ?? 12;
  const delayMs = cfg.delay_ms ?? 1800;

  console.log(`  [instagram] ${scope} 에이전시 ${agencies.length}곳 (전체 ${allAgencies.length}곳, 계정당 ${maxPosts}개)`);

  const browser = await chromium.launch({ headless: true });
  const all = [];
  const seen = new Set();

  try {
    const ctxOpts = { userAgent: UA, locale: "ko-KR", ignoreHTTPSErrors: true };
    if (existsSync(authPath)) ctxOpts.storageState = authPath;
    const context = await browser.newContext(ctxOpts);
    const page = await context.newPage();

    for (const agency of agencies) {
      const items = await scrapeProfile(page, agency, maxPosts);
      for (const j of items) {
        if (seen.has(j.id)) continue;
        seen.add(j.id);
        all.push(j);
      }
      if (items.length) {
        console.log(`  · @${agency.handle.replace(/^@/, "")} (${agency.name}): 채용 게시 ${items.length}건`);
      }
      await sleep(delayMs);
    }

    if (existsSync(authPath)) {
      try {
        await context.storageState({ path: authPath });
      } catch {
        /* ignore */
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`  · Instagram 에이전시 합계: ${all.length}건`);
  return all;
}
