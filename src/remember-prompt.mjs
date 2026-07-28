// 공고 찾기 시작 전 리멤버 로그인 확인 — Enter까지 대기 후에만 수집 진행
import { isRememberSessionValid } from "./remember-auth.mjs";
import { runRememberLogin } from "./remember-login-flow.mjs";
import { askLine, isYes, isNo, askRetryLoginOrSkip, SESSION_ONLY_NOTICE } from "./prompt.mjs";

function rememberEnabled(col) {
  const p = col.job_portals || {};
  if (p.enabled === false) return false;
  const one = p.remember;
  if (one && one.enabled === false) return false;
  return true;
}

/**
 * @returns {{ skipRemember: boolean }}
 */
export async function ensureRememberBeforeCrawl(col) {
  if (!rememberEnabled(col)) return { skipRemember: true };

  if (await isRememberSessionValid()) return { skipRemember: false };

  console.log("");
  console.log("■ 리멤버: 로그인·세션 확인이 필요합니다.");
  console.log(`  ${SESSION_ONLY_NOTICE}`);
  console.log("  Enter를 누르기 전까지 사람인·잡코리아 등 다른 사이트 검색은 시작하지 않습니다.");

  if (!process.stdin.isTTY) {
    console.log("  (자동 실행 모드 — 로그인 창을 띄울 수 없어 리멤버 수집을 건너뜁니다.)");
    console.log("  → `리멤버로그인.cmd` 실행 후 다시 공고 찾기를 해 주세요.");
    return { skipRemember: true };
  }

  let offerLogin = true;
  for (;;) {
    if (offerLogin) {
      const ans = await askLine("지금 리멤버 로그인을 진행할까요? (Y/N): ");
      if (isNo(ans) || ans === "") {
        console.log("  → 이번에는 리멤버 없이 다른 사이트만 찾습니다.");
        return { skipRemember: true };
      }
      if (!isYes(ans)) {
        console.log("  Y(예) 또는 N(아니오)로 입력해 주세요.");
        continue;
      }
    }

    const { ensureEnvironment } = await import("./setup-check.mjs");
    const env = await ensureEnvironment({ interactive: true, requirePlaywright: true });
    if (!env.ok) {
      console.log("  → Playwright 준비가 되지 않아 리멤버를 건너뜁니다.");
      return { skipRemember: true };
    }

    await runRememberLogin();

    if (await isRememberSessionValid()) return { skipRemember: false };

    console.log("  → 로그인은 저장됐지만, 사이트에서 세션 확인에 실패했습니다.");
    console.log("  → 이번 실행에서는 저장된 쿠키로 리멤버 수집을 시도합니다.");

    const { hasRememberAuthFile } = await import("./remember-auth.mjs");
    if (await hasRememberAuthFile()) return { skipRemember: false };

    const choice = await askRetryLoginOrSkip("리멤버");
    if (choice === "retry") {
      offerLogin = false;
      continue;
    }
    console.log("  → 리멤버 없이 다른 사이트만 찾습니다.");
    return { skipRemember: true };
  }
}
