// Instagram 로그인 세션 — data/instagram-auth.json (Playwright storageState)
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { UA } from "./util.mjs";

export const DEFAULT_AUTH_PATH = "data/instagram-auth.json";

export async function loadInstagramAuth(path = DEFAULT_AUTH_PATH) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch {
    return null;
  }
}

export function cookieHeaderFromInstagramAuth(auth) {
  if (!auth?.cookies?.length) return "";
  const now = Date.now() / 1000;
  return auth.cookies
    .filter((c) => {
      if (!c.domain?.includes("instagram")) return false;
      if (c.expires && c.expires > 0 && c.expires < now) return false;
      return String(c.value || "").length > 0;
    })
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/** 저장 파일에 Instagram 로그인에 쓰이는 핵심 쿠키가 있는지 (브라우저 없이) */
export function instagramCookiesLookLoggedIn(auth) {
  if (!auth?.cookies?.length) return false;
  const now = Date.now() / 1000;
  const ig = auth.cookies.filter((c) => c.domain?.includes("instagram"));
  const session = ig.find((c) => c.name === "sessionid" && String(c.value || "").length > 20);
  if (!session) return false;
  if (session.expires > 0 && session.expires < now) return false;
  const userId = ig.find((c) => c.name === "ds_user_id" && String(c.value || "").length > 0);
  return !!userId;
}

export async function hasInstagramAuthFile(path = DEFAULT_AUTH_PATH) {
  return instagramCookiesLookLoggedIn(await loadInstagramAuth(path));
}

async function isInstagramSessionValidPlaywright(path = DEFAULT_AUTH_PATH) {
  if (!existsSync(path)) return false;
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    return false;
  }

  let browser;
  let context;
  let page;
  let ok = false;

  try {
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      storageState: path,
      userAgent: UA,
      locale: "ko-KR",
      ignoreHTTPSErrors: true,
    });
    page = await context.newPage();
    await page.goto("https://www.instagram.com/", { waitUntil: "domcontentloaded", timeout: 45000 });
    await new Promise((r) => setTimeout(r, 1500));
    if (!page.isClosed()) {
      const url = page.url();
      if (!/accounts\/login|login\?/.test(url)) {
        try {
          ok = await page.evaluate(() => {
            if (document.querySelector('a[href*="/direct/"]')) return true;
            if (document.querySelector('svg[aria-label="홈"], svg[aria-label="Home"]')) return true;
            return !document.querySelector('input[name="username"]');
          });
        } catch {
          ok = false;
        }
      }
    }
  } catch {
    ok = false;
  } finally {
    try {
      await page?.close();
    } catch {}
    try {
      await context?.close();
    } catch {}
    try {
      await browser?.close();
    } catch {}
  }
  return ok;
}

/**
 * @param {{ browserCheck?: boolean }} opts — browserCheck: true면 Playwright로 재확인(느리고 환경에 따라 불안정)
 */
export async function isInstagramSessionValid(path = DEFAULT_AUTH_PATH, opts = {}) {
  const auth = await loadInstagramAuth(path);
  const cookieOk = instagramCookiesLookLoggedIn(auth);
  if (!opts.browserCheck) return cookieOk;
  if (!cookieOk) return false;
  try {
    return await isInstagramSessionValidPlaywright(path);
  } catch {
    return cookieOk;
  }
}
