# UX 가이드라인 — AlgeoMath 클론

> **목적**: 사용자 UX 지시·피드백·구현 상태를 한곳에 모아, 이후 작업(3-5 다각형, UI-2 등)에서도 AlgeoMath 원본 수준의 조작감을 이어가기 위한 문서입니다.  
> **참고 원본**: [AlgeoMath 작도 화면](https://www.algeomath.kr/algeo/algeomath/app/make)  
> **관련 코드**: `script.js` (`ALGEO_TOOL_CATEGORIES`, `constructionDraft`, `drawToolPreview`), `style.css`

---

## 1. UX 설계 원칙 (사용자 지시 요약)

1. **단순한 버튼 나열이 아니라, 원본 AlgeoMath처럼 “작도 흐름”이 직관적이어야 한다.**
2. **실시간 미리보기**: 두 번째 점(또는 기준)을 잡은 뒤 마우스 이동으로 결과 형태를 먼저 보여 주고, 클릭으로 확정한다.
3. **호(Arc)는 중심→시작→끝 3클릭 방식이 아니다.**  
   → **끝점 2개 + 호 위 조절점**으로 호 모양을 결정한다 (외접원 3점 호).
4. **플라이아웃**: 참고 사이트처럼 아이콘 + **짧은 hint**(조작 안내)로 도구 의미를 바로 알 수 있게 한다.
5. **Esc**: 작도 중(`constructionDraft` 또는 `selectedPoints` 존재 시) 취소.
6. **빈 곳 클릭으로 점 자동 생성**은 선분·직선·원·호(끝점)에 허용. 중점·수직이등분선·각도(1·2단계)·평행/수직(기준 2점)은 **기존 점 클릭** 위주.

---

## 2. 완료된 UX 항목 (체크리스트)

| 항목 | 상태 | 비고 |
|------|------|------|
| 좌측 레일 + 카테고리 플라이아웃 | ✅ | `ui_layout.md` UI-1 |
| 플라이아웃 `hint` 문구 | ✅ | `ALGEO_TOOL_CATEGORIES[].hint`, `.flyout-tool-hint` |
| 통합 작도 상태 `constructionDraft` | ✅ | 호·원·선분·직선·각·평행·수직 |
| `drawToolPreview()` 실시간 미리보기 | ✅ | 위 도구 전부 |
| 호 3점 모델 (`p1Id`, `p2Id`, `guideId`) | ✅ | 엔진·렌더·히트테스트·`Arc(A,B,C)` 파서 |
| 대수창 토글 (접기/펼치기) | ✅ | `#btnToggleAlgebra`, `#btnOpenAlgebra` |
| 선분/직선 아이콘 | ✅ | 사용자 선호: `―`, `↔` (▬, ∞ 사용 안 함) |
| 캔버스 가시성 `ALGEO_VIS` | ✅ | 굵은 선, 라벨 흰 외곽선, 각도 연보라 채움 |

---

## 3. 도구별 조작 명세 (현재 구현)

| 도구 | hint | 조작 순서 | 미리보기 | 대수창 |
|------|------|-----------|----------|--------|
| 이동 | 드래그로 이동 | 빈 곳 Pan / 자유 점 드래그 | — | — |
| 점 | 빈 곳 클릭 | 빈 곳 클릭 → 점 생성 | — | `A=(x,y)` |
| 중점 | 점 2개 선택 | 점 2개 클릭 | — | `Midpoint(A,B)` |
| 선분 | 점1 → 드래그 → 점2 | 1점 → 마우스 → 2점 확정 | 점선 선분 | `AB` |
| 직선 | 점1 → 드래그 → 점2 | 동일 | 무한 직선 점선 | `Line(A,B)` |
| 수직이등분선 | 점 2개 선택 | 점 2개 클릭 | — | `PerpBisector(A,B)` |
| 평행선 | 기준2점 → 통과점 | 기준 2점 → 마우스 → 통과점 | 평행 직선 | `Parallel(A,B,C)` |
| 수직선 | 기준2점 → 통과점 | 동일 | 수직 직선 | `Perpendicular(A,B,C)` |
| 각도 | 변1 → 꼭짓점 → 조절 | A → B(꼭짓점) → 마우스 → 확정 | 호+채움 | `Angle(A,B,C)` |
| 원 | 중심 → 드래그 → 확정 | 중심 → 마우스 반지름 → 확정 | 원+반지름선 | `Circle(A,C)` |
| 호 | 끝점2 → 호위점 | A → B → 마우스(외접원) → C 확정 | 원+호 강조 | `Arc(A,B,C)` |
| 삭제 | 객체 클릭 | 점·도형 클릭 | — | — |

### 호(Arc) 상세 — 반드시 유지

```
1클릭: 끝점 A (없으면 빈 곳에 점 생성)
2클릭: 끝점 B
       → constructionDraft { type:'ARC', p1Id, p2Id }
       → 연한 전체 원 + 마우스 방향 호 미리보기
3클릭: 호 위 조절점 C (클릭 위치를 외접원에 투영, 또는 기존 점)
```

- **엔진 객체**: `{ type:'ARC', p1Id, p2Id, guideId }` — `computeCircumcenter` + `getArcSweepThroughGuide`
- **금지**: 중심 O → 시작 A → 끝 B 방식으로 되돌리지 않을 것

---

## 4. 플라이아웃 아이콘 (현재)

| 카테고리 | 레일 | 도구 | 아이콘 |
|----------|------|------|--------|
| pointer | ✋ | 이동 | ✋ |
| point | ● | 점 / 중점 | ● / ◎ |
| line | ／ | 선분 / 직선 | **―** / **↔** |
| line | | 수직이등분 / 평행 / 수직 / 각 | ⊥ / ∥ / ┴ / ∠ |
| circle | ◯ | 원 / 호 | ◯ / ◠ |
| edit | ⌫ | 삭제 | ⌫ |

- **선분·직선 아이콘**: 사용자가 `▬`, `∞`보다 **`―`, `↔` 선호** — 변경 시 사용자 확인 필요.
- 향후 **SVG 아이콘 세트**로 교체 예정 (`ui_layout.md` 2단계).

---

## 5. 기술 구현 메모 (다음 작업자용)

### 상태 변수 (`AlgeoApp`)

| 변수 | 용도 |
|------|------|
| `constructionDraft` | 인터랙티브 작도 중 (`type` + 도구별 id 필드) |
| `selectedPoints` | 2클릭 도구(중점, 수직이등분, 각도 1단계, 평행/수직 기준) |
| `renderer.toolPreview` | `drawToolPreview()` 입력 |
| `algebraPanelOpen` | 대수창 표시 여부 |

### `constructionDraft.type` 종류

- `SEGMENT`, `LINE` — `p1Id`
- `ARC` — `p1Id`, `p2Id`
- `CIRCLE` — `centerId`
- `ANGLE` — `ray1Id`, `vertexId`
- `PARALLEL_LINE`, `PERP_LINE` — `refP1Id`, `refP2Id`

### 핵심 메서드

| 메서드 | 역할 |
|--------|------|
| `resolvePointAtClick()` | hit 없으면 새 점 생성 후 id 반환 |
| `updateToolPreviewFromMouse()` | 마우스 → `toolPreview` 갱신 |
| `clearToolDraft()` | Esc·도구 전환 시 초기화 |
| `setAlgebraPanelOpen()` | 대수창 토글 + `renderer.resize()` |
| `getArcSweepThroughGuide()` | 3점 호 렌더/히트테스트 |
| `getGuidePointOnCircumcircle()` | 호 미리보기·확정 시 원 위 투영 |

### CSS 클래스

- `.flyout-tool-hint` — 플라이아웃 조작 안내
- `.algeo-sidebar.collapsed` — 대수창 접힘
- `.algebra-reopen-btn.visible` — 캔버스 좌측 열기 탭

---

## 6. 대수창 UX

| 기능 | 상태 |
|------|------|
| 객체 리스트 + 입력 + 명령어 사전 | ✅ |
| 항목 클릭 → 캔버스 하이라이트 | ✅ |
| **헤더 `◀` 토글로 숨기기** | ✅ |
| **캔버스 좌측 `▶ 대수창` 탭으로 다시 열기** | ✅ |
| 생성순 / 종류순 탭 | ⬜ UI-2 |
| 입력창 `+` 버튼 스타일 | ⬜ UI-2 |

---

## 7. 다음 UX 작업 (우선순위)

### 기능 로드맵 연동

1. **3-5 다각형** — AlgeoMath처럼 꼭짓점 순 클릭 + 닫기 + `constructionDraft`·미리보기 패턴 재사용.
2. **UI-2** — 대수창 탭, 격자/스냅 토글(우측 바), Undo UI, 헤더 껍데기.
3. **5-2 단축키** — `D`, `M` 등 `ALGEO_TOOL_CATEGORIES[].shortcut` 실제 연동.

### UX 개선 후보 (미구현)

- [ ] 작도 중 **단계 안내** (캔버스 하단 또는 커서 근처: “끝점 B를 선택하세요”)
- [ ] 수직이등분선·중점도 **선택 점 하이라이트** 강화 (이미 부분 적용)
- [ ] 터치 디바이스용 작도 (5단계)
- [ ] SVG/비트맵 **도구 아이콘** (원본 AlgeoMath 자산 참고)
- [ ] 다각형·호 드래그 시 **조절점 핸들** 표시
- [ ] 대수창 토글 상태 **localStorage** 저장 (선택)

### 검증 시나리오 (회귀 테스트)

1. 호: A → B → 마우스로 호 모양 확인 → C 확정 → `Arc(A,B,C)` 대수창 일치
2. 선분/직선: 빈 곳 1점 → 드래그 미리보기 → 2점 확정
3. 원: 중심 → 반지름 미리보기 → 확정
4. 각도: A → B(꼭짓점) → 마우스 각 → 확정
5. 평행/수직: 기준 2점 → 미리보기 → 통과점
6. Esc로 작도 취소
7. 대수창 토글 후 캔버스 크기·격자 정상
8. 플라이아웃 hint 가독성

---

## 8. 변경 이력

| 일자 | 내용 |
|------|------|
| UI-1 | 좌측 레일·플라이아웃·우측 줌 바 (`ui_layout.md`) |
| UX-1 | `constructionDraft` 통합, 호 3점 모델, 도구별 미리보기, 플라이아웃 hint |
| UX-2 | 대수창 토글, 선분/직선 아이콘 `―`/`↔` 복원 |

---

## 9. 관련 문서

- [`ui_layout.md`](ui_layout.md) — DOM 구조·레일·2단계 UI 계획
- [`task.md`](task.md) — 단계별 체크리스트
- [`README.md`](README.md) — 로드맵·실행 방법
