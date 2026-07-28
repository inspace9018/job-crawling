// 잡코리아(JobKorea) — 공개 검색 HTML 크롤링 (API 키 불필요).
import { fetchText, decodeEntities, stripTags } from "../util.mjs";

const BASE = "https://www.jobkorea.co.kr";

function parseList(html, keyword) {
  const jobs = [];
  const seen = new Set();

  // 최신 UI: shadow-list 카드
  const cards = html.split('class="shadow-list"');
  for (let i = 1; i < cards.length; i++) {
    const block = cards[i].slice(0, 8000);
    const gno = (block.match(/GI_Read\/(\d+)/) || block.match(/Gno=(\d+)/i) || [])[1];
    if (!gno || seen.has(gno)) continue;
    const anchors = [...block.matchAll(/<a[^>]*href="[^"]*GI_Read[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)];
    const texts = anchors.map((m) => stripTags(m[1])).filter(Boolean);
    if (!texts.length) continue;
    seen.add(gno);
    jobs.push({
      source: "jobkorea",
      id: `jobkorea:${gno}`,
      title: texts[0],
      company: texts[1] || "",
      url: `${BASE}/Recruit/GI_Read/${gno}`,
      location: "",
      experience: "",
      education: "",
      etype: "",
      deadline: "",
      keyword,
    });
  }

  // fallback: 페이지 내 GI_Read 링크만
  if (!jobs.length) {
    for (const m of html.matchAll(/GI_Read\/(\d+)/g)) {
      const gno = m[1];
      if (seen.has(gno)) continue;
      seen.add(gno);
      jobs.push({
        source: "jobkorea",
        id: `jobkorea:${gno}`,
        title: "채용공고",
        company: "",
        url: `${BASE}/Recruit/GI_Read/${gno}`,
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

export async function fetchJobkorea(keyword, { pages = 1 } = {}) {
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const url = `${BASE}/Search/?stext=${encodeURIComponent(keyword)}&Page_No=${p}`;
    try {
      const html = await fetchText(url, { headers: { Referer: BASE } });
      const items = parseList(html, keyword);
      if (!items.length) break;
      out.push(...items);
    } catch (e) {
      console.error(`  [jobkorea] "${keyword}" p${p} 실패: ${e.message}`);
      break;
    }
  }
  return out;
}

export async function fetchJobkoreaByCompany(company, { pages = 1 } = {}) {
  const items = await fetchJobkorea(`${company} 디자인`, { pages });
  const norm = company.replace(/\s/g, "");
  return items.filter((j) => (j.company || j.title || "").replace(/\s/g, "").includes(norm));
}
