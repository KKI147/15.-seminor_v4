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
- 우측 바: 격자·스냅·줌·테마·단축키 (**SVG**, `bar-icon`) — 4-5 ✅
- 레일·플라이아웃: **밝은 배경** + **SVG 아이콘** (흰 타일 + 기하 도형) — [`icon_guidelines.md`](icon_guidelines.md)
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
| **접기 `−`** | 가이드 내용만 접기 — 도구 전환 시 **펼침** (✕ 닫기와 별개) |
| **닫기 `✕`** | 가이드 패널 전체 숨김 → **▶ 안내**를 누르기 전까지 **자동으로 다시 열리지 않음** |
| **드래그** | `.tool-guide-head` 드래그로 패널 위치 이동 (`getPopscaleFactor()` 보정) |
| **Esc** | `constructionDraft` / 선택 점 작도 중 취소 |

> **좌표·드래그**: `#wrap` popscale 적용 시 화면 픽셀 → 설계 좌표 변환에 **factor** 필요. [`README.md`](README.md) 「좌표·드래그와 popscale factor」 참고.

- 상태: `AlgeoApp.constructionDraft` + `renderer.drawToolPreview()`
- 대수창 호: `Arc(A,B,C)` — C가 호 위 조절점

## 대수창 토글 (UX-2 일부 완료)

- 헤더 `◀` (`#btnToggleAlgebra`) → 사이드바 접기 (`.algeo-sidebar.collapsed`)
- 캔버스 **좌상단** `▶ 대수창` (`#btnOpenAlgebra`) → 다시 펼치기 (세로 중앙 ❌ → 상단 12px)
- 토글 후 `renderer.resize()` 로 캔버스 재계산

## 대수창 탭·속성 패널 (4-1 · UI-2)

- 헤더 아래 **생성순 / 종류순** 탭 (`.algebra-list-tabs`, `#algebraPropsPanel` 위)
- 목록 위 **속성 패널** — 객체 선택 시 좌표·길이·반지름·함수 계수 편집
- 종속 객체(MIDPOINT, ANGLE 등)는 읽기 전용 안내
- `Enter` 또는 **적용** 버튼으로 반영 → `#algebraError` 검증 메시지

## Undo·수식 히스토리 (4-2)

- 대수창 헤더 **「대수창」** 옆 `↶` / `↷` 버튼 (`.sidebar-undo-group`)
- 단축키 **Ctrl+Z** / **Ctrl+Y** (입력창 포커스 시 제외)
- 대수창 하단 **작업 기록** — Undo 스택 라벨 + 수식 히스토리 (클릭 시 입력창에 채움)
- 작도·삭제·속성 편집·수식 입력마다 엔진 스냅샷 저장 (최대 50단계)

## 다크/라이트 테마 (5-3)

- `.algeo-wrapper[data-theme="light"|"dark"]` — CSS 변수로 UI 전체 전환
- 캔버스: `ALGEO_VIS_LIGHT` / `ALGEO_VIS_DARK` (`setTheme` 시 `renderer.draw()`)
- 우측 바 최상단 **🌙** / **☀** (`#btnToggleTheme`)
- `localStorage` 키 `algeo_theme` — 새로고침 후 유지
- `common/` 영역은 변경 없음 (알지오 작업 영역만 테마 적용)

---

- 대수창 헤더 **「대수창」** 옆 `↶` / `↷` 버튼 (`.sidebar-undo-group`)
- 단축키 **Ctrl+Z** / **Ctrl+Y** (입력창 포커스 시 제외)
- 대수창 하단 **작업 기록** — Undo 스택 라벨 + 수식 히스토리 (클릭 시 입력창에 채움)
- 작도·삭제·속성 편집·수식 입력마다 엔진 스냅샷 저장 (최대 50단계)

---

## 도구 카테고리

> **목표 구조 (52종)**: [`tool_catalog.md`](tool_catalog.md) · 스크린샷: [`images/README.md`](images/README.md)

### 현재 (`ALGEO_TOOL_CATEGORIES` — 7카테고리, SVG `iconId`)

| 카테고리 ID | 레일 `iconId` | 플라이아웃 도구 |
|-------------|---------------|----------------|
| `pointer` | `cat-pointer` | 이동 (MOVE) |
| `point` | `cat-point` | 점, 중점 |
| `line` | `cat-line` | 선분, 직선, 수직이등분선, 평행선, 수직선, 각도 |
| `polygon` | `cat-polygon` | 다각형 |
| `circle` | `cat-circle` | 원, 호 |
| `slider` | `cat-slider` | 슬라이더 |
| `edit` | `cat-edit` | 숨기기, 삭제 |

- 아이콘 렌더: `algeo-icons.js` → `renderAlgeoIcon()` (유니코드 문자 **사용 안 함**)

### 목표 (원본 AlgeoMath — 9+1)

| 카테고리 ID | 플라이아웃 수 | 로드맵 |
|-------------|--------------|--------|
| `blockcoding` | (별도) | 11단계 |
| `pointer` | 3 | 7단계 |
| `point` | 8 | 6-1, 10-1 |
| `circle` | 7 | 6-3 |
| `line` | 10 | 6-2 |
| `polygon` | 4 | 6-4 |
| `transform` | 9 | 8-1, 9단계 |
| `misc` | 9 | 4-3, 4-4, 7단계 |
| `draw` | 5 | 8단계 |
| `settings` | (패널) | 4-5, 11-3 |

- 데이터: `script.js` `ALGEO_TOOL_CATEGORIES` — **5단계**에서 전체 재구성
- 미구현: `status: 'stub'` · 구현 시 `tool_catalog.md` 상태 갱신

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

## UI 로드맵 (갱신)

| 항목 | 로드맵 | 상태 |
|------|--------|------|
| 대수창 토글 · 탭 · Undo | 4-1, 4-2 | ✅ |
| 격자 on/off, 스냅 | **4-5** | ✅ |
| 레일 9+1 · 플라이아웃 52종 | **5단계** | ⬜ |
| 테마 토글 | **12-1** | ✅ |
| 단축키 | **12-3** | 🔄 (G, N, H, ? 등 일부) |
| SVG 아이콘 (핵심 UI) | **12-5** | ✅ [`icon_guidelines.md`](icon_guidelines.md) |
| SVG 아이콘 (52종 전체) | **5~6단계** | ⬜ stub 도구별 `iconId` |
| 저장·헤더 | **12-4**, 11-3 | ⬜ |

전체 도구: [`tool_catalog.md`](tool_catalog.md)

---

## 사용법 (신 UI)

1. **좌측 레일**에서 카테고리(점·선·원 등) 클릭
2. **플라이아웃**에서 세부 도구 선택
3. 캔버스에서 기존과 동일하게 작도
4. **우측 `+` `−` `⌂`** 으로 줌·원점 이동
5. 대수창·명령어 사전은 기존과 동일
6. **캔버스 좌하단 `#toolGuide`** 에서 단계별 사용법 확인 (작도 중 현재 단계 강조)
