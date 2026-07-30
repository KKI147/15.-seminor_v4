# script.js 모듈 분리 기록

> **목적**: 단일 `script.js`(~1.4만 줄)를 유지보수 가능한 파일 단위로 점진 분리한다.  
> **방식**: ES 모듈/번들러 없이 `<script>` 로드 순서만 사용 (IE·레거시·기존 `common/` 프레임워크와 호환).  
> **관련**: [`editor_parity_plan.md`](editor_parity_plan.md) Could **C10**

---

## 원칙

1. **동작 동일** — 분리만 하고 기능 변경 없음 (동작 확인 후 다음 단계).
2. **기존 계층 유지** — `AlgeoEngine` / `AlgeoRenderer` / `AlgeoApp` 경계를 파일로 옮긴다.
3. **전역 프로토타입** — `function` / `prototype` 그대로 (화살표·`import` 미사용).
4. **한 단계씩** — 단계 완료 → 이 문서 갱신 → 다음 단계.

---

## 목표 구조

```text
algeo-icons.js              ← 기존 (SVG 아이콘)
js/algeo-constants.js       ← 1단계 ✅
js/algeo-tools.js           ← 1단계 ✅
js/algeo-engine.js          ← 2단계 ✅
js/algeo-renderer.js        ← 3단계 예정
js/algeo-app.js             ← 4단계 예정
script.js                   ← 진입점(init·UI·contentScript) + Renderer/App
```

### 로드 순서 (`index.html`)

```text
… common …
algeo-icons.js
js/algeo-constants.js
js/algeo-tools.js
js/algeo-engine.js
(이후) js/algeo-renderer.js → js/algeo-app.js
script.js
```

---

## 단계 체크리스트

| 단계 | 내용 | 상태 |
|------|------|------|
| **1** | 상수·타입 헬퍼·테마/스타일 + 도구 카탈로그·가이드·단축키 분리 | ✅ 2026-07-30 |
| **2** | `AlgeoEngine` → `js/algeo-engine.js` | ✅ 2026-07-30 |
| **3** | `AlgeoRenderer` → `js/algeo-renderer.js` | ⬜ |
| **4** | `AlgeoApp` → `js/algeo-app.js` | ⬜ |
| **5** | `script.js`를 진입점만 남기고 README·구조 문서 정리 | ⬜ |

---

## 1단계 상세 (완료)

### 분리 파일

| 파일 | 포함 |
|------|------|
| [`js/algeo-constants.js`](js/algeo-constants.js) | `ALGEBRA_*`, 타입 맵/헬퍼, 슬라이더·Undo·펜 상수, `getPopscaleFactor` / `getCanvasMousePos`, 테마·`ALGEO_VIS*`·스타일 resolve |
| [`js/algeo-tools.js`](js/algeo-tools.js) | `ALGEO_TOOL_CATEGORIES` / `GUIDES` / `VIEW_GUIDES` / `SHORTCUTS` / `KEY_MAP`, `findTool*` · `buildToolRailHtml` · `buildViewGuideSummary` |

### 검증

- [x] 분리 파일·`script.js` 구문 검사
- [x] 브라우저 스모크 (사용자 확인)

---

## 2단계 상세 (완료)

### 분리 파일

| 파일 | 포함 |
|------|------|
| [`js/algeo-engine.js`](js/algeo-engine.js) | `AlgeoEngine` 생성자 · 객체 추가/검색 · DAG 종속성 · 교점·변환·측정·꾸미기·펜 · `exportState`/`importState` (~3k줄) |

### 남긴 것 (`script.js`)

- 진입점 (`contentScript` · `initAlgeoMath` · `createAlgeoUI`)
- `AlgeoRenderer` / `AlgeoApp` (3~4단계)

### 의존성

- Engine → `js/algeo-constants.js` 타입 헬퍼·상수 (`isAlgeoPointType` 등)

### 검증

- [x] `js/algeo-engine.js` · `script.js` 구문 검사
- [ ] 브라우저: 점·선분 작도 · 종속성 이동 · Undo/JSON

---

## 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-07-30 | 문서 초안 · **1단계** constants/tools 분리 |
| 2026-07-30 | **2단계** `AlgeoEngine` → `js/algeo-engine.js` |
