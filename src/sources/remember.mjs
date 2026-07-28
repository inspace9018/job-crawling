// 리멤버(Remember) — 저장된 로그인 세션(쿠키)으로 채용 공고 수집. 비밀번호는 사용하지 않음.
import { UA } from "../util.mjs";
import {
  loadRememberAuth,
  cookieHeaderFromAuth,
  authHintMissing,
  DEFAULT_AUTH_PATH,
} from "../remember-auth.mjs";
import { saveContextAuth, touchAuthExpiry, readSessionCookieDays } from "../session-store.mjs";

const CAREER_ORIGIN = "https://career.rememberapp.co.kr";
const API_HOST = "https://career-api.rememberapp.co.kr";

function formatRememberExperience(p) {
  const min = p.min_experience ?? p.minExperience;
  const max = p.max_experience ?? p.maxExperience;
  if (min != null || max != null) {
    const lo = min != null && min !== "" ? Number(min) : null;
    const hi = max != null && max !== "" ? Number(max) : null;
    if (lo === 0 && (hi == null || hi === 0)) return "신입";
    if (lo != null && hi != null) return `경력 ${lo}~${hi}년`;
    if (lo != null && lo > 0) return `경력 ${lo}년↑`;
    if (hi != null && hi > 0) return `경력 ${hi}년↓`;
  }
  const direct = [p.experience, p.career, p.careerText].find((v) => typeof v === "string" && v.trim());
  if (direct) return direct.trim();
  const qual = String(p.qualifications || "");
  const m = qual.match(/경력\s*(\d+)\s*년\s*이상|실무\s*경력\s*(\d+)\s*년/);
  if (m) return `경력 ${m[1] || m[2]}년↑`;
  return "";
}

function formatRememberLocation(p) {
  if (p.normalized_address) {
    const a = p.normalized_address;
    return [a.level1, a.level2].filter(Boolean).join(" ").trim();
  }
  if (Array.isArray(p.addresses) && p.addresses[0]) {
    const a = p.addresses[0];
    return [a.address_level1, a.address_level2].filter(Boolean).join(" ").trim();
  }
  return String(p.location ?? p.workPlace ?? p.address ?? "").trim();
}

function formatRememberDeadline(p) {
  if (p.ends_at) {
    if (p.explicit_due === false) return "상시채용";
    return String(p.ends_at).slice(0, 10).replace(/-/g, ".");
  }
  return p.deadline ?? p.closesAt ?? "";
}

function formatRememberCompany(p) {
  return String(
    p.companyName ??
      p.company_name ??
      p.organization?.name ??
      p.postingCompanyName ??
      p.company?.name ??
      p.employerName ??
      ""
  ).trim();
}

function normalizeList(data) {
  const raw =
    data?.data?.jobPostings ||
    data?.data?.job_postings ||
    data?.jobPostings ||
    data?.job_postings ||
    (Array.isArray(data?.data) ? data.data : null) ||
    data?.data ||
    data?.items ||
    data?.results ||
    (Array.isArray(data) ? data : []);
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const p of raw) {
    const id = p.id ?? p.job_posting_id ?? p.jobPostingId;
    if (id == null) continue;
    const title = p.title ?? p.name ?? p.jobTitle ?? "";
    const company = formatRememberCompany(p);
    const url =
      p.url ??
      p.jobPostingUrl ??
      `${CAREER_ORIGIN}/job/postings/${id}`;
    out.push({
      source: "remember",
      id: `remember:${id}`,
      title: String(title).trim(),
      company,
      url: String(url).startsWith("http") ? url : `${CAREER_ORIGIN}${url}`,
      location: formatRememberLocation(p),
      experience: formatRememberExperience(p),
      education: p.education_requirement === "bachelor" ? "학사" : p.education_requirement || "",
      etype: p.job_posting_type === "internal_headhunter" ? "헤드헌팅" : p.application_type || "",
      deadline: formatRememberDeadline(p),
      description: (p.job_description ?? p.description ?? p.summary ?? "").slice(0, 1500),
      region: "KR",
      keyword: p._keyword || "",
    });
  }
  return out.filter((j) => j.title);
}

async function fetchJsonWithCookies(url, cookie, { method = "GET", body } = {}) {
  const headers = {
    "User-Agent": UA,
    Accept: "application/json, text/plain, */*",
    Referer: `${CAREER_ORIGIN}/job/postings`,
    Origin: CAREER_ORIGIN,
  };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(url, {
    method,
    headers: body ? { ...headers, "Content-Type": "application/json" } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function tryFetchKeyword(cookie, keyword) {
  const searchBody = { keyword, query: keyword, searchText: keyword, q: keyword, page: 1, per: 30 };
  const attempts = [
    () =>
      fetchJsonWithCookies(`${API_HOST}/job_postings/search`, cookie, {
        method: "POST",
        body: searchBody,
      }),
    () => fetchJsonWithCookies(`${API_HOST}/job_postings?keyword=${encodeURIComponent(keyword)}&page=1&per=30`, cookie),
    () => fetchJsonWithCookies(`${API_HOST}/job_postings?search=${encodeURIComponent(keyword)}&page=1&per=30`, cookie),
    () => fetchJsonWithCookies(`${API_HOST}/job_postings?q=${encodeURIComponent(keyword)}&page=1&per=30`, cookie),
    () =>
      fetchJsonWithCookies(`${API_HOST}/v1/job_postings/search`, cookie, {
        method: "POST",
        body: { keyword, page: 1, size: 30 },
      }),
  ];
  for (const fn of attempts) {
    try {
      const data = await fn();
      const jobs = normalizeList(data).map((j) => ({ ...j, keyword }));
      if (jobs.length) return jobs;
    } catch {
      /* next */
    }
  }
  return [];
}

async function fetchViaPlaywright(authPath, keywords) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log("  [remember] playwright 미설치 → 리멤버로그인.cmd 를 한 번 실행해 주세요");
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  const collected = [];
  const seen = new Set();

  try {
    const context = await browser.newContext({ storageState: authPath, userAgent: UA });
    const page = await context.newPage();

    page.on("response", async (resp) => {
      const u = resp.url();
      if (!u.includes("career-api.rememberapp.co.kr")) return;
      if (!/job/i.test(u)) return;
      try {
        const data = await resp.json();
        for (const j of normalizeList(data)) {
          if (!seen.has(j.id)) {
            seen.add(j.id);
            collected.push(j);
          }
        }
      } catch {
        /* not json */
      }
    });

    for (const kw of keywords) {
      const searchUrl = `${CAREER_ORIGIN}/job/postings?keyword=${encodeURIComponent(kw)}`;
      try {
        await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(2500);
      } catch (e) {
        console.error(`  [remember] 페이지 ${kw}: ${e.message}`);
      }
    }

    if (collected.length === 0) {
      const links = await page.$$eval('a[href*="/job/postings/"]', (as) =>
        as.map((a) => ({ href: a.href, text: (a.textContent || "").trim() })).filter((x) => x.text)
      );
      for (const { href, text } of links) {
        const m = href.match(/postings\/(\d+)/);
        if (!m) continue;
        const id = `remember:${m[1]}`;
        if (seen.has(id)) continue;
        seen.add(id);
        collected.push({
          source: "remember",
          id,
          title: text.slice(0, 200),
          company: "",
          url: href.split("?")[0],
          location: "",
          experience: "",
          education: "",
          etype: "",
          deadline: "",
          region: "KR",
          keyword: "",
        });
      }
    }
    const days = await readSessionCookieDays();
    await saveContextAuth(context, authPath, { domainIncludes: "remember", days });
  } finally {
    await browser.close();
  }
  return collected;
}

export async function fetchRemember(
  keywords = ["디자인", "산업디자인", "제품디자인"],
  { authPath = DEFAULT_AUTH_PATH } = {}
) {
  const auth = await loadRememberAuth(authPath);
  if (!auth) {
    authHintMissing();
    return [];
  }

  const cookie = cookieHeaderFromAuth(auth);
  if (!cookie) {
    console.log("  [remember] 세션 만료 가능 → `리멤버로그인.cmd` 다시 실행");
    return [];
  }

  const all = [];
  const seen = new Set();
  for (const kw of keywords) {
    try {
      const items = await tryFetchKeyword(cookie, kw);
      for (const j of items) {
        if (!seen.has(j.id)) {
          seen.add(j.id);
          all.push(j);
        }
      }
    } catch (e) {
      console.error(`  [remember] API ${kw}: ${e.message}`);
    }
  }

  if (all.length === 0) {
    const viaBrowser = await fetchViaPlaywright(authPath, keywords.slice(0, 4));
    for (const j of viaBrowser) {
      if (!seen.has(j.id)) {
        seen.add(j.id);
        all.push(j);
      }
    }
  }

  console.log(`  · 리멤버: ${all.length}건 (로그인 세션)`);
  if (all.length > 0 || cookie) {
    await touchAuthExpiry(authPath, "remember").catch(() => {});
  }
  return all;
}
