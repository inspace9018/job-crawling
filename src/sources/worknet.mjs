// 워크넷(고용24 / work24.go.kr) — 채용정보 검색 HTML.
import { fetchText, stripTags } from "../util.mjs";

const LIST =
  "https://www.work.go.kr/empInfo/empInfoSrch/list/dtlEmpSrchList.do";
const DETAIL = "https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do";

function parseList(html, keyword) {
  const jobs = [];
  const seen = new Set();

  for (const m of html.matchAll(/empDetailAuthView\.do\?wantedAuthNo=(\d+)[^>]*>([\s\S]*?)<\/a>/gi)) {
    const id = m[1];
    if (seen.has(id)) continue;
    seen.add(id);
    const title = stripTags(m[2]);
    if (!title) continue;
    jobs.push({
      source: "worknet",
      id: `worknet:${id}`,
      title,
      company: "",
      url: `${DETAIL}?wantedAuthNo=${id}`,
      location: "",
      experience: "",
      education: "",
      etype: "",
      deadline: "",
      keyword,
    });
  }

  // 회사명: 같은 블록 앞쪽 단서
  for (const j of jobs) {
    const idx = html.indexOf(j.id.split(":")[1]);
    if (idx < 0) continue;
    const block = html.slice(Math.max(0, idx - 200), idx + 400);
    const co = stripTags(block.match(/class="[^"]*cpn[^"]*"[^>]*>([^<]+)</i)?.[1] || "");
    if (co) j.company = co;
  }

  return jobs;
}

export async function fetchWorknet(keyword, { pages = 1 } = {}) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const url =
      `${LIST}?keyword=${encodeURIComponent(keyword)}&pageIndex=${p}&recordCountPerPage=40`;
    try {
      const html = await fetchText(url, {
        headers: { Referer: "https://www.work.go.kr", Accept: "text/html" },
      });
      const items = parseList(html, keyword);
      if (!items.length) break;
      out.push(...items);
    } catch (e) {
      console.error(`  [worknet] "${keyword}" p${p} 실패: ${e.message}`);
      break;
    }
  }
  return out;
}
