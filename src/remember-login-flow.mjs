// 리멤버 브라우저 로그인 → storageState 저장 (비밀번호 저장 없음)
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DEFAULT_AUTH_PATH } from "./remember-auth.mjs";
import { saveContextAuth, readSessionCookieDays } from "./session-store.mjs";
import { waitForEnter, SESSION_ONLY_NOTICE } from "./prompt.mjs";

const LOGIN_URL = "https://career.rememberapp.co.kr/job/postings";

/** @returns {Promise<boolean>} */
export async function runRememberLogin() {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("");
    console.error("Playwright가 없습니다. 이 창에서 한 번만 실행:");
    console.error("  npm install");
    console.error("  npx playwright install chromium");
    console.error("그다음 리멤버로그인.cmd 를 다시 실행하세요.");
    return false;
  }

  console.log("============================================");
  console.log("  리멤버 로그인 (세션만 저장, 비밀번호 저장 안 함)");
  console.log("============================================");
  console.log(`  ${SESSION_ONLY_NOTICE}`);
  console.log("1) 곧 브라우저가 열립니다.");
  console.log("2) 리멤버에 직접 로그인하세요.");
  console.log("3) 로그인·채용 화면이 보이면 이 창으로 와서 Enter");
  console.log("   Enter 전까지 사람인 등 다른 사이트 검색은 시작하지 않습니다.");
  console.log("");

  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ locale: "ko-KR" });
    const page = await context.newPage();
    await page.goto(LOGIN_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    await waitForEnter("로그인 완료 후 Enter 키를 누르세요... ");

    const outPath = DEFAULT_AUTH_PATH;
    await mkdir(dirname(outPath), { recursive: true });
    const days = await readSessionCookieDays();
    await saveContextAuth(context, outPath, { domainIncludes: "remember", days });

    console.log("");
    console.log(`저장됨: ${outPath} (쿠키 보관 약 ${days}일)`);
    console.log("이제 공고 찾기에 리멤버가 포함됩니다.");
    console.log("(세션이 끊기면 로그인을 다시 실행하세요.)");
    return true;
  } finally {
    await browser.close();
  }
}
