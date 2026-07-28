# SPEC.md — 상세 스키마 · 예시 · 템플릿

> `CLAUDE.md`(핵심 운영 규칙)의 부록. **필요할 때만 펼쳐 본다.** 여기 있는 스키마와 템플릿을 그대로 따른다.

---

## 1. features.json (할 일 목록의 핵심)

> JSON을 쓰는 이유: 모델이 Markdown보다 JSON을 **함부로 덮어쓸 가능성이 낮기** 때문.

```json
{
  "goal": "사용자 목표 원문",
  "version": 1,
  "features": [
    {
      "id": "F001",
      "title": "기능 한 줄 제목",
      "why": "사용자 관점에서 왜 필요한가",
      "priority": "high",
      "passes": false,
      "verified_by": "",
      "notes": ""
    }
  ]
}
```

**절대 규칙**
- 작업 중에는 원칙적으로 **`passes` 필드만** `false → true`로 바꾼다. (`verified_by`, `notes` 추가만 허용)
- 기존 기능 **삭제·재작성·제목 변경 금지.** 목표 자체가 바뀐 경우에만 사용자 승인 후 `version`을 올리며 갱신.
- `passes:true`는 `CLAUDE.md` §7 검증을 **눈으로 통과**했을 때만.

---

## 2. usage.json (크레딧 / 사용량 장부)

```json
{
  "budget": 200,
  "unit": "추정 토큰(천 단위) × 모델 가중치",
  "spent": 76,
  "log": [
    {"step": "목표 확장", "model": "opus", "tokens_k": 4, "weighted": 20},
    {"step": "공고 5곳 수집", "model": "haiku", "tokens_k": 5, "weighted": 5}
  ]
}
```

**크레딧 규칙**
- 이 시스템은 **API가 아니라 Claude Code에서 직접 실행**되므로, 달러 청구액이 아닌 **토큰 사용량**으로 추정한다.
- 모델 호출마다 사용한 **추정 토큰(천 단위) × 모델 가중치**를 `weighted`로 `log`에 적립하고 `spent`를 갱신.
- 모델 가중치: **Haiku 1 / Sonnet 3 / Opus 5 / Fable 10** (실제 사용량 소모 비율 ≈ 토큰 단가 비율).
- `사용률 % = spent / budget × 100`. **추정치**이며, **Claude Code 자체 사용량 표시(`/usage` 등)가 실제 기준**임을 밝힌다.
- 예산 **80% 도달 → 즉시 경고하고 계속할지 확인**. **100% 도달 → 멈추고 보고**.

---

## 3. profile.json (개인화 기억)

```json
{
  "preferences": ["재택/하이브리드 선호", "연봉 5000 이상", "스타트업 선호"],
  "exclusions": ["야간근무", "지방 상주"],
  "feedback_log": [
    {"when": "2026-06-21", "item": "A회사 공고", "reaction": "좋음", "reason": "기술스택 일치"}
  ]
}
```

- 매 실행 **전** 읽어 반영하고, **후** 결과·사용자 반응을 누적한다. 개인화 = 맥락의 축적.

---

## 4. 사용자 보고 템플릿 (비개발자용 · 두괄식)

```
✅ [한 줄 결론]

📌 무엇을 했나
- (사람 말로) ...

🎯 왜 (당신에게 왜 좋은가)
- ...

📊 결과
- ...

💳 크레딧: ▓▓▓▓░░░░░░ 38%  (예산 200 중 76 사용 · 추정치)

➡️ 다음
- ...  (필요시) "계속할까요?"
```

---

## 5. 전체 작동 순서 (참고용)

```
[목표 입력]
   ↓ (Opus) features.json 확장 + PLAN.md 보고 + 예산 확인
[사용자 승인]
   ↓ 매 세션: 감 잡기(CLAUDE.md §2)
[한 기능 선택] → (싼 모델 실행 / 중요하면 비싼 모델·토론·레드팀)
   ↓
[엔드투엔드 검증] → passes:true → git 커밋 → PROGRESS 기록
   ↓
[사용자 보고: 결론·무엇·왜·결과·크레딧%]
   ↺ 다음 기능 (전부 passes:true가 될 때까지)
   ↓
[학습: profile.json 피드백 + insights.json 교훈 누적 → 다음번 더 싸고·빠르고·정확]
```

---

## 6. insights.json (자가 개선 장부)

> "어떻게 일하면 더 효율적인가"에 대한 교훈을 누적한다. (profile.json = 사용자 취향, insights.json = 작업 방식 개선)

```json
{
  "version": 1,
  "insights": [
    {
      "id": "I001",
      "when": "2026-06-21",
      "area": "model",
      "trigger": "로직이 필요한 코드 수정일 때",
      "lesson": "Haiku는 로직 수정에서 자주 틀려 재작업이 생김",
      "action": "로직 있는 수정은 Sonnet으로 라우팅",
      "impact": "재작업·토큰 절감"
    }
  ],
  "meta_reviews": [
    {"when": "2026-06-21", "reviewed_through": "I001", "proposed": ["..."], "approved": false}
  ]
}
```

- `area`: `model | tokens | process | bug | resource | speed` 중 하나.
- **append-only**가 기본. 단, **중복은 합치고 틀린 교훈은 삭제**해 비대화를 막는다(주기적 정리).
- **적용:** 세션 시작(§2)에 읽고, 새 작업이 어떤 `trigger`에 해당하면 그 `action`을 우선 따른다.

### 반성(Reflect) 템플릿 — 기능 완료/실패 직후 1회
```
- 무엇이 비효율적이었나? (과한 토큰 / 반복 실패 / 모델 오선택 / 느린 방식 / 자원 낭비)
- 원인은?
- 다음엔 어떻게? → insights.json에 1줄(trigger·lesson·action·impact)로 기록
```

### 메타 검토(Meta-review) — N개 기능마다 또는 주 1회 (Opus)
1. `insights.json` + `usage.json`(사용량 추세)를 훑는다.
2. 반복 패턴 → 구체적 개선안 도출(예: 라우팅 임계값 조정, 특정 작업의 더 싼 방식, 새 안전/정리 규칙).
3. **운영 규칙(CLAUDE.md/모델 라우팅/예산)을 바꾸는 제안은 사용자 승인 후** 반영. 승인 결과를 `meta_reviews`에 기록.
