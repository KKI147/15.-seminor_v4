# 도구 사용 가이드 — 구현 계획 및 설계

> **목적**: 도구 선택 시 “모눈종이에서 어떻게 그리면 되는지”를 영상 없이 안내  
> **구현 방식**: **단계 패널(정적)** + **작도 중 동적 하이라이트(동적)** 조합 (UX-4)  
> **관련 코드**: `script.js` (`ALGEO_TOOL_GUIDES`, `AlgeoApp.syncToolGuide`), `style.css` (`.algeo-tool-guide`)

---

## 1. 추천 조합 (채택)

| 계층 | 내용 | 구현 |
|------|------|------|
| **A. 도구 선택 시** | 도구 이름·요약·번호 단계·팁 | 캔버스 하단 `#toolGuide` 패널 |
| **B. 작도 중** | `constructionDraft` / `selectedPoints`에 따라 **현재 단계** 강조 | `<ol>` 항목 `done` / `active` 클래스 |
| **C. (미래)** | Canvas 고스트 데모 애니메이션 | ⬜ 2차 — 본 문서 §5 참고 |

영상·GIF는 **제외** — 유지보수·용량·레거시 IE 호환 부담.

---

## 2. 데이터 구조

### `ALGEO_TOOL_GUIDES` (script.js)

도구 ID별 가이드. `ALGEO_TOOL_CATEGORIES`와 분리해 텍스트만 관리.

```javascript
MOVE: {
  summary: '…',
  steps: ['…', '…'],
  tips: ['Esc …']   // 선택, 문자열 배열
}
```

### 메타 조회

- `findToolMeta(toolId)` → `{ label, icon, hint, guide }`
- guide 없으면 hint만으로 최소 패널 표시

---

## 3. UI 배치

```text
.algeo-canvas-container
├── #algeoCanvas
├── .algeo-right-bar          (줌 — 기존)
└── #toolGuide                (좌하단, absolute)
    ├── .tool-guide-head      (아이콘 + 제목 + 요약 + 접기)
    ├── #toolGuideSteps       (ol — 단계)
    └── #toolGuideTips        (팁·취소 안내)
    └── #btnCloseGuide       (패널 닫기)
    └── #btnOpenGuide        (닫힌 뒤 좌하단 다시 열기)
```

- **위치**: 캔버스 **좌하단** — 우측 줌 바·대수창 열기 탭과 겹치지 않음
- **접기**: `#btnCollapseGuide` — `guideCollapsed` 상태 localStorage 미사용 (단순 토글)

---

## 4. 동적 단계 (`getGuideActiveStepIndex`)

| 도구 | 단계 결정 |
|------|-----------|
| `MIDPOINT`, `PERP_BISECTOR` | `selectedPoints.length` (0→1단계, 1→2단계) |
| `SEGMENT`, `LINE` | draft 없음 → 0 / draft → 1 (미리보기·확정) |
| `CIRCLE` | draft 없음 → 0 / draft → 1 |
| `ARC` | sel 0→0, 1→1, draft → 2 |
| `ANGLE` | sel 0→0, 1→1, draft → 2 |
| `PARALLEL_LINE`, `PERP_LINE` | sel 0→0, 1→1, draft → 2 |
| `POLYGON` | vertexIds 1→0, 2+→1 |
| 그 외 | 항상 0 |

`syncToolGuide()` 호출 시점:

- `selectTool()` — 도구 변경
- `clearToolDraft()` — ✕ 취소·확정 후
- 각 `handle*MouseDown` — 클릭으로 단계 진행
- `init()` — 최초 MOVE

---

## 5. 2차 확장 (미구현)

- **고스트 데모**: `#btnGuideDemo` → 캔버스에 가짜 커서·점 순서 재생 (엔진 객체 생성 없음)
- **SVG 아이콘**: 플라이아웃·가이드 헤더 통일
- **터치**: 5단계와 연동

---

## 6. 수정 파일

| 파일 | 변경 |
|------|------|
| `script.js` | `ALGEO_TOOL_GUIDES`, UI HTML, `syncToolGuide`, 훅 |
| `style.css` | `.algeo-tool-guide` |
| `tool_guide_plan.md` | 본 문서 |
| `ux_guidelines.md` | UX-4 완료·명세 |
| `task.md` | UX-4 체크 |
| `ui_layout.md` | DOM 구조 |
| `README.md` | 사용법 한 줄 |

---

## 7. 검증 시나리오

1. 선분 선택 → 3단계 패널 표시
2. 1점 클릭 → ① 완료, ② 활성
3. 2점 확정 → 단계 ①로 리셋
4. Esc → 작도 취소, 단계 ①로
5. ✕ 닫기 → 패널 숨김, **도구·대수창 전환해도 유지**, ▶ 안내로만 복원
6. 헤더 드래그 → 위치 이동 (마우스 delta ÷ `factor`)
7. 다각형 3점 이상 → “첫 점/Enter로 닫기” 단계 활성
8. 가이드 접기(−) → 패널 최소화, **도구 전환 시 다시 펼침** (✕ 닫기와 별개)

## 8. 구현 상태

- **2025 UX-4**: `ALGEO_TOOL_GUIDES`, `#toolGuide`, `syncToolGuide()` — **완료**
- **2차**: 고스트 데모, SVG 아이콘 — 미구현
