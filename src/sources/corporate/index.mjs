// 기업 자체 채용 + 확장 검색 — config/search-settings.json → collection.corporate_careers
import { fetchWorkdayCorporate } from "./workday.mjs";
import { fetchGreenhouseCorporate } from "./greenhouse.mjs";
import { fetchLeverCorporate } from "./lever.mjs";
import { fetchGoogleSiteSearch } from "./google-cse.mjs";
import { logCorporateLine, printCorporateSummary } from "../../crawl-log.mjs";

export async function fetchAllCorporateCareers(cfg = {}) {
  if (cfg.enabled === false) return [];

  const all = [];
  let ok = 0;
  let fail = 0;
  const failLines = [];

  for (const w of cfg.workday || []) {
    if (w.enabled === false) continue;
    const label = w.company || w.tenant || "Workday";
    try {
      const { jobs, fetchFailed, lastError } = await fetchWorkdayCorporate(w);
      all.push(...jobs);
      if (fetchFailed && !jobs.length) {
        fail++;
        failLines.push(`${label} (Workday) — ${lastError}`);
        logCorporateLine(label, "Workday", false, 0, lastError);
      } else {
        ok++;
        logCorporateLine(label, "Workday", true, jobs.length);
      }
    } catch (e) {
      fail++;
      failLines.push(`${label} (Workday) — ${e.message}`);
      logCorporateLine(label, "Workday", false, 0, e.message);
    }
  }

  for (const g of cfg.greenhouse || []) {
    if (g.enabled === false) continue;
    const label = g.company || g.board || "Greenhouse";
    try {
      const items = await fetchGreenhouseCorporate(g);
      all.push(...items);
      ok++;
      logCorporateLine(label, "Greenhouse", true, items.length);
    } catch (e) {
      fail++;
      failLines.push(`${label} (Greenhouse) — ${e.message}`);
      logCorporateLine(label, "Greenhouse", false, 0, e.message);
    }
  }

  for (const l of cfg.lever || []) {
    if (l.enabled === false) continue;
    const label = l.company || l.site || "Lever";
    try {
      const items = await fetchLeverCorporate(l);
      all.push(...items);
      ok++;
      logCorporateLine(label, "Lever", true, items.length);
    } catch (e) {
      fail++;
      failLines.push(`${label} (Lever) — ${e.message}`);
      logCorporateLine(label, "Lever", false, 0, e.message);
    }
  }

  if (cfg.google_site_search?.api_key && cfg.google_site_search?.cx) {
    const label = "Google 사이트 검색";
    try {
      const items = await fetchGoogleSiteSearch(cfg.google_site_search);
      all.push(...items);
      ok++;
      logCorporateLine(label, "Google", true, items.length);
    } catch (e) {
      fail++;
      failLines.push(`${label} — ${e.message}`);
      logCorporateLine(label, "Google", false, 0, e.message);
    }
  }

  if (ok + fail > 0) {
    printCorporateSummary({ ok, fail, jobs: all.length, failLines });
  }

  return all;
}
