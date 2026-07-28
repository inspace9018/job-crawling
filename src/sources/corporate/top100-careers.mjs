// 100대 기업 — 공식 채용 홈페이지(기업 사이트) 수집. 포털 회사명 검색은 사용하지 않음.
import { readJson } from "../../util.mjs";
import { fetchWorkdayCorporate } from "./workday.mjs";
import { fetchGenericCorporateCareers } from "./generic-careers.mjs";
import { logTop100CompanyLine, printTop100Summary } from "../../crawl-log.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const DEFAULT_REGISTRY = "config/korea-top100-careers.json";

function normName(name) {
  return String(name || "").replace(/\s/g, "");
}

/** @param {object[]} extraFiles 추가 채용페이지 목록(유니콘 50 등) */
export function buildCareersRegistry(careersFile, profileCorporate = {}, extraFiles = []) {
  const byName = new Map();
  for (const e of careersFile.entries || []) {
    if (!e?.name) continue;
    byName.set(normName(e.name), e);
  }
  for (const f of extraFiles) {
    for (const e of f?.entries || []) {
      if (!e?.name) continue;
      byName.set(normName(e.name), e);
    }
  }
  for (const w of profileCorporate.workday || []) {
    if (!w?.company) continue;
    byName.set(normName(w.company), {
      name: w.company,
      platform: "workday",
      workday: w,
    });
  }
  return byName;
}

function designKeywords(profile, col) {
  const mk = profile?.match_keywords?.must_any || [];
  const sar = col?.saramin?.keywords || [];
  // '디자이너'는 '디자인'을 부분문자열로 포함하지 않는다(디자이+너 vs 디자+인).
  // 둘 다 넣지 않으면 "제품 디자이너" 같은 제목이 통째로 걸러진다.
  return [...new Set([...mk, ...sar, "디자인", "디자이너", "design", "designer", "산업디자인"])];
}

async function fetchOneEntry(entry, { keywords }) {
  if (entry.platform === "workday" && entry.workday) {
    const { jobs, fetchFailed, lastError } = await fetchWorkdayCorporate(entry.workday);
    if (fetchFailed && !jobs.length) throw new Error(lastError || "Workday 조회 실패");
    return jobs;
  }
  if ((entry.platform === "web" || !entry.platform) && entry.url) {
    return fetchGenericCorporateCareers({ name: entry.name, url: entry.url }, { keywords });
  }
  throw new Error("채용 홈페이지 설정 없음");
}

export async function fetchTop100CorporateCareers(companies, col, profile = {}) {
  const registryPath = col.companies_careers_file || DEFAULT_REGISTRY;
  const careersFile = await readJson(registryPath, { entries: [] });
  const extraCareers = [];
  for (const f of col.extra_careers_files || []) {
    extraCareers.push(await readJson(f, { entries: [] }));
  }
  const registry = buildCareersRegistry(careersFile, col.corporate_careers || {}, extraCareers);
  const keywords = designKeywords(profile, col);
  const list = companies.slice(0, col.company_search_max ?? companies.length);

  console.log(`■ 대기업·유니콘 공식 채용 홈페이지 (${list.length}곳 — 사람인/잡코리아/인크루트 회사 검색 안 함)`);

  const all = [];
  let total = 0;
  let ok = 0;
  let skip = 0;
  let fail = 0;
  const failLines = [];

  for (const company of list) {
    const entry = registry.get(normName(company));
    if (!entry) {
      skip++;
      logTop100CompanyLine(company, { corporate: { ok: false, skipped: true, count: 0, error: "미등록" } });
      continue;
    }

    try {
      const items = await fetchOneEntry(entry, { keywords });
      total += items.length;
      all.push(...items);
      ok++;
      logTop100CompanyLine(company, {
        corporate: { ok: true, count: items.length, url: entry.url || "workday" },
      });
    } catch (e) {
      fail++;
      const msg = String(e.message || "알 수 없는 오류").split("\n")[0].slice(0, 100);
      failLines.push(`${company} — ${msg}`);
      logTop100CompanyLine(company, { corporate: { ok: false, count: 0, error: msg } });
    }

    if (list.length > 25) await sleep(150);
  }

  printTop100Summary({
    companies: list.length,
    jobs: total,
    siteOk: ok,
    siteFail: fail,
    skipped: skip,
    failLines,
  });

  return all;
}
