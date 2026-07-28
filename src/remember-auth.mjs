// 리멤버 로그인 세션(쿠키) — data/remember-auth.json (Playwright storageState). 비밀번호는 저장하지 않음.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { UA } from "./util.mjs";

const CAREER_ORIGIN = "https://career.rememberapp.co.kr";

export const DEFAULT_AUTH_PATH = "data/remember-auth.json";

export async function loadRememberAuth(path = DEFAULT_AUTH_PATH) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

/** Playwright storageState → Cookie 헤더 (fetch용) */
export function cookieHeaderFromAuth(auth) {
  if (!auth?.cookies?.length) return "";
  const now = Date.now() / 1000;
  return auth.cookies
    .filter((c) => {
      if (!c.domain?.includes("remember")) return false;
      if (c.expires && c.expires > 0 && c.expires < now) return false;
      return true;
    })
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

export function authHintMissing() {
  console.log("  [remember] 로그인 세션 없음 → `리멤버로그인.cmd` 실행 후 다시 공고 찾기");
}

const SESSION_COOKIE = /remember.*session|_remember_web_session|remember_session|_remember_cookie/i;

export async function isRememberSessionValid(path = DEFAULT_AUTH_PATH) {
  const auth = await loadRememberAuth(path);
  if (!auth?.cookies?.length) return false;
  const header = cookieHeaderFromAuth(auth);
  if (!header || header.length < 8) return false;
  const now = Date.now() / 1000;
  const rememberCookies = auth.cookies.filter((c) => c.domain?.includes("remember"));
  if (!rememberCookies.length) return false;
  const hasSessionName = rememberCookies.some((c) => SESSION_COOKIE.test(c.name) && String(c.value || "").length > 0);
  const anyLive = rememberCookies.some(
    (c) => String(c.value || "").length > 0 && (!c.expires || c.expires <= 0 || c.expires > now)
  );
  if (!hasSessionName && !anyLive) return false;

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(`${CAREER_ORIGIN}/job/postings`, {
      headers: {
        "User-Agent": UA,
        Cookie: header,
        Accept: "text/html,application/xhtml+xml",
        Referer: `${CAREER_ORIGIN}/`,
        "Accept-Language": "ko-KR,ko;q=0.9",
      },
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.status === 401 || res.status === 403) return false;
    if (!res.ok) return false;
    const html = await res.text();
    if (html.length < 200) return false;
    const loginOnly =
      /sign[\-_]?in|\/login|로그인\s*\/\s*회원가입/i.test(html) &&
      !/job_postings|jobPostings|채용/i.test(html);
    return !loginOnly;
  } catch {
    return hasSessionName || anyLive;
  }
}

export async function hasRememberAuthFile(path = DEFAULT_AUTH_PATH) {
  const header = cookieHeaderFromAuth(await loadRememberAuth(path));
  return header.length >= 12;
}
