// 터미널에서 Y/N · 한 줄 입력 (공고 찾기·설치 확인 등)
import readline from "node:readline";

export function askLine(question) {
  if (!process.stdin.isTTY) return Promise.resolve("");
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (ans) => {
      rl.close();
      resolve((ans || "").trim());
    });
  });
}

/** 로그인 스크립트용 — Enter 한 번 받을 때까지 다음 단계로 진행하지 않음 */
export function waitForEnter(message) {
  return askLine(message);
}

export const SESSION_ONLY_NOTICE =
  "비밀번호는 저장하지 않습니다. 브라우저에서 직접 로그인한 뒤, 로그인 쿠키만 이 PC에 저장합니다.";

export function isYes(ans) {
  const a = String(ans).trim().toLowerCase();
  return a === "y" || a === "yes" || a === "예" || a === "ㅛ" || a === "ㅇ" || a === "네";
}

export function isNo(ans) {
  const a = String(ans).trim().toLowerCase();
  return a === "n" || a === "no" || a === "아니오" || a === "ㄴ" || a === "아니";
}

/** Y/N 질문 — TTY 아니면 defaultNo 반환 */
export async function askYesNo(question, { defaultNo = true } = {}) {
  if (!process.stdin.isTTY) return !defaultNo;
  for (;;) {
    const ans = await askLine(question);
    if (isYes(ans)) return true;
    if (isNo(ans) || (ans === "" && defaultNo)) return false;
    console.log("  Y(예) 또는 N(아니오)로 입력해 주세요.");
  }
}

/** Enter 후 세션 미확인 — 다시 로그인 vs 제외하고 계속 */
export async function askRetryLoginOrSkip(siteName) {
  console.log("");
  console.log(`  → ${siteName} 로그인 세션이 확인되지 않았습니다.`);
  for (;;) {
    const ans = await askLine(`  Y = ${siteName} 다시 로그인 / N = ${siteName} 제외하고 다른 사이트만 찾기: `);
    if (isYes(ans)) return "retry";
    if (isNo(ans) || ans === "") return "skip";
    console.log("  Y(다시) 또는 N(제외)로 입력해 주세요.");
  }
}
