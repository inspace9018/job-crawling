// Google Programmable Search (선택) — site:기업채용페이지 키워드로 한계 돌파. API 키 필요.
import { fetchText } from "../../util.mjs";

export async function fetchGoogleSiteSearch(cfg) {
  const key = cfg.api_key;
  const cx = cfg.cx;
  if (!key || !cx) return [];

  const queries = cfg.queries?.length
    ? cfg.queries
    : ["site:careers.lg.com 산업디자인", "site:recruit.lg.com designer"];
  const out = [];
  const seen = new Set();

  for (const q of queries) {
    try {
      const url =
        "https://www.googleapis.com/customsearch/v1?" +
        new URLSearchParams({ key, cx, q, num: String(cfg.num_results ?? 10), lr: "lang_ko" });
      const raw = await fetchText(url, { headers: { Accept: "application/json" } });
      const j = JSON.parse(raw);
      for (const item of j.items || []) {
        const link = item.link || "";
        if (!link || seen.has(link)) continue;
        seen.add(link);
        out.push({
          source: "web_search",
          id: `gsearch:${link.replace(/[^a-zA-Z0-9]/g, "").slice(0, 48)}`,
          title: item.title || "채용 페이지",
          company: cfg.label || "웹 검색",
          url: link,
          location: "",
          experience: "",
          education: "",
          etype: "",
          deadline: "",
          description: (item.snippet || "").slice(0, 500),
          region: "KR",
          keyword: q,
        });
      }
    } catch (e) {
      console.error(`  [google cse] "${q}" 실패: ${e.message}`);
    }
  }
  return out;
}
