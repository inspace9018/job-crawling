// npm · Playwright 등 실행 환경 점검 및 선택 설치 (cmd에서도 호출 가능)
import { ensureEnvironment } from "../src/setup-check.mjs";

const requirePlaywright = process.argv.includes("--playwright");
const env = await ensureEnvironment({ interactive: true, requirePlaywright });
process.exit(env.ok ? 0 : 1);
