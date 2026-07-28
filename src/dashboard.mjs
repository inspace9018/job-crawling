// 대시보드(HTML) + 일일 요약(MD) 생성 — OBSIDIAN(Tactical Monochrome) 디자인 시스템 준수(design.md).
// 무채색 베이스 · 손익색(녹/적/앰버)만 · 그림자 금지 · 코너 브라켓 · 고밀도 · mono 숫자.
import { writeFile } from "node:fs/promises";
import { today, readJson } from "./util.mjs";
import { detectHiringType, jobplanetUrl, googleUrl, companyBlurb, normCo } from "./company.mjs";

const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// 매칭 점수 → 손익색 + 글리프(이중 인코딩)
function scoreMeta(s) {
  if (s >= 85) return { cls: "pos", g: "▲" };
  if (s >= 70) return { cls: "amb", g: "◆" };
  return { cls: "sdim", g: "●" };
}

// 연봉 문자열 → 희망(min) 대비 손익색
function salaryHtml(job, min) {
  if (!job.salary) return "";
  const nums = (job.salary.match(/\d[\d,]*/g) || []).map((n) => +n.replace(/,/g, ""));
  if (!nums.length) return `<span class="mut">${esc(job.salary)}</span>`;
  const top = Math.max(...nums);
  const ok = top >= min;
  return `<span class="${ok ? "pos" : "neg"}">${esc(job.salary)} ${ok ? "▲" : "▼"}</span>`;
}

const SOURCE_LABELS = {
  saramin: "사람인",
  jobkorea: "잡코리아",
  incruit: "인크루트",
  wanted: "원티드",
  jobplanet: "잡플래닛",
  linkedin: "링크드인",
  worknet: "워크넷",
  remember: "리멤버",
  jumpit: "점프잇",
  designrookie: "디자인루키",
  corporate_workday: "기업(Workday)",
  corporate_web: "기업(공식채용)",
  corporate_greenhouse: "기업(GH)",
  corporate_lever: "기업(Lever)",
  web_search: "웹검색",
  instagram_agency: "인스타",
};

const SOURCE_ORDER = [
  "saramin",
  "jobkorea",
  "incruit",
  "wanted",
  "jobplanet",
  "linkedin",
  "worknet",
  "remember",
  "jumpit",
  "designrookie",
  "corporate_workday",
  "corporate_web",
  "corporate_greenhouse",
  "corporate_lever",
  "web_search",
  "instagram_agency",
];

/** 출처별 구분색(필터·뱃지) — 가독성 유지 + 사이트별 색 복원 */
const SOURCE_THEME = {
  saramin: { fg: "#7ec8ff", bg: "rgba(126,200,255,.14)", bd: "#356891" },
  jobkorea: { fg: "#57c08a", bg: "rgba(87,192,138,.14)", bd: "#1c5a2e" },
  incruit: { fg: "#c4a0ff", bg: "rgba(196,160,255,.14)", bd: "#5a4080" },
  wanted: { fg: "#5eead4", bg: "rgba(94,234,212,.12)", bd: "#1a665c" },
  jobplanet: { fg: "#e0a23a", bg: "rgba(224,162,58,.14)", bd: "#5a4a00" },
  linkedin: { fg: "#6eb5ff", bg: "rgba(110,181,255,.12)", bd: "#2a5080" },
  worknet: { fg: "#9ad67a", bg: "rgba(154,214,122,.12)", bd: "#3d5a2a" },
  remember: { fg: "#ff8ec7", bg: "rgba(255,142,199,.12)", bd: "#804060" },
  jumpit: { fg: "#8eb4ff", bg: "rgba(142,180,255,.12)", bd: "#3a5080" },
  designrookie: { fg: "#ffb07a", bg: "rgba(255,176,122,.12)", bd: "#805030" },
  corporate_workday: { fg: "#b8b8ff", bg: "rgba(184,184,255,.12)", bd: "#505080" },
  corporate_web: { fg: "#a8d4ff", bg: "rgba(168,212,255,.1)", bd: "#406080" },
  corporate_greenhouse: { fg: "#7dcea0", bg: "rgba(125,206,160,.12)", bd: "#2a6040" },
  corporate_lever: { fg: "#f0a0a0", bg: "rgba(240,160,160,.12)", bd: "#804040" },
  web_search: { fg: "#b0b0b0", bg: "rgba(176,176,176,.10)", bd: "#505050" },
  instagram_agency: { fg: "#ff9fd4", bg: "rgba(255,159,212,.12)", bd: "#804868" },
};

function safeSourceKey(src) {
  return String(src || "unknown").replace(/[^a-z0-9_]/gi, "") || "unknown";
}

function sourceThemeCss() {
  const out = [];
  for (const [k, t] of Object.entries(SOURCE_THEME)) {
    out.push(
      `.sf.active[data-src="${k}"]{color:${t.fg};border-color:${t.bd};background:${t.bg}}`,
      `.badge.src-${k}{color:${t.fg};border-color:${t.bd};background:${t.bg}}`
    );
  }
  return out.join("\n");
}

function sourceLabel(src) {
  return SOURCE_LABELS[src] || src || "—";
}

function sourceCounts(jobs) {
  const c = {};
  for (const j of jobs) {
    const s = j.source || "unknown";
    c[s] = (c[s] || 0) + 1;
  }
  return c;
}

function buildTop100NormSet(names = []) {
  const set = new Set();
  for (const name of names) {
    const n = normCo(name);
    if (n) set.add(n);
  }
  return set;
}

function isListedCompany(company, topNormSet) {
  if (!topNormSet?.size) return false;
  const n = normCo(company);
  if (!n) return false;
  for (const t of topNormSet) {
    if (n.includes(t) || t.includes(n)) return true;
  }
  return false;
}

function companySearchPanelHtml(companies = [], note = "") {
  if (!companies.length) return "";
  const chips = companies
    .map((c, i) => `<span class="cochip" data-name="${esc(c)}"><span class="coi num">${String(i + 1).padStart(2, "0")}</span>${esc(c)}</span>`)
    .join("");
  const noteHtml = note ? `<p class="conote mut">${esc(note)}</p>` : "";
  return `<details class="co100" id="co100">
  <summary>100대 기업 검색 목록 (${companies.length}곳) ▾</summary>
  <div class="cobody">
    ${noteHtml}
    <p class="cohint mut">아래 회사는 <strong>공식 채용 홈페이지</strong>에서 디자인 관련 공고를 찾습니다(사람인·잡코리아 회사 검색 아님). 공고 옆 <span class="badge top100">100대</span> 뱃지는 이 목록에 해당하는 회사입니다.</p>
    <label class="cofilt"><span class="mut">회사명 찾기</span> <input type="search" id="coSearch" placeholder="예: 삼성, LG" autocomplete="off"></label>
    <div class="cogrid" id="cogrid">${chips}</div>
  </div>
</details>`;
}

function sourceFilterHtml(counts, alwaysShow = []) {
  const keySet = new Set([
    ...Object.keys(counts),
    ...alwaysShow.filter(Boolean),
    ...SOURCE_ORDER.filter((k) => counts[k]),
  ]);
  const keys = [
    ...SOURCE_ORDER.filter((k) => keySet.has(k)),
    ...[...keySet].filter((k) => !SOURCE_ORDER.includes(k)).sort(),
  ];
  const chips = keys
    .map((k) => {
      const n = counts[k] || 0;
      const zero = n === 0;
      const tip = zero
        ? k === "remember"
          ? " 이번 결과 0건 — 리멤버로그인.cmd 후 공고새로찾기"
          : k === "instagram_agency"
            ? " 이번 결과 0건 — 인스타로그인.cmd 후 공고새로찾기"
            : " 이번 결과 0건"
        : "";
      return `<button type="button" class="sf${zero ? " zero" : ""}" data-src="${esc(k)}" aria-pressed="false" title="${esc(tip.trim())}">${esc(sourceLabel(k))} <span class="c num">${n}</span></button>`;
    })
    .join("");
  return `<div class="srcfilt" id="srcfilt" role="group" aria-label="출처 필터">
  <span class="srcfilt-lbl">출처</span>
  <button type="button" class="sf all active" data-src="" aria-pressed="true">전체</button>
  ${chips}
</div>`;
}

const SRC = { saramin: "SARAMIN", wanted: "WANTED", linkedin: "LINKEDIN", designrookie: "ROOKIE" };

function jrow(j, rank, min, research, topNormSet) {
  const m = scoreMeta(j.score);
  const condParts = [j.experience, j.location, j.etype, j.deadline].filter(Boolean).map(esc);
  const condHtml = condParts.length ? `<span class="jcond">${condParts.join("<span class=\"sep\">·</span>")}</span>` : "";
  const sal = j.salary ? salaryHtml(j, min) : "";
  const salBlock = sal ? `<span class="jsal">${sal}</span>` : "";
  const isnew = j.is_new ? `<span class="pill on">● NEW</span>` : "";
  const hire = detectHiringType(j);
  const hbadge = `<span class="badge ${hire.label === "대행" ? "agency" : "direct"}">${hire.label}${hire.conf ? "·" + hire.conf : ""}</span>`;
  const topBadge = isListedCompany(j.company, topNormSet) ? ` <span class="badge top100">100대</span>` : "";

  // 70점 이상: 회사 리서치 패널
  let panel = "";
  if (j.score >= 70) {
    const r = research[normCo(j.company)];
    const blurb = companyBlurb(j);
    panel = `<details class="rsch"><summary>회사 리서치 · 잡플래닛 ▾</summary><div class="rbody">
      <div class="rrow"><b>채용형태</b> ${esc(hire.label)}${hire.conf ? " (" + esc(hire.conf) + ")" : ""} — ${esc(hire.why)}</div>
      ${r && r.summary ? `<div class="rrow"><b>회사</b> ${esc(r.summary)}</div>` : ""}
      ${r && r.note ? `<div class="rrow"><b>메모</b> ${esc(r.note)}</div>` : ""}
      ${blurb ? `<div class="rrow"><b>공고요약</b> ${esc(blurb)}</div>` : ""}
      <div class="rlinks"><a href="${jobplanetUrl(j.company)}" target="_blank" rel="noopener">잡플래닛 평점·리뷰</a> · <a href="${googleUrl(j.company + " 기업")}" target="_blank" rel="noopener">구글 검색</a> · <a href="${esc(j.url)}" target="_blank" rel="noopener">공고 원문</a></div>
    </div></details>`;
  }
  const srcKey = safeSourceKey(j.source);
  const srcBadge = `<span class="badge src src-${srcKey}">${esc(sourceLabel(j.source) || SRC[j.source] || esc(j.source || ""))}</span>`;
  const reasons = (j.reasons || []).filter(Boolean);
  const whyHtml = reasons.length
    ? `<ul class="jwhy">${reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>`
    : "";

  return `<div class="jrow" data-id="${esc(j.id)}" data-source="${esc(j.source || "")}" data-co="${esc(j.company || "")}" data-title="${esc(j.title)}">
  <div class="jrank num">${String(rank).padStart(2, "0")}</div>
  <div class="jscore num ${m.cls}" title="적합도 ${j.score}점"><span class="g">${m.g}</span>${j.score}</div>
  <div class="jmain">
    <div class="jtitle"><a href="${esc(j.url)}" target="_blank" rel="noopener">${esc(j.title)}</a>${isnew ? ` ${isnew}` : ""}</div>
    <div class="jmeta">
      <div class="jmeta-top">
        <span class="jco">${esc(j.company) || "—"}</span>
        <span class="jbadges">${hbadge}${topBadge} ${srcBadge}${j.region && j.region !== "KR" ? ` <span class="badge rgn">${esc(j.region)}</span>` : ""}</span>
      </div>
      ${condHtml || salBlock ? `<div class="jmeta-sub">${condHtml}${condHtml && salBlock ? `<span class="sep">·</span>` : ""}${salBlock}</div>` : ""}
    </div>
    ${whyHtml}
    ${panel}
  </div>
  <div class="jact">
    <button class="fb up" data-r="up" title="관심 — 이런 회사 더">관심 ▲</button>
    <button class="fb down" data-r="down" title="제외 — 이런 회사 덜">제외 ▼</button>
  </div>
</div>`;
}

export async function renderHtml(ranked, fresh, meta = {}) {
  const min = meta.salaryMin ?? 4000;
  const research = await readJson("data/company_research.json", {});
  const allOverseas = ranked.filter((j) => j.region && j.region !== "KR");
  const allDomestic = ranked.filter((j) => !j.region || j.region === "KR");
  const overseas = allOverseas.slice(0, 60);
  const domestic = allDomestic.slice(0, 120);
  const srcCounts = sourceCounts(ranked);
  const srcFilter = sourceFilterHtml(srcCounts, meta.alwaysShowSources || []);
  const companyList = meta.companySearchList || [];
  const topNormSet = buildTop100NormSet(companyList);
  const coPanel = companySearchPanelHtml(companyList, meta.companySearchNote || "");
  const srcColors = sourceThemeCss();
  const domSourceSet = new Set(allDomestic.map((j) => j.source || ""));
  const ovsOnlySources = [...new Set(allOverseas.map((j) => j.source || ""))].filter((s) => s && !domSourceSet.has(s));
  const css = `
:root{
  --bg:#050505;--card:#141414;--card2:#0d0d0d;
  --line:rgba(255,255,255,.16);--line2:rgba(255,255,255,.09);
  --fg:#f4f4f4;--fg2:#c2c2c2;--mut:#8c8c8c;--dim:#666;
  --grn:#57c08a;--grnb:rgba(87,192,138,.10);--red:#eb5c4d;--redb:rgba(235,92,77,.10);--amber:#e0a23a;--accent:#7ec8ff;
  --r:3px;--rs:2px;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.65 -apple-system,Segoe UI,Roboto,'Malgun Gothic','Apple SD Gothic Neo',sans-serif;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
a{color:var(--accent);text-decoration:none;text-underline-offset:3px}a:hover{text-decoration:underline}
b{font-weight:650}.fg2{color:var(--fg2)}
.pos{color:var(--grn)}.neg{color:var(--red)}.amb{color:var(--amber)}.mut{color:var(--mut)}.sdim{color:var(--mut)}
.num{font-family:Consolas,ui-monospace,SFMono-Regular,monospace;font-variant-numeric:tabular-nums}
.caps{text-transform:uppercase;letter-spacing:.04em;font-size:.92em}
header{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 24px;background:rgba(5,5,5,.92);backdrop-filter:blur(8px);border-bottom:1px solid var(--line2)}
header .brand{font-size:18px;font-weight:750;letter-spacing:-.02em;color:var(--fg)}
header .brand .badge{color:var(--grn);border-color:#1c5a2e;background:var(--grnb)}
header .sub{color:var(--mut);font-size:13px;line-height:1.45;max-width:420px}
header .upd{margin-left:auto;font-size:12px;color:var(--dim);line-height:1.4;text-align:right}
main{max-width:960px;margin:0 auto;padding:24px 20px 64px}
.ruler{height:4px;margin:0 0 20px;background:repeating-linear-gradient(90deg,var(--line) 0 1px,transparent 1px 14px);opacity:.45}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
.card{position:relative;background:var(--card);border:1px solid var(--line2);border-radius:var(--r)}
.card::before,.card::after{content:"";position:absolute;width:11px;height:11px;border:1px solid rgba(255,255,255,.30);pointer-events:none;z-index:2}
.card::before{top:-1px;left:-1px;border-right:0;border-bottom:0}
.card::after{bottom:-1px;right:-1px;border-left:0;border-top:0}
.kpi{padding:16px 18px;border-top:2px solid var(--line2)}
.grid-4 .kpi:nth-child(1){border-top-color:var(--grn)}
.grid-4 .kpi:nth-child(2){border-top-color:var(--amber)}
.grid-4 .kpi:nth-child(3){border-top-color:#7ec8ff}
.grid-4 .kpi:nth-child(4){border-top-color:#c4a0ff}
.kpi .l{color:var(--mut);font-size:12px;font-weight:600;letter-spacing:.02em}
.kpi .v{font-size:28px;font-weight:800;margin-top:6px;letter-spacing:-.03em;line-height:1.1;color:var(--fg)}
.kpi .v.src{font-size:12px;font-weight:500;color:var(--mut);letter-spacing:0;margin-top:10px;line-height:1.45}
.tabs{display:flex;gap:10px;margin:28px 0 12px}
.tab{font:inherit;font-size:14px;font-weight:700;cursor:pointer;border:1px solid var(--line);background:var(--card2);color:var(--mut);border-radius:var(--rs);padding:10px 20px;letter-spacing:.01em;transition:.12s}
.tab:hover{border-color:var(--mut);color:var(--fg2)}
.tab.active{background:var(--card);color:var(--fg);border-color:var(--accent)}
.tab.active[data-t="dom"]{color:var(--grn);border-color:#1c5a2e;background:var(--grnb)}
.tab.active[data-t="ovs"]{color:#7ec8ff;border-color:#356891;background:rgba(126,200,255,.12)}
.tab .c{color:inherit;opacity:.75;font-weight:600;margin-left:6px;font-family:Consolas,monospace;font-size:13px}
.srcfilt{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 14px;align-items:center}
.srcfilt-lbl{font-size:13px;font-weight:700;color:var(--accent);margin-right:4px}
.sf{font:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--line2);background:var(--card2);color:var(--mut);border-radius:var(--rs);padding:8px 14px;transition:.12s;line-height:1.2}
.sf:hover{border-color:var(--mut);color:var(--fg2)}
.sf.active{color:var(--fg);border-color:var(--accent);background:var(--card)}
.sf.all.active{background:var(--grnb);color:var(--grn);border-color:#1c5a2e}
.sf.zero{opacity:.55;border-style:dashed}
.sf.zero:hover{opacity:.85}
${srcColors}
.helpbox{font-size:13px;color:var(--mut);line-height:1.6;margin:0 0 16px;padding:14px 16px;background:var(--card2);border:1px solid var(--line2);border-radius:var(--r);border-left:3px solid var(--accent)}
.helpbox p{margin:0 0 6px}.helpbox p:last-child{margin-bottom:0}
.helpbox b{font-weight:650}
.helpbox .hl-src{color:#7ec8ff}.helpbox .hl-score{color:var(--amber)}.helpbox .hl-sal{color:var(--grn)}
.filt-empty{display:none;padding:24px 20px!important;background:var(--card2)!important}
.filt-empty .jmain{font-size:14px;line-height:1.6;color:var(--mut)}
.filt-empty b{color:var(--accent);font-weight:650}
.list{padding:0}
.jrow{display:flex;gap:16px;padding:18px 20px;border-bottom:1px solid var(--line2);align-items:flex-start}
.jrow:nth-child(even){background:rgba(255,255,255,.02)}
.jrow:last-child{border-bottom:0}
.jrow:hover{background:#1a1a1a}
.jrank{flex:none;width:26px;color:var(--dim);font-size:12px;padding-top:8px}
.jscore{flex:none;width:56px;text-align:right;font-size:26px;font-weight:800;line-height:1.05;padding-top:2px}
.jscore .g{display:block;font-size:12px;font-weight:700;margin-bottom:4px}
.jmain{flex:1;min-width:0}
.jtitle{font-size:16px;font-weight:700;letter-spacing:-.02em;line-height:1.45;color:var(--fg)}
.jtitle a{color:var(--fg)}
.jtitle a:hover{color:var(--accent)}
.jmeta{margin-top:10px;display:flex;flex-direction:column;gap:6px}
.jmeta-top{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;line-height:1.4}
.jco{font-size:14px;font-weight:700;color:var(--fg)}
.jbadges{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px}
.jmeta-sub{font-size:13px;color:var(--mut);line-height:1.5;display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}
.jmeta-sub .sep,.jcond .sep{color:var(--dim);padding:0 2px;font-weight:400}
.jsal{font-weight:600}
.jwhy{margin:10px 0 0;padding:0 0 0 18px;color:var(--mut);font-size:13px;line-height:1.55;list-style:disc}
.jwhy li::marker{color:var(--amber)}
.jwhy li{margin:2px 0}
.badge{display:inline-block;font-size:11px;letter-spacing:.02em;border:1px solid var(--line);color:var(--mut);padding:2px 8px;border-radius:2px;font-weight:600;line-height:1.35}
.badge.src{font-family:Consolas,ui-monospace,monospace;font-size:10.5px}
.badge.rgn{color:#7ec8ff;border-color:#356891;background:rgba(126,200,255,.10)}
.badge.direct{color:var(--grn);border-color:#1c5a2e;background:var(--grnb)}
.badge.agency{color:var(--amber);border-color:#5a4a00;background:rgba(224,162,58,.10)}
.badge.top100{color:#c4a0ff;border-color:#5a4080;background:rgba(196,160,255,.12)}
.co100{margin:20px 0 8px;border:1px solid var(--line2);border-radius:var(--r);background:var(--card2)}
.co100>summary{list-style:none;cursor:pointer;font-size:14px;font-weight:700;color:var(--fg2);padding:14px 18px;letter-spacing:.01em;line-height:1.4}
.co100>summary::-webkit-details-marker{display:none}
.co100[open]>summary{border-bottom:1px solid var(--line2);color:var(--fg)}
.cobody{padding:14px 18px 18px}
.conote,.cohint{font-size:13px;line-height:1.65;margin:0 0 12px;color:var(--mut)}
.cofilt{display:flex;align-items:center;gap:12px;margin-bottom:14px;font-size:13px;color:var(--fg2)}
.cofilt input{flex:1;max-width:320px;font:inherit;font-size:14px;padding:8px 12px;border:1px solid var(--line2);border-radius:var(--rs);background:var(--bg);color:var(--fg)}
.cogrid{display:flex;flex-wrap:wrap;gap:8px;max-height:240px;overflow:auto;padding-right:6px}
.cochip{display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:5px 10px;border:1px solid var(--line2);border-radius:var(--rs);background:var(--card);color:var(--fg2);line-height:1.3}
.cochip .coi{color:var(--dim);font-size:11px}
.cochip.hidden{display:none}
.rsch{margin-top:12px;border-top:1px solid var(--line2);padding-top:10px}
.rsch>summary{list-style:none;cursor:pointer;font-size:13px;color:var(--mut);font-weight:600;letter-spacing:.01em;line-height:1.4}
.rsch>summary::-webkit-details-marker{display:none}
.rsch[open]>summary{color:var(--fg2)}
.rbody{font-size:13px;color:var(--fg2);margin-top:10px;line-height:1.7;background:var(--card2);border:1px solid var(--line2);border-radius:var(--rs);padding:12px 14px}
.rbody .rrow{margin-bottom:6px}
.rbody .rrow b{color:var(--mut);font-weight:600;margin-right:8px}
.rlinks{margin-top:10px;line-height:1.6}
.rlinks a{color:var(--accent);text-decoration:underline;font-size:13px;margin-right:6px}
.rlinks a:hover{color:#5eead4}
.pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;border:1px solid var(--line);color:var(--mut);vertical-align:middle}
.pill.on{background:var(--grnb);color:var(--grn);border-color:#1c5a2e}
.jact{flex:none;display:flex;flex-direction:column;gap:8px;justify-content:flex-start;padding-top:4px}
.fb{font:inherit;font-size:12px;cursor:pointer;border:1px solid var(--line);background:var(--card2);color:var(--mut);border-radius:var(--rs);padding:6px 12px;transition:.12s;white-space:nowrap;line-height:1.2}
.fb:hover{border-color:var(--mut);background:var(--card)}
.fb.up:hover{color:var(--grn)}.fb.down:hover{color:var(--red)}
.jrow.liked{box-shadow:inset 3px 0 0 var(--grn)}
.jrow.liked .fb.up{color:var(--grn);border-color:#1c5a2e;background:var(--grnb)}
.jrow.disliked{opacity:.5;box-shadow:inset 3px 0 0 var(--red)}
.jrow.disliked .fb.down{color:var(--red);border-color:#5a1f1f}
footer{color:var(--dim);font-size:12px;margin-top:28px;text-align:center;line-height:1.75;padding:0 12px}
@media(max-width:880px){
  .grid-4{grid-template-columns:repeat(2,1fr)}
  main{padding:18px 14px 56px}
  .jrow{padding:16px 14px;gap:12px}
  .jscore{width:48px;font-size:22px}
  header .upd{width:100%;margin-left:0;text-align:left;margin-top:4px}
  .jmeta-top{flex-direction:column;align-items:flex-start;gap:6px}
}
`;
  const html = `<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>맞춤 채용 // JOB MONITOR</title>
<style>${css}</style></head><body>
<header>
  <div class="brand">맞춤 채용 <span class="badge">JOB MONITOR</span></div>
  <div class="sub">산업디자인 3년차 · 가전 특화 · 적합도 100점 정렬</div>
  <div class="upd">갱신 ${esc(today())}</div>
</header>
<main>
<div class="ruler"></div>
<div class="grid-4">
  <div class="card kpi"><div class="l">맞는 공고</div><div class="v num">${ranked.length}</div></div>
  <div class="card kpi"><div class="l">새 공고</div><div class="v num ${fresh.length ? "pos" : "mut"}">${fresh.length}</div></div>
  <div class="card kpi"><div class="l">최고 점수</div><div class="v num ${ranked[0] ? scoreMeta(ranked[0].score).cls : "mut"}">${ranked[0]?.score ?? "—"}</div></div>
  <div class="card kpi"><div class="l">100대 기업 검색</div><div class="v num">${companyList.length || "—"}</div><div class="v src">아래 목록에서 회사명 확인</div></div>
</div>
${coPanel}
<div class="tabs">
  <button class="tab active" data-t="dom">국내 <span class="c">${allDomestic.length}</span></button>
  <button class="tab" data-t="ovs">해외 <span class="c">${allOverseas.length}</span></button>
</div>
${srcFilter}
<div class="helpbox">
  <p><b class="hl-src">출처</b> — 버튼으로 사이트별로 골라 볼 수 있습니다. <b>리멤버</b>는 <b>국내</b> 탭·분홍색 버튼(로그인 필요). <b>인스타</b>는 에이전시 채용 게시(로그인 필요). <b>링크드인</b>은 <b>해외</b> 탭.</p>
  <p><b class="hl-score">점수</b> — 100점 만점 적합도. <span class="pos">▲ 85점 이상</span> · <span class="amb">◆ 70점 이상</span> · <span class="mut">● 그 외</span></p>
  <p><b class="hl-sal">연봉</b> — 희망 연봉 기준 <span class="pos">▲ 충족</span> / <span class="neg">▼ 미달</span> (표시된 경우만)</p>
</div>
<div class="panel" id="dom">
  <div class="card list">
  ${domestic.map((j, i) => jrow(j, i + 1, min, research, topNormSet)).join("\n")}
  <div class="jrow filt-empty" id="dom-empty" aria-live="polite"><div class="jmain"></div></div>
  </div>
</div>
<div class="panel hidden" id="ovs">
  <div class="card list">
  ${overseas.length ? overseas.map((j, i) => jrow(j, i + 1, min, research, topNormSet)).join("\n") : '<div class="jrow"><div class="jmain mut">해외 공고 없음(다음 수집 때 다시 확인)</div></div>'}
  <div class="jrow filt-empty" id="ovs-empty" aria-live="polite"><div class="jmain"></div></div>
  </div>
</div>
<footer>국내 ${allDomestic.length}건 · 해외 ${allOverseas.length}건 · 총 ${ranked.length}건 · ${esc(today())} 생성 · 관심/제외는 다음 공고 찾기부터 점수에 반영됩니다</footer>
</main>
<script>
var OVS_ONLY_SOURCES=${JSON.stringify(ovsOnlySources)};
function jobRows(panelId){
  var p=document.getElementById(panelId);
  if(!p) return [];
  return [].slice.call(p.querySelectorAll('.jrow[data-source]'));
}
function visibleCount(panelId){
  return jobRows(panelId).filter(function(r){ return r.style.display!== 'none'; }).length;
}
function switchTab(tabKey){
  document.querySelectorAll('.tab').forEach(function(x){x.classList.remove('active')});
  document.querySelectorAll('.panel').forEach(function(x){x.classList.add('hidden')});
  var t=document.querySelector('.tab[data-t="'+tabKey+'"]');
  var p=document.getElementById(tabKey);
  if(t) t.classList.add('active');
  if(p) p.classList.remove('hidden');
}
function updateEmptyHints(){
  var labels={dom:'국내',ovs:'해외'};
  ['dom','ovs'].forEach(function(pid){
    var hint=document.getElementById(pid+'-empty');
    if(!hint) return;
    var rows=jobRows(pid);
    var vis=rows.filter(function(r){ return r.style.display!== 'none'; });
    if(rows.length && vis.length===0){
      hint.style.display='';
      var other=pid==='dom'?'ovs':'dom';
      var otherLabel=labels[other];
      var n=visibleCount(other);
      hint.querySelector('.jmain').innerHTML=
        '선택한 출처 공고가 <b>'+labels[pid]+'</b> 탭에는 없습니다.'+
        (n>0 ? ' <b>'+otherLabel+'</b> 탭('+n+'건)을 눌러 보세요.' : ' 다른 출처를 선택해 보세요.');
    } else {
      hint.style.display='none';
    }
  });
}
function applySrcFilter(){
  var allBtn=document.querySelector('.sf.all');
  var on=[].slice.call(document.querySelectorAll('.sf.active:not(.all)')).map(function(b){return b.dataset.src;});
  var showAll=allBtn&&allBtn.classList.contains('active');
  document.querySelectorAll('.jrow[data-source]').forEach(function(row){
    if(showAll||!on.length){ row.style.display=''; return; }
    row.style.display=on.indexOf(row.dataset.source)>=0?'':'none';
  });
  if(!showAll&&on.length){
    var activeTab=document.querySelector('.tab.active');
    var activeId=activeTab&&activeTab.dataset.t;
    var cDom=visibleCount('dom');
    var cOvs=visibleCount('ovs');
    if(activeId==='dom'&&cDom===0&&cOvs>0) switchTab('ovs');
    else if(activeId==='ovs'&&cOvs===0&&cDom>0) switchTab('dom');
    else if(on.length===1&&OVS_ONLY_SOURCES.indexOf(on[0])>=0&&cOvs>0&&cDom===0) switchTab('ovs');
  }
  updateEmptyHints();
}
document.querySelectorAll('.fb').forEach(function(b){
  b.addEventListener('click', function(){
    var row=b.closest('.jrow');
    var payload={id:row.dataset.id,company:row.dataset.co,title:row.dataset.title,reaction:b.dataset.r};
    b.disabled=true;
    fetch('/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      .then(function(r){return r.json()})
      .then(function(j){ if(j&&j.ok){ row.classList.remove('liked','disliked'); row.classList.add(b.dataset.r==='up'?'liked':'disliked'); } })
      .catch(function(){})
      .finally(function(){ b.disabled=false; });
  });
});
document.querySelectorAll('.tab').forEach(function(t){
  t.addEventListener('click', function(){
    switchTab(t.dataset.t);
    updateEmptyHints();
  });
});
document.querySelectorAll('.sf').forEach(function(b){
  b.addEventListener('click', function(){
    if(b.classList.contains('all')){
      document.querySelectorAll('.sf').forEach(function(x){ x.classList.remove('active'); x.setAttribute('aria-pressed','false'); });
      b.classList.add('active'); b.setAttribute('aria-pressed','true');
    } else {
      document.querySelector('.sf.all').classList.remove('active');
      document.querySelector('.sf.all').setAttribute('aria-pressed','false');
      b.classList.toggle('active');
      b.setAttribute('aria-pressed', b.classList.contains('active')?'true':'false');
      if(!document.querySelector('.sf.active:not(.all)')){
        document.querySelector('.sf.all').classList.add('active');
        document.querySelector('.sf.all').setAttribute('aria-pressed','true');
      }
    }
    applySrcFilter();
  });
});
var coIn=document.getElementById('coSearch');
if(coIn){
  coIn.addEventListener('input', function(){
    var q=(coIn.value||'').replace(/\\s/g,'').toLowerCase();
    document.querySelectorAll('.cochip').forEach(function(el){
      var n=(el.dataset.name||'').replace(/\\s/g,'').toLowerCase();
      el.classList.toggle('hidden', q.length>0 && n.indexOf(q)<0);
    });
  });
}
</script>
</body></html>`;
  await writeFile("reports/dashboard.html", html, "utf8");
  return "reports/dashboard.html";
}

export async function renderMarkdown(fresh, ranked) {
  const lines = [`# ${today()} 맞춤 채용 공고`, ""];
  lines.push(`- 맞는 공고 **${ranked.length}건**, 그중 새 공고 **${fresh.length}건**`, "");
  if (fresh.length) {
    lines.push("## 🆕 오늘의 새 공고");
    for (const j of fresh.slice(0, 20))
      lines.push(`- **[${j.score}점]** [${j.title}](${j.url}) — ${j.company} (${j.experience} / ${j.location})`);
    lines.push("");
  }
  lines.push("## ⭐ 적합도 상위 10");
  for (const j of ranked.slice(0, 10))
    lines.push(`- **[${j.score}점]** [${j.title}](${j.url}) — ${j.company} (${j.experience} / ${j.location})`);
  const path = `reports/${today()}.md`;
  await writeFile(path, lines.join("\n"), "utf8");
  return path;
}
