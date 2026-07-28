// 매칭·점수 엔진 — 프로필 기준 0~100 적합도 + '왜 맞는지' 이유. 모델 없이 규칙 처리(비용 0).
// 목록 신호(제목·회사·경력)에 더해, 상세 본문(job.description)이 있으면 전문분야/성과/연봉까지 반영한다.
// 직무 관련 키워드(무슨 일을 찾는지)는 전부 config/search-settings.json 의 match_keywords 에서 읽는다.
// 이 파일에는 특정 직무(예: 산업디자인)를 편애하는 키워드를 하드코딩하지 않는다 — 다른 직무를 찾는 사람도 config만 바꿔서 그대로 쓸 수 있게 하기 위함.

// 회사 문화/커리어 선호 — config의 match_keywords.culture 로 덮어쓸 수 있는 기본값(직무 무관하게 두루 쓰이는 표현).
const DEFAULT_CULTURE = ["성과", "주도", "자율", "리드", "커리어", "글로벌", "상장", "코스닥", "코스피"];

const found = (text, list) => list.filter((k) => text.includes(k.toLowerCase()));
const any = (text, list) => list.some((k) => text.includes(k.toLowerCase()));

// 직무 적합 점수 — config의 match_keywords.must_any 에 제목이 걸리면 강하게, 본문에만 있으면 약하게.
//
// ambiguous_roles: 같은 이름이 전혀 다른 직무를 가리키는 단어(예: '프로덕트 디자이너'는
// 산업디자인일 수도, 소프트웨어 UI/UX일 수도 있다). 이런 제목은 그것만으로 일치로 치지 않고,
// context_positive(내 분야 신호)가 함께 있을 때만 일치로 인정하고 context_negative 가 있으면 배제한다.
// 어느 직무를 찾든 config만 바꿔 쓸 수 있도록 이 파일에는 특정 직무 단어를 넣지 않는다.
function roleScore(title, hay, mk) {
  const mustAny = mk.must_any || [];
  const ambiguous = mk.ambiguous_roles || [];
  const ctxPos = mk.context_positive || [];
  const ctxNeg = mk.context_negative || [];

  if (any(title, mustAny)) {
    if (ctxNeg.length && any(hay, ctxNeg) && !(ctxPos.length && any(hay, ctxPos))) {
      return { p: 6, why: "직무 키워드는 맞지만 다른 분야 성격(제외 신호)", matched: false };
    }
    return { p: 35, why: "직무 키워드 일치(제목)", matched: true };
  }

  if (ambiguous.length && any(title, ambiguous)) {
    if (ctxPos.length && any(hay, ctxPos)) {
      return { p: 32, why: "직무 일치(내 분야 신호 확인)", matched: true };
    }
    if (ctxNeg.length && any(hay, ctxNeg)) {
      return { p: -6, why: "이름은 비슷하나 다른 분야 직무", matched: false };
    }
    return { p: 8, why: "직무가 모호함(분야 신호 없음)", matched: false };
  }

  // 본문에만 걸린 경우는 근거가 약하다. 상세 설명에 '제품 디자인' 한 줄만 스쳐도 걸리기 때문에,
  // 내 분야 신호(양산·금형·CMF 등)가 함께 있을 때만 직무 일치로 인정한다.
  if (mustAny.length && any(hay, mustAny)) {
    const posOk = ctxPos.length ? any(hay, ctxPos) : true;
    const negBad = ctxNeg.length ? any(hay, ctxNeg) : false;
    if (posOk && !negBad) return { p: 12, why: "직무 키워드 일치(본문)", matched: true };
    return { p: 4, why: "본문에만 언급(직무 확실치 않음)", matched: false };
  }
  return { p: 0, why: null, matched: false };
}

// 경력 적합도(3년차 중급): 0~18
function experienceFit(expStr, years) {
  const s = (expStr || "").replace(/\s/g, "");
  if (!s) return [9, "경력조건 미표기"];
  if (/무관/.test(s)) return [16, "경력무관"];
  if (/신입·경력|신입,경력|경력·신입/.test(s)) return [17, "신입·경력 모두 가능"];
  const range = s.match(/경력(\d+)~(\d+)/);
  if (range) {
    const [lo, hi] = [+range[1], +range[2]];
    return years >= lo && years <= hi ? [18, `경력 ${lo}~${hi}년(딱 맞음)`] : [7, `경력 ${lo}~${hi}년`];
  }
  const min = s.match(/경력(\d+)/);
  if (min) {
    const n = +min[1];
    return years >= n ? [16, `경력 ${n}년↑(충족)`] : [9, `경력 ${n}년↑(약간 부족)`];
  }
  if (/^신입$/.test(s)) return [5, "신입 전용(경력 대비 아쉬움)"];
  const yearsRange = s.match(/(\d+)~(\d+)년/);
  if (yearsRange) {
    const lo = +yearsRange[1];
    const hi = +yearsRange[2];
    return years >= lo && years <= hi ? [18, `경력 ${lo}~${hi}년(딱 맞음)`] : [7, `경력 ${lo}~${hi}년`];
  }
  const yearsUp = s.match(/(\d+)년↑|(\d+)년\s*이상/);
  if (yearsUp) {
    const n = +(yearsUp[1] || yearsUp[2]);
    return years >= n ? [16, `경력 ${n}년↑(충족)`] : [9, `경력 ${n}년↑(약간 부족)`];
  }
  return [11, expStr];
}

// 연봉 단서 → [점수, 사유]
function salaryFit(salaryStr, minManwon) {
  if (!salaryStr) return [2, null];
  const num = (salaryStr.match(/([\d,]{3,})/) || [])[1];
  if (!num) return [2, "급여 협의/미상"];
  const won = parseInt(num.replace(/,/g, ""), 10);
  const manwon = won >= 100000 ? Math.round(won / 10000) : won; // 원 단위면 만원으로
  if (manwon >= minManwon) return [6, `연봉 ${manwon}만원선(희망 충족)`];
  return [-4, `연봉 ${manwon}만원선(희망 미달)`];
}

export function scoreJob(job, profile) {
  const mk = profile.match_keywords || {};
  const title = (job.title || "").toLowerCase();
  const desc = (job.description || "").toLowerCase();
  const hay = `${title} ${(job.company || "").toLowerCase()} ${desc}`;

  const selfAliases = profile.exclusions?.self_company_aliases || [];
  if (selfAliases.some((a) => a && hay.includes(String(a).toLowerCase()))) {
    return { ...job, score: 0, reasons: ["현재 재직 중인 회사 공고(제외)"], is_self: true };
  }

  let score = 0;
  const reasons = [];

  // 1) 직무 일치 — config의 match_keywords.must_any 기준
  const role = roleScore(title, hay, mk);
  score += role.p;
  if (role.why) reasons.push(role.why);
  const roleMatched = role.matched;

  // 2) 전문 분야 특화 — config의 match_keywords.specialty(+specialty_bonus)에서 읽음. 미설정 시 가점 없음.
  const specialtyKw = mk.specialty || [];
  const specialtyBonus = Number(mk.specialty_bonus) || 20;
  const specialty = found(hay, specialtyKw);
  if (specialty.length) {
    score += specialtyBonus;
    reasons.push(`전문 분야 특화: ${specialty.slice(0, 2).join(", ")}`);
  }

  // 3) 경력 적합
  const [eScore, eWhy] = experienceFit(job.experience, profile.identity?.experience_years ?? 3);
  score += eScore;
  reasons.push(eWhy);

  // 4) 강점 키워드
  const boost = found(hay, mk.boost || []);
  if (boost.length) {
    score += Math.min(boost.length, 4) * 4;
    reasons.push(`강점: ${boost.slice(0, 3).join(", ")}`);
  }

  // 5) 문화/커리어(성과중심·주도·성장) — config의 match_keywords.culture 로 덮어쓸 수 있음.
  const CULTURE = mk.culture?.length ? mk.culture : DEFAULT_CULTURE;
  const culture = found(hay, CULTURE);
  if (culture.length) {
    score += Math.min(culture.length, 4) * 3;
    reasons.push(`선호 문화: ${culture.slice(0, 3).join(", ")}`);
  }

  // 6) 관심 기업군
  const target = (profile.target_companies_hint || []).filter((c) => job.company && job.company.includes(c));
  if (target.length) {
    score += 12;
    reasons.push(`관심 기업군: ${target[0]}`);
  }

  // 6b) 사용자 피드백 학습(👍/👎)
  const learned = profile.learned || {};
  const co = job.company || "";
  if ((learned.disliked_companies || []).some((c) => co.includes(c))) {
    score -= 45;
    reasons.push("내가 '별로' 표시한 회사");
  }
  if ((learned.liked_companies || []).some((c) => co.includes(c))) {
    score += 18;
    reasons.push("내가 '관심' 표시한 회사");
  }

  // 6c) 지역 선호(해외 추가 — 싱가포르>미국>유럽 우선)
  const REGION_BONUS = (profile.overseas && profile.overseas.region_bonus) || { SG: 6, US: 4, EU: 2, KR: 0 };
  const rb = REGION_BONUS[job.region] ?? 0;
  if (job.region && job.region !== "KR") {
    score += rb;
    reasons.push(`해외 ${job.region}(${job.location || ""})`);
  }

  // 6d) 언어 선호(영어/한국어 우선, 일본어 등 감점)
  const hasEng = /[A-Za-z]/.test(title);
  const hasKor = /[가-힣]/.test(title);
  const hasJP = /[぀-ヿ]/.test(title);
  if (hasEng || hasKor) score += 2;
  if (hasJP) {
    score -= 12;
    reasons.push("일본어 공고(선호 낮음)");
  }

  // 7) 연봉
  const [sScore, sWhy] = salaryFit(job.salary, profile.salary?.min_manwon ?? 4000);
  score += sScore;
  if (sWhy) reasons.push(sWhy);

  // 8) 부적합 키워드 감점
  const down = found(hay, mk.down || []);
  if (down.length) {
    score += down.length * -8;
    reasons.push(`주의: ${down.slice(0, 2).join(", ")}`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { ...job, score, reasons, is_self: false, role_matched: roleMatched };
}

// 점수화 + 정렬(높은순). floor 미만 제외.
// require_role_match(기본 켜짐)이면 직무 키워드(must_any)에 걸리지 않은 공고는 점수와 무관하게 제외한다.
// 이게 없으면 "가전 MD·영업"처럼 분야만 겹치고 직무는 다른 공고가 전문분야 가점만으로 올라온다.
export function rankJobs(jobs, profile, { floor = 35 } = {}) {
  const mk = profile.match_keywords || {};
  const requireRole = mk.require_role_match !== false && (mk.must_any || []).length > 0;
  return jobs
    .map((j) => scoreJob(j, profile))
    .filter((j) => !j.is_self && j.score >= floor)
    .filter((j) => !requireRole || j.role_matched)
    .sort((a, b) => b.score - a.score);
}
