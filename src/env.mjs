// 프로젝트 루트 .env 로드 (외부 패키지 없음)
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

export const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let envLoaded = false;

function parseEnvValue(raw) {
  let val = raw.trim();
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1);
  }
  return val.replace(/\\n/g, "\n");
}

/** .env 파일을 process.env에 병합 (이미 있는 키는 덮어쓰지 않음) */
export function loadEnvFile(path = join(PROJECT_ROOT, ".env")) {
  if (envLoaded) return;
  envLoaded = true;
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = parseEnvValue(trimmed.slice(eq + 1));
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

export function envOr(key, fallback = "") {
  loadEnvFile();
  const v = process.env[key];
  return v !== undefined && v !== "" ? v : fallback;
}
