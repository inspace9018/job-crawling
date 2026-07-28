// 공통 유틸 — HTML 디코딩/정리, 안전한 fetch, 파일 입출력.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";

export const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
export function decodeEntities(s = "") {
  return s
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ENT[e] ?? _)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}
export function stripTags(s = "") {
  return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

// 재시도 가능한 텍스트 fetch (한 출처가 막혀도 전체가 멈추지 않게 호출측에서 try/catch).
export async function fetchText(url, { headers = {}, retries = 2, timeoutMs = 15000 } = {}) {
  let lastErr;
  for (let i = 0; i <= retries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9", ...headers },
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (i < retries) await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function readJson(path, fallback) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return fallback;
  }
}
export async function writeJson(path, obj) {
  if (!existsSync(dirname(path))) await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(obj, null, 2), "utf8");
}
export const today = () => new Date().toISOString().slice(0, 10);
/** 화면이 최신인지 확인용 — 현지 시각 HH:MM */
export const nowHM = () =>
  new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
export const nowIso = () => new Date().toISOString();
