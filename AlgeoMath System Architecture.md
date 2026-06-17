Next.js
│
├── React UI
│
├── iframe
│      │
│      ├── jQuery
│      ├── jQuery UI
│      ├── MathQuill
│      ├── wasm_algeo
│      └── 자체 수학 엔진
│
└── Kakao SDK

React / Next.js      100%
jQuery               100%
MathQuill            100%
WebAssembly          100%
자체 수학 엔진        95%
SVG 렌더링           70%
Canvas 렌더링        25%
WebGL                5%
Three.js             1%
Matter.js            0%

[...document.querySelectorAll("script")]
  .map(s => s.src)
  .filter(Boolean)

document.querySelector("iframe").src
window.frames[0].document.querySelector("canvas")
window.frames[0].document.querySelector("svg")


*****************
1. 왜 이런 하이브리드 구조를 사용했을까?
① 역사적 배경과 레거시 코드의 보존 (가장 큰 이유)
알지오메스는 2018년부터 서비스된 플랫폼입니다. 당시에는 복잡한 수학 연산 및 그리기 도구(수학 엔진)를 jQuery와 Canvas/SVG 기반의 순수 HTML/JS 웹 페이지로 먼저 개발했을 가능성이 큽니다. 이후 서비스가 확장되면서 커뮤니티, 로그인, 콘텐츠 저장, 모둠 활동 등 포털 기능이 필요해졌고, 이를 위해 최신 기술인 Next.js로 웹사이트 전체를 개편(리뉴얼)했을 것입니다. 이때 기존에 잘 작동하던 방대한 수학 엔진 코드를 React로 전부 다시 작성(Rewriting)하는 것은 비용과 리스크가 너무 크기 때문에, iframe을 통해 기존 엔진을 그대로 품는 방식을 선택한 것입니다.

② 렌더링 성능 최적화 (Canvas/SVG와 가상 DOM의 충돌 방지)
수학 그래프나 기하학적 도형을 드래그하여 실시간으로 그리는 작업(60fps)은 메모리와 CPU 연산을 많이 소모합니다.

**React의 가상 DOM(Virtual DOM)**은 상태가 바뀔 때마다 변경 사항을 비교하고 반영하므로, 실시간 픽셀 렌더링이 필요한 Canvas 내부 그래픽 연산에서는 오히려 불필요한 오버헤드(성능 저하)를 일으킬 수 있습니다.
따라서 수학적 계산과 렌더링을 담당하는 코어 엔진은 React 생태계와 완전히 분리하여, DOM 조작이 직관적이고 가벼운 jQuery와 브라우저 자체 API(Canvas/SVG)로 직접 조작하는 것이 성능과 개발 편의성 면에서 더 유리할 수 있습니다.
③ 독립적인 환경 격리 (Sandboxing)
수학 에디터 내부의 수많은 자바스크립트 변수, CSS 스타일, 이벤트 리스너들이 메인 Next.js 사이트의 상태와 충돌하지 않도록 iframe으로 완전히 격리(Sandboxing)한 것입니다. 이렇게 하면 메인 사이트의 업데이트가 수학 엔진에 영향을 주지 않아 유지보수가 안전해집니다.

2. 이 구조의 장점과 단점
장점:
안정성: 검증된 수학 라이브러리와 jQuery 코드를 그대로 유지할 수 있습니다.
성능 격리: 에디터가 무거워져도 메인 포털 웹사이트의 반응 속도에는 지장을 주지 않습니다.
기술 독립성: 에디터 영역과 웹 서비스 영역을 담당하는 개발자가 각각 독립적으로 작업할 수 있습니다.
단점:
통신 비용: 메인 껍데기(Next.js)와 에디터(iframe 안의 HTML) 간에 데이터를 주고받으려면 postMessage API 등을 이용해 복잡하게 이벤트를 주고받아야 하므로 상태 동기화가 까다롭습니다.
반응형 레이아웃 구성: 모바일이나 다양한 스크린 크기에 맞춰 iframe의 크기를 유연하게 조절하는 디자인 처리가 번거로울 수 있습니다.
