#!/usr/bin/env node
// 사용량 게이트 — ccusage 실제 사용량과 '남은 시간 대비 페이스'를 비교해 GO/WAIT 결정.
// 창: 월(구독 주기, 기본) / 주간 / 5시간 — 각 창은 budget>0 일 때만 켜진다. 켜진 창이 모두 통과해야 GO.
// 사용: node scripts/usage-gate.mjs   (GO=exit 0, WAIT=exit 10, 측정실패=exit 1→안전상 WAIT 취급)
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const CFG_PATH = new URL("../usage_budget.json", import.meta.url);

function runCcusage(args) {
  const out = execSync(`npx -y ccusage@latest ${args}`, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 120000,
  });
  return JSON.parse(out);
}

function metricOf(obj, metric) {
  if (metric === "cost") return obj.costUSD ?? obj.totalCost ?? 0;
  if (metric === "tokens") return obj.totalTokens ?? 0;
  if (metric === "tokens_billable") {
    const t = obj.tokenCounts ?? obj;
    return (t.inputTokens ?? 0) + (t.outputTokens ?? 0) + (t.cacheCreationInputTokens ?? t.cacheCreationTokens ?? 0);
  }
  return obj.costUSD ?? obj.totalCost ?? 0;
}
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function fmt(metric, v) {
  return metric === "cost" ? `$${v.toFixed(2)}` : `${Math.round(v).toLocaleString()}tok`;
}
function dstr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
// 월 day 안전 생성(말일 초과 방지)
function resetDateFor(year, month, day) {
  const dim = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, dim), 0, 0, 0, 0);
}

function gate(label, used, budget, elapsedFrac, marginPct, windowSec) {
  const line = budget * elapsedFrac;
  const threshold = line * (1 - marginPct / 100);
  const pass = used <= threshold;
  let waitSec = 0;
  if (!pass) {
    const fracNeeded = used / (budget * (1 - marginPct / 100));
    waitSec = Math.max(0, (fracNeeded - elapsedFrac) * windowSec);
  }
  return { label, pass, used, budget, line, threshold, elapsedFrac, waitSec };
}

function main() {
  const cfg = JSON.parse(readFileSync(CFG_PATH, "utf8"));
  const metric = cfg.metric ?? "cost";
  const margin = cfg.margin_percent ?? 10;
  const now = Date.now();
  const gates = [];
  let daily = null;
  const getDaily = () => (daily ??= (runCcusage("daily --json").daily ?? []));
  const sumDailySince = (startStr) => {
    let u = 0;
    for (const r of getDaily()) if ((r.period ?? r.date ?? "") >= startStr) u += metricOf(r, metric);
    return u;
  };

  // ── 월 (구독 주기) ──
  if (cfg.monthly?.budget > 0) {
    try {
      const day = cfg.monthly.reset_day ?? 1;
      const n = new Date(now);
      let cyc = resetDateFor(n.getFullYear(), n.getMonth(), day);
      if (cyc.getTime() > now) cyc = resetDateFor(n.getFullYear(), n.getMonth() - 1, day);
      const next = resetDateFor(cyc.getFullYear(), cyc.getMonth() + 1, day);
      const winSec = (next.getTime() - cyc.getTime()) / 1000;
      const frac = clamp((now - cyc.getTime()) / (next.getTime() - cyc.getTime()), 0, 1);
      gates.push(gate("월", sumDailySince(dstr(cyc)), cfg.monthly.budget, frac, margin, winSec));
    } catch (e) { gates.push({ label: "월", pass: false, error: String(e.message || e) }); }
  }

  // ── 주간 (선택) ──
  if (cfg.weekly?.budget > 0) {
    try {
      const rw = cfg.weekly.reset_weekday ?? 1, rh = cfg.weekly.reset_hour ?? 0;
      const d = new Date(now); d.setHours(rh, 0, 0, 0);
      if (d.getTime() > now) d.setDate(d.getDate() - 1);
      while (d.getDay() !== rw) d.setDate(d.getDate() - 1);
      const frac = clamp((now - d.getTime()) / (7 * 86400000), 0, 1);
      gates.push(gate("주간", sumDailySince(dstr(d)), cfg.weekly.budget, frac, margin, 7 * 86400));
    } catch (e) { gates.push({ label: "주간", pass: false, error: String(e.message || e) }); }
  }

  // ── 5시간 (선택, 실제 하드캡 예방) ──
  if (cfg.session_5h?.budget > 0) {
    try {
      const b = (runCcusage("blocks --active --json").blocks ?? []).find((x) => x.isActive);
      if (!b) gates.push({ label: "5시간", pass: true, idle: true });
      else {
        const start = new Date(b.startTime).getTime(), end = new Date(b.endTime).getTime();
        const frac = clamp((now - start) / (end - start), 0, 1);
        gates.push(gate("5시간", metricOf(b, metric), cfg.session_5h.budget, frac, margin, 5 * 3600));
      }
    } catch (e) { gates.push({ label: "5시간", pass: false, error: String(e.message || e) }); }
  }

  // ── 종합 ──
  if (gates.length === 0) {
    console.log("켜진 창이 없음(모든 budget=0) → 게이트 비활성, 통과 처리.");
    console.log("DECISION: GO");
    console.log("SUGGEST_WAIT_SECONDS: 0");
    process.exit(0);
  }
  const errored = gates.some((g) => g.error);
  const decision = errored || !gates.every((g) => g.pass) ? "WAIT" : "GO";

  console.log(`사용량 게이트 (기준: ${metric}, 여유 ${margin}%)`);
  for (const g of gates) {
    if (g.error) { console.log(`  · ${g.label}: 측정 실패 → 안전상 대기 (${g.error})`); continue; }
    if (g.idle) { console.log(`  · ${g.label}: 활성 사용 없음 → 통과`); continue; }
    const status = g.pass ? "여유✅" : "초과⏸";
    console.log(`  · ${g.label}: 사용 ${fmt(metric, g.used)} / 페이스선 ${fmt(metric, g.line)} (예산 ${fmt(metric, g.budget)} 중 ${(g.elapsedFrac * 100).toFixed(0)}% 경과) → ${status}`);
  }
  const waits = gates.filter((g) => !g.pass && g.waitSec).map((g) => g.waitSec);
  const suggest = waits.length ? clamp(Math.round(Math.max(...waits)), 300, 3600) : 0;
  if (decision === "WAIT" && suggest) console.log(`  → 다음 확인 권장: 약 ${Math.round(suggest / 60)}분 후`);
  console.log(`DECISION: ${decision}`);
  console.log(`SUGGEST_WAIT_SECONDS: ${suggest}`);
  process.exit(decision === "GO" ? 0 : errored ? 1 : 10);
}

main();
