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
```

- 상단 가로 툴바 **제거**
- 캔버스가 세로 전체 높이 사용
- 우측 바 자리 확보 (2단계에서 격자·스냅 버튼 추가 예정)
- 레일·플라이아웃: **밝은 배경** + 카테고리/도구별 **색상 아이콘** (가시성 개선)

---

## 도구 카테고리 (`ALGEO_TOOL_CATEGORIES`)

| 카테고리 ID | 레일 아이콘 | 플라이아웃 도구 |
|-------------|------------|----------------|
| `pointer` | ↖ | 이동 (MOVE) |
| `point` | ● | 점 (POINT), 중점 (MIDPOINT) |
| `line` | ╱ | 선분, 직선, 수직이등분선, 평행선, 수직선 |
| `circle` | ○ | 원 (CIRCLE) |
| `edit` | ✂ | 삭제 (DELETE) |

- 데이터: `script.js` 상단 `ALGEO_TOOL_CATEGORIES` 배열
- HTML 생성: `buildToolRailHtml()`, 플라이아웃은 `renderToolFlyout()` 동적 렌더

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
