// 공고 찾기 전 Instagram 로그인 확인 (에이전시 수집) — Enter까지 대기 후 수집
import { isInstagramSessionValid, hasInstagramAuthFile, DEFAULT_AUTH_PATH } from "./instagram-auth.mjs";
import { runInstagramLogin } from "./instagram-login-flow.mjs";
import { askLine, isYes, isNo, askRetryLoginOrSkip, SESSION_ONLY_NOTICE } from "./prompt.mjs";

function instagramAgenciesEnabled(col) {
  const ig = col.instagram_agencies || {};
  return ig.enabled !== false;
}

/**
 * @returns {{ skipInstagram: boolean }}
 */
export async function ensureInstagramBeforeCrawl(col) {
  if (!instagramAgenciesEnabled(col)) return { skipInstagram: true };

  const authPath = col.instagram_agencies?.auth_path || DEFAULT_AUTH_PATH;

  let sessionOk = false;
  try {
    sessionOk = await isInstagramSessionValid(authPath);
  } catch {
    sessionOk = false;
  }

  if (sessionOk) {
    console.log("");
    console.log("  → Instagram: 저장된 로그인 세션이 확인됐습니다. (에이전시 수집 포함)");
    return { skipInstagram: false };
  }

  console.log("");
  console.log("■ Instagram: 에이전시 채용 게시물 수집을 위해 로그인·세션 확인이 필요합니다.");
  console.log(`  ${SESSION_ONLY_NOTICE}`);
  console.log("  Enter를 누르기 전까지 사람인·잡코리아 등 다른 사이트 검색은 시작하지 않습니다.");

  if (!process.stdin.isTTY) {
    console.log("  (자동 모드 — Instagram 수집을 건너뜁니다.)");
    console.log("  → `인스타로그인.cmd` 실행 후 다시 공고 찾기를 해 주세요.");
    return { skipInstagram: true };
  }

  let offerLogin = true;
  for (;;) {
    if (offerLogin) {
      const ans = await askLine("지금 Instagram 로그인을 진행할까요? (Y/N): ");
      if (isNo(ans) || ans === "") {
        console.log("  → 이번에는 Instagram 에이전시 없이 다른 사이트만 찾습니다.");
        return { skipInstagram: true };
      }
      if (!isYes(ans)) {
        console.log("  Y(예) 또는 N(아니오)로 입력해 주세요.");
        continue;
      }
    }

    const { ensureEnvironment } = await import("./setup-check.mjs");
    const env = await ensureEnvironment({ interactive: true, requirePlaywright: true });
    if (!env.ok) {
      console.log("  → Playwright 준비가 되지 않아 Instagram을 건너뜁니다.");
      return { skipInstagram: true };
    }

    await runInstagramLogin();

    try {
      sessionOk = await isInstagramSessionValid(authPath);
    } catch {
      sessionOk = false;
    }

    if (sessionOk) {
      console.log("  → Instagram 로그인 확인됨. 에이전시 수집을 진행합니다.");
      return { skipInstagram: false };
    }

    if (await hasInstagramAuthFile(authPath)) {
      console.log("  → 로그인 정보는 저장됐습니다. 자동 확인만 실패해, 저장된 세션으로 수집을 시도합니다.");
      return { skipInstagram: false };
    }

    console.log("  → Instagram 로그인 세션이 저장되지 않았습니다.");

    const choice = await askRetryLoginOrSkip("Instagram");
    if (choice === "retry") {
      offerLogin = false;
      continue;
    }
    console.log("  → Instagram 없이 다른 사이트만 찾습니다.");
    return { skipInstagram: true };
  }
}
