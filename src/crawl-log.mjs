// 기업별·사이트별 수집 결과 로그 (성공 / 실패 구분)
import { writeFile, appendFile } from "node:fs/promises";
import { today, nowIso } from "./util.mjs";

const COMPANY_LOG = "reports/company-crawl.log";

async function appendCompanyLog(block) {
  const head = `\n--- ${nowIso()} ---\n`;
  try {
    await appendFile(COMPANY_LOG, head + block + "\n", "utf8");
  } catch {
    await writeFile(COMPANY_LOG, head + block + "\n", "utf8");
  }
}

const okMark = "성공";
const failMark = "실패";

export function siteResult(ok, count = 0, error = "") {
  if (ok) return { ok: true, count, error: "" };
  return { ok: false, count: 0, error: error || "알 수 없는 오류" };
}

export function formatSiteChip(label, r) {
  if (!r) return null;
  if (r.ok) return `${label}:${okMark}(${r.count}건)`;
  return `${label}:${failMark}(${r.error})`;
}

/** 100대 기업 — 회사당 한 줄 (공식 채용 홈페이지) */
export function logTop100CompanyLine(company, { corporate, saramin, jobkorea, incruit } = {}) {
  if (corporate) {
    if (corporate.skipped) {
      console.log(`  · ${company} — 공식채용:미등록 (config/korea-top100-careers.json)`);
      return;
    }
    if (corporate.ok) {
      console.log(`  · ${company} — 공식채용:성공(${corporate.count}건)`);
      return;
    }
    console.log(`  · ${company} — 공식채용:실패(${corporate.error})`);
    return;
  }
  const parts = [
    formatSiteChip("사람인", saramin),
    formatSiteChip("잡코리아", jobkorea),
    formatSiteChip("인크루트", incruit),
  ].filter(Boolean);
  console.log(`  · ${company} — ${parts.join(" | ") || "검색 없음"}`);
}

export function logCorporateLine(company, platform, ok, count = 0, error = "") {
  const name = company || platform;
  if (ok) {
    console.log(`  · ${name} (${platform}) — ${okMark} ${count}건`);
    return;
  }
  console.log(`  · ${name} (${platform}) — ${failMark}: ${error}`);
}

export function printTop100Summary({ companies, jobs, siteOk, siteFail, skipped, failLines }) {
  const lines = [
    `■ 100대 기업 공식 채용 요약 (${today()}) — ${companies}곳 · 공고 ${jobs}건 · 성공 ${siteOk}곳 · 실패 ${siteFail}곳 · URL 미등록 ${skipped ?? 0}곳`,
  ];
  if (failLines?.length) {
    lines.push("  실패만 모음:");
    for (const line of failLines) lines.push(`    · ${line}`);
  }
  const text = lines.join("\n");
  console.log("");
  console.log(text);
  appendCompanyLog(text).catch(() => {});
}

export function printCorporateSummary({ ok, fail, jobs, failLines }) {
  const lines = [`■ 기업 자체 채용 요약 (${today()}) — ${okMark} ${ok}곳 · ${failMark} ${fail}곳 · 공고 ${jobs}건`];
  if (failLines?.length) {
    lines.push("  실패만 모음:");
    for (const line of failLines) lines.push(`    · ${line}`);
  }
  const text = lines.join("\n");
  console.log("");
  console.log(text);
  appendCompanyLog(text).catch(() => {});
}
