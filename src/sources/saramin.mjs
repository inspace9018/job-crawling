// 사람인(Saramin) 검색결과 수집기.
// 검색어로 검색 → 페이지별 HTML 파싱 → 표준 공고 객체 배열 반환.
// 표준 공고: { source, id, title, company, url, experience, location, etype, education, deadline, keyword }
import { fetchText, decodeEntities, stripTags } from "../util.mjs";

const BASE = "https://www.saramin.co.kr";

function parseItems(html, keyword) {
  const jobs = [];
  // 공고 블록 단위로 분리
  const parts = html.split('class="item_recruit"');
  for (let i = 1; i < parts.length; i++) {
    const block = parts[i].replace(/\s+/g, " ").slice(0, 6000); // 공백 정리 후 한 공고 분량

    const id = (block.match(/value="(\d+)"/) || [])[1];
    if (!id) continue;

    const titleM = block.match(/<h2 class="job_tit">\s*<a[^>]*\btitle="([^"]*)"[^>]*\bhref="([^"]*)"/);
    if (!titleM) continue;
    const title = decodeEntities(titleM[1]).trim();
    const url = BASE + decodeEntities(titleM[2]);

    // 회사명
    let company =
      (block.match(/class="corp_name"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/) || [])[1] ||
      (block.match(/class="corp_name"[^>]*>\s*([^<]+)</) || [])[1] ||
      "";
    company = decodeEntities(company).trim();

    // 근무조건(지역/경력/학력/고용형태) — job_condition 안의 span들
    const condBlock = (block.match(/class="job_condition">([\s\S]*?)<\/div>/) || [])[1] || "";
    const conds = [...condBlock.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/g)].map((m) => stripTags(m[1])).filter(Boolean);
    const location = conds[0] || "";
    const experience = conds.find((c) => /경력|신입|무관/.test(c)) || "";
    const education = conds.find((c) => /졸|학력|고졸|초대졸/.test(c)) || "";
    const etype = conds.find((c) => /정규|계약|인턴|파견|프리|아르바이트/.test(c)) || "";

    // 마감일
    const deadline = stripTags((block.match(/class="date">([^<]*)</) || [])[1] || "");

    jobs.push({
      source: "saramin",
      id: `saramin:${id}`,
      title,
      company,
      url,
      location,
      experience,
      education,
      etype,
      deadline,
      keyword,
    });
  }
  return jobs;
}

// 특정 회사(대기업 등) 타깃 수집: "회사명 디자인"으로 검색 후 실제 그 회사 공고만 남긴다.
export async function fetchSaraminByCompany(company, { pages = 1 } = {}) {
  const items = await fetchSaramin(`${company} 디자인`, { pages });
  const norm = company.replace(/\s/g, "");
  return items.filter((j) => (j.company || "").replace(/\s/g, "").includes(norm));
}

// 공고 상세 본문 수집(JS 아이프레임 대신 view-detail 엔드포인트 사용).
// rec_idx 또는 "saramin:NNNN" 모두 허용. { text, salary } 반환.
export async function fetchSaraminDetail(idOrRecIdx) {
  const recIdx = String(idOrRecIdx).replace(/^saramin:/, "");
  const url = `${BASE}/zf_user/jobs/relay/view-detail?rec_idx=${recIdx}`;
  const html = await fetchText(url, { headers: { Accept: "text/html,application/xhtml+xml" } });
  const text = stripTags(html).slice(0, 5000);
  // 연봉/급여 단서 추출(있을 때만)
  const sal = text.match(/(연봉|급여|월급)[^\d]{0,8}([\d,]{2,}\s*(만원|만|원|억)?)/);
  return { text, salary: sal ? sal[0].slice(0, 30) : "" };
}

// 동시 실행 수 제한 유틸(서버 예의 + 안정성).
export async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try {
        out[idx] = await fn(items[idx], idx);
      } catch {
        out[idx] = null;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// keyword 하나에 대해 pages 페이지까지 수집.
export async function fetchSaramin(keyword, { pages = 2, sort = "relation" } = {}) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const url =
      `${BASE}/zf_user/search/recruit?searchType=search&searchword=${encodeURIComponent(keyword)}` +
      `&recruitPage=${p}&recruitSort=${sort}&recruitPageCount=40`;
    try {
      const html = await fetchText(url, { headers: { Accept: "text/html,application/xhtml+xml" } });
      const items = parseItems(html, keyword);
      if (items.length === 0) break; // 더 없으면 중단
      out.push(...items);
    } catch (e) {
      console.error(`  [saramin] "${keyword}" p${p} 실패: ${e.message}`);
      break;
    }
  }
  return out;
}
