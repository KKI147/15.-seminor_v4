# 도구 전체 카탈로그 — AlgeoMath 원본 대비

> **목적**: `images/` 스크린샷에 나온 **모든 도구**를 한곳에 정의하고, 구현 상태·로드맵 단계·엔진 타입을 추적합니다.  
> **코드 연동**: `script.js`의 `ALGEO_TOOL_CATEGORIES` · `ALGEO_TOOL_GUIDES` · `constructionDraft` 핸들러가 이 표의 `toolId`를 따릅니다.

**참고 스크린샷**: [`images/README.md`](images/README.md)

---

## 요약

| 구분 | 개수 |
|------|------|
| 플라이아웃 도구 (현재 코드) | **54** |
| 레일 전용 (블록코딩·설정) | **2** |
| **엔진 구현** (`done`) | **30** |
| **UI만** (`stub`) | **24** |

> 원본 스샷 기준 ~52종 + 작도 `ANGLE`(선) + SELECT/GROUP을 pointer에만 둔 구성.  
> 5단계 완료 후 **UI 맵 100%**, 엔진은 6단계부터 stub → done 전환.

---

## 좌측 레일 (현재 = 목표 구조) ✅ 5단계

원본 AlgeoMath 순서 (위 → 아래).

| 순서 | 카테고리 ID | 레일 | 플라이아웃 | 스크린샷 | 로드맵 |
|------|-------------|------|-----------|----------|--------|
| 0 | `blockcoding` | 블록코딩 | *(railOnly)* | (레일만) | 11단계 |
| 1 | `pointer` | 선택·이동 | 이동, 선택, 그룹선택 | 144341 | 7단계 |
| 2 | `point` | 점 | 8종 | 144346 | 6-1 |
| 3 | `circle` | 원 | 7종 | 144354 | 6-3 |
| 4 | `line` | 선 | 11종 (+작도 각도) | 144351 | 6-2 |
| 5 | `polygon` | 다각형 | 4종 | 144358 | 6-4 |
| 6 | `transform` | 변환·측정 | 9종 | 144401 | 8·9단계 |
| 7 | `misc` | 기타·객체 | 7종 | 144341 | 7·8·11 |
| 8 | `draw` | 펜·꾸미기 | 5종 | 144405 | 8단계 |
| 9 | `settings` | 설정 | *(railOnly)* | (레일만) | 11단계 |

**현재 코드**: 위 10칸 전부 등록. 아이콘 **SVG** ([`icon_guidelines.md`](icon_guidelines.md))

---

## 5단계 개선 메모 (2026-07-10)

구현 중 반영·권장 사항:

| 항목 | 결정 | 이유 |
|------|------|------|
| SELECT / GROUP_SELECT | **pointer에만** 배치, misc에서 제거 | 카탈로그 중복 해소 (`tool_catalog` 구버전 주의) |
| 그룹선택 단축키 | **`Shift+G`** (원본 표기 G → 변경) | 단독 `G`는 격자 토글과 충돌 |
| SELECT 단축키 | 플라이아웃에서 **Esc 표기 제거** | Esc는 작도 취소·이동 복귀만 (선택 도구와 무관) |
| 단축키 안내 | **`Shift+?`** (키캡 Shift+/) | `?`만 쓰면 Shift 누락 · `/` 단독 표기는 파서와 충돌 주의 |
| Redo | **`Ctrl+Y / Ctrl+Shift+Z`** 병기 | 코드가 둘 다 지원 · 대안은 ` / `로만 구분 |
| 블록코딩·설정 | `railOnly: true` | 플라이아웃 없이 가이드 안내 (11단계까지) |
| stub 클릭 | 캔버스 입력 무시 + 가이드 「준비 중」 | 빈 작도·오동작 방지 |
| 작도 `ANGLE` | `line` 카테고리 유지 | 측정 `MEASURE_ANGLE`과 toolId 분리 |
| 레일 순서 | 원본대로 **원 → 선** | 기존 코드(선→원)에서 교정 |

**추가 개선 제안** (미반영 · 이후 검토)

1. **플라이아웃 hint 표시** — 현재 CSS로 `.flyout-tool-hint`가 `display:none`. 원본처럼 짧은 hint를 다시 켤지, 가이드 패널만 쓸지 UX 결정 필요.
2. **설정 패널 조기 연결** — 격자·스냅·테마는 우측 바에 있음. ⚙ 클릭 시 동일 옵션을 모달로 모아 두면 11-3 전에 체감 UX 향상.
3. **stub → done 배지 자동 갱신** — 엔진 구현 시 `status`만 바꾸면 배지·커서·클릭이 따라가도록 이미 연결됨. 6단계부터 `status: 'done'`만 갱신하면 됨.
4. **`script.js` 모듈 분리** — 카테고리·가이드·단축키 상수가 비대해짐. 여유 시 `algeo-tools.js` 분리 검토 (로드 순서만 주의).

---

## 플라이아웃 도구 상세

상태: `done` 엔진 구현 · `stub` UI만(5단계) · (구 `planned`는 stub로 통합)

### pointer — 선택·이동

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `MOVE` | 이동 | — | done | 1단계 | Pan + 자유 점 드래그 |
| `SELECT` | 선택 | — | done | 7-1 | 클릭 선택 · Shift 토글 · 드래그 이동 · Delete |
| `GROUP_SELECT` | 그룹선택 | Shift+G | done | 7-1 | 드래그 박스 다중선택 · G 단독 = 격자 |

### point — 점 (`144346`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 엔진 |
|--------|------|--------|------|--------|------|
| `POINT` | 점 | D | done | 1단계 | POINT |
| `INTERSECTION` | 교점 | I | done | **6-1** | INTERSECTION (종속) |
| `POINT_ON_OBJECT` | 대상 위의 점 | O | done | **6-1** | POINT_ON |
| `LINE_TRACER` | 라인 트레이서 | — | stub | 6-1 | 애니메이션 이후 |
| `MIDPOINT` | 중점 | M | done | 3-2 | MIDPOINT |
| `INSERT_IMAGE` | 그림 넣기 | — | stub | 10-1 | IMAGE |
| `INSERT_VIDEO` | 동영상 넣기 | — | stub | 10-1 | VIDEO |
| `TABLE` | 표 | — | stub | 10-2 | TABLE |

### circle — 원 (`144354`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `CIRCLE` | 원 : 중심과 한 점 | C | done | 1단계 | |
| `COMPASS` | 컴퍼스 | — | done | **6-3** | 반지름 두 점 → 중심 |
| `CIRCLE_3P` | 원 : 세 점 | — | done | **6-3** | |
| `CIRCLE_RADIUS` | 원 : 중심과 반지름 | — | done | **6-3** | prompt 숫자·슬라이더 |
| `ARC` | 호 | — | done | 3-4 | |
| `SECTOR` | 부채꼴 | — | done | **6-3** | |
| `CIRCULAR_SEGMENT` | 활꼴 | — | done | **6-3** | |

### line — 선 (`144351` + 작도 각도)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `SEGMENT` | 선분 | S | done | 1단계 | |
| `SEGMENT_GIVEN_LENGTH` | 주어진 길이의 선분 | — | done | **6-2** | prompt 길이 + 방향 |
| `LINE` | 직선 | L | done | 3-1 | |
| `RAY` | 반직선 | — | done | **6-2** | |
| `PARALLEL_LINE` | 평행선 | — | done | 3-3 | |
| `PERP_LINE` | 수선 | — | done | 3-3 | |
| `PERP_BISECTOR` | 수직이등분선 | V | done | 3-2 | |
| `ANGLE_BISECTOR` | 각의 이등분선 | — | done | **6-2** | |
| `TANGENT` | 접선 | — | done | **6-2** | 원→점 |
| `VECTOR` | 벡터 | — | done | **6-2** | 화살표 선분 |
| `ANGLE` | 각도 (작도) | — | done | 3-4 | ≠ `MEASURE_ANGLE` |

### polygon — 다각형 (`144358`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `POLYGON` | 다각형 | P | done | 3-5 | |
| `REGULAR_POLYGON_SIDE` | 정다각형 : 한 변 | — | done | **6-4** | 두 점 → n → 방향 |
| `REGULAR_POLYGON_CENTER` | 정다각형 : 중심과 한 점 | — | done | **6-4** | 중심·꼭짓점 → n |
| `ANGLE_GIVEN` | 주어진 크기의 각 | — | done | **6-4** | 두 점 → 각도 → 방향 |

### transform — 변환·측정 (`144401`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `MEASURE_LENGTH` | 길이 | — | stub | 8-1 | |
| `MEASURE_ANGLE` | 각도 | — | stub | 8-1 | 측정 (작도 ANGLE과 별개) |
| `MEASURE_AREA` | 넓이 | — | stub | 8-1 | |
| `REFLECT_POINT` | 점대칭 | R | stub | 9-1 | |
| `REFLECT_LINE` | 선대칭 | — | stub | 9-1 | |
| `ROTATE` | 회전 | — | stub | 9-2 | |
| `TRANSLATE` | 평행이동 | — | stub | 9-2 | |
| `DILATE` | 점을 중심으로 확대 | — | stub | 9-2 | |
| `TILE` | 타일 | — | stub | 9-3 | |

### misc — 기타·객체 (`144341`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `TEXT` | 텍스트 | T | stub | 7-2 | |
| `SLIDER` | 슬라이더 | — | done | 4-3 | |
| `USER_TOOL` | 사용자 도구 | — | stub | 11-2 | |
| `CHECKBOX` | 체크박스 | — | stub | 7-2 | |
| `BLOCK_EVENT_BTN` | 블록코딩 이벤트 버튼 | — | stub | 11-1 | |
| `HIDE_OBJECT` | 대상 숨기기 | H | done | 4-4 | |
| `DELETE` | 삭제 | — | done | 1단계 | |

> SELECT / GROUP_SELECT는 **pointer** 전용 (misc 미포함).

### draw — 펜·꾸미기 (`144405`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `DECORATE_LEADER` | 꾸미기: 설명선 | E | stub | 8-2 | |
| `DECORATE_LENGTH` | 꾸미기: 길이 | — | stub | 8-2 | |
| `DECORATE_ANGLE` | 꾸미기: 각도 | — | stub | 8-2 | |
| `DECORATE_PARALLEL` | 꾸미기: 평행 | — | stub | 8-2 | |
| `PEN` | 그리기 (펜그림) | B | stub | 8-3 | |

---

## 구현 패턴 (공통)

새 도구를 stub → done 으로 올릴 때:

0. **아이콘** — 이미 있으면 유지 ([`icon_guidelines.md`](icon_guidelines.md))
1. `tool_catalog.md` — 상태 `done` 갱신
2. `ALGEO_TOOL_CATEGORIES` — `status: 'done'`
3. `ALGEO_TOOL_GUIDES` — 실제 조작 단계로 교체
4. `AlgeoEngine` — `type` · `parents` · `recompute`
5. `AlgeoRenderer` — `draw*` · hit test
6. `AlgeoApp` — `constructionDraft` · `handleMouse*` (stub 가드 통과)
7. 대수창 · `task.md` · `README.md`

**좌표·드래그**: 캔버스 밖 UI는 [`README.md`](README.md) 「popscale factor」 참고.

---

## 단계별 묶음

| 로드맵 | 핵심 | 상태 |
|--------|------|------|
| 4단계 | 슬라이더, 숨김, 격자·스냅 | ✅ |
| 5단계 | 레일 9+1, 플라이아웃 stub | ✅ |
| 6단계 | 점·선·원·다각형 작도 | ✅ |
| 7-1 | 선택 · 그룹선택 | ✅ |
| 7-2~11 | 텍스트·측정·변환·미디어·블록 | ⬜ 다음(측정·변환 우선) |
| 12단계 | 터치·저장·단축키 완성 | 일부 ✅ |

---

## 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-07-23 | 7-1 SELECT·GROUP_SELECT done — 클릭/Shift/마퀴·Delete·다중 이동 |
| 2026-07-01 | `images/` 7장 기준 전체 카탈로그·로드맵 4~12단계 정의 |
| 2026-07-10 | 5단계 UI 맵 완료 · stub 39 · 개선 메모 · SELECT misc 중복 제거 · Shift+G |
| 2026-07-10 | UI 서비스 품질 원칙 (`ux_guidelines.md`) · 6-1 교점·대상 위 점 done |
| 2026-07-10 | 6-2 반직선·벡터·각이등분선·접선·주어진 길이 선분 |
| 2026-07-10 | 6-3 컴퍼스·세 점 원·중심+반지름·부채꼴·활꼴 |
