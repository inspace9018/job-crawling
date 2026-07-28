// 저장·이력 관리 — '이미 본 공고'를 기억해 새 공고만 구분한다.
import { readJson, writeJson, today } from "./util.mjs";

const SEEN = "data/seen.json";
const LATEST = "data/jobs_latest.json";
const RUNS = "data/runs.json";

export async function loadSeen() {
  return await readJson(SEEN, {}); // { id: 최초발견일 }
}

// ranked 공고들 중 seen에 없는 것 = 새 공고. seen 갱신 후 새 공고 목록 반환.
export async function markNewAndSave(ranked) {
  const seen = await loadSeen();
  const day = today();
  const fresh = [];
  for (const j of ranked) {
    if (!seen[j.id]) {
      seen[j.id] = day;
      j.is_new = true;
      fresh.push(j);
    } else {
      j.is_new = false;
      j.first_seen = seen[j.id];
    }
  }
  await writeJson(SEEN, seen);
  await writeJson(LATEST, { generated: day, count: ranked.length, jobs: ranked });
  return fresh;
}

export async function logRun(stats) {
  const runs = await readJson(RUNS, { runs: [] });
  runs.runs.push({ when: today(), ...stats });
  if (runs.runs.length > 200) runs.runs = runs.runs.slice(-200);
  await writeJson(RUNS, runs);
}
