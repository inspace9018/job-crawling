// 메인 실행기 — 10대 채용 포털 + 100대 기업 + 기업 Workday 등.
import { readJson } from "../src/util.mjs";
import { loadProfile } from "../src/profile.mjs";
import { fetchSaraminDetail, mapLimit } from "../src/sources/saramin.mjs";
import { fetchAllCorporateCareers } from "../src/sources/corporate/index.mjs";
import { fetchInstagramAgencyJobs } from "../src/sources/instagram-agencies.mjs";
import {
  fetchPortalKeywords,
  fetchTop100CompanyJobs,
  resolveSearchKeywords,
  resolveCompanyList,
  JOB_PORTALS,
  dashboardAlwaysShowSources,
} from "../src/sources/portals.mjs";
import { rankJobs, scoreJob } from "../src/match.mjs";
import { markNewAndSave, logRun } from "../src/store.mjs";
import { renderHtml, renderMarkdown } from "../src/dashboard.mjs";
import { toast } from "../src/notify.mjs";
import { ensureRememberBeforeCrawl } from "../src/remember-prompt.mjs";
import { ensureJobplanetBeforeCrawl } from "../src/jobplanet-prompt.mjs";
import { ensureInstagramBeforeCrawl } from "../src/instagram-prompt.mjs";
import { ensureEnvironment } from "../src/setup-check.mjs";

const DEFAULT_COLLECTION = {
  score_floor: 40,
  use_top100_companies: true,
  companies_file: "config/korea-top100-companies.json",
  companies_careers_file: "config/korea-top100-careers.json",
  extra_companies_files: ["config/korea-unicorn50-companies.json"],
  extra_careers_files: ["config/korea-unicorn50-careers.json"],
  company_search_max: 150,
  job_portals: { enabled: true },
  saramin: { pages_per_keyword: 2, company_pages: 1, detail_top_n: 60 },
  wanted: { limit_per_keyword: 40 },
  linkedin_kr: { pages_per_keyword: 1, location: "South Korea" },
  linkedin_overseas: { pages_per_keyword: 1 },
  designrookie: { pages_all: 3, pages_product_field: 2, limit_per_page: 20, product_job_fields: ["산업(제품)디자인"] },
  corporate_careers: { enabled: true },
  instagram_agencies: {
    enabled: true,
    config_file: "config/design-agencies-instagram.json",
    domestic_only: true,
    max_posts_per_account: 12,
    auth_path: "data/instagram-auth.json",
  },
};

function collectionFrom(profile) {
  const c = profile.collection || {};
  return {
    score_floor: c.score_floor ?? DEFAULT_COLLECTION.score_floor,
    use_top100_companies: c.use_top100_companies ?? DEFAULT_COLLECTION.use_top100_companies,
    companies_file: c.companies_file ?? DEFAULT_COLLECTION.companies_file,
    companies_careers_file: c.companies_careers_file ?? DEFAULT_COLLECTION.companies_careers_file,
    extra_companies_files: c.extra_companies_files ?? DEFAULT_COLLECTION.extra_companies_files,
    extra_careers_files: c.extra_careers_files ?? DEFAULT_COLLECTION.extra_careers_files,
    company_search_max: c.company_search_max ?? DEFAULT_COLLECTION.company_search_max,
    job_portals: { ...DEFAULT_COLLECTION.job_portals, ...c.job_portals },
    saramin: { ...DEFAULT_COLLECTION.saramin, ...c.saramin },
    wanted: { ...DEFAULT_COLLECTION.wanted, ...c.wanted },
    linkedin_kr: { ...DEFAULT_COLLECTION.linkedin_kr, ...c.linkedin_kr },
    linkedin_overseas: { ...DEFAULT_COLLECTION.linkedin_overseas, ...c.linkedin_overseas },
    designrookie: { ...DEFAULT_COLLECTION.designrookie, ...c.designrookie },
    corporate_careers: { ...DEFAULT_COLLECTION.corporate_careers, ...c.corporate_careers },
    instagram_agencies: { ...DEFAULT_COLLECTION.instagram_agencies, ...c.instagram_agencies },
  };
}

async function main() {
  const env = await ensureEnvironment({ interactive: true, requirePlaywright: false });
  if (!env.ok) process.exit(1);

  const profile = await loadProfile();
  const col = collectionFrom(profile);

  console.log("");
  console.log("■ 리멤버·잡플래닛·Instagram 로그인 확인 (필요할 때만)");
  console.log("  비밀번호는 저장하지 않습니다. 로그인·Enter가 끝난 뒤에만 공고 검색을 시작합니다.");
  console.log("");

  const { skipRemember } = await ensureRememberBeforeCrawl(col);
  if (skipRemember) {
    col.job_portals = {
      ...col.job_portals,
      remember: { ...(col.job_portals.remember || {}), enabled: false },
    };
  }

  const { skipJobplanet } = await ensureJobplanetBeforeCrawl(col);
  if (skipJobplanet) {
    col.job_portals = {
      ...col.job_portals,
      jobplanet: { ...(col.job_portals.jobplanet || {}), enabled: false },
    };
    console.log("  (잡플래닛 수집은 이번 실행에서 제외됨)");
  }

  const { skipInstagram } = await ensureInstagramBeforeCrawl(col);
  if (skipInstagram) {
    col.instagram_agencies = { ...col.instagram_agencies, enabled: false };
    console.log("  (Instagram 에이전시 수집은 이번 실행에서 제외됨)");
  }

  console.log("");
  console.log("■ 로그인 확인 단계가 끝났습니다. 이제 공고 수집을 시작합니다.");
  console.log("");

  const top100 = await readJson(col.companies_file, { companies: [] });
  const extraCompanyFiles = [];
  for (const f of col.extra_companies_files || []) {
    extraCompanyFiles.push(await readJson(f, { companies: [] }));
  }
  const companies = resolveCompanyList(profile, col, top100, extraCompanyFiles).slice(
    0,
    col.company_search_max ?? 150
  );
  const keywords = resolveSearchKeywords(profile, col);

  const portalNames = JOB_PORTALS.map((p) => p.name).join(" · ");
  console.log(`■ 수집 시작 — 10대 포털: ${portalNames}`);

  const all = [];

  console.log("■ 키워드 검색 (전 포털)");
  all.push(...(await fetchPortalKeywords(profile, col, keywords)));

  if (companies.length) {
    all.push(...(await fetchTop100CompanyJobs(companies, col, profile)));
  }

  try {
    console.log("■ 기업 자체 채용 (Workday · Greenhouse · Lever · 선택 Google)");
    all.push(...(await fetchAllCorporateCareers(col.corporate_careers || {})));
  } catch (e) {
    console.error(`  · 기업 채용 수집 실패: ${e.message}`);
  }

  try {
    const igCfg = col.instagram_agencies || {};
    if (igCfg.enabled !== false) {
      console.log("■ 디자인 에이전시 Instagram (채용·모집 게시물)");
      all.push(...(await fetchInstagramAgencyJobs(igCfg)));
    }
  } catch (e) {
    console.error(`  · Instagram 수집 실패: ${e.message}`);
  }

  const byId = new Map();
  for (const j of all) if (!byId.has(j.id)) byId.set(j.id, j);
  const sigs = new Set();
  const unique = [];
  for (const j of byId.values()) {
    const sig = (j.company + "|" + j.title).replace(/\s/g, "");
    if (sigs.has(sig)) continue;
    sigs.add(sig);
    unique.push(j);
  }
  console.log(`■ 수집 ${all.length} → 중복제거 후 ${unique.length}건`);

  const detailN = col.saramin?.detail_top_n ?? 60;
  const pre = unique
    .map((j) => ({ job: j, s: scoreJob(j, profile).score }))
    .sort((a, b) => b.s - a.s)
    .slice(0, detailN)
    .map((p) => p.job)
    .filter((j) => j.id.startsWith("saramin:"));
  console.log(`■ 상세 본문 수집(사람인): 상위 ${pre.length}건 …`);
  let okDetail = 0;
  await mapLimit(pre, 4, async (j) => {
    const d = await fetchSaraminDetail(j.id);
    if (d) {
      j.description = d.text;
      if (d.salary) j.salary = d.salary;
      okDetail++;
    }
  });
  console.log(`  · 본문 확보 ${okDetail}/${pre.length}건`);

  const floor = col.score_floor ?? 40;
  const ranked = rankJobs(unique, profile, { floor });
  console.log(`■ 적합도 ${floor}점 이상: ${ranked.length}건`);

  const fresh = await markNewAndSave(ranked);
  const sourceLabel = JOB_PORTALS.map((p) => p.name).join("·") + "·기업채용";
  const htmlPath = await renderHtml(ranked, fresh, {
    sources: sourceLabel,
    salaryMin: profile.salary?.min_manwon,
    companySearchList: companies,
    unicornList: extraCompanyFiles.flatMap((f) => f?.companies || []),
    companySearchNote: top100._source || top100._README || "",
    alwaysShowSources: dashboardAlwaysShowSources(col),
  });
  const mdPath = await renderMarkdown(fresh, ranked);
  await logRun({ collected: all.length, unique: unique.length, ranked: ranked.length, fresh: fresh.length });

  if (fresh.length) {
    const t = fresh[0];
    const msg = await toast(`새 맞춤 공고 ${fresh.length}건`, `최고 ${t.score}점 · ${t.title} (${t.company})`);
    console.log(`■ 알림: ${msg}`);
  }
  console.log(`■ 완료 — 새 공고 ${fresh.length}건 · ${htmlPath} · ${mdPath}`);
}

main().catch((e) => {
  console.error("실행 오류:", e);
  process.exit(1);
});
