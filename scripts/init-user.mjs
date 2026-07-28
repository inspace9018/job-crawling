// .env.example → .env (없을 때만)
import { copyFile, access } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";
import { PROJECT_ROOT } from "../src/env.mjs";

async function exists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

console.log("");
console.log("■ 초기 설정 (.env)");
console.log("");

const from = join(PROJECT_ROOT, ".env.example");
const to = join(PROJECT_ROOT, ".env");

if (await exists(to)) {
  console.log("  · .env: 이미 있습니다.");
} else if (!(await exists(from))) {
  console.log("  · .env.example 이 없습니다.");
} else {
  await copyFile(from, to);
  console.log("  · .env 생성됨 → 메모장으로 열어 본인 정보를 채워 주세요.");
}

console.log("");
console.log("수집·키워드는 config/search-settings.json 에 있습니다 (필요 시만 수정).");
console.log("");
