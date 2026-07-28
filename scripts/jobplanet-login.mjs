// CLI: 잡플래닛 로그인 (공고 찾기와 분리 — import 시 자동 실행 없음)
import { runJobplanetLogin } from "../src/jobplanet-login-flow.mjs";

async function main() {
  const ok = await runJobplanetLogin();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("오류:", e.message);
  process.exit(1);
});
