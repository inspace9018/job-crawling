// 공고 찾기 전 잡플래닛 로그인 확인 — Enter까지 대기 후에만 수집 진행
import { isJobplanetSessionValid } from "./jobplanet-auth.mjs";
import { runJobplanetLogin } from "./jobplanet-login-flow.mjs";
import { askLine, isYes, isNo, askRetryLoginOrSkip, SESSION_ONLY_NOTICE } from "./prompt.mjs";

function jobplanetEnabled(col) {
  const p = col.job_portals || {};
  if (p.enabled === false) return false;
  const one = p.jobplanet;
  if (one && one.enabled === false) return false;
  return true;
}

/**
 * @returns {{ skipJobplanet: boolean }}
 */
export async function ensureJobplanetBeforeCrawl(col) {
  if (!jobplanetEnabled(col)) return { skipJobplanet: true };

  if (await isJobplanetSessionValid()) return { skipJobplanet: false };

  console.log("");
  console.log("■ 잡플래닛: 로그인·세션 확인이 필요합니다. (로그인 없으면 HTTP 403으로 수집되지 않습니다.)");
  console.log(`  ${SESSION_ONLY_NOTICE}`);
  console.log("  Enter를 누르기 전까지 사람인·잡코리아 등 다른 사이트 검색은 시작하지 않습니다.");

  if (!process.stdin.isTTY) {
    console.log("  (자동 모드 — 잡플래닛 수집을 건너뜁니다.)");
    console.log("  → `잡플래닛로그인.cmd` 실행 후 다시 공고 찾기를 해 주세요.");
    return { skipJobplanet: true };
  }

  let offerLogin = true;
  for (;;) {
    if (offerLogin) {
      const ans = await askLine("지금 잡플래닛 로그인을 진행할까요? (Y/N): ");
      if (isNo(ans) || ans === "") {
        console.log("  → 이번에는 잡플래닛 없이 다른 사이트만 찾습니다.");
        return { skipJobplanet: true };
      }
      if (!isYes(ans)) {
        console.log("  Y(예) 또는 N(아니오)로 입력해 주세요.");
        continue;
      }
    }

    await runJobplanetLogin();

    if (await isJobplanetSessionValid()) {
      console.log("  → 잡플래닛 로그인 확인됨. 수집을 진행합니다.");
      return { skipJobplanet: false };
    }

    const { hasJobplanetAuthFile } = await import("./jobplanet-auth.mjs");
    if (await hasJobplanetAuthFile()) {
      console.log("  → 로그인 정보는 저장됐습니다. 자동 확인만 실패해, 저장된 세션으로 수집을 시도합니다.");
      return { skipJobplanet: false };
    }

    console.log("  → 잡플래닛 로그인 세션이 저장되지 않았습니다.");

    const choice = await askRetryLoginOrSkip("잡플래닛");
    if (choice === "retry") {
      offerLogin = false;
      continue;
    }
    console.log("  → 잡플래닛 없이 다른 사이트만 찾습니다.");
    return { skipJobplanet: true };
  }
}
