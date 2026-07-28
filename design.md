# OBSIDIAN — Tactical Monochrome · 디자인 시스템

> **재사용 가능한 단일 출처(portable design spec).** 이 문서는 `hub/dashboard.html`에 **실제 구현된** 디자인을 그대로 추출한 것입니다 — 기획/제안이 아니라 *지금 화면에 나오는 값*. 다른 프로젝트에 그대로 복사해 쓸 수 있도록 토큰·컴포넌트 CSS를 자급자족(self-contained)으로 담았습니다.
>
> 스택: **무의존성** (Vanilla HTML/CSS, 빌드·CDN·프레임워크 없음). 다크 고정.

---

## 0. 철학 — 5원칙

1. **무채색 베이스 · 유일한 채도 = 손익색.** 화면 95%는 중성 그레이스케일(R=G=B). 색이 들어가는 곳은 **이익 녹(`--grn`)·손실 적(`--red`)·주의 앰버(`--amber`)** 뿐. "의미 없는 색이 보이면 위반."
2. **그림자 금지 — 깊이는 휘도 + 헤어라인으로.** 드롭섀도우 없음. 면을 한 단계 밝게(`--bg→--card`) + 1px 헤어라인으로 층을 만든다.
3. **코너 브라켓 = 위계 프리미티브.** 둥근 모서리(라운딩) 대신 ⌐¬ 2코너 브라켓으로 "중요 컨테이너"를 표시. 라운딩은 2~3px(거의 직각).
4. **고밀도 + 라인 구획.** 큰 여백 대신 헤어라인으로 통제된 밀도. 숫자는 mono·tabular·우정렬.
5. **이중 인코딩.** 손익/상태는 색만으로 판단하지 않게 항상 **색 + 부호(+/−) 또는 글리프(▲▼●○◆)** 병기.

---

## 1. Color Tokens — drop-in `:root`

그대로 복사해서 쓰는 토큰. **컴포넌트는 변수만 참조**(색 하드코딩 금지). 토큰명은 의미가 아니라 관습적 약어다(`--grn`=이익, `--accent`=중성 강조).

```css
:root{
  /* ── 면(surface) · 휘도 레이어링 ── */
  --bg:#050505;     /* 캔버스(거의 순흑·중성) */
  --card:#141414;   /* 패널/카드 — 솔리드 불투명(글자 대비 최우선) */
  --card2:#0d0d0d;  /* 함몰면 — 인풋·칩·차트 바닥 */

  /* ── 헤어라인 ── */
  --line:rgba(255,255,255,.16);   /* 강조 보더/디바이더 */
  --line2:rgba(255,255,255,.09);  /* 기본 헤어라인 */

  /* ── 텍스트 4단계(전부 중성 그레이) ── */
  --fg:#f4f4f4;   /* 본문 강조·큰 숫자 */
  --fg2:#c2c2c2;  /* 본문 */
  --mut:#8c8c8c;  /* 라벨·메타 */
  --dim:#666666;  /* 각주·비활성 */

  /* ── 유일한 채도 = 손익/상태(텍스트·부호·얇은 선에만, 면 채움 최소) ── */
  --grn:#57c08a; --grnb:rgba(87,192,138,.10);   /* 이익(+)·상승·가동/LIVE/PASS */
  --red:#eb5c4d; --redb:rgba(235,92,77,.10);    /* 손실(−)·하락·WARN/FAIL/경보 */
  --amber:#e0a23a; --amberb:rgba(224,162,58,.10); /* 주의·잠금·결측·구코드 */

  /* ── 중성 강조(= 액센트). 시안 아님 — '강조'도 무채색으로 ── */
  --accent:#c2c2c2;
  --crypto:#8c8c8c; --us:#8c8c8c;   /* 자산군/카테고리 색은 부여하지 않음(전부 회색) */

  /* ── 라운딩(거의 직각 — 위계는 브라켓이 담당) ── */
  --r:3px;   /* 카드·패널 */
  --rs:2px;  /* 인풋·칩·버튼 */
}
```

**레이어 규칙**: 가까운 면일수록 밝게(`--bg #050505 → --card #141414`). 면 위 면 = 배경 한 단계 ↑ + `--line2` 헤어라인. **그림자 절대 금지.**

> **★ 액센트도 무채색이다.** 다른 다크 시스템과 가장 다른 점: "강조색"(`--accent`)이 시안/파랑이 아니라 **밝은 회색**. 시선 유도는 *채도*가 아니라 *밝기 4단계 + 글리프*로 한다. 화면의 채도는 손익 녹/적/앰버에만 예약.

### 손익/상태 헬퍼 클래스
```css
.pos{color:var(--grn)} .neg{color:var(--red)} .mut{color:var(--mut)} .amb{color:var(--amber)}
.long{color:#c2c2c2} .short{color:#8c8c8c}   /* 방향: 롱=밝은회·숏=어두운회 + 글리프로 구분 */
```

---

## 2. Base / Reset

```css
*{box-sizing:border-box}
body{
  margin:0; background:var(--bg); color:var(--fg);
  font:14px/1.55 -apple-system,Segoe UI,Roboto,'Malgun Gothic',sans-serif;
  -webkit-font-smoothing:antialiased;
  font-variant-numeric:tabular-nums;   /* 전역 tabular — 숫자 정렬 흔들림 방지 */
}
a{color:var(--accent)}
b{font-weight:650}
```

---

## 3. Typography

무의존성 — 시스템 폰트만 사용(CDN 로드 = 네트워크 의존이라 금지).

| 역할 | 스택 |
|---|---|
| **본문/UI** | `-apple-system, Segoe UI, Roboto, 'Malgun Gothic', sans-serif` |
| **숫자/데이터/로그(mono)** | `Consolas, ui-monospace, SFMono-Regular, Menlo, monospace` |

**규약**
- **숫자는 항상 mono + `font-variant-numeric:tabular-nums` + 우정렬.** KPI 값·칩 값·표 셀·금액 전부.
  ```css
  .num{font-family:Consolas,ui-monospace,SFMono-Regular,monospace; letter-spacing:0; font-variant-numeric:tabular-nums}
  ```
- **마이크로 라벨 = ALL CAPS + 자간.** 섹션·칩·KPI 라벨:
  ```css
  .caps{text-transform:uppercase; letter-spacing:.07em}   /* 섹션 라벨은 .6px, 데이터 라벨은 .04~.07em */
  ```
- weight: 본문 400, 강조 `b`=650, 카드 제목 750, 큰 KPI 800~850.

### 타입 스케일(실측)
| 역할 | 크기 | weight |
|---|---|---|
| 통합 히어로 값 | 30px | 850 |
| KPI 값 | 27px / 보조 23px | 800 |
| 브랜드 | 17px | 750 |
| 카드 제목 | 16.5px | 750 |
| 본문 | 14px | 400 |
| 칩 값 | 15px | 750 |
| 섹션 라벨(CAPS) | 13px | 700 |
| 칩/표 라벨(CAPS) | 10.5~11px | 600 |
| 각주·메타 | 11px | 400, `--dim` |

---

## 4. Depth — 코너 브라켓 (그림자 금지)

모든 주요 컨테이너(카드·KPI·패널·히어로)에 **2코너 브라켓**(좌상단 ⌐ + 우하단 ¬)을 붙인다. 균일 적용 — 라이브/활성이라고 4코너로 띄우지 않는다(평등한 위계).

```css
/* 브라켓을 붙일 요소는 position:relative 필요 */
.bracket{position:relative}
.bracket::before,.bracket::after{
  content:""; position:absolute; width:11px; height:11px;
  border:1px solid rgba(255,255,255,.30); pointer-events:none; z-index:2;
}
.bracket::before{top:-1px; left:-1px;  border-right:0; border-bottom:0}  /* ⌐ */
.bracket::after {bottom:-1px; right:-1px; border-left:0;  border-top:0}   /* ¬ */
```

> 구현에선 `.kpi, .ccard, .scard, .totalhero, details.panel` 등에 일괄 적용. 라이브 표시는 브라켓·글로우가 아니라 **작은 녹 `●` 점**으로만.

---

## 5. 컴포넌트 — 실제 CSS

### 5.1 카드 / 패널 (surface)
```css
.card{background:var(--card); border:1px solid var(--line2); border-radius:var(--r); padding:15px 17px}
.card-recessed{background:var(--card2); border:1px solid var(--line2); border-radius:var(--rs)}
```
- 패널 상단 2px 액센트 바(선택): `.card::before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:var(--line)}`

### 5.2 버튼
```css
button{font:inherit; cursor:pointer; border-radius:var(--rs);
  border:1px solid var(--line); background:var(--card2); color:var(--fg);
  padding:7px 13px; transition:.12s}
button:hover{border-color:var(--mut); background:#1f1f1f}

button.primary{background:transparent; border-color:var(--fg); color:var(--fg)}  /* 주액션 = 밝은 아웃라인(채움X) */
button.primary:hover{background:#1f1f1f}

button.danger{background:var(--redb); border-color:#5a1f1f; color:#ff9b94}        /* 비가역 액션 */
button.danger:hover{background:#3a1414}

button.sm{padding:3px 9px; font-size:12px}
button.link{background:none; border:0; color:var(--mut); padding:2px 4px}
button.link:hover{color:var(--fg); background:none}
```

### 5.3 입력
```css
input,select{background:#0d0d0d; color:var(--fg); border:1px solid var(--line);
  border-radius:var(--rs); padding:6px 9px; font:inherit; font-size:13px}
input:focus,select:focus{outline:0; border-color:var(--accent)}   /* 포커스 = 보더만, 글로우 없음 */
```

### 5.4 토글 스위치 (CSS-only)
```css
.sw{appearance:none; width:38px; height:21px; background:#2a2a2a; border-radius:20px;
  position:relative; cursor:pointer; border:0; flex:none}
.sw:checked{background:var(--grn)}
.sw::after{content:""; position:absolute; top:2px; left:2px; width:17px; height:17px;
  border-radius:50%; background:#fff; transition:.15s}
.sw:checked::after{left:19px}
```

### 5.5 Pill / Chip / Status dot (상태 표시)
```css
/* 알약형 상태 뱃지 */
.pill{display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:20px;
  font-size:12px; font-weight:600; border:1px solid var(--line); color:var(--mut); background:var(--card)}
.pill.on  {background:var(--grnb);  color:var(--grn);  border-color:#1c5a2e}
.pill.lock{background:var(--amberb);color:var(--amber);border-color:#5a4a00}
.pill.off {background:var(--card);  color:var(--dim)}

/* 가동 상태 점 */
.statusdot{display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600;
  padding:2px 8px; border-radius:20px; border:1px solid var(--line)}
.statusdot.run  {background:var(--grnb);  color:var(--grn);  border-color:#1c5a2e}
.statusdot.stop {background:var(--card2); color:var(--dim)}
.statusdot.stale{background:var(--amberb);color:var(--amber);border-color:#5a4a00}
```
> 패턴: 색 면(`*b` 알파 .10) + 같은 색 텍스트 + 어두운 동색 보더(`#1c5a2e` 녹 / `#5a4a00` 앰버 / `#5a1f1f` 적). 손익·상태색에만 색면 허용(작게).

### 5.6 KPI 셀
```css
.kpi{background:var(--card); border:1px solid var(--line2); border-radius:var(--r); padding:15px 17px}
.kpi .l{color:var(--mut); font-size:12.5px; font-weight:600}              /* 라벨 */
.kpi .v{font-size:27px; font-weight:800; margin-top:7px; letter-spacing:-.5px; line-height:1.1}  /* 값 */
.kpi .v .abs{font-size:13px; font-weight:600; color:var(--mut)}           /* 보조 절대값 */
```

### 5.7 표
```css
table.t{width:100%; border-collapse:collapse; font-size:12px}
table.t th,table.t td{padding:6px 8px; text-align:right; border-bottom:1px solid var(--line2); white-space:nowrap}
table.t th{color:var(--mut); font-weight:600; font-size:10.5px; text-transform:uppercase; letter-spacing:.05em}
table.t th:first-child,table.t td:first-child{text-align:left}   /* 첫 칼럼(이름)만 좌정렬 */
table.t tr:last-child td{border-bottom:0}
table.t tbody tr:hover td{background:#1a1a1a}
```

### 5.8 헤더 (sticky)
```css
header{position:sticky; top:0; z-index:20; display:flex; align-items:center; gap:10px; flex-wrap:wrap;
  padding:12px 22px; background:rgba(5,5,5,.85); backdrop-filter:blur(8px); border-bottom:1px solid var(--line2)}
header .brand{font-size:17px; font-weight:750; letter-spacing:-.3px}
header .sub{color:var(--mut); font-size:12.5px; margin-right:auto}
```

### 5.9 접힘 패널 (`<details>`)
```css
details.panel{background:var(--card); border:1px solid var(--line2); border-radius:var(--r); margin-top:14px}
details.panel>summary{list-style:none; cursor:pointer; padding:14px 18px; font-size:14px; font-weight:700;
  display:flex; align-items:center; gap:8px}
details.panel>summary::-webkit-details-marker{display:none}
details.panel>summary .chev{margin-left:auto; color:var(--mut); transition:.15s}
details.panel[open]>summary .chev{transform:rotate(90deg)}
details.panel .pbody{padding:0 18px 18px}
```

### 5.10 토스트
```css
.toast{position:fixed; bottom:24px; left:50%; transform:translateX(-50%) translateY(8px);
  background:var(--card2); border:1px solid var(--accent); color:var(--fg);
  padding:11px 18px; border-radius:10px; opacity:0; pointer-events:none; transition:.22s; z-index:50;
  box-shadow:0 8px 28px rgba(0,0,0,.5); white-space:pre-line; font-size:13px}
.toast.show{opacity:1; transform:translateX(-50%) translateY(0)}
```

### 5.11 디테일 텍스처(택티컬 무드, 선택)
```css
/* 룰러 틱 — 섹션 구분선 */
.ruler{height:5px; margin:0 2px 12px;
  background:repeating-linear-gradient(90deg,var(--line) 0 1px,transparent 1px 14px); opacity:.55}
/* 모니터 코드 줄 — <BTCUSDT> 같은 라벨 */
.monline{font-family:ui-monospace,Consolas,monospace; font-size:11px; letter-spacing:.04em; color:var(--dim)}
/* 레터 배지 — 섹션에 A/B/S 표식 */
.badge{display:inline-block; font-size:9.5px; letter-spacing:.05em; border:1px solid var(--line);
  color:var(--dim); padding:1px 6px; border-radius:2px; vertical-align:middle; font-weight:600}
```

---

## 6. Spacing & Grid

- **4px 베이스** — gap/padding은 `4·8·12·16·24` 중심. 패널 내부 `15~17px`, 모듈 간 `14~16px`, 섹션 간 `~26px`.
- 본문 컨테이너: `main{max-width:1240px; margin:0 auto; padding:20px 22px 60px}`
- 섹션 제목:
  ```css
  .sectitle{font-size:13px; font-weight:700; color:var(--mut);
    text-transform:uppercase; letter-spacing:.6px; margin:26px 2px 11px}
  ```
- **여백보다 헤어라인으로 구획**(고밀도 유지).

### 반응형 (단일 분기점)
```css
@media(max-width:880px){
  .grid-2,.grid-4{grid-template-columns:repeat(2,1fr)}  /* 4열→2열 */
  .cards{grid-template-columns:1fr}                      /* 카드 1열 */
  .chips{grid-template-columns:repeat(3,1fr)}            /* 칩 5→3열 */
  main{padding:16px 14px 50px}
}
```
> 데스크톱 우선. `880px` 미만에서 컬럼 수만 줄여 재배치(정보 손실 없음). 모바일에서도 표는 `overflow-x:auto` 래퍼로 가로 스크롤.

---

## 7. 차트 = 와이어프레임 (선택)

차트는 인라인 SVG로 그리고, 와이어 규칙을 따른다(무의존성).
- **단일 두께 라인 · 면 채움 금지.** 주 시리즈만 `--fg`(밝게), 비교/벤치선은 `--mut`(어둡게).
- 축/그리드 = `--line2` 점선 + ALL CAPS 라벨(`--mut`).
- 툴팁은 `--card2` 배경 + `--line` 보더 + mono.

---

## 8. 글리프 정책 (무채색 → 모노 글리프)

컬러 이모지(🟢🔴🪙)는 지양. 모노 유니코드 글리프 + 상태색으로 표현한다.

| 의미 | 글리프 | 색 |
|---|---|---|
| 이익/상승 | `▲` | `--grn` |
| 손실/하락 | `▼` | `--red` |
| 보합/유지 | `●` `▬` | `--mut` |
| 가동/정상 | `●` | `--grn` |
| 정지/미연결 | `○` | `--dim` |
| 주의/결측/잠금 | `◆` `◇` | `--amber` |
| 진입/청산 | `▲ 진입` / `▼ 청산` | 손익색 |
| 펼침 토글 | `▸` / `▾` | `--mut` |

---

## 9. Do / Don't

**Do**
- 무채색 위에 손익 녹/적/앰버를 **텍스트·부호·얇은 선·작은 색면(.10 알파)** 으로만.
- 깊이 = 휘도(면 밝기) + 헤어라인 + 코너 브라켓. 그림자 대신.
- 숫자는 mono·tabular·우정렬, 라벨은 ALL CAPS 마이크로.
- 손익/상태는 색 + 부호/글리프 **이중 인코딩**.
- 라이브/활성은 **밝기·작은 녹 `●`** 로 (색 띄움 아님).

**Don't**
- 드롭섀도우, 둥근 카드(라운딩 > 3px), 그라데이션 색면.
- 강조색으로 시안/파랑 등 채도 도입(강조도 무채색 `--accent`).
- 자산군/카테고리마다 색 부여(전부 회색 + 라벨/글리프로 구분).
- 한 화면에 의미 없는 색 · 손익색 큰 면 채움 · 컬러 이모지로 상태 표현.

---

## 10. 빠른 시작 (다른 프로젝트 이식)

`<head>`에 아래를 넣으면 바로 OBSIDIAN 룩이 적용된다. 빌드·CDN 불필요.

```html
<style>
:root{
  --bg:#050505;--card:#141414;--card2:#0d0d0d;
  --line:rgba(255,255,255,.16);--line2:rgba(255,255,255,.09);
  --fg:#f4f4f4;--fg2:#c2c2c2;--mut:#8c8c8c;--dim:#666666;
  --grn:#57c08a;--grnb:rgba(87,192,138,.10);--red:#eb5c4d;--redb:rgba(235,92,77,.10);
  --amber:#e0a23a;--amberb:rgba(224,162,58,.10);--accent:#c2c2c2;
  --r:3px;--rs:2px;
}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);
  font:14px/1.55 -apple-system,Segoe UI,Roboto,'Malgun Gothic',sans-serif;
  -webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums}
.pos{color:var(--grn)}.neg{color:var(--red)}.mut{color:var(--mut)}.amb{color:var(--amber)}
.card{position:relative;background:var(--card);border:1px solid var(--line2);border-radius:var(--r);padding:15px 17px}
.num{font-family:Consolas,ui-monospace,SFMono-Regular,monospace;font-variant-numeric:tabular-nums}
.caps{text-transform:uppercase;letter-spacing:.07em}
/* 코너 브라켓 — .card 등에 함께 적용 */
.card::before,.card::after{content:"";position:absolute;width:11px;height:11px;
  border:1px solid rgba(255,255,255,.30);pointer-events:none;z-index:2}
.card::before{top:-1px;left:-1px;border-right:0;border-bottom:0}
.card::after{bottom:-1px;right:-1px;border-left:0;border-top:0}
button{font:inherit;cursor:pointer;border-radius:var(--rs);border:1px solid var(--line);
  background:var(--card2);color:var(--fg);padding:7px 13px;transition:.12s}
button:hover{border-color:var(--mut);background:#1f1f1f}
button.primary{background:transparent;border-color:var(--fg)}
input,select{background:#0d0d0d;color:var(--fg);border:1px solid var(--line);
  border-radius:var(--rs);padding:6px 9px;font:inherit;font-size:13px}
input:focus,select:focus{outline:0;border-color:var(--accent)}
</style>
```

> 원본 구현(전체 컴포넌트): [`hub/dashboard.html`](hub/dashboard.html) `<style>` 블록(라인 4–241).
> 미리보기 참고: [`docs/design/redesign/preview/obsidian_dashboard.html`](docs/design/redesign/preview/obsidian_dashboard.html).
