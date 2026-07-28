// 잡플래닛 브라우저 로그인 → storageState 저장 (비밀번호 저장 없음)
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { DEFAULT_AUTH_PATH } from "./jobplanet-auth.mjs";
import { ensureEnvironment } from "./setup-check.mjs";
import { saveContextAuth, readSessionCookieDays } from "./session-store.mjs";
import { waitForEnter, SESSION_ONLY_NOTICE } from "./prompt.mjs";

const BASE = "https://www.jobplanet.co.kr";
const START_URL = `${BASE}/job/search?query=${encodeURIComponent("디자인")}`;

/** @returns {Promise<boolean>} */
export async function runJobplanetLogin() {
  const env = await ensureEnvironment({ interactive: true, requirePlaywright: true });
  if (!env.ok) return false;

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error("Playwright를 사용할 수 없습니다. 공고 찾기 시작 시 설치(Y)를 선택해 주세요.");
    return false;
  }

  console.log("");
  console.log("============================================");
  console.log("  잡플래닛 로그인 (세션만 저장, 비밀번호 저장 안 함)");
  console.log("============================================");
  console.log(`  ${SESSION_ONLY_NOTICE}`);
  console.log("1) 브라우저가 열립니다.");
  console.log("2) 잡플래닛에 로그인하세요.");
  console.log("3) 채용 검색 화면이 보이면 이 창으로 와서 Enter");
  console.log("   Enter 전까지 사람인 등 다른 사이트 검색은 시작하지 않습니다.");
  console.log("");

  const browser = await chromium.launch({ headless: false });
  try {
    const context = await browser.newContext({ locale: "ko-KR" });
    const page = await context.newPage();
    await page.goto(START_URL, { waitUntil: "domcontentloaded", timeout: 90000 });

    await waitForEnter("로그인·검색 화면 확인 후 Enter 키를 누르세요... ");

    const outPath = DEFAULT_AUTH_PATH;
    await mkdir(dirname(outPath), { recursive: true });
    const days = await readSessionCookieDays();
    await saveContextAuth(context, outPath, { domainIncludes: "jobplanet", days });
    console.log(`\n저장됨: ${outPath} (쿠키 보관 약 ${days}일)`);
    return true;
  } finally {
    await browser.close();
  }
}
