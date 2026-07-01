# UI 레이아웃 개편 기록

AlgeoMath 원본([https://kki147.github.io/algeomath/](https://kki147.github.io/algeomath/)) UI에 맞추기 위한 단계별 개편 문서입니다.

---

## 개편 일자

- **1단계 (완료)**: 좌측 도구 레일 + 플라이아웃 + 레이아웃 껍데기

---

## 1단계 — 변경 전 vs 변경 후

### 변경 전 (구 UI)

```text
.algeo-wrapper (column)
├── .algeo-toolbar          ← 상단 가로, 모든 도구 나열
└── .algeo-main
    ├── .algeo-sidebar
    └── .algeo-canvas-container
        └── #algeoCanvas
```

- 도구 11개가 상단 한 줄에 배치
- 줌 버튼(`+` `−` `⌂`)도 상단 툴바에 포함
- 캔버스 높이 = 전체 − 56px

### 변경 후 (신 UI)

```text
.algeo-wrapper (row, 전체 1920×1020)
├── .algeo-left-panel
│   ├── .algeo-mode-rail      ← 모드 표시 (작도 ⌗, 40px)
│   ├── .algeo-tool-rail      ← 카테고리 아이콘 (48px)
│   └── .algeo-tool-flyout    ← 클릭 시 서브메뉴 (absolute)
└── .algeo-workspace
    ├── .algeo-sidebar        ← 대수창 (280px, 기존 유지)
    └── .algeo-canvas-container
        ├── #algeoCanvas
        └── .algeo-right-bar  ← 줌·원점 (우측 상단)
        └── #toolGuide        ← 도구 사용 가이드 (좌하단, UX-4)
```

- 상단 가로 툴바 **제거**
- 캔버스가 세로 전체 높이 사용
- 우측 바 자리 확보 (2단계에서 격자·스냅 버튼 추가 예정)
- 레일·플라이아웃: **밝은 배경** + 카테고리/도구별 **색상 아이콘** (가시성 개선)
- 캔버스: `ALGEO_VIS` 팔레트 — AlgeoMath 참고 선명한 색·굵은 선·라벨 흰 외곽선

## 인터랙티브 작도 (AlgeoMath UX)

> **상세 명세·원칙·다음 작업**: [`ux_guidelines.md`](ux_guidelines.md)

| 도구 | 조작 |
|------|------|
| **선분·직선** | 점1 → 마우스 미리보기 → 점2 확정 |
| **원** | 중심 → 마우스 반지름 미리보기 → 확정 |
| **호** | 끝점 A → 끝점 B → 마우스(외접원+호) → 호 위 점 C 확정 |
| **각도** | 변1 → 꼭짓점 → 마우스 조절 → 확정 |
| **평행·수직** | 기준 2점 → 마우스 미리보기 → 통과점 |
| **다각형** | 꼭짓점 순 클릭 → 첫 점/Enter로 닫기 |
| **접기 `−`** | 가이드 내용만 접기 |
| **닫기 `✕`** | 가이드 패널 전체 숨김 → `▶ 안내` 탭으로 다시 열기 |
| **드래그** | `.tool-guide-head` 드래그로 패널 위치 이동 |
| **Esc** | `constructionDraft` / 선택 점 작도 중 취소 |

- 상태: `AlgeoApp.constructionDraft` + `renderer.drawToolPreview()`
- 대수창 호: `Arc(A,B,C)` — C가 호 위 조절점

## 대수창 토글 (UX-2 일부 완료)

- 헤더 `◀` (`#btnToggleAlgebra`) → 사이드바 접기 (`.algeo-sidebar.collapsed`)
- 캔버스 **좌상단** `▶ 대수창` (`#btnOpenAlgebra`) → 다시 펼치기 (세로 중앙 ❌ → 상단 12px)
- 토글 후 `renderer.resize()` 로 캔버스 재계산

---

## 도구 카테고리 (`ALGEO_TOOL_CATEGORIES`)

| 카테고리 ID | 레일 아이콘 | 플라이아웃 도구 |
|-------------|------------|----------------|
| `pointer` | ✋ | 이동 (MOVE) |
| `point` | ● | 점 (POINT), 중점 (MIDPOINT) |
| `line` | ／ | 선분(―), 직선(↔), 수직이등분선, 평행선, 수직선, 각도, **다각형(⬡)** |
| `circle` | ◯ | 원 (CIRCLE), 호 (ARC) |
| `edit` | ⌫ | 삭제 (DELETE) |

- 데이터: `script.js` 상단 `ALGEO_TOOL_CATEGORIES` 배열 (각 도구 `hint` 포함)
- HTML 생성: `buildToolRailHtml()`, 플라이아웃은 `renderToolFlyout()` 동적 렌더
- 플라이아웃 hint 스타일: `style.css` `.flyout-tool-hint`

---

## JS 이벤트 흐름 (AlgeoApp)

| 메서드 | 역할 |
|--------|------|
| `initToolRail()` | 레일·플라이아웃 클릭 바인딩 |
| `toggleToolCategory(id)` | 카테고리 클릭 → 플라이아웃 열기/닫기 |
| `renderToolFlyout(id)` | 플라이아웃 본문 HTML 생성 |
| `selectTool(toolId)` | `currentTool` 설정 + UI·커서 동기화 |
| `syncToolRailUI()` | 활성 카테고리·도구 하이라이트 |
| `closeToolFlyout()` | 바깥 클릭 시 플라이아웃 닫기 |

**엔진·렌더러 변경 없음** — 기존 `data-tool` 값(`MOVE`, `POINT` 등)과 마우스 핸들러 그대로 사용.

---

## 수정 파일 목록 (1단계)

| 파일 | 변경 내용 |
|------|----------|
| `script.js` | `createAlgeoUI` HTML 구조, `ALGEO_TOOL_CATEGORIES`, `initToolRail` 등 |
| `style.css` | 상단 툴바 스타일 제거, 레일·플라이아웃·우측 바 스타일 추가 |
| `ui_layout.md` | 본 문서 (신규) |
| `README.md` | 프로젝트 구조·실행 안내·UI 섹션 갱신 |
| `task.md` | UI 1단계 체크 항목 추가 |

`common/` 폴더는 **수정하지 않음**.

---

## 2단계 예정 (미구현)

- [x] 대수창 표시/숨김 토글 (헤더 ◀ / 캔버스 열기 탭) — `ux_guidelines.md` UX-2
- [ ] 대수창 `생성순` / `종류순` 탭
- [ ] 입력창 `+` 버튼 스타일
- [ ] 우측 바: 격자 on/off, 스냅(자석) 토글
- [ ] 캔버스 좌상단 Undo/Redo UI (4-2 기능 연동 후)
- [ ] 상단 파란 헤더 (저장·로그인 — 껍데기 또는 5-4 연동)
- [ ] 도구 단축키 실제 동작 (5-2)
- [ ] SVG 아이콘 세트

---

## 사용법 (신 UI)

1. **좌측 레일**에서 카테고리(점·선·원 등) 클릭
2. **플라이아웃**에서 세부 도구 선택
3. 캔버스에서 기존과 동일하게 작도
4. **우측 `+` `−` `⌂`** 으로 줌·원점 이동
5. 대수창·명령어 사전은 기존과 동일
6. **캔버스 좌하단 `#toolGuide`** 에서 단계별 사용법 확인 (작도 중 현재 단계 강조)
