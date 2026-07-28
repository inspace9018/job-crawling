// 원티드(Wanted) 수집기 — 공개 검색 API(positions) 사용. 연봉 범위까지 제공.
// 원티드는 "산업디자인"(붙여쓰기) 0건 → 띄어쓰기/영문/가전 키워드를 쓴다.
import { fetchText } from "../util.mjs";

const BASE = "https://www.wanted.co.kr";
const H = { Accept: "application/json", Referer: "https://www.wanted.co.kr/" };

function normalize(p) {
  const from = p.annual_from || 0;
  const to = p.annual_to || 0;
  let salary = "";
  if (to && to > 0) salary = from ? `연봉 ${from}~${to}만원` : `연봉 ~${to}만원`;
  const loc = [p.address?.location, p.address?.district].filter(Boolean).join(" ");
  return {
    source: "wanted",
    id: `wanted:${p.id}`,
    title: p.position || "",
    company: p.company?.name || "",
    url: `${BASE}/wd/${p.id}`,
    location: loc,
    experience: p.is_newbie ? "신입" : "경력",
    education: "",
    etype: p.employment_type || "",
    deadline: "상시",
    salary,
    keyword: "",
  };
}

// keyword 하나로 검색해 표준 공고 배열 반환.
export async function fetchWantedKeyword(keyword, { limit = 40 } = {}) {
  const url = `${BASE}/api/chaos/search/v1/results?query=${encodeURIComponent(keyword)}&tab=job&limit=${limit}`;
  try {
    const txt = await fetchText(url, { headers: H });
    const j = JSON.parse(txt);
    const data = j.positions?.data || [];
    return data.map(normalize).filter((x) => x.title);
  } catch (e) {
    console.error(`  [wanted] "${keyword}" 실패: ${e.message}`);
    return [];
  }
}

export async function fetchWanted(
  keywords = ["프로덕트 디자이너", "product designer", "가전", "하드웨어 디자이너"],
  { limit = 40 } = {}
) {
  const out = [];
  for (const kw of keywords) {
    const items = await fetchWantedKeyword(kw, { limit });
    items.forEach((it) => (it.keyword = kw));
    out.push(...items);
  }
  return out;
}
