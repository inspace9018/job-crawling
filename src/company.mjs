// 회사 분석 — 직접채용 vs 채용대행 판별, 잡플래닛/구글 링크, 공고 요약.
export function normCo(name = "") {
  return name.replace(/\(주\)|\(유\)|㈜|주식회사|\(株\)|Inc\.?|Co\.?,?\s*Ltd\.?/gi, "").replace(/\s+/g, "").trim();
}
export function jobplanetUrl(name) {
  return "https://www.jobplanet.co.kr/search?query=" + encodeURIComponent(normCo(name));
}
export function googleUrl(q) {
  return "https://www.google.com/search?q=" + encodeURIComponent(q);
}

// 채용대행/헤드헌팅 신호
const AGENCY_STRONG_NAME = ["써치", "서치", "search", "헤드헌", "스카우트", "scout", "리크루", "recruit", "맨파워", "manpower", "로버트월터", "아데코", "adecco", "persol", "서치펌"];
const AGENCY_WEAK_NAME = ["hr", "에이치알", "컨설팅", "consult", "파트너즈", "파트너스", "피플", "커리어", "career", "매니지먼트", "어소시에이", "스태핑", "staffing"];
// '고객사'는 디자인 외주사도 쓰므로 '채용 고객사' 등 채용 맥락일 때만 인정
const AGENCY_DESC = ["헤드헌", "채용대행", "채용 대행", "서치펌", "채용 고객사", "채용고객사", "고객사 채용", "지원인력", "인력 파견", "도급", "아웃소싱", "채용 의뢰", "포지션 의뢰"];
const ANON_TITLE = /\[[^\]]*(대기업|중견|중소기업|외국계|글로벌\s*기업|상장사|상장기업|소비재\s*기업|유명|최상위|스타트업|코스닥|코스피)[^\]]*\]/;

// { label:'직접'|'대행', conf:'확실'|'추정'|'', why }
export function detectHiringType(job) {
  const co = (job.company || "").toLowerCase();
  const title = job.title || "";
  const desc = job.description || "";
  if (AGENCY_STRONG_NAME.some((k) => co.includes(k)) || AGENCY_DESC.some((k) => desc.includes(k)))
    return { label: "대행", conf: "확실", why: "채용대행/헤드헌팅 신호(회사명·본문)" };
  if (AGENCY_WEAK_NAME.some((k) => co.includes(k)) || ANON_TITLE.test(title))
    return { label: "대행", conf: "추정", why: "실제 채용기업 비공개·대행 정황(익명 제목/사명)" };
  return { label: "직접", conf: "", why: "회사가 직접 올린 공고로 보임" };
}

// 공고 본문에서 요약 추출(있을 때만)
export function companyBlurb(job) {
  let t = (job.description || "").replace(/채용공고\s*상세/, "").trim();
  if (job.title) t = t.split(job.title).join(" ").trim();
  t = t.replace(/📋|📌|◈|•/g, " ").replace(/\s+/g, " ").trim();
  return t.slice(0, 160);
}
