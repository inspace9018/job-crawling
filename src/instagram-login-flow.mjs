// Instagram 로그인 → 세션 저장 (비밀번호 파일 저장 없음)
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DEFAULT_AUTH_PATH } from "./instagram-auth.mjs";
import { ensureEnvironment } from "./setup-check.mjs";
import { saveContextAuth, readSessionCookieDays } from "./session-store.mjs";
import { waitForEnter, SESSION_ONLY_NOTICE } from "./prompt.mjs";

export async function runInstagramLogin() {
  const env = await ensureEnvironment({ interactive: true, requirePlaywright: true });
  if (!env.ok) return false;

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright가 필요합니다.");
    return false;
  }

  console.log("");
  console.log("============================================");
  console.log("  Instagram 로그인 (세션만 저장, 비밀번호 저장 안 함)");
  console.log("============================================");
  console.log(`  ${SESSION_ONLY_NOTICE}`);
  console.log("1) 브라우저에서 Instagram에 로그인하세요.");
  console.log("2) 피드가 보이면 이 창으로 와서 Enter");
  console.log("   Enter 전까지 다른 사이트 공고 검색은 시작하지 않습니다.");
  console.log("");

  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ locale: "ko-KR", ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 90000 });

    await waitForEnter("로그인 완료 후 Enter 키를 누르세요... ");

    const outPath = DEFAULT_AUTH_PATH;
    await mkdir(dirname(outPath), { recursive: true });
    const days = await readSessionCookieDays();
    await saveContextAuth(context, outPath, { domainIncludes: "instagram", days });
    console.log(`\n저장됨: ${outPath} (쿠키 보관 약 ${days}일)`);
    return true;
  } finally {
    await browser.close();
  }
}
