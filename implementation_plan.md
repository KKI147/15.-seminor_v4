# 알지오메스(AlgeoMath) 클론코딩 구현 계획

알지오메스의 핵심 기능인 기하 작도, 대수창 연동, 도구바 및 수학 종속성 엔진을 단계별로 클론코딩하기 위한 아키텍처 설계 및 구현 계획입니다.

## User Review Required

> [!IMPORTANT]
> - **기술 스택 선정**: 레거시 브라우저(IE 포함) 호환성 및 개발 규칙에 따라, 현대 프레임워크 대신 **HTML5 Canvas, Vanilla CSS, 그리고 jQuery**를 기반으로 구현합니다.
> - **종속성 그래프 엔진**: 기하학적 작도 도구의 핵심은 객체 간의 관계(예: 점 A와 B가 움직일 때 선분 AB도 함께 움직임)를 관리하는 것입니다. 이를 구현하기 위해 가벼운 **방향성 비순환 그래프(DAG) 기반의 기하 엔진**을 자체 설계합니다.

## Open Questions

> [!NOTE]
> 1. **렌더링 방식 선택**: 정밀한 이벤트 감지(클릭, 드래그)와 수많은 객체의 효율적인 렌더링을 위해 **HTML5 Canvas**를 기본으로 제안합니다. 혹시 SVG 방식(도형 하나하나가 DOM 객체가 됨)을 더 선호하시나요? (Canvas 방식이 성능 및 마우스 조작 구현에 더 범용적입니다.)
> 2. **수학 식 파싱 범위**: 알지오메스처럼 대수창에 `y = 2x + 1` 또는 `A = (1, 2)` 형태의 텍스트를 입력했을 때 이를 해석하여 화면에 그려주는 수식 파서(Parser) 기능을 어느 단계에서 도입할까요? 1단계 기초 기하 도구 완성 후 2단계에서 도입하는 것을 추천합니다.

---

## Proposed Changes

프로젝트 디렉토리 구조는 다음과 같이 구성할 예정입니다.

```text
/algeomath
  ├── index.html          # 메인 레이아웃 (도구바, 캔버스 영역, 대수창)
  ├── css/
  │   └── style.css       # 메인 UI 스타일 (Dark/Light 테마, 반응형 레이아웃)
  └── js/
      ├── app.js          # 어플리케이션 메인 진입점 및 UI 이벤트 핸들링
      ├── engine.js       # 수학 객체 모델 및 종속성 그래프 관리 엔진 (Geometry Engine)
      └── renderer.js     # Canvas 그리기 및 좌표 변환(줌, 팬, 격자 출력) 담당
```

### 1. 메인 레이아웃 및 렌더러 구축

#### [NEW] [index.html](file:///d:/15. seminor/other/algeomath/index.html)
- 상단 도구바(Toolbar), 좌측 대수창(Algebra Sidebar), 우측 작도 영역(Canvas Canvas Container) 레이아웃 구성.

#### [NEW] [style.css](file:///d:/15. seminor/other/algeomath/css/style.css)
- 깔끔하고 모던한 다크/라이트 테마 스타일 구현.
- Flexbox/Grid를 사용한 유연한 3단 분할 레이아웃.

#### [NEW] [renderer.js](file:///d:/15. seminor/other/algeomath/js/renderer.js)
- 화면 좌표(Canvas Pixel Space)와 수학적 좌표(Math Coordinate Space) 간의 양방향 변환 기능 구현.
- 마우스 드래그를 통한 캔버스 이동(Pan) 및 휠을 통한 확대/축소(Zoom) 기능.
- 모눈종이 격자(Grid) 및 X-Y 좌표축(Axis) 동적 렌더링.

### 2. 기하 종속성 엔진 설계

#### [NEW] [engine.js](file:///d:/15. seminor/other/algeomath/js/engine.js)
- 기하학적 요소(Point, Segment, Line, Circle 등)의 데이터 구조 정의.
- 객체 간의 관계를 정의하는 종속성 그래프 구현:
  - 예: 선분 `Segment` 객체는 시작점 `Point1`과 끝점 `Point2`를 부모(Parents)로 가짐.
  - 부모 점의 좌표가 바뀌면 종속된 자식 객체들에게 전파되어 좌표 재계산(`update()`) 수행.

### 3. 도구 핸들러 및 UI 연동

#### [NEW] [app.js](file:///d:/15. seminor/other/algeomath/js/app.js)
- jQuery를 활용한 도구바 버튼 이벤트 바인딩.
- 선택된 도구 상태(예: 'POINT', 'SEGMENT', 'MOVE')에 따른 마우스 이벤트 처리 분기.
- 마우스 클릭 시 새로운 객체 생성 및 엔진 등록, 드래그 시 객체 위치 업데이트.
- 대수창(Sidebar)에 생성된 객체 리스트 동적 추가 및 업데이트.

---

## Verification Plan

### Manual Verification
1. **렌더링 테스트**: 격자 눈금과 좌표축이 줌/팬에 따라 자연스럽게 깨짐 없이 갱신되는지 확인.
2. **도형 작도 테스트**:
   - `점` 도구를 선택하고 캔버스를 클릭하여 점 A, B 생성.
   - `선분` 도구를 선택하고 점 A와 B를 순서대로 클릭하여 선분 AB 생성.
   - `이동` 도구를 선택하고 점 A를 드래그할 때 선분 AB가 끊어지지 않고 따라 움직이는지 확인.
3. **종속성 정합성 테스트**: 부모 점이 삭제될 때 종속된 선분도 함께 안전하게 제거되는지 확인.

---

## 확장 계획 (2026-07 갱신)

초기 설계(1~3단계) 이후, `images/` 원본 스크린샷 기준 **플라이아웃 도구 52종** 전체 구현을 목표로 로드맵을 **4~12단계**로 재구성했습니다.

| 문서 | 내용 |
|------|------|
| [`tool_catalog.md`](tool_catalog.md) | toolId · 카테고리 · 구현 상태 · 엔진 타입 |
| [`images/README.md`](images/README.md) | 스크린샷 ↔ 카테고리 인덱스 |
| [`README.md`](README.md) | 단계별 로드맵·진행률 |
| [`task.md`](task.md) | 체크리스트 |

**구현 원칙**

1. **4단계** — 슬라이더·숨김·격자 등 공통 인프라를 먼저 완료
2. **5단계** — 레일·플라이아웃 UI 전체 맵 (`stub` 허용)
3. **6~11단계** — 카테고리별 엔진·렌더·UX 구현
4. **12단계** — 터치·단축키·저장·SVG 아이콘

실제 코드는 당분간 `script.js` 단일 파일을 유지하되, 도구 메타는 `ALGEO_TOOL_CATEGORIES` 중심으로 확장합니다.
