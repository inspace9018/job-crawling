// CLI: Instagram 로그인 (에이전시 공고 수집용)
import { runInstagramLogin } from "../src/instagram-login-flow.mjs";

async function main() {
  const ok = await runInstagramLogin();
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("오류:", e.message);
  process.exit(1);
});
