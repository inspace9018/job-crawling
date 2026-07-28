// Workday 기업 자체 채용 — 공개 CXS JSON (로그인 불필요, 사이트마다 tenant/site 설정).
import { UA } from "../../util.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function postJobs(host, tenant, site, { searchText = "", offset = 0, limit = 20 } = {}) {
  const url = `${host}/wday/cxs/${tenant}/${site}/jobs`;
  const body = { appliedFacets: {}, limit, offset, searchText };
  const headers = {
    "User-Agent": UA,
    Accept: "application/json",
    "Content-Type": "application/json",
    Referer: `${host}/en-US/${site}`,
  };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    if (text.trimStart().startsWith("<")) throw new Error("HTML 응답(차단 또는 주소 변경)");
    return JSON.parse(text);
  } catch (e) {
    return postJobsViaPlaywright(url, body, headers, e.message);
  }
}

async function postJobsViaPlaywright(url, body, headers, priorErr) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    throw new Error(priorErr || "Workday 조회 실패");
  }
  const browser = await chromium.launch({ headless: true });
  try {
    const ctx = await browser.newContext({ userAgent: UA, ignoreHTTPSErrors: true });
    const res = await ctx.request.post(url, { data: body, headers });
    const text = await res.text();
    if (!res.ok()) throw new Error(`HTTP ${res.status()}`);
    if (text.trimStart().startsWith("<")) throw new Error("HTML 응답(차단 또는 주소 변경)");
    return JSON.parse(text);
  } finally {
    await browser.close();
  }
}

function normJob(posting, cfg, host) {
  const locale = cfg.locale || "en-US";
  const path = posting.externalPath || posting.externalUrl || "";
  const url = path.startsWith("http") ? path : `${host}/${locale}/${cfg.site}${path}`;
  const loc =
    posting.locationsText ||
    (posting.locations || []).map((l) => l.location).filter(Boolean).join(", ") ||
    posting.location ||
    "";
  const idPath = (path || posting.title || "").replace(/\s/g, "").slice(0, 80);
  return {
    source: "corporate_workday",
    id: `workday:${cfg.tenant}:${idPath}`,
    title: posting.title || "",
    company: cfg.company || cfg.tenant,
    url,
    location: loc,
    experience: "",
    education: "",
    etype: "",
    deadline: posting.postedOn || "",
    description: (posting.description || posting.jobDescription || "").slice(0, 2000),
    region: cfg.region || "KR",
    keyword: cfg.search_text_used || "",
  };
}

// cfg: { company, tenant, site, wd_server?, locale?, region?, search_texts[] }
export async function fetchWorkdayCorporate(cfg) {
  const wd = cfg.wd_server || "wd3";
  const host = `https://${cfg.tenant}.${wd}.myworkdayjobs.com`;
  const searches = cfg.search_texts?.length ? cfg.search_texts : ["design"];
  const maxPages = cfg.max_pages ?? 3;
  const out = [];
  const seen = new Set();
  let fetchFailed = false;
  let lastError = "";

  for (const searchText of searches) {
    for (let page = 0; page < maxPages; page++) {
      try {
        const j = await postJobs(host, cfg.tenant, cfg.site, {
          searchText,
          offset: page * 20,
          limit: 20,
        });
        const list = j.jobPostings || j.jobs || [];
        if (!list.length) break;
        for (const p of list) {
          const job = normJob(p, { ...cfg, search_text_used: searchText }, host);
          if (!job.title || seen.has(job.id)) continue;
          seen.add(job.id);
          out.push(job);
        }
        if (list.length < 20) break;
        await sleep(400);
      } catch (e) {
        if (page === 0) {
          fetchFailed = true;
          lastError = e.message;
        }
        break;
      }
    }
    await sleep(300);
  }
  return { jobs: out, fetchFailed, lastError };
}
