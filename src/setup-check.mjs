// 실행 전 환경 점검 — 부족한 항목을 모아 한 번에 설치 여부 질문
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { askYesNo } from "./prompt.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_NODE_MAJOR = 18;

function runCmd(cmd, args, cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: "inherit", shell: process.platform === "win32" });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

function nodeMajor() {
  const m = /^v(\d+)/.exec(process.version);
  return m ? +m[1] : 0;
}

async function canImportPlaywright() {
  try {
    await import("playwright");
    return true;
  } catch {
    return false;
  }
}

async function hasChromiumBrowser() {
  try {
    const { chromium } = await import("playwright");
    const exe = chromium.executablePath();
    return existsSync(exe);
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<{ ok: boolean, issues: { code: string, label: string, detail?: string }[] }>}
 */
export async function auditEnvironment() {
  const issues = [];

  if (nodeMajor() < MIN_NODE_MAJOR) {
    issues.push({
      code: "node_version",
      label: `Node.js ${MIN_NODE_MAJOR} 이상 필요 (현재 ${process.version})`,
      detail: "https://nodejs.org/ 에서 LTS 버전을 설치해 주세요.",
    });
  }

  const pkgPlaywright = existsSync(join(ROOT, "node_modules", "playwright"));
  const importOk = pkgPlaywright || (await canImportPlaywright());
  if (!importOk) {
    issues.push({
      code: "npm_packages",
      label: "npm 패키지 (Playwright — 리멤버 로그인·수집용)",
      detail: "npm install",
    });
  }

  if (importOk) {
    const browser = await hasChromiumBrowser();
    if (!browser) {
      issues.push({
        code: "playwright_browser",
        label: "Playwright Chromium 브라우저",
        detail: "npx playwright install chromium",
      });
    }
  } else if (!issues.some((i) => i.code === "npm_packages")) {
    issues.push({
      code: "playwright_browser",
      label: "Playwright Chromium 브라우저",
      detail: "패키지 설치 후 브라우저 다운로드",
    });
  }

  const blocking = issues.some((i) => i.code === "node_version");
  return { ok: issues.length === 0, issues, blocking };
}

async function applyInstalls(issues) {
  const needNpm = issues.some((i) => i.code === "npm_packages");
  const needBrowser = issues.some(
    (i) => i.code === "playwright_browser" || i.code === "npm_packages"
  );

  if (needNpm) {
    console.log("\n■ npm install 실행 중… (1~3분 걸릴 수 있습니다)\n");
    await runCmd("npm", ["install", "--no-fund", "--no-audit"]);
  }
  if (needBrowser) {
    console.log("\n■ Playwright Chromium 다운로드 중…\n");
    await runCmd("npx", ["playwright", "install", "chromium"]);
  }
}

/**
 * @param {{ interactive?: boolean, requirePlaywright?: boolean }} opts
 * @returns {Promise<{ ok: boolean, playwrightReady: boolean }>}
 */
export async function ensureEnvironment(opts = {}) {
  const { interactive = true, requirePlaywright = false } = opts;

  let audit = await auditEnvironment();

  if (audit.blocking) {
    console.log("\n■ 실행 환경 확인");
    for (const i of audit.issues) {
      console.log(`  · ${i.label}`);
      if (i.detail) console.log(`    ${i.detail}`);
    }
    console.log("");

    const nodeIssue = audit.issues.find((i) => i.code === "node_version");
    if (nodeIssue && process.platform === "win32" && interactive && process.stdin.isTTY) {
      const install = await askYesNo("Node.js LTS 를 winget 으로 설치·업그레이드 할까요? (Y/N): ", {
        defaultNo: false,
      });
      if (install) {
        console.log("\n■ Node.js LTS 설치 중… (관리자 확인 창이 뜰 수 있습니다)\n");
        try {
          await runCmd("winget", [
            "install",
            "-e",
            "--id",
            "OpenJS.NodeJS.LTS",
            "--accept-package-agreements",
            "--accept-source-agreements",
          ]);
          console.log("\n  설치가 끝났습니다. 이 창을 닫고 공고새로찾기.cmd 를 다시 실행해 주세요.\n");
        } catch (e) {
          console.error("\n  winget 설치 실패:", e.message);
          console.log("  https://nodejs.org/ 에서 LTS 를 직접 설치해 주세요.\n");
        }
      } else {
        console.log("\nNode.js 설치 후 이 창을 다시 실행해 주세요.\n");
      }
      return { ok: false, playwrightReady: false };
    }

    console.log("\nNode.js 설치 후 이 창을 다시 실행해 주세요.\n");
    return { ok: false, playwrightReady: false };
  }

  if (audit.ok) {
    return { ok: true, playwrightReady: await hasChromiumBrowser() };
  }

  console.log("\n■ 실행 전 준비가 필요합니다");
  for (const i of audit.issues) {
    console.log(`  · ${i.label}`);
  }
  console.log("");

  if (!interactive || !process.stdin.isTTY) {
    console.log("  (입력할 수 없는 모드 — 설치를 건너뜁니다.)");
    if (requirePlaywright) return { ok: false, playwrightReady: false };
    return { ok: true, playwrightReady: false };
  }

  const install = await askYesNo("위 항목을 지금 설치할까요? (Y/N): ", { defaultNo: false });

  if (!install) {
    console.log("");
    if (requirePlaywright) {
      console.log("  → Playwright 없이는 리멤버 로그인을 할 수 없습니다.");
      return { ok: false, playwrightReady: false };
    }
    console.log("  → 설치 없이 진행합니다. (리멤버 기능은 사용할 수 없을 수 있습니다.)");
    return { ok: true, playwrightReady: false };
  }

  try {
    await applyInstalls(audit.issues);
  } catch (e) {
    console.error("\n  설치 중 오류:", e.message);
    return { ok: false, playwrightReady: false };
  }

  audit = await auditEnvironment();
  const playwrightReady = await hasChromiumBrowser();

  if (!audit.ok) {
    console.log("\n  일부 항목이 아직 준비되지 않았습니다. 위 메시지를 확인해 주세요.\n");
    return { ok: !requirePlaywright, playwrightReady };
  }

  console.log("\n  준비 완료.\n");
  return { ok: true, playwrightReady };
}
