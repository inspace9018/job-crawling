// Playwright storageState 저장 — 쿠키 만료 연장·기존 세션과 병합 (리멤버·잡플래닛 공통)
import { readJson, writeJson } from "./util.mjs";
import { loadEnvFile } from "./env.mjs";

export const DEFAULT_SESSION_DAYS = 180;

function cookieKey(c) {
  return `${c.domain || ""}|${c.name}|${c.path || "/"}`;
}

export function mergeStorageStates(oldState, newState) {
  const map = new Map();
  for (const c of oldState?.cookies || []) map.set(cookieKey(c), c);
  for (const c of newState?.cookies || []) map.set(cookieKey(c), { ...map.get(cookieKey(c)), ...c });
  const origins = newState?.origins?.length ? newState.origins : oldState?.origins || [];
  return { cookies: [...map.values()], origins };
}

/** 세션 쿠키(expires 없음·-1)와 짧은 만료를 days 일 후까지 연장 */
export function extendCookieExpiry(state, { days = DEFAULT_SESSION_DAYS, domainIncludes } = {}) {
  if (!state?.cookies?.length) return state;
  const floor = Math.floor(Date.now() / 1000) + days * 86400;
  const cookies = state.cookies.map((c) => {
    if (domainIncludes && !String(c.domain || "").includes(domainIncludes)) return c;
    const exp = c.expires;
    const isSession = exp == null || exp === -1 || exp === 0;
    if (isSession || (exp > 0 && exp < floor)) {
      return { ...c, expires: floor };
    }
    return c;
  });
  return { ...state, cookies };
}

export async function readSessionCookieDays() {
  loadEnvFile();
  const d = Number(process.env.SESSION_COOKIE_DAYS);
  return Number.isFinite(d) && d > 0 ? d : DEFAULT_SESSION_DAYS;
}

/** 로그인 직후·브라우저 종료 전 — 파일에 오래 보관되도록 저장 */
export async function persistAuthState(filePath, newState, { domainIncludes, days } = {}) {
  const keepDays = days ?? (await readSessionCookieDays());
  const old = await readJson(filePath, null);
  let state = old ? mergeStorageStates(old, newState) : { ...newState };
  state = extendCookieExpiry(state, { days: keepDays, domainIncludes });
  const until = new Date(Date.now() + keepDays * 86400000).toISOString();
  state._session_meta = {
    savedAt: new Date().toISOString(),
    keepDays,
    storeUntil: until,
  };
  await writeJson(filePath, state);
  return state;
}

/** 공고 수집 등 세션이 살아 있을 때 만료일만 다시 연장 */
export async function touchAuthExpiry(filePath, domainIncludes, days) {
  const state = await readJson(filePath, null);
  if (!state?.cookies?.length) return false;
  const keepDays = days ?? (await readSessionCookieDays());
  const next = extendCookieExpiry(state, { days: keepDays, domainIncludes });
  next._session_meta = {
    ...(state._session_meta || {}),
    lastTouched: new Date().toISOString(),
    keepDays,
    storeUntil: new Date(Date.now() + keepDays * 86400000).toISOString(),
  };
  await writeJson(filePath, next);
  return true;
}

/** Playwright context → 파일 (병합·연장 포함) */
export async function saveContextAuth(context, filePath, options) {
  const state = await context.storageState();
  await persistAuthState(filePath, state, options);
}
