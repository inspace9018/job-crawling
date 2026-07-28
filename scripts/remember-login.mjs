// CLI: 리멤버 로그인 (공고 찾기와 분리 — import 시 자동 실행 없음)
import { ensureEnvironment } from "../src/setup-check.mjs";
import { runRememberLogin } from "../src/remember-login-flow.mjs";

async function main() {
  const env = await ensureEnvironment({ interactive: true, requirePlaywright: true });
  if (!env.ok) process.exit(1);
  const ok = await runRememberLogin();
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error("오류:", e.message);
  process.exit(1);
});
