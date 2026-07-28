# 맞춤 채용 공고 찾기

여러 채용 사이트·기업 채용·Instagram 에이전시에서 공고를 모아 **나에게 맞는 순**으로 보여 줍니다.

---

## 처음 받는 분 — 내 컴퓨터에 설치하기

> 개발을 몰라도 됩니다. 아래 순서대로만 하면 됩니다. **Windows 기준**이며 10~15분 걸립니다.

### 1단계. 프로그램 내려받기 (둘 중 편한 방법)

**방법 A — 그냥 압축파일로 받기 (가장 쉬움, 추천)**

1. https://github.com/inspace9018/job-crawling 접속
2. 초록색 **`< > Code`** 버튼 클릭 → **`Download ZIP`** 클릭
3. 받은 zip 파일을 **마우스 오른쪽 → 압축 풀기**
4. 압축 푼 폴더를 원하는 곳에 두기 (예: `C:\job-crawling`)
   - ⚠️ **바탕화면·다운로드 폴더는 피하세요.** OneDrive 동기화 폴더면 오작동할 수 있습니다.

**방법 B — git 으로 받기 (나중에 업데이트가 편함)**

git 이 깔려 있다면, 폴더를 만들 위치에서 주소창에 `cmd` 를 입력해 검은 창을 연 뒤:

```
git clone https://github.com/inspace9018/job-crawling.git
```

> git 이 없으면 https://git-scm.com/download/win 에서 설치(전부 "다음"만 눌러도 됩니다). 잘 모르겠으면 **방법 A**로 하세요.

### 2단계. 내 조건 입력하기 (`.env` 파일 만들기)

1. 폴더 안의 **`.env.example`** 파일을 복사 → 붙여넣기
   - `.env.example` 이 안 보이면: 탐색기 상단 **보기 → 표시 → 파일 확장명** 및 **숨긴 항목** 켜기
2. 복사본 이름을 **`.env`** 로 바꾸기 (앞에 점 하나, 뒤에 아무것도 안 붙음)
3. 메모장으로 열어 **숫자 3개만** 본인 것으로 고치기 → 저장
   - 자세한 설명은 아래 「`.env` 만들기」 표 참고
   - **`.env` 는 내 개인정보입니다. 남에게 보내거나 GitHub에 올리지 마세요.**

### 3단계. 실행하기

**`@_공고새로찾기.cmd`** 파일을 **더블클릭**합니다.

- 검은 창이 뜨고 **"Node.js LTS 를 설치할까요?"** 라고 물으면 → **`Y`** 입력 후 Enter
  (Node.js 는 이 프로그램을 돌리는 데 필요한 무료 프로그램입니다)
  - 설치가 끝나면 **창을 닫고 `@_공고새로찾기.cmd` 를 한 번 더** 더블클릭해 주세요
- **"위 항목을 지금 설치할까요?"** 라고 물으면 → **`Y`** (처음 한 번만, 1~3분 걸립니다)
- **"지금 리멤버 로그인을 진행할까요? (Y/N)"** (잡플래닛·Instagram 도 차례로 물어봅니다)
  - 쓰는 곳만 **`Y`** → 브라우저가 열리면 **직접 로그인**한 뒤, 검은 창으로 돌아와 **Enter**
  - 안 쓰면 **`N`** (그냥 **Enter만 눌러도 건너뜁니다**)
  - 비밀번호는 저장하지 않고, 로그인 상태만 저장합니다 (한 번 하면 약 6개월 유지)
- 이후 **5~20분** 기다리면 브라우저에 결과가 자동으로 열립니다

### 자주 막히는 곳

| 증상 | 해결 |
|---|---|
| 파란 창 "Windows의 PC 보호" | **추가 정보** → **실행** (내가 받은 파일이 맞는지 확인 후) |
| `.env` 파일이 안 보임 | 탐색기 **보기 → 표시 → 숨긴 항목**·**파일 확장명** 켜기 |
| 한글이 깨져 보임 | `@_공고새로찾기.cmd` 대신 **`run.cmd`** 사용 |
| 검은 창이 바로 꺼짐 | 폴더 경로에 한글·공백이 많으면 `C:\job-crawling` 처럼 짧은 영문 경로로 옮기기 |
| 그 외 오류 | 검은 창 **위쪽 빨간 글씨**를 통째로 복사해 AI에게 물어보기 |

### 나중에 최신 버전으로 올리려면

- 방법 A로 받았다면: zip 을 다시 받아 **`.env` 파일과 `data` 폴더만 빼고** 덮어쓰기
- 방법 B로 받았다면: 폴더에서 검은 창을 열고 `git pull`

> **주의:** `data` 폴더에는 로그인 정보와 지금까지 모은 공고가 들어 있습니다. 지우면 다시 로그인해야 합니다.

---

## 처음 3줄 요약

1. **`.env.example`** 복사 → **`.env`** 로 이름 바꾸고, 경력·연봉 칸에 **숫자만** 채우기 (아래 「`.env` 만들기」 참고)  
2. **`공고새로찾기.cmd`** 더블클릭 → **설치·Node.js** 질문에 **`Y`** → 기다리기 ( **5~20분** ) → 브라우저에 결과  
3. (선택) 직무가 "산업디자인·가전"이 아니면 아래 **「다른 직무로 바꿔 쓰려면」** 의 AI 프롬프트 사용

**Node.js가 없을 때:** 같은 `.cmd` 실행 → **Node.js LTS 설치 Y** → 창 닫고 **한 번 더** 실행.

---

## `.env` 만들기 (AI 없이 바로 채우기)

1. **`.env.example`** 파일을 복사해서 이름을 **`.env`** 로 바꿉니다 (Windows에서 `.env`가 안 보이면 탐색기 **보기 → 숨긴 항목** 켜기).
2. 메모장으로 열어 아래 3가지만 채웁니다. `SESSION_COOKIE_DAYS=180` 줄은 그대로 둡니다.

| 줄 | 채울 값 | 예시 |
|---|---|---|
| `JOB_SEEKER_EXPERIENCE_YEARS=` | 경력 연차 — **숫자만** (신입·취준생은 `0`) | `5` |
| `SALARY_MIN_MANWON=` | 희망 최소 연봉(만원) — **숫자만** | `4000` |
| `EXCLUDE_COMPANY_ALIASES=` | 결과에서 뺄 회사 이름(재직 중인 회사 등). 여러 개면 쉼표로, 없으면 빈 값 | `회사영문,회사한글` |

3. 저장하면 끝입니다. **`.env`는 개인정보라서 남에게 보내거나 git에 올리지 마세요.**

---

## `공고새로찾기.cmd` 실행 시 (기억할 것)

- **설치 관련 질문 → 기본 `Y`** (Node.js LTS, npm, 브라우저 자동화 도구)
- **`.env` 없음** → 위 「`.env` 만들기」대로 `.env` 먼저 만들기  
- **리멤버·잡플래닛·Instagram** → 쓰는 사이트만 **Y** → 브라우저 로그인 → 검은 창에서 **Enter** (비밀번호는 저장 안 함, 로그인 상태만 저장)  
- **실패** → 검은 창 **위쪽 오류**를 AI에게 보여 주며 문의  

`run.cmd`는 같은 동작입니다. 한글 파일명이 깨지면 **`run.cmd`** / **`view.cmd`** 를 쓰세요.

---

## 평소에 쓰는 파일

| 할 일 | 더블클릭 |
|--------|----------|
| 새로 공고 찾기 + 브라우저 결과 | **`공고새로찾기.cmd`** 또는 `run.cmd` |
| 지난번 결과만 보기 | `대시보드보기.cmd` 또는 `view.cmd` |
| (선택) 리멤버 로그인만 | `리멤버로그인.cmd` / `remember-login.cmd` |
| (선택) 잡플래닛 로그인만 | `잡플래닛로그인.cmd` / `jobplanet-login.cmd` |
| (선택) Instagram 로그인만 | `인스타로그인.cmd` |

---

## 결과 화면(대시보드)

- **100점** 기준, 높은 점수부터 · **85↑** 잘 맞음 · **70↑** 괜찮음  
- **[관심 ▲] / [제외 ▼]** → 다음 검색 때 순서에 반영  
- **국내 / 해외**, **출처**(사람인·리멤버·인스타 등) 버튼으로 골라 보기  
- **제목** 클릭 → 채용 페이지로 이동  

---

## 다른 직무로 바꿔 쓰려면

지금 기본값은 "산업디자인·가전"으로 맞춰져 있지만, **`config/search-settings.json`** 파일의 키워드들만 바꾸면 다른 직무(개발자·마케터·기획자 등)로도 똑같이 쓸 수 있습니다.

**`[내 직무]` 부분만 직접 채운 뒤, 상자 전체를 복사해서 ChatGPT·Gemini·Claude·Cursor 등 어떤 AI 채팅에든 한 번에 붙여 넣으세요.**

```
너는 지금부터 "채용 공고 찾기 프로그램의 직무 키워드 생성기" 역할이야.
결과물은 config/search-settings.json 파일 안에 들어갈 키워드 목록들이야.
나에게 아무것도 되묻지 말고, 아래 [내 직무]와 [항목 가이드]만 보고 바로
[출력 형식]을 채워서 코드블록(json 코드블록)으로 보여줘.

[내 직무] (내가 채운 내용)
직무: 
세부 전문 분야(없으면 "없음"): 
우대 조건·기술·경험(없으면 "없음"): 
피하고 싶은 조건·직무(없으면 "없음"): 
관심 있는 회사(없으면 "없음"): 

[항목 가이드]
- must_any: [내 직무]의 "직무"를 기준으로, 채용공고 제목에 쓰일 법한 한국어·영어 동의어 6~10개
  (예: "백엔드 개발자" → "백엔드", "서버 개발자", "backend developer", "backend engineer")
- specialty / specialty_bonus: "세부 전문 분야"가 "없음"이 아니면 관련 키워드 3~6개 + specialty_bonus는 20.
  "없음"이면 specialty는 빈 배열 [], specialty_bonus는 0
- boost: "우대 조건·기술·경험" 기준 5~10개. "없음"이면 빈 배열 []
- down: "피하고 싶은 조건·직무" 기준 키워드. "없음"이면 빈 배열 []
- saramin_keywords / wanted_keywords / linkedin_keywords / linkedin_overseas_keywords /
  jobplanet_keywords / jumpit_keywords / remember_keywords: must_any·specialty·boost를 참고해서
  같은 의미의 키워드 8~12개씩(한국어·영어 섞어서). 같은 값을 여러 항목에 반복 사용해도 괜찮음
- target_companies: "관심 있는 회사"를 그대로. "없음"이면 빈 배열 []

규칙:
- [내 직무]에 적힌 내용만으로 전부 판단해서 채워. 정보가 부족해도 절대 나에게 되묻지 말고, 네가 합리적으로 판단해서 채워.
- 결과는 항상 문법이 맞는 JSON으로 써: 키와 문자열은 쌍따옴표(")로, 마지막 항목 뒤에 쉼표 없이, 주석 없이.
- 코드블록 아래에 "아래 안내를 보고 config/search-settings.json 에서 같은 이름의 항목을 통째로 바꿔 넣으세요" 라고 안내해줘.
- 만약 네가 이 대화창이 열려 있는 프로젝트의 실제 파일을 직접 읽고 쓸 수 있는 도구(Cursor, Claude Code 등)이고, 그 프로젝트 안에 config/search-settings.json 파일이 이미 있다면, 코드블록 대신 그 파일을 열어서 [출력 형식]에 해당하는 항목만 바꿔줘(다른 설정은 건드리지 마). 그런 파일이 안 보이거나 파일 접근이 안 되면 그냥 코드블록으로 보여줘.

[출력 형식]
{
  "match_keywords": {
    "must_any": [],
    "specialty": [],
    "specialty_bonus": 0,
    "boost": [],
    "down": []
  },
  "target_companies": [],
  "saramin_keywords": [],
  "wanted_keywords": [],
  "linkedin_keywords": [],
  "linkedin_overseas_keywords": [],
  "jobplanet_keywords": [],
  "jumpit_keywords": [],
  "remember_keywords": []
}

위 결과를 config/search-settings.json 에 넣는 위치:
- match_keywords → 파일의 "match_keywords" 전체를 이 값으로 교체
- target_companies → 파일의 "target_companies_hint" 를 이 값으로 교체
- saramin_keywords → "collection.saramin.keywords"
- wanted_keywords → "collection.wanted.keywords"
- linkedin_keywords → "collection.linkedin_kr.keywords"
- linkedin_overseas_keywords → "collection.linkedin_overseas.keywords"
- jobplanet_keywords → "collection.job_portals.jobplanet.keywords"
- jumpit_keywords → "collection.job_portals.jumpit.keywords"
- remember_keywords → "collection.job_portals.remember.keywords"
```

**디자인 직군이 아니면:** `config/search-settings.json`의 `job_portals.designrookie.enabled`와 `instagram_agencies.enabled`를 `false`로 꺼두세요(디자인 전용 채용원이라 다른 직무에는 필요 없습니다).

---

## 어디서 모으나 (한 줄)

사람인·잡코리아·원티드·링크드인 등 **채용 사이트**, **리멤버·잡플래닛·Instagram**(로그인 시), **대기업 공식 채용** 등 — `.env`와 프로그램 설정에 맞는 공고만 점수 순으로 남깁니다.

---

## 막힐 때

| 상황 | 해결 |
|------|------|
| 실행이 안 됨 | `.env` 있는지, 설치 **Y** 했는지 확인 → 오류 문구를 AI에게 |
| 로그인 사이트 오류 | 해당 `*로그인.cmd` 실행 후 다시 공고 찾기, 또는 로그인 질문에 **N** |
| 공고 0건 | 인터넷·잠시 후 재시도 |
| 조건 바꾸기 | `.env` 파일을 열어 숫자·회사 이름만 직접 고치기 (연봉·경력·제외 회사 등) |
| 직무를 바꾸고 싶음 | 아래 **「다른 직무로 바꿔 쓰려면」** 참고 |

---

**한 줄:** `.env.example` → `.env`(숫자만) → **`공고새로찾기.cmd`** → **Y** → 기다리기
