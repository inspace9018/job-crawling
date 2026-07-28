// 디자인루키(designrookie.kr) 수집기 — 공개 API(/api/recruit) 사용. 디자이너 특화.
// job_field로 직무가 명확(산업(제품)디자인/UXUI 등), 연봉·경력 제공.
import { fetchText, stripTags } from "../util.mjs";

const BASE = "https://www.designrookie.kr";
const H = { Accept: "application/json", Referer: "https://www.designrookie.kr/recruit" };

// job_field → 매칭이 알아듣는 표준어로 변환(산업/제품=강신호, 나머지는 UX/그래픽으로)
const FIELD_MAP = {
  "산업(제품)디자인": "산업디자인 제품디자인 하드웨어 product",
  "프로덕트디자인(디지털)": "프로덕트 디자이너 UX/UI",
  "UXUI디자인": "UX/UI 디자인",
  "GUI디자인": "GUI UI 디자인",
  "앱/웹디자인": "앱 디자인 웹 디자인",
  "UX기획·리서치": "UX 기획 리서치",
  "공간연출(VMD)디자인": "VMD 공간연출 디자인",
};

function careerToExp(arr) {
  if (!arr || !arr.length) return "";
  const txt = arr.join(" ");
  if (/무관/.test(txt)) return "경력무관";
  const onlyNew = arr.every((x) => /신입/.test(x));
  if (onlyNew) return "신입";
  const nums = (txt.match(/\d+/g) || []).map(Number);
  if (!nums.length) return arr.join(", ");
  return (/신입/.test(txt) ? "신입·" : "") + `경력 ${Math.min(...nums)}~${Math.max(...nums)}년`;
}

function isActivePosting(s) {
  if (s.is_open === "N" || s.is_close === "Y") return false;
  const end = s.end_date;
  if (end) {
    const t = Date.parse(String(end).replace(" ", "T"));
    if (!Number.isNaN(t) && t < Date.now()) return false;
  }
  return true;
}

function normalize(s) {
  if (!isActivePosting(s)) return null;
  const fields = Array.isArray(s.job_field) ? s.job_field : [];
  const fieldText = fields.map((f) => FIELD_MAP[f] || f).join(" ");
  const salary = s.salary_type === "공개" && s.salary_min ? `연봉 ${s.salary_min}~${s.salary_max}만원` : "";
  const desc = (stripTags(s.job_intro || "") + " [분야] " + fieldText).slice(0, 1200);
  return {
    source: "designrookie",
    id: `designrookie:${s.id}`,
    title: s.title || "",
    company: s.company_name || "",
    url: `${BASE}/recruit/${s.uuid}`,
    location: "",
    experience: careerToExp(s.career_type),
    education: "",
    etype: "",
    deadline: s.end_date || "",
    salary,
    description: desc,
    region: "KR",
    keyword: "designrookie",
  };
}

export async function fetchDesignrookie({ pages = 3, limit = 20, jobFields = null } = {}) {
  const fieldParam =
    jobFields && jobFields.length ? encodeURIComponent(JSON.stringify(jobFields)) : encodeURIComponent("[]");
  const out = [];
  for (let p = 1; p <= pages; p++) {
    const url = `${BASE}/api/recruit?job_field=${fieldParam}&career_type=[]&page=${p}&limit=${limit}&is_open=Y&order=created_at+desc&is_close=N`;
    try {
      const j = JSON.parse(await fetchText(url, { headers: H }));
      const arr = j.data || [];
      if (!arr.length) break;
      out.push(...arr.map(normalize).filter((x) => x && x.title));
    } catch (e) {
      console.error(`  [designrookie] p${p} 실패: ${e.message}`);
      break;
    }
  }
  return out;
}
