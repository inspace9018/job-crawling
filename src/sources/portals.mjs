// 10대 채용 포털 + 100대 기업 회사 검색 오케스트레이션.
import { fetchSaramin } from "./saramin.mjs";
import { fetchJobkorea } from "./jobkorea.mjs";
import { fetchIncruit } from "./incruit.mjs";
import { fetchWanted } from "./wanted.mjs";
import { fetchJobplanetAll } from "./jobplanet.mjs";
import { fetchWorknet } from "./worknet.mjs";
import { fetchRemember } from "./remember.mjs";
import { fetchJumpitAll } from "./jumpit.mjs";
import { fetchDesignrookie } from "./designrookie.mjs";
import { fetchLinkedinKeyword, fetchLinkedinOverseas } from "./linkedin.mjs";
import { fetchTop100CorporateCareers } from "./corporate/top100-careers.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const JOB_PORTALS = [
  { id: "saramin", name: "사람인" },
  { id: "jobkorea", name: "잡코리아" },
  { id: "incruit", name: "인크루트" },
  { id: "wanted", name: "원티드" },
  { id: "jobplanet", name: "잡플래닛" },
  { id: "linkedin_kr", name: "링크드인" },
  { id: "worknet", name: "워크넷" },
  { id: "remember", name: "리멤버" },
  { id: "jumpit", name: "점프잇" },
  { id: "designrookie", name: "디자인루키" },
];

/** 대시보드 data-src / job.source 키 (링크드인만 id와 다름) */
export const PORTAL_TO_JOB_SOURCE = { linkedin_kr: "linkedin" };

export function jobSourceForPortal(portalId) {
  return PORTAL_TO_JOB_SOURCE[portalId] || portalId;
}

export function enabledJobSources(col) {
  const p = col.job_portals || {};
  if (p.enabled === false) return [];
  return JOB_PORTALS.filter((portal) => {
    const one = p[portal.id];
    if (one && one.enabled === false) return false;
    return true;
  }).map((portal) => jobSourceForPortal(portal.id));
}

/** 대시보드 출처 필터 — 0건이어도 켜 둔 수집원은 버튼 표시 */
export function dashboardAlwaysShowSources(col) {
  const keys = [...enabledJobSources(col)];
  const push = (k) => {
    if (k && !keys.includes(k)) keys.push(k);
  };
  const ig = col.instagram_agencies || {};
  if (ig.enabled !== false) push("instagram_agency");
  return keys;
}

function portalOn(cfg, id) {
  const p = cfg.job_portals || {};
  if (p.enabled === false) return false;
  const one = p[id];
  if (one && one.enabled === false) return false;
  return true;
}

export async function fetchPortalKeywords(profile, col, keywords) {
  const all = [];
  const pcfg = col.job_portals || {};

  if (portalOn(col, "saramin")) {
    const sar = col.saramin;
    for (const kw of keywords) {
      const items = await fetchSaramin(kw, { pages: sar.pages_per_keyword ?? 2 });
      console.log(`  · 사람인 ${kw}: ${items.length}건`);
      all.push(...items);
    }
  }

  if (portalOn(col, "jobkorea")) {
    const pages = pcfg.jobkorea?.pages_per_keyword ?? 1;
    for (const kw of keywords) {
      const items = await fetchJobkorea(kw, { pages });
      console.log(`  · 잡코리아 ${kw}: ${items.length}건`);
      all.push(...items);
    }
  }

  if (portalOn(col, "incruit")) {
    const pages = pcfg.incruit?.pages_per_keyword ?? 1;
    for (const kw of keywords) {
      const items = await fetchIncruit(kw, { pages });
      console.log(`  · 인크루트 ${kw}: ${items.length}건`);
      all.push(...items);
    }
  }

  if (portalOn(col, "wanted")) {
    const w = await fetchWanted(col.wanted?.keywords || keywords, {
      limit: col.wanted?.limit_per_keyword ?? 40,
    });
    console.log(`  · 원티드: ${w.length}건`);
    all.push(...w);
  }

  if (portalOn(col, "jobplanet")) {
    const kws = pcfg.jobplanet?.keywords || keywords;
    const items = await fetchJobplanetAll(kws, { pages: pcfg.jobplanet?.pages ?? 1 });
    all.push(...items);
  }

  if (portalOn(col, "linkedin_kr")) {
    for (const kw of col.linkedin_kr?.keywords || keywords) {
      const items = await fetchLinkedinKeyword(kw, {
        pages: col.linkedin_kr?.pages_per_keyword ?? 1,
        location: col.linkedin_kr?.location || "South Korea",
        region: "KR",
      });
      console.log(`  · 링크드인 ${kw}: ${items.length}건`);
      all.push(...items);
      await sleep(500);
    }
  }

  if (portalOn(col, "worknet")) {
    const pages = pcfg.worknet?.pages_per_keyword ?? 1;
    for (const kw of keywords) {
      const items = await fetchWorknet(kw, { pages });
      console.log(`  · 워크넷 ${kw}: ${items.length}건`);
      all.push(...items);
    }
  }

  if (portalOn(col, "remember")) {
    const kws =
      pcfg.remember?.keywords || ["산업디자인", "제품디자인", "디자인", "product designer"];
    all.push(...(await fetchRemember(kws)));
  }

  if (portalOn(col, "jumpit")) {
    const kws = pcfg.jumpit?.keywords || ["디자인", "product designer", "design"];
    const items = await fetchJumpitAll(kws);
    console.log(`  · 점프잇: ${items.length}건`);
    all.push(...items);
  }

  if (portalOn(col, "designrookie")) {
    const dr = col.designrookie;
    const drAll = await fetchDesignrookie({ pages: dr.pages_all ?? 3, limit: dr.limit_per_page ?? 20 });
    const drProd = await fetchDesignrookie({
      pages: dr.pages_product_field ?? 2,
      limit: dr.limit_per_page ?? 20,
      jobFields: dr.product_job_fields || ["산업(제품)디자인"],
    });
    console.log(`  · 디자인루키: ${drAll.length + drProd.length}건`);
    all.push(...drAll, ...drProd);
  }

  if (profile.overseas?.enabled !== false && portalOn(col, "linkedin_kr")) {
    try {
      const o = await fetchLinkedinOverseas(col.linkedin_overseas?.locations, col.linkedin_overseas?.keywords, {
        pages: col.linkedin_overseas?.pages_per_keyword ?? 1,
      });
      console.log(`  · 링크드인(해외): ${o.length}건`);
      all.push(...o);
    } catch (e) {
      console.error(`  · 링크드인(해외) 실패: ${e.message}`);
    }
  }

  return all;
}

export async function fetchTop100CompanyJobs(companies, col, profile = {}) {
  return fetchTop100CorporateCareers(companies, col, profile);
}

// 사람인·잡코리아·인크루트·워크넷 등 "공용 키워드" 포털에 넘길 검색어.
// config/search-settings.json 의 saramin.keywords + match_keywords.must_any 를 그대로 합친 것 —
// 특정 직무(산업디자인 등)를 강제로 끼워 넣지 않으므로, 직무를 바꿔도 config만 고치면 그대로 반영된다.
export function resolveSearchKeywords(profile, col) {
  const mk = profile.match_keywords?.must_any || [];
  const sar = col.saramin?.keywords || [];
  return [...new Set([...sar, ...mk])];
}

export function resolveCompanyList(profile, col, top100File) {
  const fromFile = top100File?.companies || [];
  const extra = col.saramin?.company_names || [];
  const hints = profile.target_companies_hint || [];
  const useTop = col.use_top100_companies !== false;
  const merged = useTop ? [...fromFile, ...extra, ...hints] : [...extra, ...hints];
  const seen = new Set();
  const out = [];
  for (const name of merged) {
    const k = (name || "").replace(/\s/g, "");
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(name);
  }
  return out;
}
