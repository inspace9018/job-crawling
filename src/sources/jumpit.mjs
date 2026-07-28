// 점프잇(Jumpit) — api.jumpit.co.kr 공개 JSON.
import { fetchText } from "../util.mjs";

const API = "https://api.jumpit.co.kr/api/positions";

export async function fetchJumpit(keyword, { page = 1, size = 30 } = {}) {
  const url = `${API}?${new URLSearchParams({ keyword, page: String(page), size: String(size) })}`;
  try {
    const raw = await fetchText(url, {
      headers: { Accept: "application/json", Referer: "https://www.jumpit.co.kr/" },
    });
    if (raw.trimStart().startsWith("<")) throw new Error("HTML 응답(API 변경)");
    const j = JSON.parse(raw);
    const list = j.result?.positions || j.result?.content || [];
    return list.map((p) => ({
      source: "jumpit",
      id: `jumpit:${p.id}`,
      title: p.title || "",
      company: p.companyName || p.company?.name || "",
      url: `https://www.jumpit.co.kr/position/${p.id}`,
      location: (p.locations || []).join(", ") || p.address || "",
      experience: p.minCareer != null ? `경력 ${p.minCareer}~${p.maxCareer ?? ""}년` : "",
      education: "",
      etype: "",
      deadline: p.closedAt || "",
      keyword,
    }));
  } catch (e) {
    console.error(`  [jumpit] "${keyword}" 실패: ${e.message}`);
    return [];
  }
}

export async function fetchJumpitAll(keywords = []) {
  const out = [];
  const seen = new Set();
  for (const kw of keywords) {
    for (const j of await fetchJumpit(kw)) {
      if (!seen.has(j.id)) {
        seen.add(j.id);
        out.push(j);
      }
    }
  }
  return out;
}
