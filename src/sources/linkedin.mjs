// 링크드인(LinkedIn) 수집기 — 비로그인 게스트 검색 API의 잡 카드 HTML 파싱.
// 로그인 불필요. 가끔 차단/빈응답 가능 → 실패 시 빈 배열(전체는 계속 작동). 연타 방지 딜레이 포함.
import { fetchText, decodeEntities, stripTags } from "../util.mjs";

const ENDPOINT = "https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseCards(html, keyword) {
  const jobs = [];
  const parts = html.split("urn:li:jobPosting:"); // 카드당 1회 등장 → 안전한 분할 기준
  for (let i = 1; i < parts.length; i++) {
    const b = parts[i].replace(/\s+/g, " ").slice(0, 2600);
    const id = (b.match(/^(\d+)/) || [])[1];
    if (!id) continue;
    let url = (b.match(/base-card__full-link[^>]*href="([^"]+)"/) || [])[1] || "";
    url = decodeEntities(url).split("?")[0];
    const title = stripTags((b.match(/base-search-card__title">([\s\S]*?)<\/h3>/) || [])[1] || "");
    const company = stripTags((b.match(/base-search-card__subtitle">([\s\S]*?)<\/h4>/) || [])[1] || "");
    const location = stripTags((b.match(/job-search-card__location">([\s\S]*?)<\/span>/) || [])[1] || "");
    if (!title) continue;
    jobs.push({
      source: "linkedin",
      id: `linkedin:${id}`,
      title,
      company,
      url,
      location,
      experience: "",
      education: "",
      etype: "",
      deadline: "",
      keyword,
    });
  }
  return jobs;
}

export async function fetchLinkedinKeyword(keyword, { pages = 1, location = "South Korea", region = "KR" } = {}) {
  const out = [];
  for (let p = 0; p < pages; p++) {
    const url = `${ENDPOINT}?keywords=${encodeURIComponent(keyword)}&location=${encodeURIComponent(location)}&start=${p * 25}`;
    try {
      const html = await fetchText(url, { headers: { Accept: "text/html" } });
      const items = parseCards(html, keyword);
      if (!items.length) break;
      items.forEach((it) => (it.region = region));
      out.push(...items);
      await sleep(700); // 연타 차단 방지
    } catch (e) {
      console.error(`  [linkedin] "${keyword}"@${location} p${p} 실패: ${e.message}`);
      break;
    }
  }
  return out;
}

// 국내(한국)
export async function fetchLinkedin(keywords = ["산업디자인", "제품디자인", "프로덕트 디자이너", "가전 디자인"]) {
  const out = [];
  for (const kw of keywords) {
    out.push(...(await fetchLinkedinKeyword(kw, { region: "KR" })));
    await sleep(700);
  }
  return out;
}

// 해외 — 위치별(싱가포르>미국>유럽 우선) 영어 키워드 검색.
export async function fetchLinkedinOverseas(
  locations = [
    { location: "Singapore", region: "SG" },
    { location: "United States", region: "US" },
    { location: "United Kingdom", region: "EU" },
    { location: "Germany", region: "EU" },
  ],
  keywords = ["industrial designer", "product designer"],
  { pages = 1 } = {}
) {
  const out = [];
  for (const { location, region } of locations) {
    for (const kw of keywords) {
      out.push(...(await fetchLinkedinKeyword(kw, { location, region, pages })));
      await sleep(700);
    }
  }
  return out;
}
