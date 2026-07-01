# 아이콘 가이드 — SVG 전용

> **프로젝트 정책 (2026-07 확정)**: **앞으로 모든 UI 아이콘은 인라인 SVG만 사용합니다.**  
> 레일·플라이아웃·가이드·우측 바·신규 도구·stub 52종까지 동일 규칙을 적용합니다.

> **필수 규칙**: UI 아이콘은 **유니코드·이모지 문자(✋, ●, ⌫ 등)를 쓰지 않습니다.**  
> 모든 레일·플라이아웃·가이드·우측 바 아이콘은 **`algeo-icons.js` 인라인 SVG** 로만 추가합니다.

> **에이전트·협업**: Cursor 규칙 [`.cursor/rules/svg-icons.mdc`](.cursor/rules/svg-icons.mdc) — 세션마다 자동 적용.

**관련 파일**

| 파일 | 역할 |
|------|------|
| [`algeo-icons.js`](algeo-icons.js) | `ALGEO_ICON_PATHS`, `renderAlgeoIcon()` |
| [`script.js`](script.js) | `ALGEO_TOOL_CATEGORIES[].iconId`, `buildToolRailHtml`, 플라이아웃 |
| [`style.css`](style.css) | `.algeo-icon-tile`, `.bar-icon`, 다크 모드 `--right-bar-icon` |
| [`index.html`](index.html) | `algeo-icons.js` → `script.js` 로드 순서 |

**참고 스크린샷**: [`images/`](images/) — AlgeoMath 원본 플라이아웃 (런타임 에셋 아님)

---

## 1. 스타일 (AlgeoMath 클론)

| 요소 | 규칙 |
|------|------|
| 레일·플라이아웃 | 흰색 둥근 타일(`.algeo-icon-tile`) + 얇은 선 기하 도형 |
| 강조색 | 빨강 `#e53935` (점·결과), 파랑 `#2563eb` (보조), 먹색 `#1a1a1a` (선) |
| 플라이아웃 배경 | 다크 `#2b2b2b` (테마와 무관하게 고정) |
| 우측 바 | 타일 없음 (`renderAlgeoIcon(id, 'bar-icon', true)`), `currentColor` |
| viewBox | `0 0 24 24` 통일 |

---

## 2. 새 아이콘 추가 절차

1. **`algeo-icons.js`** — `ALGEO_ICON_PATHS`에 SVG path 추가  
   - 카테고리 레일: `cat-{categoryId}` (예: `cat-point`)  
   - 도구: `toolId` 소문자·언더스코어 (예: `perp_bisector`)
2. **`script.js`** — `ALGEO_TOOL_CATEGORIES` 항목에 **`iconId`** 지정 (`icon` 문자열 필드 사용 금지)
3. **가이드 패널** — `ALGEO_TOOL_GUIDES` / `ALGEO_VIEW_GUIDES`는 텍스트만; 아이콘은 `iconId`로 자동 연동
4. **다크 모드** — `currentColor` 쓰는 SVG는 CSS 변수 확인  
   - 우측 바: `--right-bar-icon`, `--right-bar-icon-hover`  
   - `.algeo-icon-svg`는 전역 `color: inherit` 제외 → **명시적 color 규칙 필요**
5. **`tool_catalog.md`** · **`task.md`** — 도구 추가 시 아이콘 ID 기록

---

## 3. API 요약

```javascript
// HTML 문자열 반환 (jQuery .html() 에 넣기)
renderAlgeoIcon(iconId, extraClass, noTile);

// extraClass 예: 'rail-icon-tile' | 'flyout-icon-tile' | 'guide-icon-tile' | 'bar-icon'
// noTile === true → 우측 바·모드 레일 (타일 없이 SVG만)
```

`resolveAlgeoIconId(toolOrCatId)` — `MOVE` → `move`, `pointer` → `cat-pointer` 등 자동 해석.

---

## 4. 금지·주의

| 하지 말 것 | 이유 |
|------------|------|
| `ALGEO_TOOL_CATEGORIES`에 `icon: '●'` | 구식; 반드시 `iconId` |
| `common/` 폴더에 아이콘 에셋 추가 | 프로젝트 규칙 |
| PNG를 런타임 아이콘으로 사용 | 스케일·테마 대응 어려움 |
| 플라이아웃에만 유니코드 유지 | 레일·가이드와 불일치 |

**대수창 눈 아이콘(◉/○)·Undo(↶↷)** 등 소수 텍스트 기호는 대수창 전용으로 예외 허용. **도구·뷰 UI는 SVG.**

---

## 5. 구현 상태 (2026-07)

| 범위 | 상태 |
|------|------|
| 레일 7카테고리 + 플라이아웃 19도구 | ✅ |
| 가이드 헤더 아이콘 | ✅ |
| 우측 바 (줌·테마·격자·스냅·단축키) | ✅ |
| 52종 stub·미구현 도구 아이콘 | ⬜ 5~6단계에서 `iconId` 추가 |
| 외부 스프라이트 `images/icons/` | ⬜ 불필요 시 생략 (인라인 SVG 유지) |

로드맵 **12-5**: 핵심 UI 아이콘 ✅ / 전체 카탈로그 아이콘 ⬜

---

## 6. 체크리스트 (PR·작업 시)

- [ ] `ALGEO_ICON_PATHS`에 SVG 추가했는가?
- [ ] `iconId`만 사용했는가? (유니코드 `icon` 없음)
- [ ] `index.html`에 `algeo-icons.js` 로드 순서 유지했는가?
- [ ] 다크 모드에서 우측 바·신규 `currentColor` 아이콘 가시성 확인했는가?
- [ ] `tool_catalog.md` · 본 문서 필요 시 갱신했는가?
