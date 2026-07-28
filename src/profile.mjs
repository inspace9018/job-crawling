// 실행 설정 = config/search-settings.json + .env(개인정보) + data/learned.json(관심/제외)
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { readJson } from "./util.mjs";
import { loadEnvFile, PROJECT_ROOT } from "./env.mjs";

export const SEARCH_SETTINGS_PATH = join(PROJECT_ROOT, "config/search-settings.json");
export const LEARNED_PATH = join(PROJECT_ROOT, "data/learned.json");

function splitList(raw) {
  if (raw === undefined || raw === null) return [];
  if (!String(raw).trim()) return [];
  return String(raw)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function numEnv(key, fallback) {
  const v = process.env[key];
  if (v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function requireEnvFile() {
  loadEnvFile();
  const path = join(PROJECT_ROOT, ".env");
  if (!existsSync(path)) {
    throw new Error(
      ".env 파일이 없습니다.\n" +
        "  → .env.example 을 .env 로 복사한 뒤 본인 정보를 채워 주세요.\n" +
        "  → 또는 node scripts/init-user.mjs 실행"
    );
  }
}

/** .env 만으로 identity / salary / exclusions 구성 — 실제 점수 계산에 쓰이는 값만 읽는다. */
function personalFromEnv() {
  const e = process.env;
  return {
    identity: {
      // 경력 적합도 점수(experienceFit)에 사용
      experience_years: numEnv("JOB_SEEKER_EXPERIENCE_YEARS", 5),
    },
    salary: {
      // 연봉 적합도 점수(salaryFit)에 사용
      min_manwon: numEnv("SALARY_MIN_MANWON", 0),
    },
    exclusions: {
      // 재직 중인 회사 공고를 결과에서 제외할 때 사용
      self_company_aliases: splitList(e.EXCLUDE_COMPANY_ALIASES),
    },
  };
}

function applyEnvToCollection(collection) {
  const col = structuredClone(collection || {});
  col.session_cookie_days = numEnv("SESSION_COOKIE_DAYS", 180);
  col.corporate_careers = col.corporate_careers || {};
  col.corporate_careers.google_site_search = col.corporate_careers.google_site_search || {};
  const gss = col.corporate_careers.google_site_search;
  if (process.env.GOOGLE_CSE_API_KEY) gss.api_key = process.env.GOOGLE_CSE_API_KEY;
  if (process.env.GOOGLE_CSE_CX) gss.cx = process.env.GOOGLE_CSE_CX;
  return col;
}

async function loadLearned() {
  if (!existsSync(LEARNED_PATH)) {
    return { liked_companies: [], disliked_companies: [], feedback_log: [] };
  }
  const d = await readJson(LEARNED_PATH, {});
  return {
    liked_companies: d.liked_companies || [],
    disliked_companies: d.disliked_companies || [],
    feedback_log: d.feedback_log || [],
  };
}

export async function loadProfile() {
  requireEnvFile();
  const settings = await readJson(SEARCH_SETTINGS_PATH, {});
  const personal = personalFromEnv();
  const learned = await loadLearned();

  return {
    ...settings,
    ...personal,
    collection: applyEnvToCollection(settings.collection),
    learned: {
      liked_companies: learned.liked_companies,
      disliked_companies: learned.disliked_companies,
    },
    feedback_log: learned.feedback_log,
  };
}

export async function readLearnedDocument() {
  requireEnvFile();
  return loadLearned();
}

export async function writeLearnedDocument(doc) {
  requireEnvFile();
  await mkdir(dirname(LEARNED_PATH), { recursive: true });
  await writeFile(
    LEARNED_PATH,
    JSON.stringify(
      {
        liked_companies: doc.liked_companies || [],
        disliked_companies: doc.disliked_companies || [],
        feedback_log: doc.feedback_log || [],
      },
      null,
      2
    ),
    "utf8"
  );
}

/** @deprecated 피드백용 — learned 파일 */
export const readProfileDocument = readLearnedDocument;
export const writeProfileDocument = writeLearnedDocument;
