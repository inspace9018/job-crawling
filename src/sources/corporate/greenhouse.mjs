// Greenhouse 기업 채용 보드 — boards-api (공개 JSON).
import { fetchText } from "../../util.mjs";

export async function fetchGreenhouseCorporate(cfg) {
  const board = cfg.board;
  const company = cfg.company || board;
  const url = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
  let raw;
  try {
    raw = await fetchText(url, { headers: { Accept: "application/json" } });
  } catch (e) {
    throw new Error(e.message);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  const jobs = data.jobs || [];
  const filterRe = cfg.title_filter
    ? new RegExp(cfg.title_filter, "i")
    : /design|designer|디자인|industrial|product|cmf|hardware/i;

  return jobs
    .filter((j) => filterRe.test(j.title || "") || filterRe.test(j.content || ""))
    .map((j) => ({
      source: "corporate_greenhouse",
      id: `greenhouse:${board}:${j.id}`,
      title: j.title || "",
      company,
      url: j.absolute_url || "",
      location: (j.location && j.location.name) || "",
      experience: "",
      education: "",
      etype: "",
      deadline: "",
      description: (j.content || "").replace(/<[^>]+>/g, " ").slice(0, 2000),
      region: cfg.region || "KR",
      keyword: "greenhouse",
    }));
}
