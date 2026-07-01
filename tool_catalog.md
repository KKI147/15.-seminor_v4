# 도구 전체 카탈로그 — AlgeoMath 원본 대비

> **목적**: `images/` 스크린샷에 나온 **모든 도구**를 한곳에 정의하고, 구현 상태·로드맵 단계·엔진 타입을 추적합니다.  
> **코드 연동**: `script.js`의 `ALGEO_TOOL_CATEGORIES` · `ALGEO_TOOL_GUIDES` · `constructionDraft` 핸들러가 이 표의 `toolId`를 따릅니다.

**참고 스크린샷**: [`images/README.md`](images/README.md)

---

## 요약

| 구분 | 개수 |
|------|------|
| 플라이아웃 도구 (스크린샷 기준) | **52** |
| 레일 전용 (블록코딩·설정) | **2** |
| **구현 완료** (`done`) | **18** |
| **미구현** (`planned`) | **36** |

---

## 좌측 레일 (목표 구조)

원본 AlgeoMath 순서 (위 → 아래). `images/` 7장 기준.

| 순서 | 카테고리 ID | 레일 | 플라이아웃 | 스크린샷 | 로드맵 |
|------|-------------|------|-----------|----------|--------|
| 0 | `blockcoding` | 블록코딩 | (별도 진입) | (레일만) | 11단계 |
| 1 | `pointer` | 선택·이동 | 선택, 그룹선택 | 144341 | 7단계 |
| 2 | `point` | 점 | 8종 | 144346 | 6-1 |
| 3 | `circle` | 원 | 7종 | 144354 | 6-3 |
| 4 | `line` | 선 | 10종 | 144351 | 6-2 |
| 5 | `polygon` | 다각형 | 4종 | 144358 | 6-4 |
| 6 | `transform` | 변환·측정 | 9종 | 144401 | 9단계 |
| 7 | `misc` | 기타·객체 | 9종 | 144341 | 7·8단계 |
| 8 | `draw` | 펜·꾸미기 | 5종 | 144405 | 8단계 |
| 9 | `settings` | 설정 ⚙ | (패널) | (레일만) | 4-5 · 11단계 |

**현재 코드** (`ALGEO_TOOL_CATEGORIES`): `pointer` · `point` · `line`(다각형 포함) · `circle` · `edit` — **5카테고리, 17도구**

---

## 플라이아웃 도구 상세

상태: `done` 구현 완료 · `planned` 미구현 · `stub` UI만 노출(5단계)

### pointer — 선택·이동 (`144341` 일부)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `MOVE` | 이동 | — | done | 1단계 | Pan + 자유 점 드래그 |
| `SELECT` | 선택 | Esc | planned | 7-1 | 객체 단일 선택 모드 |
| `GROUP_SELECT` | 그룹선택 | G | planned | 7-1 | 영역·다중 선택 |

### point — 점 (`144346`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 엔진 |
|--------|------|--------|------|--------|------|
| `POINT` | 점 | D | done | 1단계 | POINT |
| `INTERSECTION` | 교점 | I | planned | 6-1 | POINT (종속) |
| `POINT_ON_OBJECT` | 대상 위의 점 | O | planned | 6-1 | POINT + path t |
| `LINE_TRACER` | 라인 트레이서 | — | planned | 6-1 | POINT + 애니메이션 |
| `MIDPOINT` | 중점 | M | done | 3-2 | MIDPOINT |
| `INSERT_IMAGE` | 그림 넣기 | — | planned | 10-1 | IMAGE |
| `INSERT_VIDEO` | 동영상 넣기 | — | planned | 10-1 | VIDEO |
| `TABLE` | 표 | — | planned | 10-2 | TABLE |

### line — 선 (`144351`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `SEGMENT` | 선분 | S | done | 1단계 | |
| `SEGMENT_GIVEN_LENGTH` | 주어진 길이의 선분 | — | planned | 6-2 | 길이 입력·슬라이더 연동 |
| `LINE` | 직선 | L | done | 3-1 | |
| `RAY` | 반직선 | — | planned | 6-2 | LINE 변형 |
| `PARALLEL_LINE` | 평행선 | — | done | 3-3 | 원본 「평행선」 |
| `PERP_LINE` | 수선 | — | done | 3-3 | 원본 「수선」 |
| `PERP_BISECTOR` | 수직이등분선 | V | done | 3-2 | 단축키 V는 5-3에서 |
| `ANGLE_BISECTOR` | 각의 이등분선 | — | planned | 6-2 | LINE |
| `TANGENT` | 접선 | — | planned | 6-2 | LINE + 원 |
| `VECTOR` | 벡터 | — | planned | 6-2 | SEGMENT + 화살표 |

### circle — 원 (`144354`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `CIRCLE` | 원 : 중심과 한 점 | C | done | 1단계 | |
| `COMPASS` | 컴퍼스 | — | planned | 6-3 | 반지름 복사 작도 |
| `CIRCLE_3P` | 원 : 세 점 | — | planned | 6-3 | CIRCLE |
| `CIRCLE_RADIUS` | 원 : 중심과 반지름 | — | planned | 6-3 | 숫자/변수 반지름 |
| `ARC` | 호 | — | done | 3-4 | |
| `SECTOR` | 부채꼴 | — | planned | 6-3 | 채움 영역 |
| `CIRCULAR_SEGMENT` | 활꼴 | — | planned | 6-3 | 현+호 영역 |

### polygon — 다각형 (`144358`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `POLYGON` | 다각형 | P | done | 3-5 | 현재 `line` 카테고리에 있음 → 6-4에서 분리 |
| `REGULAR_POLYGON_SIDE` | 정다각형 : 한 변 | — | planned | 6-4 | n 입력 |
| `REGULAR_POLYGON_CENTER` | 정다각형 : 중심과 한 점 | — | planned | 6-4 | |
| `ANGLE_GIVEN` | 주어진 크기의 각 | — | planned | 6-4 | ANGLE + 고정 각도 |

> **주의**: `line` 카테고리의 **각도(`ANGLE`)** 는 **작도 도구**(∠ABC). `transform`의 **각도** 는 **측정 도구** — `toolId`를 `MEASURE_ANGLE` 등으로 구분합니다.

### transform — 변환·측정 (`144401`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `MEASURE_LENGTH` | 길이 | — | planned | 8-1 | 주석·라벨 |
| `MEASURE_ANGLE` | 각도 | — | planned | 8-1 | 측정 (작도 ANGLE과 별개) |
| `MEASURE_AREA` | 넓이 | — | planned | 8-1 | |
| `REFLECT_POINT` | 점대칭 | R | planned | 9-1 | 복사/변환 |
| `REFLECT_LINE` | 선대칭 | — | planned | 9-1 | |
| `ROTATE` | 회전 | — | planned | 9-2 | |
| `TRANSLATE` | 평행이동 | — | planned | 9-2 | |
| `DILATE` | 점을 중심으로 확대 | — | planned | 9-2 | |
| `TILE` | 타일 | — | planned | 9-3 | 패턴 반복 |

### misc — 기타·객체 (`144341`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `SELECT` | 선택 | Esc | planned | 7-1 | pointer와 중복 시 misc 제거 검토 |
| `GROUP_SELECT` | 그룹선택 | G | planned | 7-1 | |
| `TEXT` | 텍스트 | T | planned | 7-2 | |
| `SLIDER` | 슬라이더 | — | done | **4-3** | 변수 연동 |
| `USER_TOOL` | 사용자 도구 | — | planned | 11-2 | |
| `CHECKBOX` | 체크박스 | — | planned | 7-2 | |
| `BLOCK_EVENT_BTN` | 블록코딩 이벤트 버튼 | — | planned | 11-1 | |
| `HIDE_OBJECT` | 대상 숨기기 | H | planned | **4-4** | `visible` 플래그 |
| `DELETE` | 삭제 | — | done | 1단계 | |

### draw — 펜·꾸미기 (`144405`)

| toolId | 라벨 | 단축키 | 상태 | 로드맵 | 비고 |
|--------|------|--------|------|--------|------|
| `DECORATE_LEADER` | 꾸미기: 설명선 | E | planned | 8-2 | |
| `DECORATE_LENGTH` | 꾸미기: 길이 | — | planned | 8-2 | |
| `DECORATE_ANGLE` | 꾸미기: 각도 | — | planned | 8-2 | |
| `DECORATE_PARALLEL` | 꾸미기: 평행 | — | planned | 8-2 | |
| `PEN` | 그리기 (펜그림) | B | planned | 8-3 | 폴리라인, `점의 수: N` |

---

## 구현 패턴 (공통)

새 도구 추가 시 체크리스트:

1. `tool_catalog.md` — `toolId` · 상태 갱신
2. `ALGEO_TOOL_CATEGORIES` — 카테고리·`hint`·`shortcut`·`status`
3. `ALGEO_TOOL_GUIDES` — 가이드 단계
4. `AlgeoEngine` — `type` · `parents` · `recompute`
5. `AlgeoRenderer` — `draw*` · hit test
6. `AlgeoApp` — `constructionDraft` · `handleMouse*`
7. 대수창 — 라벨 문자열 · 속성 패널(해당 시)
8. `task.md` · `README.md` — 단계 체크

**좌표·드래그**: 캔버스 밖 UI는 [`README.md`](README.md) 「popscale factor」 참고.

---

## 단계별 묶음 (로드맵 대응)

| 로드맵 | 포함 도구 수 | 핵심 |
|--------|-------------|------|
| 4단계 | 2 (+인프라) | 슬라이더, 숨김, 격자·스냅 |
| 5단계 | 52 stub | 레일 9+1, 플라이아웃 전체 노출 |
| 6단계 | 22 | 점·선·원·다각형 **작도** 보강 |
| 7단계 | 6 | 선택, 텍스트, 체크박스, 그룹 |
| 8단계 | 8 | 측정 3 + 꾸미기 4 + 펜 |
| 9단계 | 9 | 변환·타일 |
| 10단계 | 3 | 그림·동영상·표 |
| 11단계 | 3 | 블록코딩·사용자도구·설정 |
| 12단계 | — | 터치·단축키·저장·아이콘 SVG |

---

## 변경 이력

| 일자 | 내용 |
|------|------|
| 2026-07-01 | `images/` 7장 기준 전체 카탈로그·로드맵 4~12단계 정의 |
