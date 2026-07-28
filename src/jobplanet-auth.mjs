// 잡플래닛 로그인 세션 — data/jobplanet-auth.json (Playwright storageState)
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { UA } from "./util.mjs";

export const DEFAULT_AUTH_PATH = "data/jobplanet-auth.json";
const BASE = "https://www.jobplanet.co.kr";
const PROBE_URL = `${BASE}/job/search?query=${encodeURIComponent("디자인")}&page=1`;

export async function loadJobplanetAuth(path = DEFAULT_AUTH_PATH) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

export function cookieHeaderFromJobplanetAuth(auth) {
  if (!auth?.cookies?.length) return "";
  const now = Date.now() / 1000;
  return auth.cookies
    .filter((c) => {
      if (!c.domain?.includes("jobplanet")) return false;
      if (c.expires && c.expires > 0 && c.expires < now) return false;
      return String(c.value || "").length > 0;
    })
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

function htmlLooksLikeJobSearch(html, pageUrl = "") {
  if (!html || html.length < 500) return false;
  if (/user-session\/sign-in|membership\/sign_in/i.test(pageUrl)) return false;
  if (/\/job_postings\/\d+|companies\/\d+\/job_postings/.test(html)) return true;
  const loginOnly =
    /user-session\/sign-in|membership\/sign_in/i.test(html) &&
    !/\/job_postings\/|job_postings\//.test(html);
  return !loginOnly && html.length > 8000;
}

async function isJobplanetSessionValidFetch(path = DEFAULT_AUTH_PATH) {
  const auth = await loadJobplanetAuth(path);
  const cookie = cookieHeaderFromJobplanetAuth(auth);
  if (!cookie || cookie.length < 8) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(PROBE_URL, {
      headers: {
        "User-Agent": UA,
        Cookie: cookie,
        Accept: "text/html,application/xhtml+xml",
        Referer: `${BASE}/job`,
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.status === 403 || res.status === 401) return false;
    if (!res.ok) return false;
    const html = await res.text();
    return htmlLooksLikeJobSearch(html, res.url || PROBE_URL);
  } catch {
    return false;
  }
}

async function isJobplanetSessionValidPlaywright(path = DEFAULT_AUTH_PATH) {
  if (!existsSync(path)) return false;
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return false;
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ storageState: path, userAgent: UA, locale: "ko-KR" });
    const page = await context.newPage();
    const resp = await page.goto(PROBE_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    if (resp && (resp.status() === 403 || resp.status() === 401)) return false;
    await page.waitForTimeout(1500);
    const html = await page.content();
    return htmlLooksLikeJobSearch(html, page.url());
  } catch {
    return false;
  } finally {
    await browser.close();
  }
}

/** 저장된 세션으로 채용 검색 페이지 접근 가능한지 확인 (Node fetch 실패 시 Playwright로 재확인) */
export async function isJobplanetSessionValid(path = DEFAULT_AUTH_PATH) {
  const cookie = cookieHeaderFromJobplanetAuth(await loadJobplanetAuth(path));
  if (!cookie || cookie.length < 8) return false;
  if (await isJobplanetSessionValidFetch(path)) return true;
  return isJobplanetSessionValidPlaywright(path);
}

export async function hasJobplanetAuthFile(path = DEFAULT_AUTH_PATH) {
  const cookie = cookieHeaderFromJobplanetAuth(await loadJobplanetAuth(path));
  return cookie.length >= 12;
}

export async function jobplanetCookieHeader(path = DEFAULT_AUTH_PATH) {
  return cookieHeaderFromJobplanetAuth(await loadJobplanetAuth(path));
}
