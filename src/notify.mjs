// 데스크톱 알림 — 윈도우 토스트(베스트 에포트). 실패해도 throw하지 않음.
import { spawn } from "node:child_process";

export function toast(title, body) {
  return new Promise((resolve) => {
    try {
      const ps = spawn(
        "powershell.exe",
        ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "scripts/notify.ps1", "-Title", title, "-Body", body],
        { windowsHide: true }
      );
      let out = "";
      ps.stdout.on("data", (d) => (out += d));
      ps.on("close", () => resolve(out.trim() || "done"));
      ps.on("error", () => resolve("spawn-failed"));
    } catch {
      resolve("spawn-failed");
    }
  });
}
