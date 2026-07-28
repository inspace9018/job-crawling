// Lever 기업 채용 — api.lever.co 공개 JSON.
import { fetchText } from "../../util.mjs";

export async function fetchLeverCorporate(cfg) {
  const site = cfg.site;
  const company = cfg.company || site;
  const url = `https://api.lever.co/v0/postings/${site}?mode=json`;
  let raw;
  try {
    raw = await fetchText(url, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw new Error(e.message);
  }
  let list;
  try {
    list = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(list)) return [];

  const filterRe = cfg.title_filter
    ? new RegExp(cfg.title_filter, "i")
    : /design|designer|디자인|industrial|product|cmf|hardware/i;

  return list
    .filter((j) => filterRe.test(j.text || "") || filterRe.test(j.descriptionPlain || ""))
    .map((j) => ({
      source: "corporate_lever",
      id: `lever:${site}:${j.id}`,
      title: j.text || "",
      company: j.categories?.team || company,
      url: j.hostedUrl || j.applyUrl || "",
      location: (j.categories?.location || "").trim(),
      experience: "",
      education: "",
      etype: j.categories?.commitment || "",
      deadline: "",
      description: (j.descriptionPlain || "").slice(0, 2000),
      region: cfg.region || "KR",
      keyword: "lever",
    }));
}
