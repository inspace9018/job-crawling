// 재수집 없이 저장된 데이터(data/jobs_latest.json)로 대시보드/요약만 다시 생성.
// 디자인 수정 후 빠른 미리보기에 사용.
import { readJson } from "../src/util.mjs";
import { loadProfile } from "../src/profile.mjs";
import { renderHtml, renderMarkdown } from "../src/dashboard.mjs";
import { resolveCompanyList, dashboardAlwaysShowSources } from "../src/sources/portals.mjs";

const profile = await loadProfile();
const col = profile.collection || {};
const top100 = await readJson(col.companies_file || "config/korea-top100-companies.json", { companies: [] });
const companies = resolveCompanyList(profile, col, top100).slice(0, col.company_search_max ?? 100);

const d = await readJson("data/jobs_latest.json", { jobs: [] });
const ranked = d.jobs || [];
const fresh = ranked.filter((j) => j.is_new);
const html = await renderHtml(ranked, fresh, {
  sources: "사람인·원티드·링크드인·디자인루키",
  salaryMin: profile.salary?.min_manwon,
  companySearchList: companies,
  companySearchNote: top100._source || top100._README || "",
  alwaysShowSources: dashboardAlwaysShowSources(col),
});
const md = await renderMarkdown(fresh, ranked);
console.log(`재생성 완료 — ${ranked.length}건(신규 ${fresh.length}) · ${html} · ${md}`);
