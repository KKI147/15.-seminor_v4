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

## 목표 구조 (완료)

```text
algeo-icons.js              ← SVG 아이콘
js/algeo-constants.js       ← 1단계 ✅
js/algeo-tools.js           ← 1단계 ✅
js/algeo-engine.js          ← 2단계 ✅
js/algeo-renderer.js        ← 3단계 ✅
js/algeo-app.js             ← 4단계 ✅
script.js                   ← 5단계 ✅ 진입점만 (~250줄)
```

### 로드 순서 (`index.html`)

```text
… common …
algeo-icons.js
js/algeo-constants.js
js/algeo-tools.js
js/algeo-engine.js
js/algeo-renderer.js
js/algeo-app.js
script.js
```

---

## 단계 체크리스트

| 단계 | 내용 | 상태 |
|------|------|------|
| **1** | 상수·타입 헬퍼·테마/스타일 + 도구 카탈로그·가이드·단축키 | ✅ 2026-07-30 |
| **2** | `AlgeoEngine` → `js/algeo-engine.js` | ✅ 2026-07-30 |
| **3** | `AlgeoRenderer` → `js/algeo-renderer.js` | ✅ 2026-07-30 |
| **4** | `AlgeoApp` → `js/algeo-app.js` | ✅ 2026-07-30 |
| **5** | `script.js` 진입점만 유지 · README 정리 | ✅ 2026-07-30 |

---

## 1단계

| 파일 | 대략 | 포함 |
|------|------|------|
| [`js/algeo-constants.js`](js/algeo-constants.js) | ~0.6k | 타입·테마·스타일 resolve |
| [`js/algeo-tools.js`](js/algeo-tools.js) | ~0.9k | 카탈로그·가이드·단축키·레일 |

검증: 구문 ✅ · 브라우저 ✅

---

## 2단계

| 파일 | 대략 | 포함 |
|------|------|------|
| [`js/algeo-engine.js`](js/algeo-engine.js) | ~3.0k | DAG · 작도/변환/측정 · export/import |

검증: 구문 ✅ · 브라우저 ✅

---

## 3단계

| 파일 | 대략 | 포함 |
|------|------|------|
| [`js/algeo-renderer.js`](js/algeo-renderer.js) | ~2.4k | 좌표변환·격자·객체 렌더·미리보기·선택 하이라이트 |

검증: 구문 ✅ · 브라우저 ✅

---

## 4단계 (완료)

| 파일 | 대략 | 포함 |
|------|------|------|
| [`js/algeo-app.js`](js/algeo-app.js) | ~7.5k | 도구 이벤트·작도·대수창·Undo/저장·테마·설정·단축키 |

### 의존성

App → Engine · Renderer · constants · tools · icons

### 검증

- [x] 구문 검사
- [x] 브라우저: 도구 전환 · 작도 · 대수 입력 · 선택/스타일 · 저장·설정 패널 (사용자 확인)

---

## 5단계 (완료)

| 파일 | 대략 | 포함 |
|------|------|------|
| [`script.js`](script.js) | ~0.25k | `contentScript` · `waitWrapReady` · `bindWrapResize` · `initAlgeoMath` · `createAlgeoUI` |

README 프로젝트 구조·`editor_parity_plan` C10 갱신.

---

## 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-07-30 | 1단계 constants/tools |
| 2026-07-30 | 2단계 Engine |
| 2026-07-30 | 3단계 Renderer |
| 2026-07-30 | **4~5단계** App 분리 · `script.js` 진입점만 · 브라우저 검증 완료 |
