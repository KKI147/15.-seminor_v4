let algeoAppInstance = null;

// 대수창 명령어 사전
const ALGEBRA_COMMANDS = [
    {
        label: '점',
        syntax: 'A = (x, y)',
        example: 'A=(1,2)',
        desc: '점을 만들거나 좌표를 이동합니다.',
    },
    {
        label: '함수',
        syntax: 'y = ax + b',
        example: 'y=2x+1',
        desc: '일차함수 그래프를 그립니다.'
    },
    {
        label: '선분',
        syntax: 'AB 또는 D,E',
        example: 'D,E',
        desc: '두 점을 잇는 선분을 만듭니다.'
    },
    {
        label: '직선',
        syntax: 'Line(A, B)',
        example: 'Line(A,B)',
        desc: '두 점을 지나는 무한 직선입니다.'
    },
    {
        label: '중점',
        syntax: 'Midpoint(A, B)',
        example: 'Midpoint(A,B)',
        desc: '두 점의 중점을 만듭니다.'
    },
    {
        label: '수직이등분선',
        syntax: 'PerpBisector(A, B)',
        example: 'PerpBisector(A,B)',
        desc: '선분 AB의 수직이등분선입니다.'
    },
    {
        label: '원',
        syntax: 'Circle(A, C)',
        example: 'Circle(A,C)',
        desc: '중심 A, 둘레 점 C인 원입니다.'
    },
    {
        label: '평행선',
        syntax: 'Parallel(A, B, C)',
        example: 'Parallel(A,B,C)',
        desc: 'C를 지나며 AB와 평행한 직선입니다.'
    },
    {
        label: '수직선',
        syntax: 'Perpendicular(A, B, C)',
        example: 'Perpendicular(A,B,C)',
        desc: 'C를 지나며 AB에 수직인 직선입니다.'
    },
    {
        label: '각도',
        syntax: 'Angle(A, B, C)',
        example: 'Angle(A,B,C)',
        desc: 'B가 꼭짓점인 각도 ∠ABC입니다.'
    },
    {
        label: '호',
        syntax: 'Arc(A, B, C)',
        example: 'Arc(A,B,C)',
        desc: '끝점 A,B → 호 위의 점 C로 호 모양 결정.'
    },
    {
        label: '다각형',
        syntax: 'Polygon(A, B, C, ...)',
        example: 'Polygon(A,B,C,D)',
        desc: '꼭짓점을 순서대로 잇는 다각형입니다.'
    },
    {
        label: '슬라이더',
        syntax: 'a = Slider(min, max)',
        example: 'a=Slider(0,5,1)',
        desc: '변수 슬라이더를 만듭니다. y=ax+b 등에 연동할 수 있습니다.'
    }
];

// 대수창 종류순 정렬 우선순위
const ALGEBRA_TYPE_ORDER = {
    POINT: 0,
    MIDPOINT: 1,
    INTERSECTION: 2,
    POINT_ON: 3,
    REGULAR_VERTEX: 4,
    FIXED_ANGLE_POINT: 5,
    SEGMENT: 6,
    VECTOR: 7,
    LINE: 8,
    RAY: 9,
    PERP_BISECTOR: 10,
    ANGLE_BISECTOR: 11,
    PARALLEL_LINE: 12,
    PERP_LINE: 13,
    TANGENT: 14,
    CIRCLE: 15,
    CIRCLE_3P: 16,
    ARC: 17,
    SECTOR: 18,
    CIRCULAR_SEGMENT: 19,
    ANGLE: 20,
    POLYGON: 21,
    SLIDER: 22,
    FUNCTION: 23
};

// 점류 객체인지 여부 (자유점·종속점)
function isAlgeoPointType(type) {
    return type === 'POINT' || type === 'MIDPOINT' || type === 'INTERSECTION' ||
        type === 'POINT_ON' || type === 'REGULAR_VERTEX' || type === 'FIXED_ANGLE_POINT';
}

// 교점·대상 위 점 작도에 쓸 수 있는 도형 타입
const ALGEO_INTERSECTABLE_TYPES = {
    SEGMENT: true,
    VECTOR: true,
    LINE: true,
    RAY: true,
    PERP_BISECTOR: true,
    ANGLE_BISECTOR: true,
    PARALLEL_LINE: true,
    PERP_LINE: true,
    TANGENT: true,
    CIRCLE: true,
    CIRCLE_3P: true
};

// 슬라이더 트랙 길이(화면 픽셀) — 줌과 무관하게 동일한 조작감
const ALGEO_SLIDER_TRACK_PX = 120;
const ALGEO_SLIDER_THUMB_R = 7;
const ALGEO_SLIDER_DEFAULT_MIN = 0;
const ALGEO_SLIDER_DEFAULT_MAX = 10;
const ALGEO_SLIDER_DEFAULT_VALUE = 1;
const ALGEO_SLIDER_DEFAULT_STEP = 0.1;

// Undo 스택 최대 깊이
const ALGEO_UNDO_MAX = 50;

// popscale(#wrap) 줌 계수 — 화면 픽셀 ↔ 설계 좌표(1920×1020) 변환에 사용
function getPopscaleFactor() {
    if (typeof FORTEACHERCD !== 'undefined' && FORTEACHERCD.responsive &&
        FORTEACHERCD.responsive.baseContainerSize &&
        FORTEACHERCD.responsive.baseContainerSize.zoom > 0) {
        return FORTEACHERCD.responsive.baseContainerSize.zoom;
    }
    return 1;
}

// 캔버스 마우스 좌표 — #wrap popscale(transform) 시 offsetX/Y 보정
function getCanvasMousePos(canvas, e) {
    const ev = e.originalEvent ? e.originalEvent : e;
    const rect = canvas.getBoundingClientRect();
    let x = ev.clientX - rect.left;
    let y = ev.clientY - rect.top;

    if (rect.width > 0 && rect.height > 0) {
        x = x * (canvas.width / rect.width);
        y = y * (canvas.height / rect.height);
    }

    return { x: x, y: y };
}

// 좌측 도구 레일 카테고리 (플라이아웃 서브메뉴 구성)
// 5단계: 원본 레일 순서(블록코딩→…→설정). status: done | stub
// SELECT/GROUP_SELECT는 pointer에만 두고 misc 중복은 제거 (개선안)
const ALGEO_TOOL_CATEGORIES = [
    {
        id: 'blockcoding',
        iconId: 'cat-blockcoding',
        title: '블록코딩',
        railOnly: true,
        railHint: '11단계에서 구현 예정'
    },
    {
        id: 'pointer',
        iconId: 'cat-pointer',
        title: '선택·이동',
        tools: [
            { tool: 'MOVE', label: '이동', iconId: 'move', status: 'done', hint: '객체·점 드래그 / 빈 곳 Pan' },
            { tool: 'SELECT', label: '선택', iconId: 'select', status: 'stub', hint: '객체 단일 선택 (7-1)' },
            { tool: 'GROUP_SELECT', label: '그룹선택', iconId: 'group_select', status: 'stub', shortcut: 'Shift+G', hint: '영역·다중 선택 (7-1)' }
        ]
    },
    {
        id: 'point',
        iconId: 'cat-point',
        title: '점',
        tools: [
            { tool: 'POINT', label: '점', iconId: 'point', status: 'done', shortcut: 'D', hint: '빈 곳 클릭' },
            { tool: 'INTERSECTION', label: '교점', iconId: 'intersection', status: 'done', shortcut: 'I', hint: '도형 2개 클릭' },
            { tool: 'POINT_ON_OBJECT', label: '대상 위의 점', iconId: 'point_on_object', status: 'done', shortcut: 'O', hint: '선·원 위 클릭' },
            { tool: 'LINE_TRACER', label: '라인 트레이서', iconId: 'line_tracer', status: 'stub', hint: '경로 따라 이동 (6-1)' },
            { tool: 'MIDPOINT', label: '중점', iconId: 'midpoint', status: 'done', shortcut: 'M', hint: '점 2개 선택' },
            { tool: 'INSERT_IMAGE', label: '그림 넣기', iconId: 'insert_image', status: 'stub', hint: '이미지 삽입 (10-1)' },
            { tool: 'INSERT_VIDEO', label: '동영상 넣기', iconId: 'insert_video', status: 'stub', hint: '동영상 삽입 (10-1)' },
            { tool: 'TABLE', label: '표', iconId: 'table', status: 'stub', hint: '표 삽입 (10-2)' }
        ]
    },
    {
        id: 'circle',
        iconId: 'cat-circle',
        title: '원',
        tools: [
            { tool: 'CIRCLE', label: '원 : 중심과 한 점', iconId: 'circle', status: 'done', shortcut: 'C', hint: '중심 → 드래그 → 확정' },
            { tool: 'COMPASS', label: '컴퍼스', iconId: 'compass', status: 'done', hint: '반지름 두 점 → 중심' },
            { tool: 'CIRCLE_3P', label: '원 : 세 점', iconId: 'circle_3p', status: 'done', hint: '세 점 클릭' },
            { tool: 'CIRCLE_RADIUS', label: '원 : 중심과 반지름', iconId: 'circle_radius', status: 'done', hint: '중심 → 반지름 입력' },
            { tool: 'ARC', label: '호', iconId: 'arc', status: 'done', hint: '끝점2 → 호 위 점' },
            { tool: 'SECTOR', label: '부채꼴', iconId: 'sector', status: 'done', hint: '중심 → 끝점2' },
            { tool: 'CIRCULAR_SEGMENT', label: '활꼴', iconId: 'circular_segment', status: 'done', hint: '끝점2 → 호 위 점' }
        ]
    },
    {
        id: 'line',
        iconId: 'cat-line',
        title: '선',
        tools: [
            { tool: 'SEGMENT', label: '선분', iconId: 'segment', status: 'done', shortcut: 'S', hint: '점1 → 드래그 → 점2' },
            { tool: 'SEGMENT_GIVEN_LENGTH', label: '주어진 길이의 선분', iconId: 'segment_given_length', status: 'done', hint: '시작점 → 길이 → 방향' },
            { tool: 'LINE', label: '직선', iconId: 'line', status: 'done', shortcut: 'L', hint: '점1 → 드래그 → 점2' },
            { tool: 'RAY', label: '반직선', iconId: 'ray', status: 'done', hint: '시작점 → 방향점' },
            { tool: 'PARALLEL_LINE', label: '평행선', iconId: 'parallel_line', status: 'done', hint: '기준2점 → 통과점' },
            { tool: 'PERP_LINE', label: '수선', iconId: 'perp_line', status: 'done', hint: '기준2점 → 통과점' },
            { tool: 'PERP_BISECTOR', label: '수직이등분선', iconId: 'perp_bisector', status: 'done', shortcut: 'V', hint: '점 2개 선택' },
            { tool: 'ANGLE_BISECTOR', label: '각의 이등분선', iconId: 'angle_bisector', status: 'done', hint: '변1 → 꼭짓점 → 변2' },
            { tool: 'TANGENT', label: '접선', iconId: 'tangent', status: 'done', hint: '원 → 점' },
            { tool: 'VECTOR', label: '벡터', iconId: 'vector', status: 'done', hint: '시작점 → 끝점' },
            { tool: 'ANGLE', label: '각도', iconId: 'angle', status: 'done', hint: '변1 → 꼭짓점 → 조절' }
        ]
    },
    {
        id: 'polygon',
        iconId: 'cat-polygon',
        title: '다각형',
        tools: [
            { tool: 'POLYGON', label: '다각형', iconId: 'polygon', status: 'done', shortcut: 'P', hint: '꼭짓점 클릭 → 첫 점으로 닫기' },
            { tool: 'REGULAR_POLYGON_SIDE', label: '정다각형 : 한 변', iconId: 'regular_polygon_side', status: 'done', hint: '한 변 두 점 → 꼭짓점 수' },
            { tool: 'REGULAR_POLYGON_CENTER', label: '정다각형 : 중심과 한 점', iconId: 'regular_polygon_center', status: 'done', hint: '중심·꼭짓점 → 꼭짓점 수' },
            { tool: 'ANGLE_GIVEN', label: '주어진 크기의 각', iconId: 'angle_given', status: 'done', hint: '두 점 → 각도 → 방향' }
        ]
    },
    {
        id: 'transform',
        iconId: 'cat-transform',
        title: '변환·측정',
        tools: [
            { tool: 'MEASURE_LENGTH', label: '길이', iconId: 'measure_length', status: 'stub', hint: '길이 측정 (8-1)' },
            { tool: 'MEASURE_ANGLE', label: '각도', iconId: 'measure_angle', status: 'stub', hint: '각도 측정 (8-1)' },
            { tool: 'MEASURE_AREA', label: '넓이', iconId: 'measure_area', status: 'stub', hint: '넓이 측정 (8-1)' },
            { tool: 'REFLECT_POINT', label: '점대칭', iconId: 'reflect_point', status: 'stub', shortcut: 'R', hint: '점대칭 변환 (9-1)' },
            { tool: 'REFLECT_LINE', label: '선대칭', iconId: 'reflect_line', status: 'stub', hint: '선대칭 변환 (9-1)' },
            { tool: 'ROTATE', label: '회전', iconId: 'rotate', status: 'stub', hint: '회전 변환 (9-2)' },
            { tool: 'TRANSLATE', label: '평행이동', iconId: 'translate', status: 'stub', hint: '평행이동 (9-2)' },
            { tool: 'DILATE', label: '점을 중심으로 확대', iconId: 'dilate', status: 'stub', hint: '확대·축소 (9-2)' },
            { tool: 'TILE', label: '타일', iconId: 'tile', status: 'stub', hint: '패턴 반복 (9-3)' }
        ]
    },
    {
        id: 'misc',
        iconId: 'cat-misc',
        title: '기타·객체',
        tools: [
            { tool: 'TEXT', label: '텍스트', iconId: 'text', status: 'stub', shortcut: 'T', hint: '텍스트 상자 (7-2)' },
            { tool: 'SLIDER', label: '슬라이더', iconId: 'slider', status: 'done', hint: '캔버스 클릭 생성' },
            { tool: 'USER_TOOL', label: '사용자 도구', iconId: 'user_tool', status: 'stub', hint: '사용자 정의 (11-2)' },
            { tool: 'CHECKBOX', label: '체크박스', iconId: 'checkbox', status: 'stub', hint: '표시 토글 (7-2)' },
            { tool: 'BLOCK_EVENT_BTN', label: '블록코딩 이벤트 버튼', iconId: 'block_event_btn', status: 'stub', hint: '이벤트 버튼 (11-1)' },
            { tool: 'HIDE_OBJECT', label: '대상 숨기기', iconId: 'hide_object', status: 'done', shortcut: 'H', hint: '객체 클릭' },
            { tool: 'DELETE', label: '삭제', iconId: 'delete', status: 'done', hint: '객체 클릭' }
        ]
    },
    {
        id: 'draw',
        iconId: 'cat-draw',
        title: '펜·꾸미기',
        tools: [
            { tool: 'DECORATE_LEADER', label: '꾸미기: 설명선', iconId: 'decorate_leader', status: 'stub', shortcut: 'E', hint: '설명선 (8-2)' },
            { tool: 'DECORATE_LENGTH', label: '꾸미기: 길이', iconId: 'decorate_length', status: 'stub', hint: '길이 표시 (8-2)' },
            { tool: 'DECORATE_ANGLE', label: '꾸미기: 각도', iconId: 'decorate_angle', status: 'stub', hint: '각도 표시 (8-2)' },
            { tool: 'DECORATE_PARALLEL', label: '꾸미기: 평행', iconId: 'decorate_parallel', status: 'stub', hint: '평행 표시 (8-2)' },
            { tool: 'PEN', label: '그리기', iconId: 'pen', status: 'stub', shortcut: 'B', hint: '펜그림 (8-3)' }
        ]
    },
    {
        id: 'settings',
        iconId: 'cat-settings',
        title: '설정',
        railOnly: true,
        railHint: '11단계에서 설정 패널 예정 (격자·스냅은 우측 바)'
    }
];

// 도구별 사용 가이드 (캔버스 하단 패널 + 작도 중 단계 하이라이트)
const ALGEO_TOOL_GUIDES = {
    MOVE: {
        summary: '화면을 이동하거나 객체·점의 위치를 바꿉니다.',
        steps: [
            '빈 곳을 드래그하면 캔버스가 이동(Pan)합니다.',
            '점·선분·원·다각형 등 객체를 드래그하면 함께 이동합니다.',
            '슬라이더 손잡이는 값 조절, 막대·라벨은 위치 이동입니다.'
        ],
        tips: ['함수 그래프는 이동할 수 없습니다.', '종속 중점을 끌면 부모 점이 함께 움직입니다.']
    },
    POINT: {
        summary: '모눈종이 위에 새 점을 만듭니다.',
        steps: ['캔버스 빈 곳을 클릭하세요.'],
        tips: ['점 이름은 A, B, C … 순으로 자동 지정됩니다.']
    },
    MIDPOINT: {
        summary: '두 점의 가운데 중점을 만듭니다.',
        steps: [
            '첫 번째 점을 클릭합니다.',
            '두 번째 점을 클릭하면 중점이 생성됩니다.'
        ],
        tips: ['기존에 만든 점을 클릭해야 합니다.']
    },
    SEGMENT: {
        summary: '두 점을 잇는 선분을 그립니다.',
        steps: [
            '첫 번째 점을 클릭합니다.',
            '마우스를 움직여 선분 모양을 미리 봅니다.',
            '두 번째 점을 클릭해 확정합니다.'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    LINE: {
        summary: '두 점을 지나는 무한 직선을 그립니다.',
        steps: [
            '첫 번째 점을 클릭합니다.',
            '마우스를 움직여 직선 방향을 미리 봅니다.',
            '두 번째 점을 클릭해 확정합니다.'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    PERP_BISECTOR: {
        summary: '선분 AB의 수직이등분선을 그립니다.',
        steps: [
            '첫 번째 점을 클릭합니다.',
            '두 번째 점을 클릭하면 수직이등분선이 생성됩니다.'
        ],
        tips: ['두 점은 서로 달라야 합니다.']
    },
    PARALLEL_LINE: {
        summary: '기준 직선과 평행한 직선을 그립니다.',
        steps: [
            '기준이 될 첫 번째 점을 클릭합니다.',
            '기준이 될 두 번째 점을 클릭합니다.',
            '마우스로 평행선 위치를 미리 봅니다.',
            '통과할 점을 클릭해 확정합니다.'
        ],
        tips: ['Esc — 작도 취소']
    },
    PERP_LINE: {
        summary: '기준 직선에 수직인 직선을 그립니다.',
        steps: [
            '기준이 될 첫 번째 점을 클릭합니다.',
            '기준이 될 두 번째 점을 클릭합니다.',
            '마우스로 수직선 위치를 미리 봅니다.',
            '통과할 점을 클릭해 확정합니다.'
        ],
        tips: ['Esc — 작도 취소']
    },
    ANGLE: {
        summary: '세 점으로 각도 ∠ABC를 표시합니다. B가 꼭짓점입니다.',
        steps: [
            '각의 첫 번째 변 끝(A)을 클릭합니다.',
            '꼭짓점(B)을 클릭합니다.',
            '마우스로 각 크기를 조절합니다.',
            '세 번째 점(C)을 클릭해 확정합니다.'
        ],
        tips: ['Esc — 작도 취소']
    },
    POLYGON: {
        summary: '꼭짓점을 순서대로 잇는 다각형을 그립니다.',
        steps: [
            '첫 꼭짓점을 클릭합니다.',
            '꼭짓점을 계속 추가합니다.',
            '첫 꼭짓점을 다시 클릭하거나 Enter로 닫습니다. (3점 이상)'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    CIRCLE: {
        summary: '중심과 둘레 점으로 원을 그립니다.',
        steps: [
            '중심이 될 점을 클릭합니다.',
            '마우스로 반지름을 조절합니다.',
            '클릭해 원을 확정합니다.'
        ],
        tips: ['빈 곳 클릭 시 둘레 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    ARC: {
        summary: '끝점 두 개와 호 위의 점으로 호 모양을 정합니다.',
        steps: [
            '호의 첫 번째 끝점(A)을 클릭합니다.',
            '두 번째 끝점(B)을 클릭합니다.',
            '마우스로 호 모양을 미리 봅니다.',
            '호 위의 점(C)을 클릭해 확정합니다.'
        ],
        tips: ['중심→시작→끝 방식이 아닙니다.', 'Esc — 작도 취소']
    },
    DELETE: {
        summary: '점·선·원 등 객체를 삭제합니다.',
        steps: ['삭제할 객체를 클릭합니다.'],
        tips: ['점 삭제 시 연결된 도형도 함께 제거될 수 있습니다.']
    },
    SLIDER: {
        summary: '슬라이더 도구로 캔버스에 숫자 변수를 만듭니다.',
        steps: [
            '좌측 기타·객체에서 슬라이더 도구를 선택합니다.',
            '캔버스를 클릭해 슬라이더를 배치합니다.',
            '손잡이를 드래그하거나 막대를 클릭해 값을 바꿉니다.'
        ],
        tips: ['이동 도구로 위치를 옮길 수 있습니다.', '대수창 수식으로 다른 도형과 연동할 수 있습니다.']
    },
    HIDE_OBJECT: {
        summary: '캔버스에서 객체를 숨깁니다.',
        steps: [
            '숨길 객체를 클릭합니다.',
            '대수창 왼쪽 눈 아이콘으로 다시 표시할 수 있습니다.'
        ],
        tips: ['단축키 H — 선택 객체 표시/숨김 토글', '숨긴 객체는 캔버스에서 선택·이동되지 않습니다.']
    },
    // ── stub 도구 (5단계 UI 맵 — 엔진 미구현) ──
    SELECT: {
        summary: '객체를 하나씩 선택합니다. (준비 중)',
        steps: ['7단계에서 구현 예정입니다.'],
        tips: ['지금은 이동 도구로 객체를 드래그할 수 있습니다.']
    },
    GROUP_SELECT: {
        summary: '여러 객체를 한꺼번에 선택합니다. (준비 중)',
        steps: ['7단계에서 구현 예정입니다.'],
        tips: ['단축키 Shift+G — 그룹선택 도구 (예정)']
    },
    INTERSECTION: {
        summary: '두 도형(선·원)이 만나는 교점을 만듭니다.',
        steps: [
            '첫 번째 도형(선분·직선·원 등)을 클릭합니다.',
            '두 번째 도형을 클릭하면 교점이 생성됩니다.'
        ],
        tips: ['원과 원이 두 점에서 만나면 둘 다 만듭니다.', 'Esc — 작도 취소', '단축키 I']
    },
    POINT_ON_OBJECT: {
        summary: '선·원 등 대상 위에 종속 점을 둡니다.',
        steps: [
            '점을 둘 선분·직선·원을 클릭합니다.',
            '그 위의 위치를 클릭해 점을 확정합니다.'
        ],
        tips: ['부모 도형을 움직이면 점도 따라갑니다.', 'Esc — 작도 취소', '단축키 O']
    },
    LINE_TRACER: {
        summary: '경로를 따라 움직이는 점을 만듭니다. (준비 중)',
        steps: ['6-1단계에서 구현 예정입니다.'],
        tips: []
    },
    INSERT_IMAGE: {
        summary: '그림을 캔버스에 넣습니다. (준비 중)',
        steps: ['10단계에서 구현 예정입니다.'],
        tips: []
    },
    INSERT_VIDEO: {
        summary: '동영상을 캔버스에 넣습니다. (준비 중)',
        steps: ['10단계에서 구현 예정입니다.'],
        tips: []
    },
    TABLE: {
        summary: '표를 삽입합니다. (준비 중)',
        steps: ['10단계에서 구현 예정입니다.'],
        tips: []
    },
    COMPASS: {
        summary: '두 점으로 반지름을 정한 뒤, 새 중심에 원을 그립니다.',
        steps: [
            '반지름의 첫 번째 점을 클릭합니다.',
            '반지름의 두 번째 점을 클릭합니다.',
            '원의 중심이 될 점을 클릭합니다.'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    CIRCLE_3P: {
        summary: '세 점을 지나는 원을 그립니다.',
        steps: [
            '첫 번째 점을 클릭합니다.',
            '두 번째 점을 클릭합니다.',
            '세 번째 점을 클릭해 원을 확정합니다.'
        ],
        tips: ['세 점이 일직선이면 원을 만들 수 없습니다.', 'Esc — 작도 취소']
    },
    CIRCLE_RADIUS: {
        summary: '중심과 반지름(숫자 또는 슬라이더 변수)으로 원을 그립니다.',
        steps: [
            '원의 중심을 클릭합니다.',
            '반지름 숫자(또는 슬라이더 이름)를 입력합니다.'
        ],
        tips: ['슬라이더 이름(예: a)을 입력하면 반지름이 연동됩니다.', 'Esc — 작도 취소']
    },
    SECTOR: {
        summary: '중심과 두 끝점으로 부채꼴을 그립니다.',
        steps: [
            '중심을 클릭합니다.',
            '첫 번째 끝점을 클릭합니다.',
            '두 번째 끝점을 클릭해 부채꼴을 확정합니다.'
        ],
        tips: ['반지름은 중심–첫 끝점 거리입니다.', 'Esc — 작도 취소']
    },
    CIRCULAR_SEGMENT: {
        summary: '현과 호로 둘러싸인 활꼴을 그립니다.',
        steps: [
            '호의 첫 끝점을 클릭합니다.',
            '호의 둘째 끝점을 클릭합니다.',
            '호 위의 점을 클릭해 활꼴을 확정합니다.'
        ],
        tips: ['호 도구와 같은 순서로 작도합니다.', 'Esc — 작도 취소']
    },
    SEGMENT_GIVEN_LENGTH: {
        summary: '길이를 지정한 선분을 그립니다.',
        steps: [
            '시작점을 클릭합니다.',
            '길이를 입력합니다.',
            '방향이 될 위치를 클릭해 선분을 확정합니다.'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    RAY: {
        summary: '한 점에서 시작해 한쪽으로만 뻗는 반직선을 그립니다.',
        steps: [
            '시작점을 클릭합니다.',
            '마우스로 방향을 미리 봅니다.',
            '방향점을 클릭해 확정합니다.'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    ANGLE_BISECTOR: {
        summary: '각의 이등분선을 그립니다.',
        steps: [
            '각의 첫 번째 변 끝(A)을 클릭합니다.',
            '꼭짓점(B)을 클릭합니다.',
            '두 번째 변 끝(C)을 클릭하면 이등분선이 생성됩니다.'
        ],
        tips: ['기존 점을 클릭해야 합니다.', 'Esc — 작도 취소']
    },
    TANGENT: {
        summary: '원에 접하는 직선을 그립니다.',
        steps: [
            '원을 클릭합니다.',
            '접점을 정할 점(원 위 또는 바깥)을 클릭합니다.'
        ],
        tips: ['원 밖의 점이면 접선이 최대 두 개 생깁니다.', 'Esc — 작도 취소']
    },
    VECTOR: {
        summary: '방향이 있는 벡터(화살표 선분)를 그립니다.',
        steps: [
            '시작점을 클릭합니다.',
            '마우스로 방향을 미리 봅니다.',
            '끝점을 클릭해 확정합니다.'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    REGULAR_POLYGON_SIDE: {
        summary: '한 변을 기준으로 정 n각형을 그립니다.',
        steps: [
            '한 변의 첫 번째 점을 클릭합니다.',
            '한 변의 두 번째 점을 클릭합니다.',
            '꼭짓점 개수 n을 입력합니다. (3 이상)',
            '마우스로 방향을 고른 뒤 클릭해 확정합니다.'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    REGULAR_POLYGON_CENTER: {
        summary: '중심과 한 꼭짓점으로 정 n각형을 그립니다.',
        steps: [
            '중심점을 클릭합니다.',
            '한 꼭짓점을 클릭합니다.',
            '꼭짓점 개수 n을 입력합니다. (3 이상)'
        ],
        tips: ['빈 곳 클릭 시 점이 자동 생성됩니다.', 'Esc — 작도 취소']
    },
    ANGLE_GIVEN: {
        summary: '크기를 지정한 각을 그립니다.',
        steps: [
            '첫 번째 점(변 위)을 클릭합니다.',
            '꼭짓점을 클릭합니다.',
            '각도(도)를 입력합니다.',
            '마우스로 방향을 고른 뒤 클릭해 확정합니다.'
        ],
        tips: ['확정 점은 첫 변과 같은 길이로 생성됩니다.', 'Esc — 작도 취소']
    },
    MEASURE_LENGTH: {
        summary: '길이를 측정해 표시합니다. (준비 중)',
        steps: ['8-1단계에서 구현 예정입니다.'],
        tips: []
    },
    MEASURE_ANGLE: {
        summary: '각도를 측정해 표시합니다. (준비 중)',
        steps: ['8-1단계에서 구현 예정입니다. 작도용 「각도」와는 별개입니다.'],
        tips: []
    },
    MEASURE_AREA: {
        summary: '넓이를 측정해 표시합니다. (준비 중)',
        steps: ['8-1단계에서 구현 예정입니다.'],
        tips: []
    },
    REFLECT_POINT: {
        summary: '점을 기준으로 대칭 이동합니다. (준비 중)',
        steps: ['9단계에서 구현 예정입니다.'],
        tips: ['단축키 R']
    },
    REFLECT_LINE: {
        summary: '직선을 기준으로 대칭 이동합니다. (준비 중)',
        steps: ['9단계에서 구현 예정입니다.'],
        tips: []
    },
    ROTATE: {
        summary: '점을 중심으로 회전합니다. (준비 중)',
        steps: ['9단계에서 구현 예정입니다.'],
        tips: []
    },
    TRANSLATE: {
        summary: '평행이동합니다. (준비 중)',
        steps: ['9단계에서 구현 예정입니다.'],
        tips: []
    },
    DILATE: {
        summary: '점을 중심으로 확대·축소합니다. (준비 중)',
        steps: ['9단계에서 구현 예정입니다.'],
        tips: []
    },
    TILE: {
        summary: '도형을 타일처럼 반복합니다. (준비 중)',
        steps: ['9단계에서 구현 예정입니다.'],
        tips: []
    },
    TEXT: {
        summary: '텍스트 상자를 넣습니다. (준비 중)',
        steps: ['7-2단계에서 구현 예정입니다.'],
        tips: ['단축키 T']
    },
    USER_TOOL: {
        summary: '사용자 정의 도구입니다. (준비 중)',
        steps: ['11단계에서 구현 예정입니다.'],
        tips: []
    },
    CHECKBOX: {
        summary: '표시를 켜고 끄는 체크박스를 만듭니다. (준비 중)',
        steps: ['7-2단계에서 구현 예정입니다.'],
        tips: []
    },
    BLOCK_EVENT_BTN: {
        summary: '블록코딩 이벤트 버튼을 만듭니다. (준비 중)',
        steps: ['11단계에서 구현 예정입니다.'],
        tips: []
    },
    DECORATE_LEADER: {
        summary: '설명선을 그립니다. (준비 중)',
        steps: ['8-2단계에서 구현 예정입니다.'],
        tips: ['단축키 E']
    },
    DECORATE_LENGTH: {
        summary: '길이 꾸미기 표시를 넣습니다. (준비 중)',
        steps: ['8-2단계에서 구현 예정입니다.'],
        tips: []
    },
    DECORATE_ANGLE: {
        summary: '각도 꾸미기 표시를 넣습니다. (준비 중)',
        steps: ['8-2단계에서 구현 예정입니다.'],
        tips: []
    },
    DECORATE_PARALLEL: {
        summary: '평행 표시를 넣습니다. (준비 중)',
        steps: ['8-2단계에서 구현 예정입니다.'],
        tips: []
    },
    PEN: {
        summary: '펜으로 자유롭게 그립니다. (준비 중)',
        steps: ['8-3단계에서 구현 예정입니다.'],
        tips: ['단축키 B']
    }
};

// 뷰·캔버스 옵션 가이드 (우측 바 격자·스냅 등)
const ALGEO_VIEW_GUIDES = {
    grid: {
        label: '격자 표시',
        iconId: 'grid',
        steps: [
            '우측 상단 격자 버튼 또는 G 키로 켜고 끌 수 있습니다.',
            '켜면 모눈종이 선과 눈금 숫자가 보입니다.',
            '끄면 X·Y 좌표축만 표시됩니다.'
        ],
        tips: ['줌 배율에 따라 격자 간격이 자동으로 바뀝니다.', '격자 표시와 스냅은 서로 독립입니다.']
    },
    snap: {
        label: '격자 스냅',
        iconId: 'snap',
        steps: [
            '우측 상단 자석 버튼 또는 N 키로 켜고 끌 수 있습니다.',
            '켜면 점 배치·이동 시 가장 가까운 격자 교차점에 맞춰집니다.',
            '끄면 클릭한 위치 그대로 좌표가 정해집니다.'
        ],
        tips: ['스냅 간격은 현재 줌의 격자 간격과 같습니다.', '격자를 끈 상태에서도 스냅은 동작합니다.']
    }
};

// 뷰 가이드 — 현재 on/off 상태 반영 요약 문구
function buildViewGuideSummary(viewId, app) {
    if (viewId === 'grid') {
        if (app.renderer.showGrid) {
            return '현재: 격자·눈금이 표시됩니다.';
        }
        return '현재: 격자를 끈 상태입니다. (좌표축만 표시)';
    }
    if (viewId === 'snap') {
        if (app.renderer.snapEnabled) {
            return '현재: 격자 스냅을 켠 상태입니다. 점이 격자에 맞춰집니다.';
        }
        return '현재: 격자 스냅을 끈 상태입니다. 자유로운 위치에 놓을 수 있습니다.';
    }
    return '';
}

// 단축키 안내 패널 — 신규 단축키는 ALGEO_SHORTCUTS에만 추가
const ALGEO_SHORTCUT_CATEGORIES = [
    { id: 'edit', label: '편집' },
    { id: 'tool', label: '도구' },
    { id: 'draw', label: '작도' },
    { id: 'view', label: '보기' }
];

const ALGEO_SHORTCUTS = [
    {
        id: 'undo',
        keys: 'Ctrl+Z',
        label: '실행 취소',
        category: 'edit',
        active: true,
        desc: '마지막 작업을 되돌립니다.'
    },
    {
        id: 'redo',
        keys: 'Ctrl+Y / Ctrl+Shift+Z',
        label: '다시 실행',
        category: 'edit',
        active: true,
        desc: '취소한 작업을 다시 적용합니다.'
    },
    {
        id: 'hide_toggle',
        keys: 'H',
        label: '숨기기 / 표시',
        category: 'edit',
        active: true,
        desc: '선택 객체 표시·숨김. 선택 없으면 숨기기 도구로 전환.'
    },
    {
        id: 'tool_point',
        keys: 'D',
        label: '점 도구',
        category: 'tool',
        active: true,
        desc: '점 생성 도구를 선택합니다.'
    },
    {
        id: 'tool_intersection',
        keys: 'I',
        label: '교점 도구',
        category: 'tool',
        active: true,
        desc: '교점 도구를 선택합니다.'
    },
    {
        id: 'tool_midpoint',
        keys: 'M',
        label: '중점 도구',
        category: 'tool',
        active: true,
        desc: '중점 도구를 선택합니다.'
    },
    {
        id: 'tool_point_on',
        keys: 'O',
        label: '대상 위의 점',
        category: 'tool',
        active: true,
        desc: '대상 위의 점 도구를 선택합니다.'
    },
    {
        id: 'tool_segment',
        keys: 'S',
        label: '선분 도구',
        category: 'tool',
        active: true,
        desc: '선분 도구를 선택합니다.'
    },
    {
        id: 'tool_line',
        keys: 'L',
        label: '직선 도구',
        category: 'tool',
        active: true,
        desc: '직선 도구를 선택합니다.'
    },
    {
        id: 'tool_perp_bisector',
        keys: 'V',
        label: '수직이등분선',
        category: 'tool',
        active: true,
        desc: '수직이등분선 도구를 선택합니다.'
    },
    {
        id: 'tool_circle',
        keys: 'C',
        label: '원 도구',
        category: 'tool',
        active: true,
        desc: '원(중심과 한 점) 도구를 선택합니다.'
    },
    {
        id: 'tool_polygon',
        keys: 'P',
        label: '다각형 도구',
        category: 'tool',
        active: true,
        desc: '다각형 도구를 선택합니다.'
    },
    {
        id: 'tool_reflect',
        keys: 'R',
        label: '점대칭',
        category: 'tool',
        active: true,
        desc: '점대칭 도구 (준비 중)'
    },
    {
        id: 'tool_text',
        keys: 'T',
        label: '텍스트',
        category: 'tool',
        active: true,
        desc: '텍스트 도구 (준비 중)'
    },
    {
        id: 'tool_decorate',
        keys: 'E',
        label: '설명선',
        category: 'tool',
        active: true,
        desc: '꾸미기 설명선 (준비 중)'
    },
    {
        id: 'tool_pen',
        keys: 'B',
        label: '펜 그리기',
        category: 'tool',
        active: true,
        desc: '펜그림 도구 (준비 중)'
    },
    {
        id: 'tool_group_select',
        keys: 'Shift+G',
        label: '그룹선택',
        category: 'tool',
        active: true,
        desc: '그룹선택 도구 (준비 중). G 단독은 격자 토글.'
    },
    {
        id: 'draw_cancel',
        keys: 'Esc',
        label: '작도 취소',
        category: 'draw',
        active: true,
        desc: '작도·선택 점을 취소하고 이동 도구로 돌아갑니다.'
    },
    {
        id: 'polygon_close',
        keys: 'Enter',
        label: '다각형 닫기',
        category: 'draw',
        active: true,
        desc: '꼭짓점 3개 이상일 때 다각형을 닫습니다.'
    },
    {
        id: 'shortcut_help',
        keys: 'Shift+?',
        label: '단축키 안내',
        category: 'view',
        active: true,
        desc: '이 패널을 열거나 닫습니다.'
    },
    {
        id: 'toggle_grid',
        keys: 'G',
        label: '격자 표시',
        category: 'view',
        active: true,
        desc: '캔버스 격자·눈금 표시를 켜거나 끕니다.'
    },
    {
        id: 'toggle_snap',
        keys: 'N',
        label: '격자 스냅',
        category: 'view',
        active: true,
        desc: '점 배치·이동 시 격자 교차점 맞춤을 켜거나 끕니다.'
    }
];

// 문자 단축키 → toolId (입력란 포커스 시 무시). Esc·G·H·N 등은 별도 처리
const ALGEO_TOOL_KEY_MAP = {
    66: 'PEN',           // B
    67: 'CIRCLE',        // C
    68: 'POINT',         // D
    69: 'DECORATE_LEADER', // E
    73: 'INTERSECTION',  // I
    76: 'LINE',          // L
    77: 'MIDPOINT',      // M
    79: 'POINT_ON_OBJECT', // O
    80: 'POLYGON',       // P
    82: 'REFLECT_POINT', // R
    83: 'SEGMENT',       // S
    84: 'TEXT',          // T
    86: 'PERP_BISECTOR'  // V
};

// 캔버스·UI 테마 localStorage 키
const ALGEO_THEME_STORAGE_KEY = 'algeo_theme';
const ALGEO_GRID_VISIBLE_KEY = 'algeo_grid_visible';
const ALGEO_SNAP_ENABLED_KEY = 'algeo_snap_enabled';

// 라이트 모드 캔버스 팔레트
const ALGEO_VIS_LIGHT = {
    point: '#e11d48',
    midpoint: '#7c3aed',
    segment: '#1d4ed8',
    vector: '#1d4ed8',
    line: '#4338ca',
    ray: '#6366f1',
    perpBisector: '#0e7490',
    angleBisector: '#0891b2',
    parallel: '#c2410c',
    perpLine: '#be123c',
    tangent: '#0f766e',
    circle: '#047857',
    arc: '#0f766e',
    sector: '#047857',
    sectorFill: 'rgba(4, 120, 87, 0.16)',
    circularSegment: '#0f766e',
    circularSegmentFill: 'rgba(15, 118, 110, 0.18)',
    angle: '#9333ea',
    angleFill: 'rgba(147, 51, 234, 0.14)',
    polygon: '#b45309',
    polygonFill: 'rgba(180, 83, 9, 0.16)',
    function: '#6d28d9',
    slider: '#2563eb',
    sliderTrack: '#cbd5e1',
    sliderThumb: '#1d4ed8',
    pointRadius: 7,
    midpointRadius: 6,
    pointStroke: '#1e293b',
    grid: '#d8e0ea',
    gridLabel: '#475569',
    axis: '#0f172a',
    canvasBg: '#ffffff',
    labelHalo: '#ffffff',
    highlightPoint: '#f59e0b',
    selectionStroke: '#0891b2',
    selectionHalo: '#ffffff',
    selectionFill: 'rgba(8, 145, 178, 0.14)',
    selectionDash: [7, 5],
    selectionLineWidth: 3.5,
    selectionHaloWidth: 7,
    selectionPointRing: 16,
    previewSegment: 'rgba(37, 99, 235, 0.65)',
    previewLine: 'rgba(79, 70, 229, 0.55)',
    previewRay: 'rgba(99, 102, 241, 0.55)',
    previewVector: 'rgba(37, 99, 235, 0.65)',
    previewParallel: 'rgba(234, 88, 12, 0.55)',
    previewPerp: 'rgba(225, 29, 72, 0.55)',
    previewCircle: 'rgba(4, 120, 87, 0.55)',
    previewCircleGuide: 'rgba(4, 120, 87, 0.35)',
    previewCircleRay: 'rgba(4, 120, 87, 0.25)',
    previewPolygon: 'rgba(180, 83, 9, 0.85)',
    previewPolygonEdge: 'rgba(180, 83, 9, 0.55)',
    previewPolygonFill: 'rgba(180, 83, 9, 0.1)',
    functionLabel: '#5b21b6'
};

// 다크 모드 캔버스 팔레트 — 배경·격자 대비 + 객체색 약간 밝게
const ALGEO_VIS_DARK = {
    point: '#fb7185',
    midpoint: '#a78bfa',
    segment: '#60a5fa',
    vector: '#60a5fa',
    line: '#818cf8',
    ray: '#a5b4fc',
    perpBisector: '#22d3ee',
    angleBisector: '#67e8f9',
    parallel: '#fb923c',
    perpLine: '#f472b6',
    tangent: '#2dd4bf',
    circle: '#34d399',
    arc: '#2dd4bf',
    sector: '#34d399',
    sectorFill: 'rgba(52, 211, 153, 0.2)',
    circularSegment: '#2dd4bf',
    circularSegmentFill: 'rgba(45, 212, 191, 0.22)',
    angle: '#c084fc',
    angleFill: 'rgba(192, 132, 252, 0.22)',
    polygon: '#fbbf24',
    polygonFill: 'rgba(251, 191, 36, 0.18)',
    function: '#a78bfa',
    slider: '#60a5fa',
    sliderTrack: '#475569',
    sliderThumb: '#93c5fd',
    pointRadius: 7,
    midpointRadius: 6,
    pointStroke: '#f1f5f9',
    grid: '#334155',
    gridLabel: '#94a3b8',
    axis: '#e2e8f0',
    canvasBg: '#0f172a',
    labelHalo: '#0f172a',
    highlightPoint: '#fbbf24',
    selectionStroke: '#22d3ee',
    selectionHalo: '#0f172a',
    selectionFill: 'rgba(34, 211, 238, 0.2)',
    selectionDash: [7, 5],
    selectionLineWidth: 3.5,
    selectionHaloWidth: 7,
    selectionPointRing: 16,
    previewSegment: 'rgba(96, 165, 250, 0.7)',
    previewLine: 'rgba(129, 140, 248, 0.65)',
    previewRay: 'rgba(165, 180, 252, 0.65)',
    previewVector: 'rgba(96, 165, 250, 0.7)',
    previewParallel: 'rgba(251, 146, 60, 0.65)',
    previewPerp: 'rgba(244, 114, 182, 0.65)',
    previewCircle: 'rgba(52, 211, 153, 0.65)',
    previewCircleGuide: 'rgba(52, 211, 153, 0.4)',
    previewCircleRay: 'rgba(52, 211, 153, 0.28)',
    previewPolygon: 'rgba(251, 191, 36, 0.9)',
    previewPolygonEdge: 'rgba(251, 191, 36, 0.6)',
    previewPolygonFill: 'rgba(251, 191, 36, 0.12)',
    functionLabel: '#c4b5fd'
};

// 현재 활성 캔버스 팔레트 (setTheme 시 갱신)
let ALGEO_VIS = ALGEO_VIS_LIGHT;

// 테마에 맞는 캔버스 팔레트 반환
function getAlgeoVisPalette(theme) {
    if (theme === 'dark') {
        return ALGEO_VIS_DARK;
    }
    return ALGEO_VIS_LIGHT;
}

// 도구 ID가 속한 카테고리 검색
function findToolCategoryId(toolId) {
    let i;
    let j;
    for (i = 0; i < ALGEO_TOOL_CATEGORIES.length; i++) {
        const cat = ALGEO_TOOL_CATEGORIES[i];
        if (!cat.tools) {
            continue;
        }
        for (j = 0; j < cat.tools.length; j++) {
            if (cat.tools[j].tool === toolId) {
                return cat.id;
            }
        }
    }
    return 'pointer';
}

// 도구 메타 조회 (라벨·아이콘·hint·status·guide)
function findToolMeta(toolId) {
    let i;
    let j;
    let cat;
    let item;

    for (i = 0; i < ALGEO_TOOL_CATEGORIES.length; i++) {
        cat = ALGEO_TOOL_CATEGORIES[i];
        if (!cat.tools) {
            continue;
        }
        for (j = 0; j < cat.tools.length; j++) {
            item = cat.tools[j];
            if (item.tool === toolId) {
                return {
                    label: item.label,
                    iconId: item.iconId || resolveAlgeoIconId(item.tool),
                    hint: item.hint || '',
                    status: item.status || 'done',
                    shortcut: item.shortcut || '',
                    guide: ALGEO_TOOL_GUIDES[toolId] || null
                };
            }
        }
    }

    return {
        label: toolId,
        iconId: resolveAlgeoIconId(toolId),
        hint: '',
        status: 'done',
        shortcut: '',
        guide: ALGEO_TOOL_GUIDES[toolId] || null
    };
}

// stub(미구현) 도구 여부
function isToolStub(toolId) {
    const meta = findToolMeta(toolId);
    return meta.status === 'stub';
}

// 카테고리 메타 조회
function findCategoryMeta(categoryId) {
    let i;
    for (i = 0; i < ALGEO_TOOL_CATEGORIES.length; i++) {
        if (ALGEO_TOOL_CATEGORIES[i].id === categoryId) {
            return ALGEO_TOOL_CATEGORIES[i];
        }
    }
    return null;
}

// 좌측 도구 레일 버튼 HTML 생성
function buildToolRailHtml() {
    let html = '';
    let i;
    for (i = 0; i < ALGEO_TOOL_CATEGORIES.length; i++) {
        const cat = ALGEO_TOOL_CATEGORIES[i];
        const railOnlyClass = cat.railOnly ? ' rail-only' : '';
        html += '<button type="button" class="tool-rail-btn' + railOnlyClass + '" data-category="' + cat.id + '" title="' + cat.title + '">';
        html += renderAlgeoIcon(cat.iconId, 'rail-icon-tile');
        html += '</button>';
    }
    return html;
}

function contentScript(_idx, _content) {
    contentsIdx = _idx;
    contents = _content;

    switch (contentsIdx) {
        case 0:
            bindWrapResize();
            waitWrapReady(function () {
                initAlgeoMath(contents);
            });
            break;
    }
}

/** #wrap 표시 및 popscale(FORTEACHERCD.responsive) 스케일 적용 후 콜백 */
function waitWrapReady(callback) {
    let tries = 0;
    const maxTries = 50;

    function isWrapScaled() {
        const wrap = document.getElementById('wrap');
        if (!wrap || wrap.style.visibility === 'hidden') {
            return false;
        }
        if (typeof FORTEACHERCD !== 'undefined' && FORTEACHERCD.responsive) {
            return FORTEACHERCD.responsive.baseContainerSize.zoom > 0;
        }
        return wrap.style.transform && wrap.style.transform.indexOf('scale') >= 0;
    }

    function check() {
        tries += 1;
        if (isWrapScaled()) {
            callback();
            return;
        }
        if (tries >= maxTries) {
            callback();
            return;
        }
        setTimeout(check, 100);
    }

    check();
}

/** 창 리사이즈 시 popscale 스케일 갱신 및 캔버스 다시 그리기 */
function bindWrapResize() {
    let resizeTimer = null;

    function onResize() {
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(function () {
            resizeTimer = null;
            if (typeof FORTEACHERCD === 'undefined' || !FORTEACHERCD.responsive) {
                return;
            }
            const wrap = document.getElementById('wrap');
            if (!wrap) {
                return;
            }
            FORTEACHERCD.responsive.currentContainerSize.containerWidth =
                window.innerWidth || document.documentElement.clientWidth;
            FORTEACHERCD.responsive.currentContainerSize.containerHeight =
                window.innerHeight || document.documentElement.clientHeight;
            FORTEACHERCD.responsive.setScaleElement(wrap);
            if (algeoAppInstance && algeoAppInstance.renderer) {
                algeoAppInstance.renderer.draw();
            }
        }, 200);
    }

    window.addEventListener('resize', onResize, false);
}

/**
 * 알지오메스 클론코딩 메인 초기화 함수
 * @param {jQuery} $container 페이지 콘텐츠 영역
 */
function initAlgeoMath($container) {
    // 1. UI 구조 동적 생성
    createAlgeoUI($container);

    // 2. 엔진 인스턴스 초기화
    const engine = new AlgeoEngine();

    // 3. 렌더러 초기화
    const renderer = new AlgeoRenderer(engine, $('#algeoCanvas')[0]);

    // 4. 앱 컨트롤러 초기화 및 이벤트 바인딩
    const app = new AlgeoApp(engine, renderer);
    algeoAppInstance = app;
    app.init();
}

/**
 * HTML 레이아웃 동적 생성
 * @param {jQuery} $container
 */
function createAlgeoUI($container) {
    // 기존 내용 비우기
    $container.empty();

    // jQuery .show()가 block으로 바꾸므로 popscale 설계 영역 안에서 flex 유지
    $container.css({
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%'
    });

    // 알지오메스 메인 컨테이너 — AlgeoMath 스타일 좌측 레일 + 작업 영역
    const layoutHtml =
        '<div class="algeo-wrapper" data-theme="light">' +
        '    <div class="algeo-left-panel">' +
        '        <div class="algeo-mode-rail">' +
        '            <button type="button" class="mode-rail-btn active" title="기하 작도" disabled>' +
        renderAlgeoIcon('geometry', 'mode-icon', true) +
        '            </button>' +
        '        </div>' +
        '        <div class="algeo-tool-rail" id="toolRail">' + buildToolRailHtml() + '</div>' +
        '        <div class="algeo-tool-flyout" id="toolFlyout">' +
        '            <div class="flyout-header" id="flyoutHeader"></div>' +
        '            <div class="flyout-body" id="flyoutBody"></div>' +
        '        </div>' +
        '    </div>' +
        '    <div class="algeo-workspace">' +
        '        <div class="algeo-sidebar" id="algebraSidebar">' +
        '            <div class="sidebar-header">' +
        '                <div class="sidebar-header-left">' +
        '                    <h3>대수창</h3>' +
        '                    <div class="sidebar-undo-group">' +
        '                        <button type="button" id="btnUndo" class="sidebar-undo-btn" title="실행 취소 (Ctrl+Z)" aria-label="실행 취소" disabled>↶</button>' +
        '                        <button type="button" id="btnRedo" class="sidebar-undo-btn" title="다시 실행 (Ctrl+Y / Ctrl+Shift+Z)" aria-label="다시 실행" disabled>↷</button>' +
        '                    </div>' +
        '                </div>' +
        '                <button type="button" id="btnToggleAlgebra" class="sidebar-toggle-btn" title="대수창 숨기기" aria-label="대수창 숨기기">◀</button>' +
        '            </div>' +
        '            <div class="algebra-list-tabs">' +
        '                <button type="button" class="algebra-tab-btn active" data-sort="created">생성순</button>' +
        '                <button type="button" class="algebra-tab-btn" data-sort="type">종류순</button>' +
        '            </div>' +
        '            <div class="algebra-props-panel" id="algebraPropsPanel">' +
        '                <p class="algebra-props-placeholder">객체를 선택하면 속성을 편집할 수 있습니다.</p>' +
        '            </div>' +
        '            <div class="sidebar-content" id="algebraList">' +
        '                <div class="empty-msg">오브젝트가 없습니다.</div>' +
        '            </div>' +
        '            <div class="sidebar-input-area">' +
        '                <div class="algebra-history-panel" id="algebraHistoryPanel">' +
        '                    <div class="history-toolbar">' +
        '                        <span class="history-title">작업 기록</span>' +
        '                    </div>' +
        '                    <ul id="algebraHistoryList" class="algebra-history-list">' +
        '                        <li class="history-empty">아직 기록이 없습니다.</li>' +
        '                    </ul>' +
        '                </div>' +
        '                <div class="algebra-input-top">' +
        '                    <button type="button" id="btnCmdDict" class="cmd-dict-btn">명령어 사전</button>' +
        '                </div>' +
        '                <div class="algebra-input-row">' +
        '                    <input type="text" id="algebraInput" placeholder="입력" autocomplete="off" />' +
        '                    <button type="button" id="btnAlgebraSubmit">입력</button>' +
        '                </div>' +
        '                <div id="algebraCmdDict" class="algebra-cmd-dict"></div>' +
        '                <div class="algebra-error" id="algebraError"></div>' +
        '            </div>' +
        '        </div>' +
        '        <div class="algeo-canvas-container">' +
        '            <button type="button" id="btnOpenAlgebra" class="algebra-reopen-btn" title="대수창 열기" aria-label="대수창 열기">▶<span>대수창</span></button>' +
        '            <button type="button" id="btnOpenGuide" class="tool-guide-reopen-btn" title="도구 안내 열기" aria-label="도구 안내 열기">▶<span>안내</span></button>' +
        '            <canvas id="algeoCanvas"></canvas>' +
        '            <div class="algeo-tool-guide" id="toolGuide">' +
        '                <div class="tool-guide-head" title="드래그하여 위치 이동">' +
        '                    <span class="tool-guide-icon" id="toolGuideIcon">' + renderAlgeoIcon('move', 'guide-icon-tile') + '</span>' +
        '                    <div class="tool-guide-head-text">' +
        '                        <strong id="toolGuideTitle">이동</strong>' +
        '                        <span id="toolGuideSummary" class="tool-guide-summary"></span>' +
        '                    </div>' +
        '                    <button type="button" id="btnCollapseGuide" class="tool-guide-collapse" title="안내 접기" aria-label="안내 접기">−</button>' +
        '                    <button type="button" id="btnCloseGuide" class="tool-guide-close" title="안내 닫기" aria-label="안내 닫기">✕</button>' +
        '                </div>' +
        '                <ol id="toolGuideSteps" class="tool-guide-steps"></ol>' +
        '                <p id="toolGuideTips" class="tool-guide-tips"></p>' +
        '            </div>' +
            '            <div class="algeo-right-bar-wrap">' +
            '                <div class="algeo-right-bar">' +
            '                    <button type="button" class="right-bar-btn" id="btnShortcutHelp" title="단축키 안내 (Shift+?)" aria-label="단축키 안내">' +
            renderAlgeoIcon('shortcuts', 'bar-icon', true) +
            '                    </button>' +
            '                    <button type="button" class="right-bar-btn" id="btnToggleTheme" title="다크 모드" aria-label="다크 모드">' +
            renderAlgeoIcon('theme', 'bar-icon', true) +
            '                    </button>' +
            '                    <button type="button" class="right-bar-btn active" id="btnToggleGrid" title="격자 숨기기 (G)" aria-label="격자 표시 토글">' +
            renderAlgeoIcon('grid', 'bar-icon', true) +
            '                    </button>' +
            '                    <button type="button" class="right-bar-btn" id="btnToggleSnap" title="격자 스냅 켜기 (N)" aria-label="격자 스냅 토글">' +
            renderAlgeoIcon('snap', 'bar-icon', true) +
            '                    </button>' +
            '                    <button type="button" class="right-bar-btn" id="btnZoomIn" title="확대">' +
            renderAlgeoIcon('zoom-in', 'bar-icon', true) +
            '                    </button>' +
            '                    <button type="button" class="right-bar-btn" id="btnZoomOut" title="축소">' +
            renderAlgeoIcon('zoom-out', 'bar-icon', true) +
            '                    </button>' +
            '                    <button type="button" class="right-bar-btn" id="btnResetView" title="원점 이동">' +
            renderAlgeoIcon('reset-view', 'bar-icon', true) +
            '                    </button>' +
            '                </div>' +
            '                <div class="algeo-shortcut-panel" id="shortcutPanel" aria-hidden="true">' +
            '                    <div class="shortcut-panel-head">' +
            '                        <strong>단축키</strong>' +
            '                        <button type="button" id="btnCloseShortcutPanel" class="shortcut-panel-close" title="닫기" aria-label="단축키 안내 닫기">✕</button>' +
            '                    </div>' +
            '                    <div class="shortcut-panel-body" id="shortcutPanelBody"></div>' +
            '                </div>' +
            '            </div>' +
        '        </div>' +
        '    </div>' +
        '</div>';

    $container.append(layoutHtml);
}

/**
 * ----------------------------------------------------
 * 기하학적 데이터 구조 및 관계 엔진 (AlgeoEngine)
 * ----------------------------------------------------
 */
function AlgeoEngine() {
    this.objects = [];        // 전체 기하 객체 리스트
    this.objectMap = {};      // 빠른 조회를 위한 ID 매핑
    this.nextId = 1;          // 생성될 객체의 고유 ID
}

AlgeoEngine.prototype.generateId = function () {
    const id = 'obj_' + this.nextId;
    this.nextId += 1;
    return id;
};

// 두 점으로 직선 검색 (순서 무관)
AlgeoEngine.prototype.findLineByPoints = function (pointId1, pointId2) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'LINE') {
            if ((obj.p1Id === pointId1 && obj.p2Id === pointId2) ||
                (obj.p1Id === pointId2 && obj.p2Id === pointId1)) {
                return obj;
            }
        }
    }
    return null;
};

// 두 점으로 선분 검색 (순서 무관)
AlgeoEngine.prototype.findSegmentByPoints = function (pointId1, pointId2) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'SEGMENT') {
            if ((obj.p1Id === pointId1 && obj.p2Id === pointId2) ||
                (obj.p1Id === pointId2 && obj.p2Id === pointId1)) {
                return obj;
            }
        }
    }
    return null;
};

// 중심·둘레 점으로 원 검색
AlgeoEngine.prototype.findCircleByCenterAndPoint = function (centerId, pointId) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'CIRCLE' && obj.centerId === centerId && obj.pointId === pointId) {
            return obj;
        }
    }
    return null;
};

// 이름으로 자유 점 검색 (대소문자 구분 후, 없으면 대소문자 무시 재검색)
AlgeoEngine.prototype.findPointByName = function (name) {
    const list = this.objects;
    let i;
    let fallback = null;
    const lowerName = (name || '').toLowerCase();

    for (i = 0; i < list.length; i++) {
        if (list[i].type !== 'POINT') {
            continue;
        }
        if (list[i].name === name) {
            return list[i];
        }
        if (fallback === null && list[i].name.toLowerCase() === lowerName) {
            fallback = list[i];
        }
    }

    return fallback;
};

// 점류(자유·종속) 이름 중복 검사
AlgeoEngine.prototype.findAnyPointLikeByName = function (name) {
    const list = this.objects;
    let i;

    for (i = 0; i < list.length; i++) {
        if (isAlgeoPointType(list[i].type) && list[i].name === name) {
            return list[i];
        }
    }
    return null;
};

// 점 객체 추가
AlgeoEngine.prototype.addPoint = function (name, x, y) {
    const id = this.generateId();
    const point = {
        id: id,
        type: 'POINT',
        name: name,
        x: x,                     // 수학적 좌표 X
        y: y,                     // 수학적 좌표 Y
        parents: [],              // 부모 객체 ID 리스트 (독립 객체는 없음)
        children: []              // 자식 객체 ID 리스트
    };
    this.objects.push(point);
    this.objectMap[id] = point;
    return point;
};

// 선분 객체 추가 (두 점 사이의 연결)
AlgeoEngine.prototype.addSegment = function (name, pointId1, pointId2) {
    const p1 = this.objectMap[pointId1];
    const p2 = this.objectMap[pointId2];
    if (!p1 || !p2) { return null; }

    const id = this.generateId();
    const segment = {
        id: id,
        type: 'SEGMENT',
        name: name,
        p1Id: pointId1,
        p2Id: pointId2,
        lengthVar: null,
        parents: [pointId1, pointId2],
        children: []
    };

    // 부모 점에 자식으로 선분 ID 등록
    p1.children.push(id);
    p2.children.push(id);

    this.objects.push(segment);
    this.objectMap[id] = segment;
    return segment;
};

// 직선 객체 추가 (두 점을 지나는 무한 직선)
AlgeoEngine.prototype.addLine = function (name, pointId1, pointId2) {
    const p1 = this.objectMap[pointId1];
    const p2 = this.objectMap[pointId2];
    if (!p1 || !p2) { return null; }

    const id = this.generateId();
    const line = {
        id: id,
        type: 'LINE',
        name: name,
        p1Id: pointId1,
        p2Id: pointId2,
        parents: [pointId1, pointId2],
        children: []
    };

    p1.children.push(id);
    p2.children.push(id);

    this.objects.push(line);
    this.objectMap[id] = line;
    return line;
};

// 반직선 추가 (시작점 p1 → 방향점 p2, 한쪽으로만 연장)
AlgeoEngine.prototype.addRay = function (name, pointId1, pointId2) {
    const p1 = this.objectMap[pointId1];
    const p2 = this.objectMap[pointId2];
    let id;
    let ray;

    if (!p1 || !p2) { return null; }
    id = this.generateId();
    ray = {
        id: id,
        type: 'RAY',
        name: name,
        p1Id: pointId1,
        p2Id: pointId2,
        parents: [pointId1, pointId2],
        children: []
    };
    p1.children.push(id);
    p2.children.push(id);
    this.objects.push(ray);
    this.objectMap[id] = ray;
    return ray;
};

// 벡터 추가 (화살표 선분)
AlgeoEngine.prototype.addVector = function (name, pointId1, pointId2) {
    const p1 = this.objectMap[pointId1];
    const p2 = this.objectMap[pointId2];
    let id;
    let vec;

    if (!p1 || !p2) { return null; }
    id = this.generateId();
    vec = {
        id: id,
        type: 'VECTOR',
        name: name,
        p1Id: pointId1,
        p2Id: pointId2,
        parents: [pointId1, pointId2],
        children: []
    };
    p1.children.push(id);
    p2.children.push(id);
    this.objects.push(vec);
    this.objectMap[id] = vec;
    return vec;
};

// 각의 이등분선 추가 (A-B-C, B가 꼭짓점)
AlgeoEngine.prototype.addAngleBisector = function (name, ray1Id, vertexId, ray2Id) {
    const r1 = this.objectMap[ray1Id];
    const v = this.objectMap[vertexId];
    const r2 = this.objectMap[ray2Id];
    let id;
    let obj;

    if (!r1 || !v || !r2) { return null; }
    id = this.generateId();
    obj = {
        id: id,
        type: 'ANGLE_BISECTOR',
        name: name,
        ray1Id: ray1Id,
        vertexId: vertexId,
        ray2Id: ray2Id,
        parents: [ray1Id, vertexId, ray2Id],
        children: []
    };
    r1.children.push(id);
    v.children.push(id);
    r2.children.push(id);
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 접선 추가 (원 + 점, index 0|1)
AlgeoEngine.prototype.addTangent = function (name, circleId, pointId, index) {
    const circle = this.objectMap[circleId];
    const point = this.objectMap[pointId];
    let id;
    let obj;

    if (!circle || !point || circle.type !== 'CIRCLE') { return null; }
    id = this.generateId();
    obj = {
        id: id,
        type: 'TANGENT',
        name: name,
        circleId: circleId,
        pointId: pointId,
        index: index || 0,
        parents: [circleId, pointId],
        children: []
    };
    circle.children.push(id);
    point.children.push(id);
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 동일 두 점 반직선·벡터·선분·직선 검색 헬퍼
AlgeoEngine.prototype.findOrientedByPoints = function (type, pointId1, pointId2) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type === type && obj.p1Id === pointId1 && obj.p2Id === pointId2) {
            return obj;
        }
    }
    return null;
};

AlgeoEngine.prototype.findAngleBisectorByPoints = function (ray1Id, vertexId, ray2Id) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type === 'ANGLE_BISECTOR' && obj.vertexId === vertexId) {
            if ((obj.ray1Id === ray1Id && obj.ray2Id === ray2Id) ||
                (obj.ray1Id === ray2Id && obj.ray2Id === ray1Id)) {
                return obj;
            }
        }
    }
    return null;
};

AlgeoEngine.prototype.findTangentByRefs = function (circleId, pointId, index) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type === 'TANGENT' && obj.circleId === circleId &&
            obj.pointId === pointId && obj.index === index) {
            return obj;
        }
    }
    return null;
};

// 각 이등분선 방향의 두 점 (꼭짓점 + 단위벡터 합 방향)
AlgeoEngine.prototype.getAngleBisectorLinePoints = function (obj) {
    const r1 = this.objectMap[obj.ray1Id];
    const v = this.objectMap[obj.vertexId];
    const r2 = this.objectMap[obj.ray2Id];
    let ux;
    let uy;
    let vx;
    let vy;
    let len1;
    let len2;
    let bx;
    let by;
    let blen;

    if (!r1 || !v || !r2) { return null; }
    ux = r1.x - v.x;
    uy = r1.y - v.y;
    vx = r2.x - v.x;
    vy = r2.y - v.y;
    len1 = Math.sqrt(ux * ux + uy * uy);
    len2 = Math.sqrt(vx * vx + vy * vy);
    if (len1 < 1e-12 || len2 < 1e-12) { return null; }
    ux /= len1;
    uy /= len1;
    vx /= len2;
    vy /= len2;
    bx = ux + vx;
    by = uy + vy;
    blen = Math.sqrt(bx * bx + by * by);
    if (blen < 1e-12) {
        // 평각에 가까우면 수직 이등분 방향
        bx = -uy;
        by = ux;
        blen = Math.sqrt(bx * bx + by * by);
        if (blen < 1e-12) { return null; }
    }
    bx /= blen;
    by /= blen;
    return {
        p1: { x: v.x, y: v.y },
        p2: { x: v.x + bx, y: v.y + by }
    };
};

// 접선 → 무한직선 두 점 (접점·방향)
AlgeoEngine.prototype.getTangentLinePoints = function (obj) {
    const circle = this.objectMap[obj.circleId];
    const point = this.objectMap[obj.pointId];
    let circ;
    let tangents;
    let t;

    if (!circle || !point) { return null; }
    circ = this.getCircleGeometry(circle);
    if (!circ) { return null; }
    tangents = this.computeTangentsFromPoint(circ.center, circ.radius, point);
    t = tangents[obj.index];
    if (!t) { return null; }
    return { p1: t.p1, p2: t.p2 };
};

// 점에서 원으로의 접선(들) — 각 항목 { p1, p2 } 무한직선용
AlgeoEngine.prototype.computeTangentsFromPoint = function (center, radius, point) {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const result = [];
    let a;
    let h;
    let px;
    let py;
    let rx;
    let ry;
    let tx;
    let ty;
    let nx;
    let ny;
    let nlen;

    if (dist < 1e-12) {
        return result;
    }

    // 원 위(접점) — 반지름에 수직인 한 접선
    if (Math.abs(dist - radius) < 1e-6) {
        nx = -dy;
        ny = dx;
        nlen = Math.sqrt(nx * nx + ny * ny);
        if (nlen < 1e-12) { return result; }
        nx /= nlen;
        ny /= nlen;
        result.push({
            p1: { x: point.x, y: point.y },
            p2: { x: point.x + nx, y: point.y + ny }
        });
        return result;
    }

    // 원 안 — 접선 없음
    if (dist < radius) {
        return result;
    }

    // 원 밖 — 두 접선
    a = (radius * radius) / dist;
    h = Math.sqrt(Math.max(0, radius * radius - a * a));
    px = center.x + a * dx / dist;
    py = center.y + a * dy / dist;
    rx = -dy * (h / dist);
    ry = dx * (h / dist);

    tx = px + rx;
    ty = py + ry;
    result.push({
        p1: { x: point.x, y: point.y },
        p2: { x: tx, y: ty }
    });
    tx = px - rx;
    ty = py - ry;
    result.push({
        p1: { x: point.x, y: point.y },
        p2: { x: tx, y: ty }
    });
    return result;
};

// 두 점으로 중점 검색 (순서 무관)
AlgeoEngine.prototype.findMidpointByPoints = function (pointId1, pointId2) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'MIDPOINT') {
            if ((obj.p1Id === pointId1 && obj.p2Id === pointId2) ||
                (obj.p1Id === pointId2 && obj.p2Id === pointId1)) {
                return obj;
            }
        }
    }
    return null;
};

// 두 점으로 수직이등분선 검색 (순서 무관)
AlgeoEngine.prototype.findPerpBisectorByPoints = function (pointId1, pointId2) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'PERP_BISECTOR') {
            if ((obj.p1Id === pointId1 && obj.p2Id === pointId2) ||
                (obj.p1Id === pointId2 && obj.p2Id === pointId1)) {
                return obj;
            }
        }
    }
    return null;
};

// 중점 객체 추가 (두 점의 중간, 종속 점)
AlgeoEngine.prototype.addMidpoint = function (name, pointId1, pointId2) {
    const p1 = this.objectMap[pointId1];
    const p2 = this.objectMap[pointId2];
    if (!p1 || !p2) { return null; }

    const id = this.generateId();
    const midpoint = {
        id: id,
        type: 'MIDPOINT',
        name: name,
        p1Id: pointId1,
        p2Id: pointId2,
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2,
        parents: [pointId1, pointId2],
        children: []
    };

    p1.children.push(id);
    p2.children.push(id);
    this.objects.push(midpoint);
    this.objectMap[id] = midpoint;
    return midpoint;
};

// ── 교점·대상 위 점 (6-1) ──

// 직선·선분·수직이등분선·평행/수선 → 무한직선 두 점 {a,b} 또는 null
AlgeoEngine.prototype.getObjectLineAB = function (obj) {
    let p1;
    let p2;
    let linePts;

    if (!obj) {
        return null;
    }
    if (obj.type === 'SEGMENT' || obj.type === 'LINE' ||
        obj.type === 'RAY' || obj.type === 'VECTOR') {
        p1 = this.objectMap[obj.p1Id];
        p2 = this.objectMap[obj.p2Id];
        if (!p1 || !p2) {
            return null;
        }
        return { a: { x: p1.x, y: p1.y }, b: { x: p2.x, y: p2.y } };
    }
    if (obj.type === 'PERP_BISECTOR') {
        linePts = this.getPerpBisectorLinePoints(obj);
    } else if (obj.type === 'ANGLE_BISECTOR') {
        linePts = this.getAngleBisectorLinePoints(obj);
    } else if (obj.type === 'PARALLEL_LINE') {
        linePts = this.getParallelLinePoints(obj);
    } else if (obj.type === 'PERP_LINE') {
        linePts = this.getPerpLinePoints(obj);
    } else if (obj.type === 'TANGENT') {
        linePts = this.getTangentLinePoints(obj);
    } else {
        return null;
    }
    if (!linePts) {
        return null;
    }
    return { a: linePts.p1, b: linePts.p2 };
};

// 원 → { center, radius } 또는 null
// 원·세 점 원의 중심·반지름
AlgeoEngine.prototype.getCircleGeometry = function (obj) {
    let center;
    let point;
    let p1;
    let p2;
    let p3;
    let dx;
    let dy;
    let r;
    let circCenter;

    if (!obj) {
        return null;
    }
    if (obj.type === 'CIRCLE') {
        center = this.objectMap[obj.centerId];
        point = this.objectMap[obj.pointId];
        if (!center || !point) {
            return null;
        }
        dx = point.x - center.x;
        dy = point.y - center.y;
        r = Math.sqrt(dx * dx + dy * dy);
        if (r < 1e-12) {
            return null;
        }
        return { center: { x: center.x, y: center.y }, radius: r };
    }
    if (obj.type === 'CIRCLE_3P') {
        p1 = this.objectMap[obj.p1Id];
        p2 = this.objectMap[obj.p2Id];
        p3 = this.objectMap[obj.p3Id];
        if (!p1 || !p2 || !p3) {
            return null;
        }
        circCenter = this.computeCircumcenter(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        if (!circCenter) {
            return null;
        }
        dx = p1.x - circCenter.x;
        dy = p1.y - circCenter.y;
        r = Math.sqrt(dx * dx + dy * dy);
        if (r < 1e-12) {
            return null;
        }
        return { center: circCenter, radius: r };
    }
    return null;
};

// 두 무한직선 교점 (평행이면 null)
AlgeoEngine.prototype.intersectLineLine = function (a1, a2, b1, b2) {
    const dax = a2.x - a1.x;
    const day = a2.y - a1.y;
    const dbx = b2.x - b1.x;
    const dby = b2.y - b1.y;
    const den = dax * dby - day * dbx;
    let t;

    if (Math.abs(den) < 1e-12) {
        return null;
    }
    t = ((b1.x - a1.x) * dby - (b1.y - a1.y) * dbx) / den;
    return { x: a1.x + t * dax, y: a1.y + t * day };
};

// 무한직선–원 교점 배열 (0~2개)
AlgeoEngine.prototype.intersectLineCircle = function (a, b, center, radius) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t;
    let fx;
    let fy;
    let disc;
    let sqrtDisc;
    let t1;
    let t2;
    const pts = [];

    if (len2 < 1e-16) {
        return pts;
    }
    t = ((center.x - a.x) * dx + (center.y - a.y) * dy) / len2;
    fx = a.x + t * dx - center.x;
    fy = a.y + t * dy - center.y;
    disc = radius * radius - (fx * fx + fy * fy);
    if (disc < -1e-12) {
        return pts;
    }
    if (disc < 0) {
        disc = 0;
    }
    sqrtDisc = Math.sqrt(disc);
    t1 = t - sqrtDisc / Math.sqrt(len2);
    t2 = t + sqrtDisc / Math.sqrt(len2);
    pts.push({ x: a.x + t1 * dx, y: a.y + t1 * dy });
    if (sqrtDisc > 1e-10) {
        pts.push({ x: a.x + t2 * dx, y: a.y + t2 * dy });
    }
    return pts;
};

// 원–원 교점 배열 (0~2개)
AlgeoEngine.prototype.intersectCircleCircle = function (c1, r1, c2, r2) {
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    let a;
    let h;
    let h2;
    let px;
    let py;
    let rx;
    let ry;
    const pts = [];

    if (d < 1e-12 || d > r1 + r2 + 1e-10 || d < Math.abs(r1 - r2) - 1e-10) {
        return pts;
    }
    a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    h2 = r1 * r1 - a * a;
    if (h2 < -1e-12) {
        return pts;
    }
    if (h2 < 0) {
        h2 = 0;
    }
    h = Math.sqrt(h2);
    px = c1.x + a * dx / d;
    py = c1.y + a * dy / d;
    rx = -dy * (h / d);
    ry = dx * (h / d);
    pts.push({ x: px + rx, y: py + ry });
    if (h > 1e-10) {
        pts.push({ x: px - rx, y: py - ry });
    }
    return pts;
};

// 두 도형의 교점 좌표 목록 (선·원 조합)
AlgeoEngine.prototype.computeIntersectionPoints = function (obj1, obj2) {
    const line1 = this.getObjectLineAB(obj1);
    const line2 = this.getObjectLineAB(obj2);
    const circ1 = this.getCircleGeometry(obj1);
    const circ2 = this.getCircleGeometry(obj2);
    let pts;
    let p;

    if (line1 && line2) {
        p = this.intersectLineLine(line1.a, line1.b, line2.a, line2.b);
        return p ? [p] : [];
    }
    if (line1 && circ2) {
        return this.intersectLineCircle(line1.a, line1.b, circ2.center, circ2.radius);
    }
    if (circ1 && line2) {
        return this.intersectLineCircle(line2.a, line2.b, circ1.center, circ1.radius);
    }
    if (circ1 && circ2) {
        return this.intersectCircleCircle(circ1.center, circ1.radius, circ2.center, circ2.radius);
    }
    return [];
};

// 동일 부모·인덱스의 교점 검색
AlgeoEngine.prototype.findIntersectionByParents = function (obj1Id, obj2Id, index) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type !== 'INTERSECTION' || obj.index !== index) {
            continue;
        }
        if ((obj.obj1Id === obj1Id && obj.obj2Id === obj2Id) ||
            (obj.obj1Id === obj2Id && obj.obj2Id === obj1Id)) {
            return obj;
        }
    }
    return null;
};

// 교점 객체 추가 (종속 점)
AlgeoEngine.prototype.addIntersection = function (name, obj1Id, obj2Id, index, x, y) {
    const o1 = this.objectMap[obj1Id];
    const o2 = this.objectMap[obj2Id];
    let id;
    let inter;

    if (!o1 || !o2) {
        return null;
    }
    id = this.generateId();
    inter = {
        id: id,
        type: 'INTERSECTION',
        name: name,
        obj1Id: obj1Id,
        obj2Id: obj2Id,
        index: index || 0,
        x: x,
        y: y,
        parents: [obj1Id, obj2Id],
        children: []
    };
    o1.children.push(id);
    o2.children.push(id);
    this.objects.push(inter);
    this.objectMap[id] = inter;
    return inter;
};

// 선분·직선·원 위 파라미터 t (0~1 또는 각도 정규화)로 좌표
AlgeoEngine.prototype.getPointOnObjectCoords = function (hostObj, t) {
    let line;
    let circ;
    let angle;

    if (!hostObj) {
        return null;
    }
    if (hostObj.type === 'CIRCLE' || hostObj.type === 'CIRCLE_3P') {
        circ = this.getCircleGeometry(hostObj);
        if (!circ) {
            return null;
        }
        angle = t * 2 * Math.PI;
        return {
            x: circ.center.x + circ.radius * Math.cos(angle),
            y: circ.center.y + circ.radius * Math.sin(angle)
        };
    }
    line = this.getObjectLineAB(hostObj);
    if (!line) {
        return null;
    }
    if (hostObj.type === 'SEGMENT') {
        if (t < 0) { t = 0; }
        if (t > 1) { t = 1; }
    }
    return {
        x: line.a.x + t * (line.b.x - line.a.x),
        y: line.a.y + t * (line.b.y - line.a.y)
    };
};

// 수학 좌표 → 대상 위 파라미터 t
AlgeoEngine.prototype.projectMathToObjectT = function (hostObj, mathX, mathY) {
    let line;
    let circ;
    let dx;
    let dy;
    let len2;
    let t;
    let ang;

    if (!hostObj) {
        return null;
    }
    if (hostObj.type === 'CIRCLE' || hostObj.type === 'CIRCLE_3P') {
        circ = this.getCircleGeometry(hostObj);
        if (!circ) {
            return null;
        }
        ang = Math.atan2(mathY - circ.center.y, mathX - circ.center.x);
        if (ang < 0) {
            ang += 2 * Math.PI;
        }
        return ang / (2 * Math.PI);
    }
    line = this.getObjectLineAB(hostObj);
    if (!line) {
        return null;
    }
    dx = line.b.x - line.a.x;
    dy = line.b.y - line.a.y;
    len2 = dx * dx + dy * dy;
    if (len2 < 1e-16) {
        return 0;
    }
    t = ((mathX - line.a.x) * dx + (mathY - line.a.y) * dy) / len2;
    if (hostObj.type === 'SEGMENT') {
        if (t < 0) { t = 0; }
        if (t > 1) { t = 1; }
    }
    return t;
};

// 대상 위의 점 추가
AlgeoEngine.prototype.addPointOnObject = function (name, hostId, t) {
    const host = this.objectMap[hostId];
    let coords;
    let id;
    let pt;

    if (!host) {
        return null;
    }
    coords = this.getPointOnObjectCoords(host, t);
    if (!coords) {
        return null;
    }
    id = this.generateId();
    pt = {
        id: id,
        type: 'POINT_ON',
        name: name,
        hostId: hostId,
        t: t,
        x: coords.x,
        y: coords.y,
        parents: [hostId],
        children: []
    };
    host.children.push(id);
    this.objects.push(pt);
    this.objectMap[id] = pt;
    return pt;
};

// 수직이등분선 객체 추가
AlgeoEngine.prototype.addPerpBisector = function (name, pointId1, pointId2) {
    const p1 = this.objectMap[pointId1];
    const p2 = this.objectMap[pointId2];
    if (!p1 || !p2) { return null; }

    const id = this.generateId();
    const perpBisector = {
        id: id,
        type: 'PERP_BISECTOR',
        name: name,
        p1Id: pointId1,
        p2Id: pointId2,
        parents: [pointId1, pointId2],
        children: []
    };

    p1.children.push(id);
    p2.children.push(id);
    this.objects.push(perpBisector);
    this.objectMap[id] = perpBisector;
    return perpBisector;
};

// 기준 두 점·통과 점으로 평행선 검색 (기준 순서 무관)
AlgeoEngine.prototype.findParallelLineByRefs = function (refP1Id, refP2Id, throughId) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'PARALLEL_LINE' && obj.throughId === throughId) {
            if ((obj.refP1Id === refP1Id && obj.refP2Id === refP2Id) ||
                (obj.refP1Id === refP2Id && obj.refP2Id === refP1Id)) {
                return obj;
            }
        }
    }
    return null;
};

// 기준 두 점·통과 점으로 수직선 검색 (기준 순서 무관)
AlgeoEngine.prototype.findPerpLineByRefs = function (refP1Id, refP2Id, throughId) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'PERP_LINE' && obj.throughId === throughId) {
            if ((obj.refP1Id === refP1Id && obj.refP2Id === refP2Id) ||
                (obj.refP1Id === refP2Id && obj.refP2Id === refP1Id)) {
                return obj;
            }
        }
    }
    return null;
};

// 평행선 객체 추가 (C를 지나며 AB와 평행)
AlgeoEngine.prototype.addParallelLine = function (name, refP1Id, refP2Id, throughId) {
    const ref1 = this.objectMap[refP1Id];
    const ref2 = this.objectMap[refP2Id];
    const through = this.objectMap[throughId];
    if (!ref1 || !ref2 || !through) { return null; }

    const id = this.generateId();
    const parallelLine = {
        id: id,
        type: 'PARALLEL_LINE',
        name: name,
        refP1Id: refP1Id,
        refP2Id: refP2Id,
        throughId: throughId,
        parents: [refP1Id, refP2Id, throughId],
        children: []
    };

    ref1.children.push(id);
    ref2.children.push(id);
    through.children.push(id);

    this.objects.push(parallelLine);
    this.objectMap[id] = parallelLine;
    return parallelLine;
};

// 수직선 객체 추가 (C를 지나며 AB에 수직)
AlgeoEngine.prototype.addPerpLine = function (name, refP1Id, refP2Id, throughId) {
    const ref1 = this.objectMap[refP1Id];
    const ref2 = this.objectMap[refP2Id];
    const through = this.objectMap[throughId];
    if (!ref1 || !ref2 || !through) { return null; }

    const id = this.generateId();
    const perpLine = {
        id: id,
        type: 'PERP_LINE',
        name: name,
        refP1Id: refP1Id,
        refP2Id: refP2Id,
        throughId: throughId,
        parents: [refP1Id, refP2Id, throughId],
        children: []
    };

    ref1.children.push(id);
    ref2.children.push(id);
    through.children.push(id);

    this.objects.push(perpLine);
    this.objectMap[id] = perpLine;
    return perpLine;
};

// 평행선을 그리기 위한 두 수학 좌표점 반환
AlgeoEngine.prototype.getParallelLinePoints = function (obj) {
    const ref1 = this.objectMap[obj.refP1Id];
    const ref2 = this.objectMap[obj.refP2Id];
    const through = this.objectMap[obj.throughId];
    if (!ref1 || !ref2 || !through) { return null; }

    const dx = ref2.x - ref1.x;
    const dy = ref2.y - ref1.y;
    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
        return null;
    }

    return {
        p1: { x: through.x - dx, y: through.y - dy },
        p2: { x: through.x + dx, y: through.y + dy }
    };
};

// 수직선을 그리기 위한 두 수학 좌표점 반환
AlgeoEngine.prototype.getPerpLinePoints = function (obj) {
    const ref1 = this.objectMap[obj.refP1Id];
    const ref2 = this.objectMap[obj.refP2Id];
    const through = this.objectMap[obj.throughId];
    if (!ref1 || !ref2 || !through) { return null; }

    const dx = ref2.x - ref1.x;
    const dy = ref2.y - ref1.y;
    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
        return null;
    }

    return {
        p1: { x: through.x - dy, y: through.y + dx },
        p2: { x: through.x + dy, y: through.y - dx }
    };
};

// 평행선 미리보기용 — 기준 두 점과 통과 좌표로 직선 두 점 반환
AlgeoEngine.prototype.getParallelLinePointsAt = function (ref1, ref2, throughX, throughY) {
    const dx = ref2.x - ref1.x;
    const dy = ref2.y - ref1.y;
    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
        return null;
    }
    return {
        p1: { x: throughX - dx, y: throughY - dy },
        p2: { x: throughX + dx, y: throughY + dy }
    };
};

// 수직선 미리보기용 — 기준 두 점과 통과 좌표로 직선 두 점 반환
AlgeoEngine.prototype.getPerpLinePointsAt = function (ref1, ref2, throughX, throughY) {
    const dx = ref2.x - ref1.x;
    const dy = ref2.y - ref1.y;
    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
        return null;
    }
    return {
        p1: { x: throughX - dy, y: throughY + dx },
        p2: { x: throughX + dy, y: throughY - dx }
    };
};

// 각도 객체 검색 (꼭짓점·두 변 점 순서 유지)
AlgeoEngine.prototype.findAngleByPoints = function (ray1Id, vertexId, ray2Id) {
    const list = this.objects;
    let i;
    for (i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'ANGLE' && obj.vertexId === vertexId &&
            obj.ray1Id === ray1Id && obj.ray2Id === ray2Id) {
            return obj;
        }
    }
    return null;
};

// 세 점의 외심(호의 중심) 계산
AlgeoEngine.prototype.computeCircumcenter = function (ax, ay, bx, by, cx, cy) {
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-12) {
        return null;
    }
    const a2 = ax * ax + ay * ay;
    const b2 = bx * bx + by * by;
    const c2 = cx * cx + cy * cy;
    return {
        x: (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d,
        y: (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / d
    };
};

// 호 객체 검색 — 끝점 2개 + 호 위의 점
AlgeoEngine.prototype.findArcByThreePoints = function (p1Id, p2Id, guideId) {
    const list = this.objects;
    let i;
    for (i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'ARC' && obj.guideId === guideId) {
            if ((obj.p1Id === p1Id && obj.p2Id === p2Id) ||
                (obj.p1Id === p2Id && obj.p2Id === p1Id)) {
                return obj;
            }
        }
    }
    return null;
};

// 각도 객체 추가 (ray1—vertex—ray2, 꼭짓점은 vertex)
AlgeoEngine.prototype.addAngle = function (name, ray1Id, vertexId, ray2Id) {
    const ray1 = this.objectMap[ray1Id];
    const vertex = this.objectMap[vertexId];
    const ray2 = this.objectMap[ray2Id];
    if (!ray1 || !vertex || !ray2) { return null; }

    const id = this.generateId();
    const angle = {
        id: id,
        type: 'ANGLE',
        name: name,
        ray1Id: ray1Id,
        vertexId: vertexId,
        ray2Id: ray2Id,
        parents: [ray1Id, vertexId, ray2Id],
        children: []
    };

    ray1.children.push(id);
    vertex.children.push(id);
    ray2.children.push(id);

    this.objects.push(angle);
    this.objectMap[id] = angle;
    return angle;
};

// 호 객체 추가 (끝점 A,B + 호 위의 조절점 C)
AlgeoEngine.prototype.addArc = function (name, p1Id, p2Id, guideId) {
    const p1 = this.objectMap[p1Id];
    const p2 = this.objectMap[p2Id];
    const guide = this.objectMap[guideId];
    if (!p1 || !p2 || !guide) { return null; }

    const id = this.generateId();
    const arc = {
        id: id,
        type: 'ARC',
        name: name,
        p1Id: p1Id,
        p2Id: p2Id,
        guideId: guideId,
        parents: [p1Id, p2Id, guideId],
        children: []
    };

    p1.children.push(id);
    p2.children.push(id);
    guide.children.push(id);

    this.objects.push(arc);
    this.objectMap[id] = arc;
    return arc;
};

// 각도 크기(도) 계산
AlgeoEngine.prototype.getAngleDegrees = function (obj) {
    const ray1 = this.objectMap[obj.ray1Id];
    const vertex = this.objectMap[obj.vertexId];
    const ray2 = this.objectMap[obj.ray2Id];
    if (!ray1 || !vertex || !ray2) { return null; }

    const v1x = ray1.x - vertex.x;
    const v1y = ray1.y - vertex.y;
    const v2x = ray2.x - vertex.x;
    const v2y = ray2.y - vertex.y;
    const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
    if (m1 < 1e-10 || m2 < 1e-10) { return null; }

    let cosVal = (v1x * v2x + v1y * v2y) / (m1 * m2);
    if (cosVal > 1) { cosVal = 1; }
    if (cosVal < -1) { cosVal = -1; }
    return Math.acos(cosVal) * 180 / Math.PI;
};

// 종속 객체 좌표 재계산
AlgeoEngine.prototype.recalculateObject = function (obj) {
    let p1;
    let p2;
    let pts;
    let coords;
    let host;

    if (obj.type === 'MIDPOINT') {
        p1 = this.objectMap[obj.p1Id];
        p2 = this.objectMap[obj.p2Id];
        if (p1 && p2) {
            obj.x = (p1.x + p2.x) / 2;
            obj.y = (p1.y + p2.y) / 2;
        }
    } else if (obj.type === 'INTERSECTION') {
        p1 = this.objectMap[obj.obj1Id];
        p2 = this.objectMap[obj.obj2Id];
        if (p1 && p2) {
            pts = this.computeIntersectionPoints(p1, p2);
            if (pts[obj.index]) {
                obj.x = pts[obj.index].x;
                obj.y = pts[obj.index].y;
            }
        }
    } else if (obj.type === 'POINT_ON') {
        host = this.objectMap[obj.hostId];
        coords = this.getPointOnObjectCoords(host, obj.t);
        if (coords) {
            obj.x = coords.x;
            obj.y = coords.y;
        }
    } else if (obj.type === 'REGULAR_VERTEX') {
        coords = this.getRegularVertexCoords(obj);
        if (coords) {
            obj.x = coords.x;
            obj.y = coords.y;
        }
    } else if (obj.type === 'FIXED_ANGLE_POINT') {
        coords = this.getFixedAnglePointCoords(obj);
        if (coords) {
            obj.x = coords.x;
            obj.y = coords.y;
        }
    }
};

// 수직이등분선을 그리기 위한 두 수학 좌표점 반환
AlgeoEngine.prototype.getPerpBisectorLinePoints = function (obj) {
    const p1 = this.objectMap[obj.p1Id];
    const p2 = this.objectMap[obj.p2Id];
    if (!p1 || !p2) { return null; }

    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
        return null;
    }

    return {
        p1: { x: mx - dy, y: my + dx },
        p2: { x: mx + dy, y: my - dx }
    };
};

// 원 객체 추가 (중심점과 둘레 위의 한 점)
AlgeoEngine.prototype.addCircle = function (name, centerId, pointId) {
    const center = this.objectMap[centerId];
    const point = this.objectMap[pointId];
    if (!center || !point) { return null; }

    const id = this.generateId();
    const circle = {
        id: id,
        type: 'CIRCLE',
        name: name,
        centerId: centerId,
        pointId: pointId,
        radiusVar: null,
        parents: [centerId, pointId],
        children: []
    };

    center.children.push(id);
    point.children.push(id);

    this.objects.push(circle);
    this.objectMap[id] = circle;
    return circle;
};

// 세 점을 지나는 원 검색
AlgeoEngine.prototype.findCircle3PByPoints = function (p1Id, p2Id, p3Id) {
    const list = this.objects;
    let i;
    let obj;
    let ids;
    let key;
    let other;

    key = [p1Id, p2Id, p3Id].slice().sort().join('|');
    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type !== 'CIRCLE_3P') {
            continue;
        }
        ids = [obj.p1Id, obj.p2Id, obj.p3Id];
        other = ids.slice().sort().join('|');
        if (other === key) {
            return obj;
        }
    }
    return null;
};

// 세 점을 지나는 원 추가
AlgeoEngine.prototype.addCircle3P = function (name, p1Id, p2Id, p3Id) {
    const p1 = this.objectMap[p1Id];
    const p2 = this.objectMap[p2Id];
    const p3 = this.objectMap[p3Id];
    let id;
    let circle;
    let center;

    if (!p1 || !p2 || !p3) {
        return null;
    }
    center = this.computeCircumcenter(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    if (!center) {
        return null;
    }
    id = this.generateId();
    circle = {
        id: id,
        type: 'CIRCLE_3P',
        name: name,
        p1Id: p1Id,
        p2Id: p2Id,
        p3Id: p3Id,
        parents: [p1Id, p2Id, p3Id],
        children: []
    };
    p1.children.push(id);
    p2.children.push(id);
    p3.children.push(id);
    this.objects.push(circle);
    this.objectMap[id] = circle;
    return circle;
};

// 부채꼴 검색
AlgeoEngine.prototype.findSectorByRefs = function (centerId, p1Id, p2Id) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type !== 'SECTOR' || obj.centerId !== centerId) {
            continue;
        }
        if ((obj.p1Id === p1Id && obj.p2Id === p2Id) ||
            (obj.p1Id === p2Id && obj.p2Id === p1Id)) {
            return obj;
        }
    }
    return null;
};

// 부채꼴 추가 (중심 + 두 끝점)
AlgeoEngine.prototype.addSector = function (name, centerId, p1Id, p2Id) {
    const center = this.objectMap[centerId];
    const p1 = this.objectMap[p1Id];
    const p2 = this.objectMap[p2Id];
    let id;
    let sector;

    if (!center || !p1 || !p2) {
        return null;
    }
    id = this.generateId();
    sector = {
        id: id,
        type: 'SECTOR',
        name: name,
        centerId: centerId,
        p1Id: p1Id,
        p2Id: p2Id,
        parents: [centerId, p1Id, p2Id],
        children: []
    };
    center.children.push(id);
    p1.children.push(id);
    p2.children.push(id);
    this.objects.push(sector);
    this.objectMap[id] = sector;
    return sector;
};

// 활꼴 검색
AlgeoEngine.prototype.findCircularSegmentByRefs = function (p1Id, p2Id, guideId) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type !== 'CIRCULAR_SEGMENT' || obj.guideId !== guideId) {
            continue;
        }
        if ((obj.p1Id === p1Id && obj.p2Id === p2Id) ||
            (obj.p1Id === p2Id && obj.p2Id === p1Id)) {
            return obj;
        }
    }
    return null;
};

// 활꼴 추가 (끝점 2개 + 호 위 점)
AlgeoEngine.prototype.addCircularSegment = function (name, p1Id, p2Id, guideId) {
    const p1 = this.objectMap[p1Id];
    const p2 = this.objectMap[p2Id];
    const guide = this.objectMap[guideId];
    let id;
    let seg;

    if (!p1 || !p2 || !guide) {
        return null;
    }
    if (!this.computeCircumcenter(p1.x, p1.y, p2.x, p2.y, guide.x, guide.y)) {
        return null;
    }
    id = this.generateId();
    seg = {
        id: id,
        type: 'CIRCULAR_SEGMENT',
        name: name,
        p1Id: p1Id,
        p2Id: p2Id,
        guideId: guideId,
        parents: [p1Id, p2Id, guideId],
        children: []
    };
    p1.children.push(id);
    p2.children.push(id);
    guide.children.push(id);
    this.objects.push(seg);
    this.objectMap[id] = seg;
    return seg;
};

// 동일 꼭짓점 순서의 다각형 검색
AlgeoEngine.prototype.findPolygonByVertices = function (vertexIds) {
    const list = this.objects;
    let i;
    let j;

    for (i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type !== 'POLYGON' || obj.vertexIds.length !== vertexIds.length) {
            continue;
        }
        let same = true;
        for (j = 0; j < vertexIds.length; j++) {
            if (obj.vertexIds[j] !== vertexIds[j]) {
                same = false;
                break;
            }
        }
        if (same) {
            return obj;
        }
    }
    return null;
};

// 다각형 객체 추가 (꼭짓점 점 ID 배열)
AlgeoEngine.prototype.addPolygon = function (name, vertexIds) {
    if (!vertexIds || vertexIds.length < 3) {
        return null;
    }

    let i;
    for (i = 0; i < vertexIds.length; i++) {
        const pt = this.objectMap[vertexIds[i]];
        if (!pt || !isAlgeoPointType(pt.type)) {
            return null;
        }
    }

    const id = this.generateId();
    const poly = {
        id: id,
        type: 'POLYGON',
        name: name,
        vertexIds: vertexIds.slice(),
        parents: vertexIds.slice(),
        children: []
    };

    for (i = 0; i < vertexIds.length; i++) {
        const parent = this.objectMap[vertexIds[i]];
        parent.children.push(id);
    }

    this.objects.push(poly);
    this.objectMap[id] = poly;
    return poly;
};

// 한 변(p0→p1) 기준 정 n각형 꼭짓점 좌표 (orient: +1 반시계 / -1 시계)
AlgeoEngine.prototype.computeRegularPolygonFromSide = function (p0, p1, n, orient) {
    const verts = [];
    const ang = (orient >= 0 ? 1 : -1) * (2 * Math.PI / n);
    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);
    let i;
    let prev;
    let prev2;
    let dx;
    let dy;

    if (!p0 || !p1 || n < 3) {
        return null;
    }
    verts.push({ x: p0.x, y: p0.y });
    verts.push({ x: p1.x, y: p1.y });
    for (i = 2; i < n; i++) {
        prev = verts[i - 1];
        prev2 = verts[i - 2];
        dx = prev.x - prev2.x;
        dy = prev.y - prev2.y;
        verts.push({
            x: prev.x + dx * cosA - dy * sinA,
            y: prev.y + dx * sinA + dy * cosA
        });
    }
    return verts;
};

// 중심·한 꼭짓점 기준 정 n각형 꼭짓점 좌표
AlgeoEngine.prototype.computeRegularPolygonFromCenter = function (center, first, n) {
    const verts = [];
    let i;
    let ang;
    let cosA;
    let sinA;
    let dx;
    let dy;

    if (!center || !first || n < 3) {
        return null;
    }
    dx = first.x - center.x;
    dy = first.y - center.y;
    for (i = 0; i < n; i++) {
        ang = 2 * Math.PI * i / n;
        cosA = Math.cos(ang);
        sinA = Math.sin(ang);
        verts.push({
            x: center.x + dx * cosA - dy * sinA,
            y: center.y + dx * sinA + dy * cosA
        });
    }
    return verts;
};

// 정다각형 종속 꼭짓점 좌표 계산
AlgeoEngine.prototype.getRegularVertexCoords = function (obj) {
    let p0;
    let p1;
    let center;
    let first;
    let verts;

    if (!obj || obj.type !== 'REGULAR_VERTEX') {
        return null;
    }
    if (obj.mode === 'SIDE') {
        p0 = this.objectMap[obj.sideP1Id];
        p1 = this.objectMap[obj.sideP2Id];
        verts = this.computeRegularPolygonFromSide(p0, p1, obj.sides, obj.orient);
    } else if (obj.mode === 'CENTER') {
        center = this.objectMap[obj.centerId];
        first = this.objectMap[obj.firstId];
        verts = this.computeRegularPolygonFromCenter(center, first, obj.sides);
    } else {
        return null;
    }
    if (!verts || !verts[obj.index]) {
        return null;
    }
    return verts[obj.index];
};

// 주어진 크기 각의 끝점 좌표 (꼭짓점 기준, ray1과 동일 길이)
AlgeoEngine.prototype.getFixedAnglePointCoords = function (obj) {
    let vertex;
    let ray1;
    let dx;
    let dy;
    let len;
    let baseAng;
    let ang;

    if (!obj || obj.type !== 'FIXED_ANGLE_POINT') {
        return null;
    }
    vertex = this.objectMap[obj.vertexId];
    ray1 = this.objectMap[obj.ray1Id];
    if (!vertex || !ray1) {
        return null;
    }
    dx = ray1.x - vertex.x;
    dy = ray1.y - vertex.y;
    len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) {
        return null;
    }
    baseAng = Math.atan2(dy, dx);
    ang = baseAng + (obj.orient >= 0 ? 1 : -1) * (obj.degrees * Math.PI / 180);
    return {
        x: vertex.x + len * Math.cos(ang),
        y: vertex.y + len * Math.sin(ang)
    };
};

// 정다각형 종속 꼭짓점 추가
AlgeoEngine.prototype.addRegularVertex = function (name, config) {
    const id = this.generateId();
    const vertex = {
        id: id,
        type: 'REGULAR_VERTEX',
        name: name,
        mode: config.mode,
        index: config.index,
        sides: config.sides,
        x: 0,
        y: 0,
        parents: [],
        children: []
    };
    let i;
    let parent;
    let coords;

    if (config.mode === 'SIDE') {
        vertex.sideP1Id = config.sideP1Id;
        vertex.sideP2Id = config.sideP2Id;
        vertex.orient = config.orient >= 0 ? 1 : -1;
        vertex.parents = [config.sideP1Id, config.sideP2Id];
    } else {
        vertex.centerId = config.centerId;
        vertex.firstId = config.firstId;
        vertex.parents = [config.centerId, config.firstId];
    }

    coords = this.getRegularVertexCoords(vertex);
    if (!coords) {
        return null;
    }
    vertex.x = coords.x;
    vertex.y = coords.y;

    for (i = 0; i < vertex.parents.length; i++) {
        parent = this.objectMap[vertex.parents[i]];
        if (!parent) {
            return null;
        }
        parent.children.push(id);
    }

    this.objects.push(vertex);
    this.objectMap[id] = vertex;
    return vertex;
};

// 주어진 크기 각의 끝점 추가
AlgeoEngine.prototype.addFixedAnglePoint = function (name, ray1Id, vertexId, degrees, orient) {
    const id = this.generateId();
    const pt = {
        id: id,
        type: 'FIXED_ANGLE_POINT',
        name: name,
        ray1Id: ray1Id,
        vertexId: vertexId,
        degrees: degrees,
        orient: orient >= 0 ? 1 : -1,
        x: 0,
        y: 0,
        parents: [ray1Id, vertexId],
        children: []
    };
    let ray1;
    let vertex;
    let coords;

    ray1 = this.objectMap[ray1Id];
    vertex = this.objectMap[vertexId];
    if (!ray1 || !vertex) {
        return null;
    }
    coords = this.getFixedAnglePointCoords(pt);
    if (!coords) {
        return null;
    }
    pt.x = coords.x;
    pt.y = coords.y;
    ray1.children.push(id);
    vertex.children.push(id);
    this.objects.push(pt);
    this.objectMap[id] = pt;
    return pt;
};

// 이름으로 함수 객체 검색
AlgeoEngine.prototype.findFunctionByName = function (name) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        if (list[i].type === 'FUNCTION' && list[i].name === name) {
            return list[i];
        }
    }
    return null;
};

// 정규화된 식으로 함수 객체 검색 (동일 식 재입력 시 갱신용)
AlgeoEngine.prototype.findFunctionByExprKey = function (exprKey) {
    const list = this.objects;
    for (let i = 0; i < list.length; i++) {
        if (list[i].type === 'FUNCTION' && list[i].exprKey === exprKey) {
            return list[i];
        }
    }
    return null;
};

// 일차함수 객체 추가 (y = ax + b)
AlgeoEngine.prototype.addFunction = function (name, expression, exprKey, slope, intercept) {
    const id = this.generateId();
    const funcObj = {
        id: id,
        type: 'FUNCTION',
        name: name,
        expression: expression,
        exprKey: exprKey,
        slope: slope,
        intercept: intercept,
        rhsRaw: null,
        parents: [],
        children: []
    };
    this.objects.push(funcObj);
    this.objectMap[id] = funcObj;
    return funcObj;
};

// 슬라이더 이름으로 검색 (소문자 변수명)
AlgeoEngine.prototype.findSliderByName = function (name) {
    const list = this.objects;
    let i;
    const key = (name || '').toLowerCase();

    for (i = 0; i < list.length; i++) {
        if (list[i].type === 'SLIDER' && list[i].name === key) {
            return list[i];
        }
    }
    return null;
};

// 슬라이더 변수 값 조회 — 없으면 null
AlgeoEngine.prototype.getSliderValue = function (name) {
    const slider = this.findSliderByName(name);
    if (!slider) {
        return null;
    }
    return slider.value;
};

// 슬라이더 객체 추가
AlgeoEngine.prototype.addSlider = function (name, min, max, value, step, anchorX, anchorY) {
    const id = this.generateId();
    const slider = {
        id: id,
        type: 'SLIDER',
        name: (name || 'a').toLowerCase(),
        min: min,
        max: max,
        value: value,
        step: step > 0 ? step : 0.1,
        anchorX: anchorX,
        anchorY: anchorY,
        parents: [],
        children: []
    };
    this.objects.push(slider);
    this.objectMap[id] = slider;
    return slider;
};

// 슬라이더 값 변경 — 범위·간격 스냅 후 연동 객체 갱신
AlgeoEngine.prototype.setSliderValue = function (sliderId, newValue) {
    const slider = this.objectMap[sliderId];
    let v;
    let step;

    if (!slider || slider.type !== 'SLIDER') {
        return false;
    }

    v = newValue;
    if (v < slider.min) {
        v = slider.min;
    }
    if (v > slider.max) {
        v = slider.max;
    }

    step = slider.step;
    if (step > 0) {
        v = Math.round(v / step) * step;
        v = parseFloat(v.toFixed(10));
    }

    slider.value = v;
    this.applySliderDependents(slider.name);
    return true;
};

// 일차식 계수 토큰 해석 — 숫자 또는 슬라이더 변수
AlgeoEngine.prototype.resolveCoeffToken = function (token) {
    const expr = (token || '').replace(/\s+/g, '').toLowerCase();
    let num;
    let varMatch;
    let nvMatch;
    let sign;
    let coef;
    let varName;
    let sliderVal;

    if (expr === '' || expr === '+') {
        return 0;
    }

    if (expr.charAt(0) === '+') {
        return this.resolveCoeffToken(expr.substring(1));
    }

    num = parseFloat(expr);
    if (!isNaN(num) && String(num) === expr) {
        return num;
    }

    varMatch = expr.match(/^(-?)([a-z])$/);
    if (varMatch) {
        sign = varMatch[1] === '-' ? -1 : 1;
        sliderVal = this.getSliderValue(varMatch[2]);
        if (sliderVal === null) {
            return null;
        }
        return sign * sliderVal;
    }

    nvMatch = expr.match(/^(-?\d*\.?\d+)([a-z])$/);
    if (nvMatch) {
        coef = parseFloat(nvMatch[1]);
        varName = nvMatch[2];
        sliderVal = this.getSliderValue(varName);
        if (sliderVal === null || isNaN(coef)) {
            return null;
        }
        return coef * sliderVal;
    }

    return null;
};

// 일차함수 우변(ax+b) 계수 해석 — 슬라이더 변수 포함
AlgeoEngine.prototype.resolveLinearRhs = function (rhs) {
    const expr = (rhs || '').replace(/\s+/g, '').replace(/\*/g, '').toLowerCase();
    let xIdx;
    let slopePart;
    let interceptPart;
    let slope;
    let intercept;

    if (!expr) {
        return null;
    }

    xIdx = expr.indexOf('x');
    if (xIdx === -1) {
        intercept = this.resolveCoeffToken(expr);
        if (intercept === null) {
            return null;
        }
        return { slope: 0, intercept: intercept };
    }

    if (expr.split('x').length - 1 > 1) {
        return null;
    }

    slopePart = expr.substring(0, xIdx);
    interceptPart = expr.substring(xIdx + 1);

    if (slopePart === '' || slopePart === '+') {
        slope = 1;
    } else if (slopePart === '-') {
        slope = -1;
    } else {
        slope = this.resolveCoeffToken(slopePart);
        if (slope === null) {
            return null;
        }
    }

    intercept = this.resolveCoeffToken(interceptPart);
    if (intercept === null) {
        return null;
    }

    return { slope: slope, intercept: intercept };
};

// 함수 객체의 현재 기울기·절편 (슬라이더 연동 시 매 프레임 재계산)
AlgeoEngine.prototype.getFunctionCoeffs = function (funcObj) {
    let resolved;

    if (funcObj.rhsRaw) {
        resolved = this.resolveLinearRhs(funcObj.rhsRaw);
        if (resolved) {
            return resolved;
        }
    }

    return { slope: funcObj.slope, intercept: funcObj.intercept };
};

// 슬라이더 값 변경 시 연동된 함수·선분·원 갱신
AlgeoEngine.prototype.applySliderDependents = function (sliderName) {
    const list = this.objects;
    let i;
    let obj;
    let coeffs;
    let val;
    const key = (sliderName || '').toLowerCase();

    for (i = 0; i < list.length; i++) {
        obj = list[i];

        if (obj.type === 'FUNCTION' && obj.rhsRaw) {
            coeffs = this.resolveLinearRhs(obj.rhsRaw);
            if (coeffs) {
                obj.slope = coeffs.slope;
                obj.intercept = coeffs.intercept;
            }
        } else if (obj.type === 'SEGMENT' && obj.lengthVar === key) {
            val = this.getSliderValue(key);
            if (val !== null && val > 0) {
                this.setSegmentLength(obj.id, val);
            }
        } else if (obj.type === 'CIRCLE' && obj.radiusVar === key) {
            val = this.getSliderValue(key);
            if (val !== null && val > 0) {
                this.setCircleRadius(obj.id, val);
            }
        }
    }
};

// 특정 객체 이동 (그를 참조하는 모든 자식 객체 재계산 전파)
AlgeoEngine.prototype.movePoint = function (pointId, newX, newY) {
    const point = this.objectMap[pointId];
    if (!point || point.type !== 'POINT') { return; }

    point.x = newX;
    point.y = newY;

    // 점 자체는 독립 객체이므로 자식들의 업데이트만 유도하면 됨
    this.updateDependents(pointId);
};

// 객체 표시 여부 (visible 미설정 시 true)
AlgeoEngine.prototype.isObjectVisible = function (obj) {
    if (!obj) {
        return false;
    }
    return obj.visible !== false;
};

// 객체 표시/숨김 설정
AlgeoEngine.prototype.setObjectVisible = function (id, isVisible) {
    const obj = this.objectMap[id];
    if (!obj) {
        return false;
    }
    obj.visible = isVisible !== false;
    return true;
};

// 점·중점 참조에서 드래그 가능한 자유 점 ID 수집 (중복 제거)
AlgeoEngine.prototype.collectFreePointIdsForPointRef = function (pointRefId) {
    const result = [];
    const seen = {};
    this.collectFreePointIdsInto(pointRefId, seen, result);
    return result;
};

// collectFreePointIdsForPointRef 내부 재귀
AlgeoEngine.prototype.collectFreePointIdsInto = function (pointRefId, seen, result) {
    const pt = this.objectMap[pointRefId];
    let childIds;
    let i;

    if (!pt || seen[pointRefId]) {
        return;
    }
    seen[pointRefId] = true;

    if (pt.type === 'POINT') {
        result.push(pointRefId);
        return;
    }

    if (pt.type === 'MIDPOINT') {
        this.collectFreePointIdsInto(pt.p1Id, seen, result);
        this.collectFreePointIdsInto(pt.p2Id, seen, result);
    } else if (pt.type === 'INTERSECTION') {
        this.mergeFreePointIds(this.collectFreePointIdsForObject(this.objectMap[pt.obj1Id]), seen, result);
        this.mergeFreePointIds(this.collectFreePointIdsForObject(this.objectMap[pt.obj2Id]), seen, result);
    } else if (pt.type === 'POINT_ON') {
        this.mergeFreePointIds(this.collectFreePointIdsForObject(this.objectMap[pt.hostId]), seen, result);
    } else if (pt.type === 'REGULAR_VERTEX') {
        if (pt.mode === 'SIDE') {
            this.collectFreePointIdsInto(pt.sideP1Id, seen, result);
            this.collectFreePointIdsInto(pt.sideP2Id, seen, result);
        } else {
            this.collectFreePointIdsInto(pt.centerId, seen, result);
            this.collectFreePointIdsInto(pt.firstId, seen, result);
        }
    } else if (pt.type === 'FIXED_ANGLE_POINT') {
        this.collectFreePointIdsInto(pt.ray1Id, seen, result);
        this.collectFreePointIdsInto(pt.vertexId, seen, result);
    }
};

// 자유점 ID 목록을 seen·result에 합침
AlgeoEngine.prototype.mergeFreePointIds = function (ids, seen, result) {
    let i;
    let id;
    if (!ids) {
        return;
    }
    for (i = 0; i < ids.length; i++) {
        id = ids[i];
        if (!seen[id]) {
            seen[id] = true;
            result.push(id);
        }
    }
};

// 객체 드래그 시 함께 옮길 자유 점 ID 목록
AlgeoEngine.prototype.collectFreePointIdsForObject = function (obj) {
    const result = [];
    const seen = {};
    let i;

    if (!obj) {
        return result;
    }

    if (isAlgeoPointType(obj.type)) {
        return this.collectFreePointIdsForPointRef(obj.id);
    }

    if (obj.type === 'SEGMENT' || obj.type === 'LINE' ||
        obj.type === 'RAY' || obj.type === 'VECTOR' ||
        obj.type === 'PERP_BISECTOR') {
        this.collectFreePointIdsInto(obj.p1Id, seen, result);
        this.collectFreePointIdsInto(obj.p2Id, seen, result);
    } else if (obj.type === 'ANGLE_BISECTOR') {
        this.collectFreePointIdsInto(obj.ray1Id, seen, result);
        this.collectFreePointIdsInto(obj.vertexId, seen, result);
        this.collectFreePointIdsInto(obj.ray2Id, seen, result);
    } else if (obj.type === 'TANGENT') {
        this.mergeFreePointIds(this.collectFreePointIdsForObject(this.objectMap[obj.circleId]), seen, result);
        this.collectFreePointIdsInto(obj.pointId, seen, result);
    } else if (obj.type === 'PARALLEL_LINE' || obj.type === 'PERP_LINE') {
        this.collectFreePointIdsInto(obj.refP1Id, seen, result);
        this.collectFreePointIdsInto(obj.refP2Id, seen, result);
        this.collectFreePointIdsInto(obj.throughId, seen, result);
    } else if (obj.type === 'CIRCLE') {
        this.collectFreePointIdsInto(obj.centerId, seen, result);
        this.collectFreePointIdsInto(obj.pointId, seen, result);
    } else if (obj.type === 'CIRCLE_3P') {
        this.collectFreePointIdsInto(obj.p1Id, seen, result);
        this.collectFreePointIdsInto(obj.p2Id, seen, result);
        this.collectFreePointIdsInto(obj.p3Id, seen, result);
    } else if (obj.type === 'SECTOR') {
        this.collectFreePointIdsInto(obj.centerId, seen, result);
        this.collectFreePointIdsInto(obj.p1Id, seen, result);
        this.collectFreePointIdsInto(obj.p2Id, seen, result);
    } else if (obj.type === 'CIRCULAR_SEGMENT') {
        this.collectFreePointIdsInto(obj.p1Id, seen, result);
        this.collectFreePointIdsInto(obj.p2Id, seen, result);
        this.collectFreePointIdsInto(obj.guideId, seen, result);
    } else if (obj.type === 'ARC') {
        this.collectFreePointIdsInto(obj.p1Id, seen, result);
        this.collectFreePointIdsInto(obj.p2Id, seen, result);
        this.collectFreePointIdsInto(obj.guideId, seen, result);
    } else if (obj.type === 'ANGLE') {
        this.collectFreePointIdsInto(obj.ray1Id, seen, result);
        this.collectFreePointIdsInto(obj.vertexId, seen, result);
        this.collectFreePointIdsInto(obj.ray2Id, seen, result);
    } else if (obj.type === 'POLYGON') {
        for (i = 0; i < obj.vertexIds.length; i++) {
            this.collectFreePointIdsInto(obj.vertexIds[i], seen, result);
        }
    }

    return result;
};

// 여러 자유 점을 동일한 Δ만큼 평행 이동
AlgeoEngine.prototype.translateFreePoints = function (pointIds, dx, dy) {
    let i;
    let id;
    let pt;
    let newX;
    let newY;

    for (i = 0; i < pointIds.length; i++) {
        id = pointIds[i];
        pt = this.objectMap[id];
        if (pt && pt.type === 'POINT') {
            newX = pt.x + dx;
            newY = pt.y + dy;
            this.movePoint(id, newX, newY);
        }
    }
};

// 선분 길이 변경 — 시작점 고정, 끝점 방향 유지
AlgeoEngine.prototype.setSegmentLength = function (segmentId, newLength) {
    const seg = this.objectMap[segmentId];
    if (!seg || seg.type !== 'SEGMENT' || newLength <= 0) {
        return false;
    }
    const p1 = this.objectMap[seg.p1Id];
    const p2 = this.objectMap[seg.p2Id];
    if (!p1 || !p2) {
        return false;
    }
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) {
        return false;
    }
    this.movePoint(seg.p2Id, p1.x + (dx / len) * newLength, p1.y + (dy / len) * newLength);
    return true;
};

// 원 반지름 변경 — 중심·방향 유지, 둘레 점 이동
AlgeoEngine.prototype.setCircleRadius = function (circleId, newRadius) {
    const circle = this.objectMap[circleId];
    if (!circle || circle.type !== 'CIRCLE' || newRadius <= 0) {
        return false;
    }
    const center = this.objectMap[circle.centerId];
    const point = this.objectMap[circle.pointId];
    if (!center || !point) {
        return false;
    }
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) {
        return false;
    }
    this.movePoint(circle.pointId, center.x + (dx / len) * newRadius, center.y + (dy / len) * newRadius);
    return true;
};

// 종속된 자식 객체들 순차 업데이트
AlgeoEngine.prototype.updateDependents = function (parentId) {
    const parent = this.objectMap[parentId];
    if (!parent) { return; }

    const children = parent.children;
    for (let i = 0; i < children.length; i++) {
        const childId = children[i];
        const child = this.objectMap[childId];
        if (child) {
            this.recalculateObject(child);
            this.updateDependents(childId);
        }
    }
};

// 객체 삭제 및 종속 객체 연쇄 삭제
AlgeoEngine.prototype.deleteObject = function (id) {
    const obj = this.objectMap[id];
    if (!obj) { return; }

    // 자식 객체가 있다면 연쇄 삭제
    // slice()를 떠서 루프 중 배열 원소 누락 방지
    const childrenCopy = obj.children.slice();
    for (let i = 0; i < childrenCopy.length; i++) {
        this.deleteObject(childrenCopy[i]);
    }

    // 부모 객체로부터의 종속성 해제
    for (let i = 0; i < obj.parents.length; i++) {
        const parentId = obj.parents[i];
        const parent = this.objectMap[parentId];
        if (parent) {
            const index = parent.children.indexOf(id);
            if (index > -1) {
                parent.children.splice(index, 1);
            }
        }
    }

    // 리스트 및 맵에서 완전 제거
    const idx = this.objects.indexOf(obj);
    if (idx > -1) {
        this.objects.splice(idx, 1);
    }
    delete this.objectMap[id];
};

// 엔진 상태 직렬화 (Undo/Redo용)
AlgeoEngine.prototype.exportState = function () {
    return {
        objects: JSON.parse(JSON.stringify(this.objects)),
        nextId: this.nextId
    };
};

// 엔진 상태 복원
AlgeoEngine.prototype.importState = function (state) {
    let i;
    let obj;

    this.objects = JSON.parse(JSON.stringify(state.objects));
    this.nextId = state.nextId;
    this.objectMap = {};

    for (i = 0; i < this.objects.length; i++) {
        obj = this.objects[i];
        this.objectMap[obj.id] = obj;
    }
};


/**
 * ----------------------------------------------------
 * 그리드 렌더러 (AlgeoRenderer)
 * ----------------------------------------------------
 */
function AlgeoRenderer(engine, canvas) {
    this.engine = engine;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    // 뷰포트 상태 변수 (원점 X, Y 및 줌 스케일)
    this.scale = 40;            // 1 수학적 단위가 몇 픽셀인지 (기본: 40px)
    this.offsetX = 0;           // 캔버스 중심에서 원점까지의 픽셀 X 오프셋
    this.offsetY = 0;           // 캔버스 중심에서 원점까지의 픽셀 Y 오프셋
    this.highlightIds = [];     // 작도 중 강조 표시할 점 ID 목록
    this.selectedObjectId = null; // 대수창에서 선택된 객체 ID
    this.toolPreview = null;    // 호·원 작도 중 실시간 미리보기
    this.showGrid = true;       // 격자·눈금 표시
    this.snapEnabled = false;   // 격자 스냅(자석)

    this.initViewport();
}

// 초기 원점 좌표 설정 (캔버스 정중앙을 수학적 원점으로 지정)
AlgeoRenderer.prototype.initViewport = function () {
    this.offsetX = this.canvas.width / 2;
    this.offsetY = this.canvas.height / 2;
};

// 수학적 좌표 -> 화면 픽셀 좌표 변환
AlgeoRenderer.prototype.toScreenX = function (mathX) {
    return this.offsetX + mathX * this.scale;
};

AlgeoRenderer.prototype.toScreenY = function (mathY) {
    // 수학적 2D 공간의 Y축은 위가 +이므로 화면(아래가 +)과 반대
    return this.offsetY - mathY * this.scale;
};

// 화면 픽셀 좌표 -> 수학적 좌표 변환
AlgeoRenderer.prototype.toMathX = function (screenX) {
    return (screenX - this.offsetX) / this.scale;
};

AlgeoRenderer.prototype.toMathY = function (screenY) {
    return (this.offsetY - screenY) / this.scale;
};

// 현재 줌에 맞는 격자 간격(수학 단위)
AlgeoRenderer.prototype.getGridSpacing = function () {
    if (this.scale < 10) {
        return 10;
    }
    if (this.scale < 25) {
        return 5;
    }
    if (this.scale < 80) {
        return 1;
    }
    if (this.scale < 200) {
        return 0.5;
    }
    return 0.1;
};

// 격자 스냅 — 수학 좌표를 격자 교차점에 맞춤
AlgeoRenderer.prototype.snapMathCoord = function (value) {
    const spacing = this.getGridSpacing();
    const steps = Math.round(value / spacing);

    return Math.round(steps * spacing * 1e12) / 1e12;
};

AlgeoRenderer.prototype.snapMathPoint = function (mathX, mathY) {
    if (!this.snapEnabled) {
        return { x: mathX, y: mathY };
    }

    return {
        x: this.snapMathCoord(mathX),
        y: this.snapMathCoord(mathY)
    };
};

// 캔버스 크기 맞춤 조절 (1920×1080 설계 좌표 기준, popscale은 #wrap transform으로 처리)
AlgeoRenderer.prototype.resize = function () {
    const parent = this.canvas.parentElement;
    const prevW = this.canvas.width;
    const prevH = this.canvas.height;
    const w = parent.clientWidth;
    const h = parent.clientHeight;

    if (w <= 0 || h <= 0) {
        return;
    }

    this.canvas.width = w;
    this.canvas.height = h;

    if (prevW === 0 || prevH === 0) {
        this.initViewport();
    }
};

// 전체 다시 그리기
AlgeoRenderer.prototype.draw = function () {
    const ctx = this.ctx;
    ctx.fillStyle = ALGEO_VIS.canvasBg;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 배경 격자(Grid) 또는 축만
    if (this.showGrid) {
        this.drawGrid();
    } else {
        this.drawAxes(ctx, this.canvas.width, this.canvas.height);
    }

    // 2. 수학 객체들 그리기
    this.drawObjects();

    // 3. 호·원 작도 미리보기
    if (this.toolPreview) {
        this.drawToolPreview(this.toolPreview);
    }

    // 4. 선택된 객체 — 표시 중일 때만 강조
    if (this.selectedObjectId) {
        const selectedObj = this.engine.objectMap[this.selectedObjectId];
        if (selectedObj && this.engine.isObjectVisible(selectedObj)) {
            this.drawSelectedObjectHighlight(selectedObj);
        }
    }
};

AlgeoRenderer.prototype.drawGrid = function () {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    const gridSpacing = this.getGridSpacing();
    const pxSpacing = gridSpacing * this.scale;

    // 격자선 펜 설정
    ctx.strokeStyle = ALGEO_VIS.grid;
    ctx.lineWidth = 1;

    // 세로 격자선 그리기 (왼쪽에서 오른쪽으로)
    const startX = this.offsetX % pxSpacing;
    for (let x = startX; x < width; x += pxSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // 눈금 숫자 라벨 그리기 (수평축)
        const mathX = Number(this.toMathX(x).toFixed(2));
        if (mathX !== 0 && Math.abs(x - this.offsetX) > 5) {
            ctx.fillStyle = ALGEO_VIS.gridLabel;
            ctx.font = '600 11px Outfit, sans-serif';
            ctx.fillText(mathX, x - 5, this.offsetY + 16);
        }
    }

    // 가로 격자선 그리기 (위에서 아래로)
    const startY = this.offsetY % pxSpacing;
    for (let y = startY; y < height; y += pxSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // 눈금 숫자 라벨 (Y축 오른쪽)
        const mathY = Number(this.toMathY(y).toFixed(2));
        if (mathY !== 0 && Math.abs(y - this.offsetY) > 5) {
            ctx.fillStyle = ALGEO_VIS.gridLabel;
            ctx.font = '600 11px Outfit, sans-serif';
            ctx.fillText(String(mathY), this.offsetX + 10, y + 4);
        }
    }

    // X-Y 축 그리기
    this.drawAxes(ctx, width, height);
};

// X축·Y축 선, 원점, 축 이름(x·y) 및 양의 방향 화살표
AlgeoRenderer.prototype.drawAxes = function (ctx, width, height) {
    const ox = this.offsetX;
    const oy = this.offsetY;
    const axisColor = ALGEO_VIS.axis;
    const labelColor = ALGEO_VIS.axis;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 2.5;

    // X축 (y = 0 수평선)
    if (oy >= -2 && oy <= height + 2) {
        ctx.beginPath();
        ctx.moveTo(0, oy);
        ctx.lineTo(width, oy);
        ctx.stroke();
    }

    // Y축 (x = 0 수직선)
    if (ox >= -2 && ox <= width + 2) {
        ctx.beginPath();
        ctx.moveTo(ox, 0);
        ctx.lineTo(ox, height);
        ctx.stroke();
    }

    ctx.fillStyle = labelColor;
    ctx.font = 'bold 11px Outfit, sans-serif';

    // 원점 O (양축이 모두 보일 때)
    if (ox >= 12 && ox <= width - 4 && oy >= 12 && oy <= height - 4) {
        ctx.fillText('O', ox - 14, oy + 14);
    }

    // X축 라벨·화살표 (오른쪽 양의 방향)
    if (oy >= 14 && oy <= height - 14) {
        const tipX = width - 8;
        ctx.beginPath();
        ctx.moveTo(tipX - 10, oy - 4);
        ctx.lineTo(tipX, oy);
        ctx.lineTo(tipX - 10, oy + 4);
        ctx.closePath();
        ctx.fillStyle = axisColor;
        ctx.fill();
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.fillText('x', width - 26, oy - 8);
    }

    // Y축 라벨·화살표 (위쪽 양의 방향, 축 왼쪽에 y 표기)
    if (ox >= 28 && ox <= width - 14) {
        const tipY = 10;
        ctx.beginPath();
        ctx.moveTo(ox - 4, tipY + 10);
        ctx.lineTo(ox, tipY);
        ctx.lineTo(ox + 4, tipY + 10);
        ctx.closePath();
        ctx.fillStyle = axisColor;
        ctx.fill();
        ctx.fillStyle = labelColor;
        ctx.font = 'bold 13px Outfit, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('y', ox - 10, tipY + 4);
        ctx.textAlign = 'left';
    }
};

AlgeoRenderer.prototype.drawObjects = function () {
    const ctx = this.ctx;
    const list = this.engine.objects;
    const engine = this.engine;

    // 1단계: 함수 → 직선 → 선분 → 원 순으로 그리기 (점보다 뒤에 오도록)
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'FUNCTION' && engine.isObjectVisible(obj)) {
            this.drawFunction(obj);
        }
    }

    // 다각형 채움 — 선·원보다 아래 레이어
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'POLYGON' && engine.isObjectVisible(obj)) {
            this.drawPolygonShape(obj);
        }
    }

    for (let i = 0; i < list.length; i++) {
        const obj = list[i];

        if (!engine.isObjectVisible(obj)) {
            continue;
        }

        if (obj.type === 'LINE') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                this.drawLine(p1, p2, ALGEO_VIS.line, [12, 6], 3);
            }
        } else if (obj.type === 'RAY') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                this.drawRay(p1, p2, ALGEO_VIS.ray, [10, 5], 3);
            }
        } else if (obj.type === 'PERP_BISECTOR') {
            const linePts = this.engine.getPerpBisectorLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, ALGEO_VIS.perpBisector, [8, 5], 3);
            }
        } else if (obj.type === 'ANGLE_BISECTOR') {
            const linePts = this.engine.getAngleBisectorLinePoints(obj);
            if (linePts) {
                this.drawRay(linePts.p1, linePts.p2, ALGEO_VIS.angleBisector, [7, 4], 3);
            }
        } else if (obj.type === 'PARALLEL_LINE') {
            const linePts = this.engine.getParallelLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, ALGEO_VIS.parallel, [10, 5], 3);
            }
        } else if (obj.type === 'PERP_LINE') {
            const linePts = this.engine.getPerpLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, ALGEO_VIS.perpLine, [6, 4], 3);
            }
        } else if (obj.type === 'TANGENT') {
            const linePts = this.engine.getTangentLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, ALGEO_VIS.tangent, [8, 4], 3);
            }
        } else if (obj.type === 'SEGMENT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
                ctx.lineTo(this.toScreenX(p2.x), this.toScreenY(p2.y));
                ctx.strokeStyle = ALGEO_VIS.segment;
                ctx.lineWidth = 3.5;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        } else if (obj.type === 'VECTOR') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                this.drawVectorShape(p1, p2, ALGEO_VIS.vector, 3.5);
            }
        } else if (obj.type === 'CIRCLE' || obj.type === 'CIRCLE_3P') {
            const circ = this.engine.getCircleGeometry(obj);
            if (circ) {
                const cx = this.toScreenX(circ.center.x);
                const cy = this.toScreenY(circ.center.y);
                const screenRadius = circ.radius * this.scale;

                ctx.beginPath();
                ctx.arc(cx, cy, screenRadius, 0, 2 * Math.PI);
                ctx.strokeStyle = ALGEO_VIS.circle;
                ctx.lineWidth = 3;
                ctx.stroke();
            }
        } else if (obj.type === 'SECTOR') {
            const center = this.engine.objectMap[obj.centerId];
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (center && p1 && p2) {
                this.drawSectorShape(center, p1, p2, ALGEO_VIS.sector, ALGEO_VIS.sectorFill, 3);
            }
        } else if (obj.type === 'CIRCULAR_SEGMENT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            const guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                this.drawCircularSegmentShape(p1, p2, guide, ALGEO_VIS.circularSegment, ALGEO_VIS.circularSegmentFill, 3.5);
            }
        } else if (obj.type === 'ARC') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            const guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                this.drawArcThreePoints(p1, p2, guide, ALGEO_VIS.arc, 3.5);
            }
        } else if (obj.type === 'ANGLE') {
            const ray1 = this.engine.objectMap[obj.ray1Id];
            const vertex = this.engine.objectMap[obj.vertexId];
            const ray2 = this.engine.objectMap[obj.ray2Id];
            if (ray1 && vertex && ray2) {
                this.drawAngleShape(ray1, vertex, ray2);
            }
        }
    }

    // 2단계: 점(Point)·중점(Midpoint) 그리기 (모든 선/원 위에 보이도록)
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (isAlgeoPointType(obj.type) && engine.isObjectVisible(obj)) {
            this.drawPointShape(obj);
        }
    }

    // 슬라이더 — 점 위에 표시
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'SLIDER' && engine.isObjectVisible(obj)) {
            this.drawSlider(obj);
        }
    }
};

// 점·중점·교점·대상 위 점·정다각형·고정각 점 렌더
AlgeoRenderer.prototype.drawPointShape = function (obj) {
    const ctx = this.ctx;
    const isMid = obj.type === 'MIDPOINT';
    const isDep = obj.type === 'INTERSECTION' || obj.type === 'POINT_ON' || isMid ||
        obj.type === 'REGULAR_VERTEX' || obj.type === 'FIXED_ANGLE_POINT';
    const radius = isDep ? ALGEO_VIS.midpointRadius : ALGEO_VIS.pointRadius;
    const sx = this.toScreenX(obj.x);
    const sy = this.toScreenY(obj.y);
    const isHighlighted = this.highlightIds.indexOf(obj.id) >= 0;
    let fillColor;

    if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius + 9, 0, 2 * Math.PI);
        ctx.strokeStyle = ALGEO_VIS.highlightPoint;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
    if (isHighlighted) {
        fillColor = ALGEO_VIS.highlightPoint;
    } else if (isDep) {
        fillColor = ALGEO_VIS.midpoint;
    } else {
        fillColor = ALGEO_VIS.point;
    }
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = ALGEO_VIS.pointStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    this.drawCanvasLabel(obj.name, sx + 10, sy - 10, {
        font: 'bold 13px Outfit, sans-serif',
        color: ALGEO_VIS.axis
    });
};

// 캔버스 라벨 (흰색 외곽선으로 격자 위 가독성 확보)
AlgeoRenderer.prototype.drawCanvasLabel = function (text, x, y, options) {
    const ctx = this.ctx;
    const opts = options || {};
    const align = opts.align || 'left';
    const font = opts.font || 'bold 12px Outfit, sans-serif';
    const color = opts.color || ALGEO_VIS.axis;
    const useHalo = opts.halo !== false;

    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';

    if (useHalo) {
        ctx.strokeStyle = ALGEO_VIS.labelHalo;
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
};

// 다각형 렌더 (채움 + 테두리 + 이름 라벨)
AlgeoRenderer.prototype.drawPolygonShape = function (obj) {
    const ctx = this.ctx;
    const ids = obj.vertexIds;
    const screenPts = [];
    let i;
    let cx = 0;
    let cy = 0;

    if (!ids || ids.length < 3) {
        return;
    }

    for (i = 0; i < ids.length; i++) {
        const pt = this.engine.objectMap[ids[i]];
        if (!pt) {
            return;
        }
        const sx = this.toScreenX(pt.x);
        const sy = this.toScreenY(pt.y);
        screenPts.push({ x: sx, y: sy });
        cx += sx;
        cy += sy;
    }

    cx /= screenPts.length;
    cy /= screenPts.length;

    ctx.beginPath();
    ctx.moveTo(screenPts[0].x, screenPts[0].y);
    for (i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = ALGEO_VIS.polygonFill;
    ctx.fill();
    ctx.strokeStyle = ALGEO_VIS.polygon;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.stroke();

    this.drawCanvasLabel(obj.name, cx, cy - 8, {
        font: 'bold 12px Outfit, sans-serif',
        color: ALGEO_VIS.polygon,
        align: 'center'
    });
};

// 호·원·선 작도 도구 실시간 미리보기 (AlgeoMath 스타일)
AlgeoRenderer.prototype.drawToolPreview = function (preview) {
    const ctx = this.ctx;
    const engine = this.engine;

    if (preview.type === 'SEGMENT') {
        const p1 = engine.objectMap[preview.p1Id];
        if (!p1) { return; }
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
        ctx.lineTo(this.toScreenX(preview.mathX), this.toScreenY(preview.mathY));
        ctx.strokeStyle = ALGEO_VIS.previewSegment;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'SEGMENT_GIVEN_LENGTH') {
        const p1 = engine.objectMap[preview.p1Id];
        let dx;
        let dy;
        let dist;
        let endX;
        let endY;
        if (!p1 || !(preview.length > 0)) { return; }
        dx = preview.mathX - p1.x;
        dy = preview.mathY - p1.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1e-8) { return; }
        endX = p1.x + (dx / dist) * preview.length;
        endY = p1.y + (dy / dist) * preview.length;
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
        ctx.lineTo(this.toScreenX(endX), this.toScreenY(endY));
        ctx.strokeStyle = ALGEO_VIS.previewSegment;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'VECTOR') {
        const p1 = engine.objectMap[preview.p1Id];
        if (!p1) { return; }
        this.drawVectorShape(p1, { x: preview.mathX, y: preview.mathY }, ALGEO_VIS.previewVector, 3);
        return;
    }

    if (preview.type === 'LINE') {
        const p1 = engine.objectMap[preview.p1Id];
        if (!p1) { return; }
        const p2 = { x: preview.mathX, y: preview.mathY };
        const end = this.getLineScreenEndpoints(p1, p2);
        if (!end) { return; }
        ctx.save();
        ctx.setLineDash([8, 5]);
        this.drawLine({ x: p1.x, y: p1.y }, p2, ALGEO_VIS.previewLine, [8, 5], 2.5);
        ctx.restore();
        return;
    }

    if (preview.type === 'RAY') {
        const p1 = engine.objectMap[preview.p1Id];
        if (!p1) { return; }
        this.drawRay(p1, { x: preview.mathX, y: preview.mathY }, ALGEO_VIS.previewRay, [8, 5], 2.5);
        return;
    }

    if (preview.type === 'ANGLE_BISECTOR') {
        const ray1 = engine.objectMap[preview.ray1Id];
        const vertex = engine.objectMap[preview.vertexId];
        if (!ray1 || !vertex) { return; }
        // 미리보기: 마우스 위치를 임시 ray2로
        const tempRay2 = { x: preview.mathX, y: preview.mathY };
        const ux = ray1.x - vertex.x;
        const uy = ray1.y - vertex.y;
        let vx = tempRay2.x - vertex.x;
        let vy = tempRay2.y - vertex.y;
        let len1 = Math.sqrt(ux * ux + uy * uy);
        let len2 = Math.sqrt(vx * vx + vy * vy);
        let bx;
        let by;
        let blen;
        if (len1 < 1e-12 || len2 < 1e-12) { return; }
        bx = ux / len1 + vx / len2;
        by = uy / len1 + vy / len2;
        blen = Math.sqrt(bx * bx + by * by);
        if (blen < 1e-12) { return; }
        this.drawRay(
            vertex,
            { x: vertex.x + bx / blen, y: vertex.y + by / blen },
            ALGEO_VIS.angleBisector,
            [6, 4],
            2.5
        );
        return;
    }

    if (preview.type === 'TANGENT') {
        const circle = engine.objectMap[preview.circleId];
        if (!circle) { return; }
        const circ = engine.getCircleGeometry(circle);
        if (!circ) { return; }
        const tangents = engine.computeTangentsFromPoint(
            circ.center,
            circ.radius,
            { x: preview.mathX, y: preview.mathY }
        );
        let ti;
        for (ti = 0; ti < tangents.length; ti++) {
            this.drawLine(tangents[ti].p1, tangents[ti].p2, ALGEO_VIS.tangent, [6, 4], 2.5);
        }
        return;
    }

    if (preview.type === 'PARALLEL_LINE' || preview.type === 'PERP_LINE') {
        const ref1 = engine.objectMap[preview.refP1Id];
        const ref2 = engine.objectMap[preview.refP2Id];
        if (!ref1 || !ref2) { return; }
        let linePts = null;
        if (preview.type === 'PARALLEL_LINE') {
            linePts = engine.getParallelLinePointsAt(ref1, ref2, preview.mathX, preview.mathY);
        } else {
            linePts = engine.getPerpLinePointsAt(ref1, ref2, preview.mathX, preview.mathY);
        }
        if (!linePts) { return; }
        const color = preview.type === 'PARALLEL_LINE'
            ? ALGEO_VIS.previewParallel : ALGEO_VIS.previewPerp;
        const dash = preview.type === 'PARALLEL_LINE' ? [10, 5] : [6, 4];
        ctx.save();
        this.drawLine(linePts.p1, linePts.p2, color, dash, 2.5);
        ctx.restore();
        return;
    }

    if (preview.type === 'ANGLE') {
        const ray1 = engine.objectMap[preview.ray1Id];
        const vertex = engine.objectMap[preview.vertexId];
        if (!ray1 || !vertex) { return; }
        const ray2 = { x: preview.mathX, y: preview.mathY };
        ctx.save();
        ctx.globalAlpha = 0.75;
        this.drawAngleShape(ray1, vertex, ray2, false);
        ctx.restore();
        return;
    }

    if (preview.type === 'CIRCLE') {
        const center = engine.objectMap[preview.centerId];
        if (!center) { return; }

        const cx = this.toScreenX(center.x);
        const cy = this.toScreenY(center.y);
        const dx = preview.mathX - center.x;
        const dy = preview.mathY - center.y;
        const r = Math.sqrt(dx * dx + dy * dy) * this.scale;
        if (r < 2) { return; }

        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, 2 * Math.PI);
        ctx.strokeStyle = ALGEO_VIS.previewCircle;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(this.toScreenX(preview.mathX), this.toScreenY(preview.mathY));
        ctx.strokeStyle = ALGEO_VIS.previewCircleGuide;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'COMPASS') {
        const p1 = engine.objectMap[preview.p1Id];
        if (!p1) { return; }
        if (!preview.p2Id) {
            ctx.save();
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
            ctx.lineTo(this.toScreenX(preview.mathX), this.toScreenY(preview.mathY));
            ctx.strokeStyle = ALGEO_VIS.previewCircleGuide;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
            return;
        }
        const p2 = engine.objectMap[preview.p2Id];
        if (!p2) { return; }
        const rdx = p2.x - p1.x;
        const rdy = p2.y - p1.y;
        const mathR = Math.sqrt(rdx * rdx + rdy * rdy);
        if (mathR < 1e-8) { return; }
        const cx = this.toScreenX(preview.mathX);
        const cy = this.toScreenY(preview.mathY);
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, mathR * this.scale, 0, 2 * Math.PI);
        ctx.strokeStyle = ALGEO_VIS.previewCircle;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'CIRCLE_3P') {
        const p1 = engine.objectMap[preview.p1Id];
        if (!p1) { return; }
        if (!preview.p2Id) {
            ctx.save();
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
            ctx.lineTo(this.toScreenX(preview.mathX), this.toScreenY(preview.mathY));
            ctx.strokeStyle = ALGEO_VIS.previewCircleGuide;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
            return;
        }
        const p2 = engine.objectMap[preview.p2Id];
        if (!p2) { return; }
        const center = engine.computeCircumcenter(
            p1.x, p1.y, p2.x, p2.y, preview.mathX, preview.mathY
        );
        if (!center) { return; }
        const mathR = Math.sqrt(
            (p1.x - center.x) * (p1.x - center.x) +
            (p1.y - center.y) * (p1.y - center.y)
        );
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(
            this.toScreenX(center.x),
            this.toScreenY(center.y),
            mathR * this.scale,
            0, 2 * Math.PI
        );
        ctx.strokeStyle = ALGEO_VIS.previewCircle;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'SECTOR') {
        const center = engine.objectMap[preview.centerId];
        if (!center) { return; }
        if (!preview.p1Id) {
            ctx.save();
            ctx.setLineDash([6, 4]);
            ctx.beginPath();
            ctx.moveTo(this.toScreenX(center.x), this.toScreenY(center.y));
            ctx.lineTo(this.toScreenX(preview.mathX), this.toScreenY(preview.mathY));
            ctx.strokeStyle = ALGEO_VIS.previewCircleGuide;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';
            ctx.stroke();
            ctx.restore();
            return;
        }
        const p1 = engine.objectMap[preview.p1Id];
        if (!p1) { return; }
        ctx.save();
        ctx.globalAlpha = 0.75;
        this.drawSectorShape(
            center, p1,
            { x: preview.mathX, y: preview.mathY },
            ALGEO_VIS.sector, ALGEO_VIS.sectorFill, 2.5
        );
        ctx.restore();
        return;
    }

    if (preview.type === 'CIRCULAR_SEGMENT') {
        const p1 = engine.objectMap[preview.p1Id];
        const p2 = engine.objectMap[preview.p2Id];
        if (!p1 || !p2) { return; }
        const guidePt = this.getGuidePointOnCircumcircle(p1, p2, preview.mathX, preview.mathY);
        ctx.save();
        ctx.globalAlpha = 0.8;
        this.drawCircularSegmentShape(
            p1, p2, guidePt,
            ALGEO_VIS.circularSegment, ALGEO_VIS.circularSegmentFill, 2.5
        );
        ctx.restore();
        return;
    }

    if (preview.type === 'ARC') {
        const p1 = engine.objectMap[preview.p1Id];
        const p2 = engine.objectMap[preview.p2Id];
        if (!p1 || !p2) { return; }

        const guidePt = this.getGuidePointOnCircumcircle(p1, p2, preview.mathX, preview.mathY);
        const sweep = this.getArcSweepThroughGuide(p1, p2, guidePt);
        if (!sweep) { return; }

        ctx.save();
        ctx.beginPath();
        ctx.arc(sweep.cx, sweep.cy, sweep.r, 0, 2 * Math.PI);
        ctx.strokeStyle = ALGEO_VIS.previewCircleRay;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sweep.cx, sweep.cy, sweep.r, sweep.startA, sweep.endA, sweep.ccw);
        ctx.strokeStyle = ALGEO_VIS.arc;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'POLYGON') {
        const ids = preview.vertexIds;
        if (!ids || ids.length < 1) {
            return;
        }

        const screenPts = [];
        let i;
        for (i = 0; i < ids.length; i++) {
            const pt = engine.objectMap[ids[i]];
            if (!pt) {
                return;
            }
            screenPts.push({
                x: this.toScreenX(pt.x),
                y: this.toScreenY(pt.y)
            });
        }

        const cursorX = this.toScreenX(preview.mathX);
        const cursorY = this.toScreenY(preview.mathY);

        ctx.save();
        ctx.setLineDash([]);
        ctx.strokeStyle = ALGEO_VIS.previewPolygon;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (screenPts.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(screenPts[0].x, screenPts[0].y);
            for (i = 1; i < screenPts.length; i++) {
                ctx.lineTo(screenPts[i].x, screenPts[i].y);
            }
            ctx.stroke();
        }

        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = ALGEO_VIS.previewPolygonEdge;
        ctx.beginPath();
        ctx.moveTo(screenPts[screenPts.length - 1].x, screenPts[screenPts.length - 1].y);
        ctx.lineTo(cursorX, cursorY);
        ctx.stroke();

        if (screenPts.length >= 2) {
            ctx.beginPath();
            ctx.moveTo(cursorX, cursorY);
            ctx.lineTo(screenPts[0].x, screenPts[0].y);
            ctx.stroke();
        }

        if (screenPts.length >= 3) {
            ctx.setLineDash([]);
            ctx.fillStyle = ALGEO_VIS.previewPolygonFill;
            ctx.beginPath();
            ctx.moveTo(screenPts[0].x, screenPts[0].y);
            for (i = 1; i < screenPts.length; i++) {
                ctx.lineTo(screenPts[i].x, screenPts[i].y);
            }
            ctx.lineTo(cursorX, cursorY);
            ctx.closePath();
            ctx.fill();
        }

        ctx.restore();
        return;
    }

    if (preview.type === 'REGULAR_POLYGON_SIDE') {
        const p0 = engine.objectMap[preview.sideP1Id];
        const p1 = engine.objectMap[preview.sideP2Id];
        let orient;
        let verts;
        let i;
        if (!p0 || !p1 || !(preview.sides >= 3)) {
            return;
        }
        orient = this.getPreviewOrientFromMouse(p0, p1, preview.mathX, preview.mathY);
        verts = engine.computeRegularPolygonFromSide(p0, p1, preview.sides, orient);
        if (!verts) {
            return;
        }
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = ALGEO_VIS.previewPolygon;
        ctx.fillStyle = ALGEO_VIS.previewPolygonFill;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.toScreenX(verts[0].x), this.toScreenY(verts[0].y));
        for (i = 1; i < verts.length; i++) {
            ctx.lineTo(this.toScreenX(verts[i].x), this.toScreenY(verts[i].y));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'REGULAR_POLYGON_CENTER') {
        const center = engine.objectMap[preview.centerId];
        const first = engine.objectMap[preview.firstId];
        let verts;
        let i;
        if (!center || !first || !(preview.sides >= 3)) {
            return;
        }
        verts = engine.computeRegularPolygonFromCenter(center, first, preview.sides);
        if (!verts) {
            return;
        }
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = ALGEO_VIS.previewPolygon;
        ctx.fillStyle = ALGEO_VIS.previewPolygonFill;
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.toScreenX(verts[0].x), this.toScreenY(verts[0].y));
        for (i = 1; i < verts.length; i++) {
            ctx.lineTo(this.toScreenX(verts[i].x), this.toScreenY(verts[i].y));
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'ANGLE_GIVEN') {
        const ray1 = engine.objectMap[preview.ray1Id];
        const vertex = engine.objectMap[preview.vertexId];
        let orient;
        let tip;
        let sx;
        let sy;
        let v1x;
        let v1y;
        let m1;
        let baseAng;
        let ang;
        let r;
        if (!ray1 || !vertex || !(preview.degrees > 0)) {
            return;
        }
        orient = this.getPreviewOrientFromMouse(vertex, ray1, preview.mathX, preview.mathY);
        v1x = ray1.x - vertex.x;
        v1y = ray1.y - vertex.y;
        m1 = Math.sqrt(v1x * v1x + v1y * v1y);
        if (m1 < 1e-10) {
            return;
        }
        baseAng = Math.atan2(v1y, v1x);
        ang = baseAng + (orient >= 0 ? 1 : -1) * (preview.degrees * Math.PI / 180);
        tip = {
            x: vertex.x + m1 * Math.cos(ang),
            y: vertex.y + m1 * Math.sin(ang)
        };
        sx = this.toScreenX(vertex.x);
        sy = this.toScreenY(vertex.y);
        r = Math.min(36, Math.sqrt(
            Math.pow(this.toScreenX(ray1.x) - sx, 2) + Math.pow(this.toScreenY(ray1.y) - sy, 2)
        ) * 0.45);
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = ALGEO_VIS.previewSegment;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(this.toScreenX(ray1.x), this.toScreenY(ray1.y));
        ctx.moveTo(sx, sy);
        ctx.lineTo(this.toScreenX(tip.x), this.toScreenY(tip.y));
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(12, r),
            this.mathAngleToCanvas(baseAng),
            this.mathAngleToCanvas(ang),
            orient < 0);
        ctx.strokeStyle = ALGEO_VIS.angle || ALGEO_VIS.previewSegment;
        ctx.stroke();
        ctx.restore();
    }
};

// 마우스 위치가 기준 벡터(a→b)의 왼쪽(+1)인지 오른쪽(-1)인지
AlgeoRenderer.prototype.getPreviewOrientFromMouse = function (a, b, mathX, mathY) {
    const abx = b.x - a.x;
    const aby = b.y - a.y;
    const amx = mathX - a.x;
    const amy = mathY - a.y;
    const cross = abx * amy - aby * amx;
    return cross >= 0 ? 1 : -1;
};

// 수학 각도(atan2, y↑) → Canvas arc 각도(y↓)
AlgeoRenderer.prototype.mathAngleToCanvas = function (mathAng) {
    return -mathAng;
};

// 원 위의 점 — 중심·반지름·마우스 방향으로 투영
AlgeoRenderer.prototype.getMathPointOnCircle = function (center, radius, mathX, mathY) {
    const angle = Math.atan2(mathY - center.y, mathX - center.x);
    return {
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
    };
};

// 화면 좌표 기준 호(arc) 파라미터 — 작은 호(劣弧) 기준
AlgeoRenderer.prototype.getArcScreenSweep = function (cx, cy, fromX, fromY, toX, toY) {
    const a1 = Math.atan2(fromY - cy, fromX - cx);
    const a2 = Math.atan2(toY - cy, toX - cx);
    let diff = a2 - a1;

    while (diff > Math.PI) { diff -= 2 * Math.PI; }
    while (diff < -Math.PI) { diff += 2 * Math.PI; }

    return {
        startA: a1,
        endA: a1 + diff,
        ccw: diff < 0
    };
};

// 끝점 2개와 호 위의 점으로 외접원 호 스윕 계산
AlgeoRenderer.prototype.getArcSweepThroughGuide = function (p1, p2, guide) {
    const center = this.engine.computeCircumcenter(
        p1.x, p1.y, p2.x, p2.y, guide.x, guide.y
    );
    if (!center) { return null; }

    const mathR = Math.sqrt(
        (p1.x - center.x) * (p1.x - center.x) +
        (p1.y - center.y) * (p1.y - center.y)
    );
    const cx = this.toScreenX(center.x);
    const cy = this.toScreenY(center.y);
    const r = mathR * this.scale;

    const sx1 = this.toScreenX(p1.x);
    const sy1 = this.toScreenY(p1.y);
    const sx2 = this.toScreenX(p2.x);
    const sy2 = this.toScreenY(p2.y);
    const sgx = this.toScreenX(guide.x);
    const sgy = this.toScreenY(guide.y);

    const a1 = Math.atan2(sy1 - cy, sx1 - cx);
    const a2 = Math.atan2(sy2 - cy, sx2 - cx);
    const ag = Math.atan2(sgy - cy, sgx - cx);

    let diff1 = a2 - a1;
    while (diff1 > Math.PI) { diff1 -= 2 * Math.PI; }
    while (diff1 < -Math.PI) { diff1 += 2 * Math.PI; }

    let diff2 = diff1 > 0 ? diff1 - 2 * Math.PI : diff1 + 2 * Math.PI;
    let t = ag - a1;
    while (t > Math.PI) { t -= 2 * Math.PI; }
    while (t < -Math.PI) { t += 2 * Math.PI; }

    let useDiff = diff1;
    if (diff1 >= 0) {
        if (t < 0 || t > diff1) { useDiff = diff2; }
    } else if (t > 0 || t < diff1) {
        useDiff = diff2;
    }

    return {
        cx: cx,
        cy: cy,
        r: r,
        startA: a1,
        endA: a1 + useDiff,
        ccw: useDiff < 0
    };
};

// 호 미리보기용 — 마우스를 외접원 위로 투영
AlgeoRenderer.prototype.getGuidePointOnCircumcircle = function (p1, p2, mathX, mathY) {
    const center = this.engine.computeCircumcenter(
        p1.x, p1.y, p2.x, p2.y, mathX, mathY
    );
    if (!center) {
        return { x: mathX, y: mathY };
    }
    const radius = Math.sqrt(
        (p1.x - center.x) * (p1.x - center.x) +
        (p1.y - center.y) * (p1.y - center.y)
    );
    return this.getMathPointOnCircle(center, radius, mathX, mathY);
};

// 원호 그리기 (끝점 2개 + 호 위의 점)
AlgeoRenderer.prototype.drawArcThreePoints = function (p1, p2, guide, color, baseWidth) {
    const sweep = this.getArcSweepThroughGuide(p1, p2, guide);
    if (!sweep || sweep.r < 1) { return; }

    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(sweep.cx, sweep.cy, sweep.r, sweep.startA, sweep.endA, sweep.ccw);
    ctx.strokeStyle = color;
    ctx.lineWidth = baseWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
};

// 부채꼴 그리기 (중심 + 두 끝점, 작은 호)
AlgeoRenderer.prototype.drawSectorShape = function (center, p1, p2, strokeColor, fillColor, lineWidth) {
    const ctx = this.ctx;
    const cx = this.toScreenX(center.x);
    const cy = this.toScreenY(center.y);
    const dx = p1.x - center.x;
    const dy = p1.y - center.y;
    const mathR = Math.sqrt(dx * dx + dy * dy);
    let endPt;
    let sweep;
    let r;

    if (mathR < 1e-10) {
        return;
    }
    endPt = this.getMathPointOnCircle(center, mathR, p2.x, p2.y);
    r = mathR * this.scale;
    sweep = this.getArcScreenSweep(
        cx, cy,
        this.toScreenX(p1.x), this.toScreenY(p1.y),
        this.toScreenX(endPt.x), this.toScreenY(endPt.y)
    );
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, sweep.startA, sweep.endA, sweep.ccw);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
    ctx.arc(cx, cy, r, sweep.startA, sweep.endA, sweep.ccw);
    ctx.lineTo(cx, cy);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
};

// 활꼴 그리기 (현 + 호)
AlgeoRenderer.prototype.drawCircularSegmentShape = function (p1, p2, guide, strokeColor, fillColor, lineWidth) {
    const sweep = this.getArcSweepThroughGuide(p1, p2, guide);
    const ctx = this.ctx;

    if (!sweep || sweep.r < 1) {
        return;
    }
    ctx.beginPath();
    ctx.arc(sweep.cx, sweep.cy, sweep.r, sweep.startA, sweep.endA, sweep.ccw);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(sweep.cx, sweep.cy, sweep.r, sweep.startA, sweep.endA, sweep.ccw);
    ctx.closePath();
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.stroke();
};

// 각도 표시 (꼭짓점 호 + 도 단위 라벨)
AlgeoRenderer.prototype.drawAngleShape = function (ray1, vertex, ray2) {
    const bx = this.toScreenX(vertex.x);
    const by = this.toScreenY(vertex.y);
    const sx1 = this.toScreenX(ray1.x);
    const sy1 = this.toScreenY(ray1.y);
    const sx2 = this.toScreenX(ray2.x);
    const sy2 = this.toScreenY(ray2.y);
    const arcR = 34;
    const sweep = this.getArcScreenSweep(bx, by, sx1, sy1, sx2, sy2);
    const ctx = this.ctx;
    const v1x = ray1.x - vertex.x;
    const v1y = ray1.y - vertex.y;
    const v2x = ray2.x - vertex.x;
    const v2y = ray2.y - vertex.y;
    const m1 = Math.sqrt(v1x * v1x + v1y * v1y);
    const m2 = Math.sqrt(v2x * v2x + v2y * v2y);
    let degrees = null;
    if (m1 > 1e-10 && m2 > 1e-10) {
        let cosVal = (v1x * v2x + v1y * v2y) / (m1 * m2);
        if (cosVal > 1) { cosVal = 1; }
        if (cosVal < -1) { cosVal = -1; }
        degrees = Math.acos(cosVal) * 180 / Math.PI;
    }

    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.arc(bx, by, arcR, sweep.startA, sweep.endA, sweep.ccw);
    ctx.closePath();
    ctx.fillStyle = ALGEO_VIS.angleFill;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bx, by, arcR, sweep.startA, sweep.endA, sweep.ccw);
    ctx.strokeStyle = ALGEO_VIS.angle;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (degrees !== null) {
        const midA = sweep.startA + (sweep.endA - sweep.startA) / 2;
        const labelR = arcR + 16;
        const lx = bx + Math.cos(midA) * labelR;
        const ly = by + Math.sin(midA) * labelR;
        this.drawCanvasLabel(degrees.toFixed(1) + '\u00B0', lx, ly + 4, {
            align: 'center',
            font: 'bold 12px Outfit, sans-serif',
            color: ALGEO_VIS.functionLabel
        });
    }
};

// 두 점을 지나는 직선을 뷰포트 끝까지 그리기
AlgeoRenderer.prototype.getLineScreenEndpoints = function (p1, p2) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;

    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
        return null;
    }

    const mathXMin = Math.min(this.toMathX(0), this.toMathX(width));
    const mathXMax = Math.max(this.toMathX(0), this.toMathX(width));
    const mathYMin = Math.min(this.toMathY(0), this.toMathY(height));
    const mathYMax = Math.max(this.toMathY(0), this.toMathY(height));
    const tList = [];
    let t;
    let i;

    if (Math.abs(dx) > 1e-10) {
        tList.push((mathXMin - p1.x) / dx);
        tList.push((mathXMax - p1.x) / dx);
    }
    if (Math.abs(dy) > 1e-10) {
        tList.push((mathYMin - p1.y) / dy);
        tList.push((mathYMax - p1.y) / dy);
    }

    if (tList.length === 0) {
        return null;
    }

    let tMin = tList[0];
    let tMax = tList[0];
    for (i = 1; i < tList.length; i++) {
        t = tList[i];
        if (t < tMin) { tMin = t; }
        if (t > tMax) { tMax = t; }
    }

    return {
        x1: this.toScreenX(p1.x + tMin * dx),
        y1: this.toScreenY(p1.y + tMin * dy),
        x2: this.toScreenX(p1.x + tMax * dx),
        y2: this.toScreenY(p1.y + tMax * dy)
    };
};

AlgeoRenderer.prototype.drawLine = function (p1, p2, color, dashPattern, baseWidth) {
    const ctx = this.ctx;
    const end = this.getLineScreenEndpoints(p1, p2);
    const strokeColor = color || '#4f46e5';
    const dash = dashPattern || [10, 6];
    const width = baseWidth || 2.5;

    if (!end) {
        return;
    }

    ctx.save();
    ctx.setLineDash(dash);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(end.x1, end.y1);
    ctx.lineTo(end.x2, end.y2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.globalAlpha = 0.92;
    ctx.stroke();
    ctx.restore();
};

// 반직선 화면 끝점 — 시작점에서 방향 쪽으로만 (t >= 0)
AlgeoRenderer.prototype.getRayScreenEndpoints = function (origin, through) {
    const width = this.canvas.width;
    const height = this.canvas.height;
    const dx = through.x - origin.x;
    const dy = through.y - origin.y;
    let tList;
    let i;
    let t;
    let tMax;
    let mathXMin;
    let mathXMax;
    let mathYMin;
    let mathYMax;

    if (Math.abs(dx) < 1e-10 && Math.abs(dy) < 1e-10) {
        return null;
    }

    mathXMin = Math.min(this.toMathX(0), this.toMathX(width));
    mathXMax = Math.max(this.toMathX(0), this.toMathX(width));
    mathYMin = Math.min(this.toMathY(0), this.toMathY(height));
    mathYMax = Math.max(this.toMathY(0), this.toMathY(height));
    tList = [];

    if (Math.abs(dx) > 1e-10) {
        tList.push((mathXMin - origin.x) / dx);
        tList.push((mathXMax - origin.x) / dx);
    }
    if (Math.abs(dy) > 1e-10) {
        tList.push((mathYMin - origin.y) / dy);
        tList.push((mathYMax - origin.y) / dy);
    }

    tMax = 0;
    for (i = 0; i < tList.length; i++) {
        t = tList[i];
        if (t > tMax) {
            tMax = t;
        }
    }
    if (tMax < 1e-8) {
        tMax = 1;
    }

    return {
        x1: this.toScreenX(origin.x),
        y1: this.toScreenY(origin.y),
        x2: this.toScreenX(origin.x + tMax * dx),
        y2: this.toScreenY(origin.y + tMax * dy)
    };
};

// 반직선 그리기
AlgeoRenderer.prototype.drawRay = function (origin, through, color, dashPattern, baseWidth) {
    const ctx = this.ctx;
    const end = this.getRayScreenEndpoints(origin, through);
    const strokeColor = color || ALGEO_VIS.ray;
    const dash = dashPattern || [10, 5];
    const width = baseWidth || 3;

    if (!end) {
        return;
    }

    ctx.save();
    ctx.setLineDash(dash);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(end.x1, end.y1);
    ctx.lineTo(end.x2, end.y2);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.globalAlpha = 0.92;
    ctx.stroke();
    ctx.restore();
};

// 벡터(화살표 선분) 그리기
AlgeoRenderer.prototype.drawVectorShape = function (p1, p2, color, baseWidth) {
    const ctx = this.ctx;
    const sx1 = this.toScreenX(p1.x);
    const sy1 = this.toScreenY(p1.y);
    const sx2 = this.toScreenX(p2.x);
    const sy2 = this.toScreenY(p2.y);
    const dx = sx2 - sx1;
    const dy = sy2 - sy1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const strokeColor = color || ALGEO_VIS.vector;
    const width = baseWidth || 3.5;
    let ux;
    let uy;
    let ax;
    let ay;
    const head = 12;

    ctx.save();
    ctx.strokeStyle = strokeColor;
    ctx.fillStyle = strokeColor;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sx1, sy1);
    ctx.lineTo(sx2, sy2);
    ctx.stroke();

    if (len > 8) {
        ux = dx / len;
        uy = dy / len;
        ax = -uy;
        ay = ux;
        ctx.beginPath();
        ctx.moveTo(sx2, sy2);
        ctx.lineTo(sx2 - ux * head + ax * head * 0.4, sy2 - uy * head + ay * head * 0.4);
        ctx.lineTo(sx2 - ux * head - ax * head * 0.4, sy2 - uy * head - ay * head * 0.4);
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
};

// 일차함수 그래프를 현재 뷰포트 x범위에 맞춰 그리기
AlgeoRenderer.prototype.drawFunction = function (obj) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const mathXLeft = this.toMathX(0);
    const mathXRight = this.toMathX(width);
    const left = Math.min(mathXLeft, mathXRight);
    const right = Math.max(mathXLeft, mathXRight);
    const step = (right - left) / width;
    let started = false;
    let coeffs;
    let mathY;
    let sx;
    let sy;

    coeffs = this.engine.getFunctionCoeffs(obj);

    ctx.beginPath();
    for (let mathX = left; mathX <= right; mathX += step) {
        mathY = coeffs.slope * mathX + coeffs.intercept;
        sx = this.toScreenX(mathX);
        sy = this.toScreenY(mathY);

        if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
        } else {
            ctx.lineTo(sx, sy);
        }
    }

    ctx.strokeStyle = ALGEO_VIS.function;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
};

// 슬라이더 화면 영역 (트랙·손잡이 좌표)
AlgeoRenderer.prototype.getSliderScreenBounds = function (slider) {
    const left = this.toScreenX(slider.anchorX);
    const top = this.toScreenY(slider.anchorY);
    const right = left + ALGEO_SLIDER_TRACK_PX;
    const range = slider.max - slider.min;
    let t = 0;

    if (range > 1e-10) {
        t = (slider.value - slider.min) / range;
    }
    if (t < 0) {
        t = 0;
    }
    if (t > 1) {
        t = 1;
    }

    return {
        left: left,
        top: top,
        right: right,
        bottom: top + 20,
        thumbX: left + t * ALGEO_SLIDER_TRACK_PX,
        thumbY: top + 10
    };
};

// 슬라이더 UI 그리기
AlgeoRenderer.prototype.drawSlider = function (slider) {
    const ctx = this.ctx;
    const bounds = this.getSliderScreenBounds(slider);
    const label = slider.name + ' = ' + slider.value.toFixed(2);

    ctx.save();
    ctx.strokeStyle = ALGEO_VIS.sliderTrack;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(bounds.left, bounds.thumbY);
    ctx.lineTo(bounds.right, bounds.thumbY);
    ctx.stroke();

    ctx.fillStyle = ALGEO_VIS.sliderThumb;
    ctx.beginPath();
    ctx.arc(bounds.thumbX, bounds.thumbY, ALGEO_SLIDER_THUMB_R, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = ALGEO_VIS.slider;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = ALGEO_VIS.axis;
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(label, bounds.left, bounds.top - 2);
    ctx.restore();
};

// 선택 강조 — 흰 외곽 + 시안 점선 (현재 path에 적용)
AlgeoRenderer.prototype.strokeSelectionPath = function () {
    const ctx = this.ctx;

    ctx.save();
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = ALGEO_VIS.selectionHalo;
    ctx.lineWidth = ALGEO_VIS.selectionHaloWidth;
    ctx.stroke();
    ctx.setLineDash(ALGEO_VIS.selectionDash);
    ctx.strokeStyle = ALGEO_VIS.selectionStroke;
    ctx.lineWidth = ALGEO_VIS.selectionLineWidth;
    ctx.stroke();
    ctx.restore();
};

// 점·중점 선택 — 시안 채움 원 + 모서리 꺾쇠
AlgeoRenderer.prototype.drawSelectionCornerBrackets = function (cx, cy, halfSize) {
    const ctx = this.ctx;
    const len = 9;
    const hs = halfSize;

    ctx.save();
    ctx.setLineDash([]);
    ctx.strokeStyle = ALGEO_VIS.selectionStroke;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'square';

    ctx.beginPath();
    ctx.moveTo(cx - hs, cy - hs + len);
    ctx.lineTo(cx - hs, cy - hs);
    ctx.lineTo(cx - hs + len, cy - hs);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + hs - len, cy - hs);
    ctx.lineTo(cx + hs, cy - hs);
    ctx.lineTo(cx + hs, cy - hs + len);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + hs, cy + hs - len);
    ctx.lineTo(cx + hs, cy + hs);
    ctx.lineTo(cx + hs - len, cy + hs);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - hs + len, cy + hs);
    ctx.lineTo(cx - hs, cy + hs);
    ctx.lineTo(cx - hs, cy + hs - len);
    ctx.stroke();

    ctx.restore();
};

// 대수창에서 선택된 객체 — 최상단 레이어에 통일 강조 표시
AlgeoRenderer.prototype.drawSelectedObjectHighlight = function (obj) {
    const ctx = this.ctx;
    const engine = this.engine;
    let p1;
    let p2;
    let end;
    let linePts;
    let center;
    let point;
    let circ;
    let dx;
    let dy;
    let radius;
    let cx;
    let cy;
    let screenRadius;
    let sweep;
    let ray1;
    let vertex;
    let ray2;
    let bx;
    let by;
    let arcR;
    let screenPts;
    let i;
    let mathX;
    let mathY;
    let sx;
    let sy;
    let started;
    let left;
    let right;
    let step;
    let width;
    let coeffs;
    let bounds;

    if (obj.type === 'POINT' || obj.type === 'MIDPOINT' ||
        obj.type === 'INTERSECTION' || obj.type === 'POINT_ON' ||
        obj.type === 'REGULAR_VERTEX' || obj.type === 'FIXED_ANGLE_POINT') {
        sx = this.toScreenX(obj.x);
        sy = this.toScreenY(obj.y);
        arcR = ALGEO_VIS.selectionPointRing;

        ctx.beginPath();
        ctx.arc(sx, sy, arcR, 0, 2 * Math.PI);
        ctx.fillStyle = ALGEO_VIS.selectionFill;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sx, sy, arcR, 0, 2 * Math.PI);
        this.strokeSelectionPath();
        this.drawSelectionCornerBrackets(sx, sy, arcR - 2);
        return;
    }

    if (obj.type === 'SEGMENT' || obj.type === 'VECTOR') {
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        if (!p1 || !p2) { return; }
        ctx.beginPath();
        ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
        ctx.lineTo(this.toScreenX(p2.x), this.toScreenY(p2.y));
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'RAY') {
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        if (!p1 || !p2) { return; }
        end = this.getRayScreenEndpoints(p1, p2);
        if (!end) { return; }
        ctx.beginPath();
        ctx.moveTo(end.x1, end.y1);
        ctx.lineTo(end.x2, end.y2);
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'LINE' || obj.type === 'PERP_BISECTOR' ||
        obj.type === 'PARALLEL_LINE' || obj.type === 'PERP_LINE' ||
        obj.type === 'ANGLE_BISECTOR' || obj.type === 'TANGENT') {
        if (obj.type === 'LINE') {
            p1 = engine.objectMap[obj.p1Id];
            p2 = engine.objectMap[obj.p2Id];
        } else if (obj.type === 'PERP_BISECTOR') {
            linePts = engine.getPerpBisectorLinePoints(obj);
            if (!linePts) { return; }
            p1 = linePts.p1;
            p2 = linePts.p2;
        } else if (obj.type === 'ANGLE_BISECTOR') {
            linePts = engine.getAngleBisectorLinePoints(obj);
            if (!linePts) { return; }
            end = this.getRayScreenEndpoints(linePts.p1, linePts.p2);
            if (!end) { return; }
            ctx.beginPath();
            ctx.moveTo(end.x1, end.y1);
            ctx.lineTo(end.x2, end.y2);
            this.strokeSelectionPath();
            return;
        } else if (obj.type === 'TANGENT') {
            linePts = engine.getTangentLinePoints(obj);
            if (!linePts) { return; }
            p1 = linePts.p1;
            p2 = linePts.p2;
        } else if (obj.type === 'PARALLEL_LINE') {
            linePts = engine.getParallelLinePoints(obj);
            if (!linePts) { return; }
            p1 = linePts.p1;
            p2 = linePts.p2;
        } else {
            linePts = engine.getPerpLinePoints(obj);
            if (!linePts) { return; }
            p1 = linePts.p1;
            p2 = linePts.p2;
        }
        end = this.getLineScreenEndpoints(p1, p2);
        if (!end) { return; }
        ctx.beginPath();
        ctx.moveTo(end.x1, end.y1);
        ctx.lineTo(end.x2, end.y2);
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'CIRCLE' || obj.type === 'CIRCLE_3P') {
        circ = engine.getCircleGeometry(obj);
        if (!circ) { return; }
        cx = this.toScreenX(circ.center.x);
        cy = this.toScreenY(circ.center.y);
        screenRadius = circ.radius * this.scale + 5;
        ctx.beginPath();
        ctx.arc(cx, cy, screenRadius, 0, 2 * Math.PI);
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'SECTOR') {
        center = engine.objectMap[obj.centerId];
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        if (!center || !p1 || !p2) { return; }
        this.drawSectorShape(center, p1, p2, ALGEO_VIS.selectionStroke, ALGEO_VIS.selectionFill, 3.5);
        return;
    }

    if (obj.type === 'CIRCULAR_SEGMENT') {
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        sweep = this.getArcSweepThroughGuide(p1, p2, engine.objectMap[obj.guideId]);
        if (!sweep || sweep.r < 1) { return; }
        ctx.beginPath();
        ctx.arc(sweep.cx, sweep.cy, sweep.r, sweep.startA, sweep.endA, sweep.ccw);
        ctx.closePath();
        ctx.fillStyle = ALGEO_VIS.selectionFill;
        ctx.fill();
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'ARC') {
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        sweep = this.getArcSweepThroughGuide(p1, p2, engine.objectMap[obj.guideId]);
        if (!sweep || sweep.r < 1) { return; }
        ctx.beginPath();
        ctx.arc(sweep.cx, sweep.cy, sweep.r, sweep.startA, sweep.endA, sweep.ccw);
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'ANGLE') {
        ray1 = engine.objectMap[obj.ray1Id];
        vertex = engine.objectMap[obj.vertexId];
        ray2 = engine.objectMap[obj.ray2Id];
        if (!ray1 || !vertex || !ray2) { return; }
        bx = this.toScreenX(vertex.x);
        by = this.toScreenY(vertex.y);
        arcR = 42;
        sweep = this.getArcScreenSweep(
            bx, by,
            this.toScreenX(ray1.x), this.toScreenY(ray1.y),
            this.toScreenX(ray2.x), this.toScreenY(ray2.y)
        );
        ctx.beginPath();
        ctx.arc(bx, by, arcR, sweep.startA, sweep.endA, sweep.ccw);
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'POLYGON') {
        screenPts = [];
        for (i = 0; i < obj.vertexIds.length; i++) {
            p1 = engine.objectMap[obj.vertexIds[i]];
            if (!p1) { return; }
            screenPts.push({
                x: this.toScreenX(p1.x),
                y: this.toScreenY(p1.y)
            });
        }
        if (screenPts.length < 3) { return; }
        ctx.beginPath();
        ctx.moveTo(screenPts[0].x, screenPts[0].y);
        for (i = 1; i < screenPts.length; i++) {
            ctx.lineTo(screenPts[i].x, screenPts[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = ALGEO_VIS.selectionFill;
        ctx.fill();
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'FUNCTION') {
        width = this.canvas.width;
        left = Math.min(this.toMathX(0), this.toMathX(width));
        right = Math.max(this.toMathX(0), this.toMathX(width));
        step = (right - left) / width;
        started = false;
        coeffs = this.engine.getFunctionCoeffs(obj);
        ctx.beginPath();
        for (mathX = left; mathX <= right; mathX += step) {
            mathY = coeffs.slope * mathX + coeffs.intercept;
            sx = this.toScreenX(mathX);
            sy = this.toScreenY(mathY);
            if (!started) {
                ctx.moveTo(sx, sy);
                started = true;
            } else {
                ctx.lineTo(sx, sy);
            }
        }
        if (started) {
            this.strokeSelectionPath();
        }
        return;
    }

    if (obj.type === 'SLIDER') {
        bounds = this.getSliderScreenBounds(obj);
        ctx.beginPath();
        ctx.arc(bounds.thumbX, bounds.thumbY, ALGEO_SLIDER_THUMB_R + 4, 0, 2 * Math.PI);
        this.strokeSelectionPath();
        return;
    }
};


/**
 * ----------------------------------------------------
 * 이벤트 및 전체 도구 흐름 관리 (AlgeoApp)
 * ----------------------------------------------------
 */
function AlgeoApp(engine, renderer) {
    this.engine = engine;
    this.renderer = renderer;

    this.currentTool = 'MOVE';        // MOVE, POINT, SEGMENT, LINE, MIDPOINT, PERP_BISECTOR, PARALLEL_LINE, PERP_LINE, ANGLE, ARC, CIRCLE, DELETE
    this.isDraggingCanvas = false;    // 캔버스 드래그 여부
    this.dragStart = { x: 0, y: 0 };  // 캔버스 드래그 시작 픽셀 좌표
    this.origOffset = { x: 0, y: 0 }; // 드래그 시작 시점 뷰포트 오프셋

    this.activePoint = null;          // (레거시) 점 드래그 — dragTranslate 사용
    this.dragTranslate = null;        // 객체·점 평행 이동 { pointIds, sliderId, lastMathX, lastMathY }
    this.selectedPoints = [];         // 선분/원 작도를 위해 선택된 점 배열
    this.selectedObjects = [];        // 교점 등 도형 2선택용 ID 배열
    this.selectedObjectId = null;     // 대수창에서 선택된 객체 ID
    this.algebraCmdDictOpen = false;  // 명령어 사전 패널 표시 여부
    this.algebraPanelOpen = true;     // 대수창 표시 여부
    this.algebraSortMode = 'created'; // 대수창 정렬: created | type
    this.openToolCategoryId = null;   // 열린 도구 플라이아웃 카테고리 ID
    this.constructionDraft = null;    // 인터랙티브 작도: type별 임시 상태 + 마우스 미리보기
    this.guideCollapsed = false;      // 가이드 패널 내용 접힘
    this.guideHidden = false;         // 가이드 패널 전체 숨김
    this.guideDragging = false;       // 가이드 드래그 중
    this.undoStack = [];              // 실행 취소 스택
    this.redoStack = [];              // 다시 실행 스택
    this.formulaHistory = [];         // 대수창 수식 입력 기록
    this.isRestoringHistory = false;  // Undo/Redo 복원 중 (기록 중복 방지)
    this.dragSnapshot = null;         // 점 드래그 시작 시점 스냅샷
    this.dragMoved = false;           // 드래그 중 좌표 변경 여부
    this.activeSlider = null;         // 슬라이더 손잡이 드래그 중
    this.sliderDragSnapshot = null;
    this.sliderDragMoved = false;
    this.theme = 'light';             // UI·캔버스 테마: light | dark
    this.shortcutPanelOpen = false;   // 단축키 안내 패널 표시 여부
    this.guideOverride = null;        // 뷰 옵션 가이드 (grid | snap) — 도구 가이드 대신 표시
}

AlgeoApp.prototype.init = function () {
    const self = this;

    self.initTheme();
    self.initViewToggles();

    // 캔버스 사이즈 조절 및 최초 렌더링 (뷰포트 스케일은 popscale이 담당)
    self.renderer.resize();
    self.renderer.draw();

    // 1. 좌측 도구 레일·플라이아웃
    self.initToolRail();
    self.initAlgebraPanelToggle();
    self.initToolGuide();
    self.initShortcutHelp();

    // 2. 뷰포트 조작 버튼 이벤트 바인딩
    $('#btnZoomIn').on('click', function () {
        self.zoom(1.2);
    });

    $('#btnZoomOut').on('click', function () {
        self.zoom(0.8);
    });

    $('#btnResetView').on('click', function () {
        self.renderer.initViewport();
        self.renderer.draw();
    });

    // 3. 캔버스 마우스/터치 이벤트 처리
    const $canvas = $(self.renderer.canvas);

    $canvas.on('mousedown', function (e) {
        self.handleMouseDown(e);
    });

    $canvas.on('mousemove', function (e) {
        self.handleMouseMove(e);
    });

    $(window).on('mouseup', function (e) {
        self.handleMouseUp(e);
    });

    $canvas.on('wheel', function (e) {
        e.preventDefault();
        const origEvent = e.originalEvent;
        const delta = origEvent.deltaY;
        const pos = getCanvasMousePos(self.renderer.canvas, origEvent);

        // 마우스 휠 줌 처리 (마우스 위치 기준 줌 구현)
        const zoomFactor = delta < 0 ? 1.1 : 0.9;
        self.zoomAt(zoomFactor, pos.x, pos.y);
    });

    // 4. 대수창 수식 입력·자동완성·명령어 사전
    self.initAlgebraInputAssist();
    self.initAlgebraSidebar();
    self.initHistory();

    // 5. 대수창 항목 클릭 → 캔버스 객체 하이라이트
    $('#algebraList').on('click', '.algebra-item', function () {
        const objId = $(this).attr('data-id');
        self.selectAlgebraObject(objId);
    });

    self.selectTool('MOVE');
    self.updateCanvasCursor();

    // Esc — 작도 취소·이동 복귀 / Enter — 다각형 닫기·이동 복귀 / Ctrl+Z·Y — Undo·Redo
    // 문자 단축키 — ALGEO_TOOL_KEY_MAP (Shift+G = 그룹선택 stub)
    $(document).on('keydown', function (e) {
        if (e.ctrlKey && !e.altKey) {
            if (e.keyCode === 90 && !e.shiftKey) {
                if ($(e.target).closest('input, textarea').length) {
                    return;
                }
                self.undo();
                e.preventDefault();
                return;
            }
            if (e.keyCode === 89 || (e.keyCode === 90 && e.shiftKey)) {
                if ($(e.target).closest('input, textarea').length) {
                    return;
                }
                self.redo();
                e.preventDefault();
                return;
            }
        }
        if (e.keyCode === 13) {
            if ($(e.target).closest('#algebraInput').length) {
                return;
            }
            if (self.constructionDraft && self.constructionDraft.type === 'POLYGON' &&
                self.constructionDraft.vertexIds.length >= 3) {
                self.confirmPolygonDraft();
                self.selectTool('MOVE');
                e.preventDefault();
                return;
            }
            if (self.currentTool !== 'MOVE') {
                self.selectTool('MOVE');
                e.preventDefault();
            }
            return;
        }
        if (e.keyCode === 72 && !e.ctrlKey && !e.altKey) {
            if ($(e.target).closest('input, textarea').length) {
                return;
            }
            if (self.selectedObjectId) {
                self.toggleObjectVisibility(self.selectedObjectId);
            } else {
                self.selectTool('HIDE_OBJECT');
            }
            e.preventDefault();
            return;
        }
        if ((e.key === '?' || (e.keyCode === 191 && e.shiftKey)) && !e.ctrlKey && !e.altKey) {
            if ($(e.target).closest('input, textarea').length) {
                return;
            }
            self.toggleShortcutPanel();
            e.preventDefault();
            return;
        }
        // Shift+G — 그룹선택 (G 단독은 격자)
        if (e.keyCode === 71 && e.shiftKey && !e.ctrlKey && !e.altKey) {
            if ($(e.target).closest('input, textarea').length) {
                return;
            }
            self.selectTool('GROUP_SELECT');
            e.preventDefault();
            return;
        }
        if (e.keyCode === 71 && !e.ctrlKey && !e.altKey && !e.shiftKey) {
            if ($(e.target).closest('input, textarea').length) {
                return;
            }
            self.setGridVisible(!self.renderer.showGrid);
            self.showViewGuide('grid');
            e.preventDefault();
            return;
        }
        if (e.keyCode === 78 && !e.ctrlKey && !e.altKey) {
            if ($(e.target).closest('input, textarea').length) {
                return;
            }
            self.setSnapEnabled(!self.renderer.snapEnabled);
            self.showViewGuide('snap');
            e.preventDefault();
            return;
        }
        // 문자 단축키 → 도구 선택 (입력란·수정키 제외)
        if (!e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && ALGEO_TOOL_KEY_MAP[e.keyCode]) {
            if ($(e.target).closest('input, textarea').length) {
                return;
            }
            self.selectTool(ALGEO_TOOL_KEY_MAP[e.keyCode]);
            e.preventDefault();
            return;
        }
        if (e.keyCode !== 27) {
            return;
        }
        if ($(e.target).closest('#algebraInput').length) {
            return;
        }
        if (self.constructionDraft || self.selectedPoints.length > 0 ||
            self.selectedObjects.length > 0 || self.currentTool !== 'MOVE') {
            self.selectTool('MOVE');
            e.preventDefault();
        }
    });
};

// 대수창 표시/숨김 토글 초기화
AlgeoApp.prototype.initAlgebraPanelToggle = function () {
    const self = this;

    $('#btnToggleAlgebra').on('click', function (e) {
        e.stopPropagation();
        self.setAlgebraPanelOpen(false);
    });

    $('#btnOpenAlgebra').on('click', function (e) {
        e.stopPropagation();
        self.setAlgebraPanelOpen(true);
    });
};

// 대수창 열림 상태 설정 및 캔버스 크기 갱신
AlgeoApp.prototype.setAlgebraPanelOpen = function (isOpen) {
    this.algebraPanelOpen = isOpen;

    if (isOpen) {
        $('#algebraSidebar').removeClass('collapsed');
        $('#btnOpenAlgebra').removeClass('visible');
    } else {
        $('#algebraSidebar').addClass('collapsed');
        $('#btnOpenAlgebra').addClass('visible');
        this.closeCmdDict();
    }

    const self = this;
    window.setTimeout(function () {
        self.renderer.resize();
        self.renderer.draw();
    }, 260);
};

// 좌측 도구 레일·플라이아웃 이벤트 초기화
AlgeoApp.prototype.initToolRail = function () {
    const self = this;

    $('#toolRail').on('click', '.tool-rail-btn', function (e) {
        e.stopPropagation();
        const categoryId = $(this).attr('data-category');
        self.toggleToolCategory(categoryId);
    });

    $('#toolFlyout').on('click', '.flyout-tool-item', function (e) {
        e.stopPropagation();
        const toolId = $(this).attr('data-tool');
        self.selectTool(toolId);
        self.closeToolFlyout();
    });

    $('#toolFlyout').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $('.algeo-left-panel').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $(document).on('click', function () {
        self.closeToolFlyout();
    });
};

// 도구 카테고리 플라이아웃 토글 (railOnly는 안내만)
AlgeoApp.prototype.toggleToolCategory = function (categoryId) {
    const cat = findCategoryMeta(categoryId);

    if (cat && cat.railOnly) {
        this.closeToolFlyout();
        this.showRailOnlyNotice(cat);
        return;
    }

    if (this.openToolCategoryId === categoryId) {
        this.closeToolFlyout();
        return;
    }
    this.openToolCategoryId = categoryId;
    this.renderToolFlyout(categoryId);
    $('#toolFlyout').addClass('open');
    this.syncToolRailUI();
};

// 레일 전용(블록코딩·설정) 클릭 시 가이드로 안내
AlgeoApp.prototype.showRailOnlyNotice = function (cat) {
    this.guideOverride = null;
    this.guideCollapsed = false;
    $('#toolGuide').removeClass('collapsed');
    $('#btnCollapseGuide').text('\u2212').attr('title', '안내 접기');
    if (!this.guideHidden) {
        $('#toolGuide').removeClass('hidden');
        $('#btnOpenGuide').removeClass('visible');
    }
    $('#toolGuideIcon').html(renderAlgeoIcon(cat.iconId, 'guide-icon-tile'));
    $('#toolGuideTitle').text(cat.title);
    $('#toolGuideSummary').text(cat.railHint || '준비 중입니다.');
    $('#toolGuideSteps').html(
        '<li class="guide-step active">이 메뉴는 이후 단계에서 연결됩니다.</li>'
    );
    $('#toolGuideTips').html('');
};

// 플라이아웃 닫기
AlgeoApp.prototype.closeToolFlyout = function () {
    this.openToolCategoryId = null;
    $('#toolFlyout').removeClass('open');
    this.syncToolRailUI();
};

// 플라이아웃 본문 렌더링 (stub 배지 포함)
AlgeoApp.prototype.renderToolFlyout = function (categoryId) {
    let i;
    let j;
    let cat = null;

    for (i = 0; i < ALGEO_TOOL_CATEGORIES.length; i++) {
        if (ALGEO_TOOL_CATEGORIES[i].id === categoryId) {
            cat = ALGEO_TOOL_CATEGORIES[i];
            break;
        }
    }
    if (!cat || !cat.tools) {
        return;
    }

    $('#flyoutHeader').text(cat.title);

    let bodyHtml = '';
    for (j = 0; j < cat.tools.length; j++) {
        const item = cat.tools[j];
        const isActive = item.tool === this.currentTool;
        const isStub = item.status === 'stub';
        const activeClass = isActive ? ' active' : '';
        const stubClass = isStub ? ' is-stub' : '';
        const shortcutHtml = item.shortcut
            ? '<span class="flyout-shortcut">' + item.shortcut + '</span>'
            : '';
        const stubBadge = isStub
            ? '<span class="flyout-stub-badge" title="준비 중">준비</span>'
            : '';
        const hintHtml = item.hint
            ? '<span class="flyout-tool-hint">' + item.hint + '</span>'
            : '';

        bodyHtml += '<button type="button" class="flyout-tool-item' + activeClass + stubClass +
            '" data-tool="' + item.tool + '" data-status="' + (item.status || 'done') + '">';
        bodyHtml += renderAlgeoIcon(item.iconId || item.tool, 'flyout-icon-tile');
        bodyHtml += '<span class="flyout-tool-text">';
        bodyHtml += '<span class="flyout-tool-label">' + item.label + stubBadge + '</span>';
        bodyHtml += hintHtml;
        bodyHtml += '</span>';
        bodyHtml += shortcutHtml;
        bodyHtml += '</button>';
    }

    $('#flyoutBody').html(bodyHtml);
};

// 작도 도구 선택 및 UI 동기화 (stub도 선택 가능 — 가이드로 안내)
AlgeoApp.prototype.selectTool = function (toolId) {
    this.currentTool = toolId;
    this.guideOverride = null;
    this.guideCollapsed = false;
    $('#toolGuide').removeClass('collapsed');
    $('#btnCollapseGuide').text('\u2212').attr('title', '안내 접기');
    if (!this.guideHidden) {
        $('#toolGuide').removeClass('hidden');
        $('#btnOpenGuide').removeClass('visible');
    }
    this.clearToolDraft();
    this.syncToolRailUI();
    this.updateCanvasCursor();
    this.syncToolGuide();
    this.renderer.draw();
};

// 인터랙티브 작도 상태 초기화
AlgeoApp.prototype.clearToolDraft = function () {
    this.selectedPoints = [];
    this.selectedObjects = [];
    this.constructionDraft = null;
    this.renderer.toolPreview = null;
    this.syncHighlightToRenderer();
    this.syncToolGuide();
};

// 화면 좌표 → 수학 좌표 (스냅 옵션 반영)
AlgeoApp.prototype.screenToMath = function (screenX, screenY) {
    const r = this.renderer;

    return r.snapMathPoint(r.toMathX(screenX), r.toMathY(screenY));
};

// 클릭 위치의 점 ID 반환 — 없으면 새 점 생성
AlgeoApp.prototype.resolvePointAtClick = function (mouseX, mouseY, hitPoint) {
    if (hitPoint) {
        return hitPoint.id;
    }
    const math = this.screenToMath(mouseX, mouseY);
    const name = this.getNextPointName();
    const pt = this.engine.addPoint(name, math.x, math.y);
    this.updateAlgebraView();
    return pt.id;
};

// 마우스 위치로 작도 미리보기 갱신
AlgeoApp.prototype.updateToolPreviewFromMouse = function (mouseX, mouseY) {
    const r = this.renderer;
    const draft = this.constructionDraft;
    if (!draft) { return; }

    const math = this.screenToMath(mouseX, mouseY);
    const preview = { type: draft.type, mathX: math.x, mathY: math.y };

    if (draft.type === 'SEGMENT' || draft.type === 'LINE' ||
        draft.type === 'RAY' || draft.type === 'VECTOR') {
        preview.p1Id = draft.p1Id;
    } else if (draft.type === 'SEGMENT_GIVEN_LENGTH') {
        preview.p1Id = draft.p1Id;
        preview.length = draft.length;
    } else if (draft.type === 'ARC') {
        preview.p1Id = draft.p1Id;
        preview.p2Id = draft.p2Id;
    } else if (draft.type === 'CIRCLE') {
        preview.centerId = draft.centerId;
    } else if (draft.type === 'COMPASS') {
        preview.p1Id = draft.p1Id;
        preview.p2Id = draft.p2Id || null;
    } else if (draft.type === 'CIRCLE_3P') {
        preview.p1Id = draft.p1Id;
        preview.p2Id = draft.p2Id || null;
    } else if (draft.type === 'SECTOR') {
        preview.centerId = draft.centerId;
        preview.p1Id = draft.p1Id || null;
    } else if (draft.type === 'CIRCULAR_SEGMENT') {
        preview.p1Id = draft.p1Id;
        preview.p2Id = draft.p2Id;
    } else if (draft.type === 'ANGLE' || draft.type === 'ANGLE_BISECTOR') {
        preview.ray1Id = draft.ray1Id;
        preview.vertexId = draft.vertexId;
    } else if (draft.type === 'TANGENT') {
        preview.circleId = draft.circleId;
    } else if (draft.type === 'PARALLEL_LINE' || draft.type === 'PERP_LINE') {
        preview.refP1Id = draft.refP1Id;
        preview.refP2Id = draft.refP2Id;
    } else if (draft.type === 'POLYGON') {
        preview.vertexIds = draft.vertexIds.slice();
    } else if (draft.type === 'REGULAR_POLYGON_SIDE') {
        preview.sideP1Id = draft.sideP1Id;
        preview.sideP2Id = draft.sideP2Id;
        preview.sides = draft.sides;
    } else if (draft.type === 'REGULAR_POLYGON_CENTER') {
        preview.centerId = draft.centerId;
        preview.firstId = draft.firstId;
        preview.sides = draft.sides;
    } else if (draft.type === 'ANGLE_GIVEN') {
        preview.ray1Id = draft.ray1Id;
        preview.vertexId = draft.vertexId;
        preview.degrees = draft.degrees;
    }

    r.toolPreview = preview;
    r.draw();
};

// 레일·플라이아웃 활성 상태 갱신
AlgeoApp.prototype.syncToolRailUI = function () {
    const categoryId = findToolCategoryId(this.currentTool);

    $('.tool-rail-btn').removeClass('active open');
    $('.tool-rail-btn[data-category="' + categoryId + '"]').addClass('active');

    if (this.openToolCategoryId) {
        $('.tool-rail-btn[data-category="' + this.openToolCategoryId + '"]').addClass('open');
    }

    $('.flyout-tool-item').removeClass('active');
    $('.flyout-tool-item[data-tool="' + this.currentTool + '"]').addClass('active');
};

// 가이드 패널 표시/숨김
AlgeoApp.prototype.setGuideVisible = function (isVisible) {
    this.guideHidden = !isVisible;

    if (isVisible) {
        $('#toolGuide').removeClass('hidden');
        $('#btnOpenGuide').removeClass('visible');
    } else {
        $('#toolGuide').addClass('hidden');
        $('#btnOpenGuide').addClass('visible');
    }
};

// 캔버스 하단 도구 가이드 — 닫기·접기·드래그
AlgeoApp.prototype.initToolGuide = function () {
    const self = this;
    const $guide = $('#toolGuide');
    const $container = $('.algeo-canvas-container');
    let dragStartX = 0;
    let dragStartY = 0;
    let guideStartLeft = 0;
    let guideStartTop = 0;

    $('#btnCloseGuide').on('click', function (e) {
        e.stopPropagation();
        self.setGuideVisible(false);
    });

    $('#btnOpenGuide').on('click', function (e) {
        e.stopPropagation();
        self.setGuideVisible(true);
    });

    $('#btnCollapseGuide').on('click', function (e) {
        e.stopPropagation();
        self.guideCollapsed = !self.guideCollapsed;
        if (self.guideCollapsed) {
            $guide.addClass('collapsed');
            $('#btnCollapseGuide').text('+').attr('title', '안내 펼치기');
        } else {
            $guide.removeClass('collapsed');
            $('#btnCollapseGuide').text('\u2212').attr('title', '안내 접기');
        }
    });

    $guide.find('.tool-guide-head').on('mousedown', function (e) {
        if ($(e.target).closest('button').length) {
            return;
        }

        e.preventDefault();
        self.guideDragging = true;
        $guide.addClass('dragging');

        const containerEl = $container[0];
        const guideEl = $guide[0];
        const containerRect = containerEl.getBoundingClientRect();
        const guideRect = guideEl.getBoundingClientRect();
        const factor = getPopscaleFactor();

        if (!$guide.hasClass('is-positioned')) {
            guideStartLeft = (guideRect.left - containerRect.left) / factor;
            guideStartTop = (guideRect.top - containerRect.top) / factor;
            $guide.addClass('is-positioned');
            $guide.css({
                left: guideStartLeft + 'px',
                top: guideStartTop + 'px',
                bottom: 'auto'
            });
        } else {
            guideStartLeft = parseFloat($guide.css('left')) || 0;
            guideStartTop = parseFloat($guide.css('top')) || 0;
        }

        dragStartX = e.clientX;
        dragStartY = e.clientY;
    });

    $(window).on('mousemove.algeoGuideDrag', function (e) {
        if (!self.guideDragging) {
            return;
        }

        const factor = getPopscaleFactor();
        const dx = (e.clientX - dragStartX) / factor;
        const dy = (e.clientY - dragStartY) / factor;
        let newLeft = guideStartLeft + dx;
        let newTop = guideStartTop + dy;
        const containerW = $container.width();
        const containerH = $container.height();
        const guideW = $guide.outerWidth();
        const guideH = $guide.outerHeight();

        if (newLeft < 0) {
            newLeft = 0;
        }
        if (newTop < 0) {
            newTop = 0;
        }
        if (newLeft + guideW > containerW) {
            newLeft = containerW - guideW;
        }
        if (newTop + guideH > containerH) {
            newTop = containerH - guideH;
        }

        $guide.css({
            left: newLeft + 'px',
            top: newTop + 'px'
        });
    });

    $(window).on('mouseup.algeoGuideDrag', function () {
        if (self.guideDragging) {
            self.guideDragging = false;
            $guide.removeClass('dragging');
        }
    });
};

// 단축키 키 조합 문자열 → <kbd> HTML
// 예: 'Ctrl+Z' · 'Shift+?' · 'Ctrl+Y / Ctrl+Shift+Z' (대안은 ' / '로만 구분, 세로 스택)
function buildShortcutKeysHtml(keys) {
    const alternatives = keys.split(' / ');
    let html = '';
    let a;
    let i;
    let parts;
    let part;

    for (a = 0; a < alternatives.length; a++) {
        if (a > 0) {
            html += '<span class="shortcut-key-or">또는</span>';
        }
        html += '<span class="shortcut-key-combo">';
        parts = alternatives[a].split('+');
        for (i = 0; i < parts.length; i++) {
            part = $.trim(parts[i]);
            if (!part) {
                continue;
            }
            if (i > 0) {
                html += '<span class="shortcut-key-plus">+</span>';
            }
            html += '<kbd class="shortcut-kbd">' + part + '</kbd>';
        }
        html += '</span>';
    }

    return html;
}

// 단축키 안내 패널 초기화
AlgeoApp.prototype.initShortcutHelp = function () {
    const self = this;

    self.renderShortcutPanel();

    $('#btnShortcutHelp').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $('#btnShortcutHelp').on('click', function (e) {
        e.stopPropagation();
        self.toggleShortcutPanel();
    });

    $('#btnCloseShortcutPanel').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $('#btnCloseShortcutPanel').on('click', function (e) {
        e.stopPropagation();
        self.closeShortcutPanel();
    });

    $('#shortcutPanel').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $('#shortcutPanel').on('click', function (e) {
        e.stopPropagation();
    });

    $(document).on('click', function (e) {
        if (!self.shortcutPanelOpen) {
            return;
        }
        if ($(e.target).closest('#btnShortcutHelp, #shortcutPanel, .algeo-right-bar-wrap').length) {
            return;
        }
        self.closeShortcutPanel();
    });
};

// 단축키 안내 패널 HTML 생성 (ALGEO_SHORTCUTS 기준)
AlgeoApp.prototype.renderShortcutPanel = function () {
    const $body = $('#shortcutPanelBody');
    let html = '';
    let ci;
    let si;
    let cat;
    let sc;
    let items;
    let itemClass;
    let badgeHtml;

    for (ci = 0; ci < ALGEO_SHORTCUT_CATEGORIES.length; ci++) {
        cat = ALGEO_SHORTCUT_CATEGORIES[ci];
        items = [];

        for (si = 0; si < ALGEO_SHORTCUTS.length; si++) {
            sc = ALGEO_SHORTCUTS[si];
            if (sc.category === cat.id) {
                items.push(sc);
            }
        }

        if (items.length === 0) {
            continue;
        }

        html += '<section class="shortcut-section">';
        html += '<h4 class="shortcut-section-title">' + cat.label + '</h4>';
        html += '<ul class="shortcut-list">';

        for (si = 0; si < items.length; si++) {
            sc = items[si];
            itemClass = 'shortcut-item' + (sc.active ? '' : ' shortcut-item-planned');
            badgeHtml = sc.active ? '' : '<span class="shortcut-badge">예정</span>';

            // 키(좌) + 라벨·설명(우)
            html += '<li class="' + itemClass + '">';
            html += '<span class="shortcut-keys">' + buildShortcutKeysHtml(sc.keys) + '</span>';
            html += '<div class="shortcut-text">';
            html += '<span class="shortcut-label">' + sc.label + badgeHtml + '</span>';
            if (sc.desc) {
                html += '<span class="shortcut-desc">' + sc.desc + '</span>';
            }
            html += '</div>';
            html += '</li>';
        }

        html += '</ul></section>';
    }

    $body.html(html);
};

// 단축키 안내 패널 닫기
AlgeoApp.prototype.closeShortcutPanel = function () {
    this.shortcutPanelOpen = false;
    $('#shortcutPanel').removeClass('open').attr('aria-hidden', 'true');
    $('#btnShortcutHelp').removeClass('active');
};

// 단축키 안내 패널 열기
AlgeoApp.prototype.openShortcutPanel = function () {
    this.shortcutPanelOpen = true;
    $('#shortcutPanel').addClass('open').attr('aria-hidden', 'false');
    $('#btnShortcutHelp').addClass('active');
    this.closeCmdDict();
};

// 단축키 안내 패널 토글
AlgeoApp.prototype.toggleShortcutPanel = function () {
    if (this.shortcutPanelOpen) {
        this.closeShortcutPanel();
    } else {
        this.openShortcutPanel();
    }
};

// 작도 중 현재 활성화할 가이드 단계 인덱스 (0-based)
AlgeoApp.prototype.getGuideActiveStepIndex = function () {
    const tool = this.currentTool;
    const draft = this.constructionDraft;
    const n = this.selectedPoints.length;

    if (tool === 'MIDPOINT' || tool === 'PERP_BISECTOR') {
        return Math.min(n, 1);
    }
    if (tool === 'ANGLE_BISECTOR') {
        if (draft && draft.type === 'ANGLE_BISECTOR') {
            return 2;
        }
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'TANGENT') {
        if (draft && draft.type === 'TANGENT') {
            return 1;
        }
        return 0;
    }
    if (tool === 'SEGMENT' || tool === 'LINE' || tool === 'RAY' ||
        tool === 'VECTOR' || tool === 'SEGMENT_GIVEN_LENGTH') {
        if (draft && draft.type === tool) {
            return tool === 'SEGMENT_GIVEN_LENGTH' ? 2 : 1;
        }
        return 0;
    }
    if (tool === 'INTERSECTION') {
        return Math.min(this.selectedObjects.length, 1);
    }
    if (tool === 'POINT_ON_OBJECT') {
        if (draft && draft.type === 'POINT_ON_OBJECT') {
            return 1;
        }
        return 0;
    }
    if (tool === 'CIRCLE') {
        if (draft && draft.type === 'CIRCLE') {
            return 1;
        }
        return 0;
    }
    if (tool === 'CIRCLE_RADIUS') {
        return 0;
    }
    if (tool === 'COMPASS') {
        if (draft && draft.type === 'COMPASS') {
            if (draft.p2Id) {
                return 2;
            }
            return 1;
        }
        return 0;
    }
    if (tool === 'CIRCLE_3P') {
        if (draft && draft.type === 'CIRCLE_3P') {
            if (draft.p2Id) {
                return 2;
            }
            return 1;
        }
        return 0;
    }
    if (tool === 'SECTOR') {
        if (draft && draft.type === 'SECTOR') {
            if (draft.p1Id) {
                return 2;
            }
            return 1;
        }
        return 0;
    }
    if (tool === 'CIRCULAR_SEGMENT') {
        if (draft && draft.type === 'CIRCULAR_SEGMENT') {
            return 2;
        }
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'ARC') {
        if (draft && draft.type === 'ARC') {
            return 2;
        }
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'ANGLE') {
        if (draft && draft.type === 'ANGLE') {
            return 2;
        }
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'PARALLEL_LINE' || tool === 'PERP_LINE') {
        if (draft && draft.type === tool) {
            return 2;
        }
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'POLYGON') {
        if (draft && draft.type === 'POLYGON') {
            if (draft.vertexIds.length >= 2) {
                return 2;
            }
            return 1;
        }
        return 0;
    }
    if (tool === 'REGULAR_POLYGON_SIDE') {
        if (draft && draft.type === 'REGULAR_POLYGON_SIDE' && draft.sides) {
            return 3;
        }
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'REGULAR_POLYGON_CENTER') {
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'ANGLE_GIVEN') {
        if (draft && draft.type === 'ANGLE_GIVEN' && draft.degrees) {
            return 3;
        }
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    return 0;
};

// 캔버스 하단 도구 가이드 패널 갱신
AlgeoApp.prototype.syncToolGuide = function () {
    let meta;
    let guide;
    let activeIndex;
    let stepsHtml = '';
    let tipsHtml = '';
    let i;
    let stepClass;
    let tips;
    let summaryText;

    if (this.guideOverride && ALGEO_VIEW_GUIDES[this.guideOverride]) {
        const viewGuide = ALGEO_VIEW_GUIDES[this.guideOverride];
        meta = {
            label: viewGuide.label,
            iconId: viewGuide.iconId
        };
        guide = viewGuide;
        activeIndex = -1;
        summaryText = buildViewGuideSummary(this.guideOverride, this);
    } else {
        meta = findToolMeta(this.currentTool);
        guide = meta.guide;
        activeIndex = this.getGuideActiveStepIndex();
    }

    $('#toolGuideIcon').html(renderAlgeoIcon(meta.iconId, 'guide-icon-tile'));
    if (meta.status === 'stub') {
        $('#toolGuideTitle').html(meta.label + ' <span class="guide-stub-badge">준비 중</span>');
    } else {
        $('#toolGuideTitle').text(meta.label);
    }

    if (!guide) {
        $('#toolGuideSummary').text(meta.hint || '');
        $('#toolGuideSteps').html('');
        $('#toolGuideTips').text('');
        return;
    }

    if (summaryText) {
        $('#toolGuideSummary').text(summaryText);
    } else {
        $('#toolGuideSummary').text(guide.summary || '');
    }

    for (i = 0; i < guide.steps.length; i++) {
        stepClass = 'tool-guide-step';
        if (activeIndex >= 0) {
            if (i < activeIndex) {
                stepClass += ' done';
            } else if (i === activeIndex) {
                stepClass += ' active';
            }
        }
        stepsHtml += '<li class="' + stepClass + '">' +
            '<span class="step-num">' + (i + 1) + '</span>' +
            '<span class="step-text">' + guide.steps[i] + '</span>' +
            '</li>';
    }
    $('#toolGuideSteps').html(stepsHtml);

    tips = guide.tips || [];
    if (tips.length > 0) {
        for (i = 0; i < tips.length; i++) {
            if (i > 0) {
                tipsHtml += ' · ';
            }
            tipsHtml += tips[i];
        }
    }
    $('#toolGuideTips').text(tipsHtml);
};

// 뷰 옵션(격자·스냅) 가이드 표시
AlgeoApp.prototype.showViewGuide = function (viewId) {
    if (!ALGEO_VIEW_GUIDES[viewId]) {
        return;
    }
    this.guideOverride = viewId;
    this.guideCollapsed = false;
    $('#toolGuide').removeClass('collapsed');
    $('#btnCollapseGuide').text('\u2212').attr('title', '안내 접기');
    this.setGuideVisible(true);
    this.syncToolGuide();
};

// 대수창 항목 선택 및 캔버스 하이라이트 연동
AlgeoApp.prototype.selectAlgebraObject = function (objId) {
    if (this.selectedObjectId === objId) {
        this.selectedObjectId = null;
    } else {
        this.selectedObjectId = objId;
    }
    this.renderer.selectedObjectId = this.selectedObjectId;
    this.syncAlgebraItemActiveState();
    this.syncAlgebraPropsPanel();
    this.renderer.draw();
};

// 대수창 리스트의 선택(active) 스타일 갱신
AlgeoApp.prototype.syncAlgebraItemActiveState = function () {
    $('#algebraList .algebra-item').removeClass('active');
    if (this.selectedObjectId) {
        $('#algebraList .algebra-item[data-id="' + this.selectedObjectId + '"]').addClass('active');
    }
};

// 대수창 선택 해제 (삭제·캔버스 빈 곳 클릭 시)
AlgeoApp.prototype.clearAlgebraSelection = function () {
    if (!this.selectedObjectId) {
        return;
    }
    this.selectedObjectId = null;
    this.renderer.selectedObjectId = null;
    this.syncAlgebraItemActiveState();
    this.syncAlgebraPropsPanel();
    this.renderer.draw();
};

// 캔버스 커서 직접 설정
AlgeoApp.prototype.setCanvasCursor = function (cursor) {
    $(this.renderer.canvas).css('cursor', cursor);
};

// 마우스·휠 이벤트 → 캔버스 픽셀 좌표
AlgeoApp.prototype.getEventCanvasPos = function (e) {
    return getCanvasMousePos(this.renderer.canvas, e);
};

// 현재 도구에 맞는 캔버스 커서 설정
AlgeoApp.prototype.updateCanvasCursor = function () {
    let cursor = 'default';

    if (isToolStub(this.currentTool)) {
        cursor = 'not-allowed';
    } else if (this.currentTool === 'MOVE') {
        cursor = 'grab';
    } else if (this.currentTool === 'POINT') {
        cursor = 'crosshair';
    } else if (this.currentTool === 'SEGMENT' || this.currentTool === 'LINE' ||
        this.currentTool === 'RAY' || this.currentTool === 'VECTOR' ||
        this.currentTool === 'SEGMENT_GIVEN_LENGTH' ||
        this.currentTool === 'MIDPOINT' || this.currentTool === 'PERP_BISECTOR' ||
        this.currentTool === 'ANGLE_BISECTOR' || this.currentTool === 'TANGENT' ||
        this.currentTool === 'PARALLEL_LINE' || this.currentTool === 'PERP_LINE' ||
        this.currentTool === 'ANGLE' || this.currentTool === 'ARC' || this.currentTool === 'CIRCLE' ||
        this.currentTool === 'COMPASS' || this.currentTool === 'CIRCLE_3P' ||
        this.currentTool === 'CIRCLE_RADIUS' || this.currentTool === 'SECTOR' ||
        this.currentTool === 'CIRCULAR_SEGMENT' ||
        this.currentTool === 'POLYGON' || this.currentTool === 'REGULAR_POLYGON_SIDE' ||
        this.currentTool === 'REGULAR_POLYGON_CENTER' || this.currentTool === 'ANGLE_GIVEN' ||
        this.currentTool === 'INTERSECTION' ||
        this.currentTool === 'POINT_ON_OBJECT') {
        cursor = 'pointer';
    } else if (this.currentTool === 'SLIDER') {
        cursor = 'crosshair';
    } else if (this.currentTool === 'HIDE_OBJECT') {
        cursor = 'pointer';
    } else if (this.currentTool === 'DELETE') {
        cursor = 'not-allowed';
    }

    this.setCanvasCursor(cursor);
};

// 작도 중 선택된 점·도형을 렌더러에 전달
AlgeoApp.prototype.syncHighlightToRenderer = function () {
    this.renderer.highlightIds = this.selectedPoints.concat(this.selectedObjects);
};

// 단순 중심 줌
AlgeoApp.prototype.zoom = function (factor) {
    const centerW = this.renderer.canvas.width / 2;
    const centerH = this.renderer.canvas.height / 2;
    this.zoomAt(factor, centerW, centerH);
};

// 특정 화면 좌표 기준 줌
AlgeoApp.prototype.zoomAt = function (factor, screenX, screenY) {
    const r = this.renderer;

    // 줌 전 마우스 위치의 수학적 좌표 기록
    const mathX = r.toMathX(screenX);
    const mathY = r.toMathY(screenY);

    // 줌 배율 수정
    r.scale *= factor;
    if (r.scale < 3) { r.scale = 3; }
    if (r.scale > 1000) { r.scale = 1000; }

    // 줌 적용 후 원래 수학적 좌표가 화면 마우스 위치와 다시 겹치도록 오프셋 역계산
    r.offsetX = screenX - mathX * r.scale;
    r.offsetY = screenY + mathY * r.scale;

    r.draw();
};

// 선분·직선: 점1 → 드래그 미리보기 → 점2 확정
AlgeoApp.prototype.handleSegmentLineMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    const toolType = this.currentTool;

    if (this.constructionDraft && this.constructionDraft.type === toolType) {
        const draft = this.constructionDraft;
        this.recordHistory(toolType === 'SEGMENT' ? '선분 생성' : '직선 생성');
        const p2Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        if (p2Id === draft.p1Id) {
            r.draw();
            return;
        }
        const p1 = this.engine.objectMap[draft.p1Id];
        const p2 = this.engine.objectMap[p2Id];
        if (toolType === 'SEGMENT') {
            const name = p1.name + p2.name;
            if (!this.engine.findSegmentByPoints(draft.p1Id, p2Id)) {
                this.engine.addSegment(name, draft.p1Id, p2Id);
                this.updateAlgebraView();
            }
        } else if (!this.engine.findLineByPoints(draft.p1Id, p2Id)) {
            const name = 'd' + p1.name + p2.name;
            this.engine.addLine(name, draft.p1Id, p2Id);
            this.updateAlgebraView();
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    const p1Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    this.constructionDraft = { type: toolType, p1Id: p1Id };
    this.renderer.highlightIds = [p1Id];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 반직선·벡터: 점1 → 미리보기 → 점2
AlgeoApp.prototype.handleRayVectorMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    const toolType = this.currentTool;
    let p2Id;
    let p1;
    let p2;
    let name;

    if (this.constructionDraft && this.constructionDraft.type === toolType) {
        const draft = this.constructionDraft;
        p2Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        if (p2Id === draft.p1Id) {
            r.draw();
            return;
        }
        p1 = this.engine.objectMap[draft.p1Id];
        p2 = this.engine.objectMap[p2Id];
        if (toolType === 'RAY') {
            if (!this.engine.findOrientedByPoints('RAY', draft.p1Id, p2Id)) {
                name = 'ray' + p1.name + p2.name;
                this.recordHistory('반직선 생성');
                this.engine.addRay(name, draft.p1Id, p2Id);
                this.updateAlgebraView();
            }
        } else if (!this.engine.findOrientedByPoints('VECTOR', draft.p1Id, p2Id)) {
            name = 'vec' + p1.name + p2.name;
            this.recordHistory('벡터 생성');
            this.engine.addVector(name, draft.p1Id, p2Id);
            this.updateAlgebraView();
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    const p1Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    this.constructionDraft = { type: toolType, p1Id: p1Id };
    this.renderer.highlightIds = [p1Id];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 주어진 길이 선분: 시작점 → 길이 입력 → 방향 클릭
AlgeoApp.prototype.handleSegmentGivenLengthMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let draft;
    let p1;
    let math;
    let dx;
    let dy;
    let dist;
    let ux;
    let uy;
    let endX;
    let endY;
    let endName;
    let endPt;
    let segName;
    let lenStr;
    let length;
    let p1Id;

    if (this.constructionDraft && this.constructionDraft.type === 'SEGMENT_GIVEN_LENGTH') {
        draft = this.constructionDraft;
        p1 = this.engine.objectMap[draft.p1Id];
        if (!p1) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        math = this.screenToMath(mouseX, mouseY);
        dx = math.x - p1.x;
        dy = math.y - p1.y;
        dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1e-8) {
            r.draw();
            return;
        }
        ux = dx / dist;
        uy = dy / dist;
        endX = p1.x + ux * draft.length;
        endY = p1.y + uy * draft.length;
        this.recordHistory('주어진 길이 선분 생성');
        endName = this.getNextPointName();
        endPt = this.engine.addPoint(endName, endX, endY);
        segName = p1.name + endPt.name;
        if (!this.engine.findSegmentByPoints(draft.p1Id, endPt.id)) {
            this.engine.addSegment(segName, draft.p1Id, endPt.id);
        }
        this.clearToolDraft();
        this.updateAlgebraView();
        r.draw();
        return;
    }

    p1Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    lenStr = window.prompt('선분 길이를 입력하세요.', '3');
    if (lenStr === null) {
        return;
    }
    length = parseFloat(lenStr);
    if (!(length > 0) || isNaN(length)) {
        length = 3;
    }
    this.constructionDraft = {
        type: 'SEGMENT_GIVEN_LENGTH',
        p1Id: p1Id,
        length: length
    };
    this.renderer.highlightIds = [p1Id];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 각의 이등분선: A → 꼭짓점 B → C
AlgeoApp.prototype.handleAngleBisectorMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let ray1Id;
    let vertexId;
    let ray2Id;
    let ray1;
    let vertex;
    let ray2;
    let name;

    if (this.constructionDraft && this.constructionDraft.type === 'ANGLE_BISECTOR') {
        if (!hitPoint) {
            r.draw();
            return;
        }
        ray2Id = hitPoint.id;
        if (ray2Id === this.constructionDraft.ray1Id ||
            ray2Id === this.constructionDraft.vertexId) {
            r.draw();
            return;
        }
        if (!this.engine.findAngleBisectorByPoints(
            this.constructionDraft.ray1Id,
            this.constructionDraft.vertexId,
            ray2Id
        )) {
            ray1 = this.engine.objectMap[this.constructionDraft.ray1Id];
            vertex = this.engine.objectMap[this.constructionDraft.vertexId];
            ray2 = this.engine.objectMap[ray2Id];
            name = 'bis' + ray1.name + vertex.name + ray2.name;
            this.recordHistory('각의 이등분선 생성');
            this.engine.addAngleBisector(
                name,
                this.constructionDraft.ray1Id,
                this.constructionDraft.vertexId,
                ray2Id
            );
            this.updateAlgebraView();
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    if (!hitPoint) {
        r.draw();
        return;
    }

    if (this.selectedPoints.length === 0) {
        this.selectedPoints.push(hitPoint.id);
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    ray1Id = this.selectedPoints[0];
    vertexId = hitPoint.id;
    if (vertexId === ray1Id) {
        r.draw();
        return;
    }

    this.constructionDraft = {
        type: 'ANGLE_BISECTOR',
        ray1Id: ray1Id,
        vertexId: vertexId
    };
    this.selectedPoints = [];
    this.renderer.highlightIds = [ray1Id, vertexId];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 접선: 원 → 점 (원 위 1개 / 바깥 최대 2개)
AlgeoApp.prototype.handleTangentMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let hitObj;
    let draft;
    let circle;
    let pointId;
    let circ;
    let tangents;
    let i;
    let name;
    let created = 0;

    if (this.constructionDraft && this.constructionDraft.type === 'TANGENT') {
        draft = this.constructionDraft;
        circle = this.engine.objectMap[draft.circleId];
        if (!circle) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        pointId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        circ = this.engine.getCircleGeometry(circle);
        if (!circ) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        tangents = this.engine.computeTangentsFromPoint(
            circ.center,
            circ.radius,
            this.engine.objectMap[pointId]
        );
        if (!tangents || tangents.length === 0) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        this.recordHistory('접선 생성');
        for (i = 0; i < tangents.length; i++) {
            if (this.engine.findTangentByRefs(circle.id, pointId, i)) {
                continue;
            }
            name = 'tg' + circle.name + this.engine.objectMap[pointId].name +
                (tangents.length > 1 ? String(i + 1) : '');
            this.engine.addTangent(name, circle.id, pointId, i);
            created += 1;
        }
        if (created > 0) {
            this.updateAlgebraView();
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    hitObj = this.findObjectAt(mouseX, mouseY);
    if (!hitObj || (hitObj.type !== 'CIRCLE' && hitObj.type !== 'CIRCLE_3P')) {
        r.draw();
        return;
    }
    this.constructionDraft = { type: 'TANGENT', circleId: hitObj.id };
    this.selectedObjects = [hitObj.id];
    this.syncHighlightToRenderer();
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 각도: 변1 → 꼭짓점 → 마우스 조절 → 확정
AlgeoApp.prototype.handleAngleMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;

    if (this.constructionDraft && this.constructionDraft.type === 'ANGLE') {
        const draft = this.constructionDraft;
        this.recordHistory('각도 생성');
        let ray2Id = null;
        if (hitPoint && hitPoint.id !== draft.vertexId && hitPoint.id !== draft.ray1Id) {
            ray2Id = hitPoint.id;
        } else {
            const vertex = this.engine.objectMap[draft.vertexId];
            const math = this.screenToMath(mouseX, mouseY);
            const dx = math.x - vertex.x;
            const dy = math.y - vertex.y;
            if (Math.sqrt(dx * dx + dy * dy) < 0.05) {
                r.draw();
                return;
            }
            const ray2Name = this.getNextPointName();
            const ray2Pt = this.engine.addPoint(ray2Name, math.x, math.y);
            ray2Id = ray2Pt.id;
            this.updateAlgebraView();
        }
        if (ray2Id !== draft.ray1Id && ray2Id !== draft.vertexId) {
            if (!this.engine.findAngleByPoints(draft.ray1Id, draft.vertexId, ray2Id)) {
                const ray1 = this.engine.objectMap[draft.ray1Id];
                const vertex = this.engine.objectMap[draft.vertexId];
                const ray2 = this.engine.objectMap[ray2Id];
                const name = '\u2220' + ray1.name + vertex.name + ray2.name;
                this.engine.addAngle(name, draft.ray1Id, draft.vertexId, ray2Id);
                this.updateAlgebraView();
            }
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    if (!hitPoint) {
        r.draw();
        return;
    }

    if (this.selectedPoints.length === 0) {
        this.selectedPoints.push(hitPoint.id);
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    const ray1Id = this.selectedPoints[0];
    const vertexId = hitPoint.id;
    if (vertexId === ray1Id) {
        r.draw();
        return;
    }

    this.constructionDraft = { type: 'ANGLE', ray1Id: ray1Id, vertexId: vertexId };
    this.selectedPoints = [];
    this.renderer.highlightIds = [ray1Id, vertexId];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 평행선·수직선: 기준2점 → 마우스 미리보기 → 통과점 확정
AlgeoApp.prototype.handleParallelPerpMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    const toolType = this.currentTool;

    if (this.constructionDraft &&
        (this.constructionDraft.type === 'PARALLEL_LINE' || this.constructionDraft.type === 'PERP_LINE')) {
        const draft = this.constructionDraft;
        this.recordHistory(draft.type === 'PARALLEL_LINE' ? '평행선 생성' : '수직선 생성');
        const throughId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        const ref1 = this.engine.objectMap[draft.refP1Id];
        const ref2 = this.engine.objectMap[draft.refP2Id];
        const through = this.engine.objectMap[throughId];

        if (draft.type === 'PARALLEL_LINE') {
            if (!this.engine.findParallelLineByRefs(draft.refP1Id, draft.refP2Id, throughId)) {
                const name = 'pl' + through.name + ref1.name + ref2.name;
                this.engine.addParallelLine(name, draft.refP1Id, draft.refP2Id, throughId);
                this.updateAlgebraView();
            }
        } else if (!this.engine.findPerpLineByRefs(draft.refP1Id, draft.refP2Id, throughId)) {
            const name = 'pp' + through.name + ref1.name + ref2.name;
            this.engine.addPerpLine(name, draft.refP1Id, draft.refP2Id, throughId);
            this.updateAlgebraView();
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    if (!hitPoint) {
        r.draw();
        return;
    }

    this.selectedPoints.push(hitPoint.id);
    this.syncHighlightToRenderer();

    if (this.selectedPoints.length < 2) {
        r.draw();
        return;
    }

    const refP1Id = this.selectedPoints[0];
    const refP2Id = this.selectedPoints[1];
    if (refP1Id === refP2Id) {
        this.selectedPoints = [];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    this.constructionDraft = {
        type: toolType,
        refP1Id: refP1Id,
        refP2Id: refP2Id
    };
    this.selectedPoints = [];
    this.renderer.highlightIds = [refP1Id, refP2Id];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 호: 끝점2 → 호 위 점으로 모양 조절
AlgeoApp.prototype.handleArcMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;

    if (this.constructionDraft && this.constructionDraft.type === 'ARC') {
        this.confirmArcDraft(mouseX, mouseY, hitPoint);
        return;
    }

    const pointId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);

    if (this.selectedPoints.length === 0) {
        this.selectedPoints.push(pointId);
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    const p1Id = this.selectedPoints[0];
    if (pointId === p1Id) {
        r.draw();
        return;
    }

    this.constructionDraft = { type: 'ARC', p1Id: p1Id, p2Id: pointId };
    this.selectedPoints = [];
    this.renderer.highlightIds = [p1Id, pointId];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 호 작도 확정 — 호 위 조절점은 외접원에 투영
AlgeoApp.prototype.confirmArcDraft = function (mouseX, mouseY, hitPoint) {
    const r = this.renderer;
    const draft = this.constructionDraft;
    if (!draft || draft.type !== 'ARC') { return; }

    this.recordHistory('호 생성');
    const p1 = this.engine.objectMap[draft.p1Id];
    const p2 = this.engine.objectMap[draft.p2Id];
    if (!p1 || !p2) {
        this.clearToolDraft();
        r.draw();
        return;
    }

    let guideId = null;
    if (hitPoint && hitPoint.id !== draft.p1Id && hitPoint.id !== draft.p2Id) {
        guideId = hitPoint.id;
    } else {
        const math = this.screenToMath(mouseX, mouseY);
        const guidePt = r.getGuidePointOnCircumcircle(p1, p2, math.x, math.y);
        const center = this.engine.computeCircumcenter(
            p1.x, p1.y, p2.x, p2.y, guidePt.x, guidePt.y
        );
        if (!center) {
            r.draw();
            return;
        }
        const guideName = this.getNextPointName();
        const guide = this.engine.addPoint(guideName, guidePt.x, guidePt.y);
        guideId = guide.id;
        this.updateAlgebraView();
    }

    if (!this.engine.findArcByThreePoints(draft.p1Id, draft.p2Id, guideId)) {
        const guide = this.engine.objectMap[guideId];
        const arcName = 'arc' + p1.name + p2.name + guide.name;
        this.engine.addArc(arcName, draft.p1Id, draft.p2Id, guideId);
        this.updateAlgebraView();
    }

    this.clearToolDraft();
    r.draw();
};

// 원: 중심 → 드래그 미리보기 → 확정
AlgeoApp.prototype.handleCircleMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;

    if (this.constructionDraft && this.constructionDraft.type === 'CIRCLE') {
        this.confirmCircleDraft(mouseX, mouseY, hitPoint);
        return;
    }

    const centerId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    this.constructionDraft = { type: 'CIRCLE', centerId: centerId };
    this.renderer.highlightIds = [centerId];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 원 작도 확정
AlgeoApp.prototype.confirmCircleDraft = function (mouseX, mouseY, hitPoint) {
    const r = this.renderer;
    const draft = this.constructionDraft;
    if (!draft || draft.type !== 'CIRCLE') { return; }

    this.recordHistory('원 생성');
    const center = this.engine.objectMap[draft.centerId];
    if (!center) {
        this.clearToolDraft();
        r.draw();
        return;
    }

    let pointId = null;
    if (hitPoint && hitPoint.id !== draft.centerId) {
        pointId = hitPoint.id;
    } else {
        const math = this.screenToMath(mouseX, mouseY);
        const dx = math.x - center.x;
        const dy = math.y - center.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.05) {
            r.draw();
            return;
        }
        const ptName = this.getNextPointName();
        const pt = this.engine.addPoint(ptName, math.x, math.y);
        pointId = pt.id;
        this.updateAlgebraView();
    }

    const circleName = '⊙' + center.name;
    if (!this.engine.findCircleByCenterAndPoint(draft.centerId, pointId)) {
        this.engine.addCircle(circleName, draft.centerId, pointId);
        this.updateAlgebraView();
    }

    this.clearToolDraft();
    r.draw();
};

// 중심·반지름으로 원 생성 (둘레 점 자동 배치)
AlgeoApp.prototype.createCircleWithRadius = function (centerId, radius, dirX, dirY, radiusVar) {
    const center = this.engine.objectMap[centerId];
    let ux = 1;
    let uy = 0;
    let len;
    let ptName;
    let pt;
    let circleName;
    let circle;

    if (!center || !(radius > 0)) {
        return null;
    }
    if (typeof dirX === 'number' && typeof dirY === 'number') {
        len = Math.sqrt(dirX * dirX + dirY * dirY);
        if (len > 1e-10) {
            ux = dirX / len;
            uy = dirY / len;
        }
    }
    ptName = this.getNextPointName();
    pt = this.engine.addPoint(ptName, center.x + ux * radius, center.y + uy * radius);
    circleName = '⊙' + center.name;
    if (this.engine.findCircleByCenterAndPoint(centerId, pt.id)) {
        return null;
    }
    circle = this.engine.addCircle(circleName, centerId, pt.id);
    if (circle && radiusVar) {
        circle.radiusVar = radiusVar;
    }
    return circle;
};

// 원 : 중심과 반지름 — 중심 클릭 후 길이/변수 입력
AlgeoApp.prototype.handleCircleRadiusMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let centerId;
    let center;
    let lenStr;
    let radius;
    let radiusVar;
    let sliderVal;

    centerId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    center = this.engine.objectMap[centerId];
    if (!center) {
        return;
    }
    lenStr = window.prompt('반지름을 입력하세요. (숫자 또는 슬라이더 이름)', '3');
    if (lenStr === null) {
        return;
    }
    lenStr = (lenStr || '').replace(/^\s+|\s+$/g, '');
    radiusVar = null;
    sliderVal = this.engine.getSliderValue(lenStr.toLowerCase());
    if (sliderVal !== null && sliderVal > 0) {
        radius = sliderVal;
        radiusVar = lenStr.toLowerCase();
    } else {
        radius = parseFloat(lenStr);
        if (!(radius > 0) || isNaN(radius)) {
            radius = 3;
        }
    }
    this.recordHistory('원(반지름) 생성');
    this.createCircleWithRadius(centerId, radius, 1, 0, radiusVar);
    this.updateAlgebraView();
    r.draw();
};

// 컴퍼스: 반지름 두 점 → 새 중심
AlgeoApp.prototype.handleCompassMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let draft;
    let p1;
    let p2;
    let centerId;
    let dx;
    let dy;
    let radius;

    if (this.constructionDraft && this.constructionDraft.type === 'COMPASS') {
        draft = this.constructionDraft;
        if (!draft.p2Id) {
            draft.p2Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
            if (draft.p2Id === draft.p1Id) {
                draft.p2Id = null;
                r.draw();
                return;
            }
            this.renderer.highlightIds = [draft.p1Id, draft.p2Id];
            this.updateToolPreviewFromMouse(mouseX, mouseY);
            return;
        }
        p1 = this.engine.objectMap[draft.p1Id];
        p2 = this.engine.objectMap[draft.p2Id];
        if (!p1 || !p2) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        dx = p2.x - p1.x;
        dy = p2.y - p1.y;
        radius = Math.sqrt(dx * dx + dy * dy);
        if (radius < 1e-8) {
            r.draw();
            return;
        }
        centerId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        this.recordHistory('컴퍼스 원 생성');
        this.createCircleWithRadius(centerId, radius, dx, dy, null);
        this.clearToolDraft();
        this.updateAlgebraView();
        r.draw();
        return;
    }

    this.constructionDraft = {
        type: 'COMPASS',
        p1Id: this.resolvePointAtClick(mouseX, mouseY, hitPoint),
        p2Id: null
    };
    this.renderer.highlightIds = [this.constructionDraft.p1Id];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 원 : 세 점
AlgeoApp.prototype.handleCircle3PMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let draft;
    let p3Id;
    let p1;
    let p2;
    let p3;
    let name;

    if (this.constructionDraft && this.constructionDraft.type === 'CIRCLE_3P') {
        draft = this.constructionDraft;
        if (!draft.p2Id) {
            draft.p2Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
            if (draft.p2Id === draft.p1Id) {
                draft.p2Id = null;
                r.draw();
                return;
            }
            this.renderer.highlightIds = [draft.p1Id, draft.p2Id];
            this.updateToolPreviewFromMouse(mouseX, mouseY);
            return;
        }
        p3Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        if (p3Id === draft.p1Id || p3Id === draft.p2Id) {
            r.draw();
            return;
        }
        p1 = this.engine.objectMap[draft.p1Id];
        p2 = this.engine.objectMap[draft.p2Id];
        p3 = this.engine.objectMap[p3Id];
        if (!p1 || !p2 || !p3) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        if (!this.engine.computeCircumcenter(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)) {
            r.draw();
            return;
        }
        if (!this.engine.findCircle3PByPoints(draft.p1Id, draft.p2Id, p3Id)) {
            this.recordHistory('세 점 원 생성');
            name = '⊙' + p1.name + p2.name + p3.name;
            this.engine.addCircle3P(name, draft.p1Id, draft.p2Id, p3Id);
            this.updateAlgebraView();
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    this.constructionDraft = {
        type: 'CIRCLE_3P',
        p1Id: this.resolvePointAtClick(mouseX, mouseY, hitPoint),
        p2Id: null
    };
    this.renderer.highlightIds = [this.constructionDraft.p1Id];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 부채꼴: 중심 → 끝점1 → 끝점2
AlgeoApp.prototype.handleSectorMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let draft;
    let p2Id;
    let center;
    let p1;
    let p2;
    let name;

    if (this.constructionDraft && this.constructionDraft.type === 'SECTOR') {
        draft = this.constructionDraft;
        if (!draft.p1Id) {
            draft.p1Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
            if (draft.p1Id === draft.centerId) {
                draft.p1Id = null;
                r.draw();
                return;
            }
            this.renderer.highlightIds = [draft.centerId, draft.p1Id];
            this.updateToolPreviewFromMouse(mouseX, mouseY);
            return;
        }
        p2Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        if (p2Id === draft.centerId || p2Id === draft.p1Id) {
            r.draw();
            return;
        }
        center = this.engine.objectMap[draft.centerId];
        p1 = this.engine.objectMap[draft.p1Id];
        p2 = this.engine.objectMap[p2Id];
        if (!center || !p1 || !p2) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        if (!this.engine.findSectorByRefs(draft.centerId, draft.p1Id, p2Id)) {
            this.recordHistory('부채꼴 생성');
            name = 'sec' + center.name + p1.name + p2.name;
            this.engine.addSector(name, draft.centerId, draft.p1Id, p2Id);
            this.updateAlgebraView();
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    this.constructionDraft = {
        type: 'SECTOR',
        centerId: this.resolvePointAtClick(mouseX, mouseY, hitPoint),
        p1Id: null
    };
    this.renderer.highlightIds = [this.constructionDraft.centerId];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 활꼴: 끝점2 → 호 위 점 (호와 동일 순서)
AlgeoApp.prototype.handleCircularSegmentMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let pointId;
    let p1Id;

    if (this.constructionDraft && this.constructionDraft.type === 'CIRCULAR_SEGMENT') {
        this.confirmCircularSegmentDraft(mouseX, mouseY, hitPoint);
        return;
    }

    pointId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);

    if (this.selectedPoints.length === 0) {
        this.selectedPoints.push(pointId);
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    p1Id = this.selectedPoints[0];
    if (pointId === p1Id) {
        r.draw();
        return;
    }

    this.constructionDraft = { type: 'CIRCULAR_SEGMENT', p1Id: p1Id, p2Id: pointId };
    this.selectedPoints = [];
    this.renderer.highlightIds = [p1Id, pointId];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 활꼴 작도 확정
AlgeoApp.prototype.confirmCircularSegmentDraft = function (mouseX, mouseY, hitPoint) {
    const r = this.renderer;
    const draft = this.constructionDraft;
    let p1;
    let p2;
    let guideId;
    let guidePt;
    let math;
    let center;
    let guideName;
    let guide;
    let segName;

    if (!draft || draft.type !== 'CIRCULAR_SEGMENT') {
        return;
    }

    this.recordHistory('활꼴 생성');
    p1 = this.engine.objectMap[draft.p1Id];
    p2 = this.engine.objectMap[draft.p2Id];
    if (!p1 || !p2) {
        this.clearToolDraft();
        r.draw();
        return;
    }

    guideId = null;
    if (hitPoint && hitPoint.id !== draft.p1Id && hitPoint.id !== draft.p2Id) {
        guideId = hitPoint.id;
    } else {
        math = this.screenToMath(mouseX, mouseY);
        guidePt = r.getGuidePointOnCircumcircle(p1, p2, math.x, math.y);
        center = this.engine.computeCircumcenter(
            p1.x, p1.y, p2.x, p2.y, guidePt.x, guidePt.y
        );
        if (!center) {
            r.draw();
            return;
        }
        guideName = this.getNextPointName();
        guide = this.engine.addPoint(guideName, guidePt.x, guidePt.y);
        guideId = guide.id;
        this.updateAlgebraView();
    }

    if (!this.engine.findCircularSegmentByRefs(draft.p1Id, draft.p2Id, guideId)) {
        guide = this.engine.objectMap[guideId];
        segName = 'sg' + p1.name + p2.name + guide.name;
        this.engine.addCircularSegment(segName, draft.p1Id, draft.p2Id, guideId);
        this.updateAlgebraView();
    }

    this.clearToolDraft();
    r.draw();
};

// 다각형: 꼭짓점 순 클릭 → 첫 점 재클릭 또는 Enter로 닫기
AlgeoApp.prototype.handlePolygonMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    const draft = this.constructionDraft;

    if (draft && draft.type === 'POLYGON') {
        const ids = draft.vertexIds;
        const firstId = ids[0];

        if (hitPoint && hitPoint.id === firstId && ids.length >= 3) {
            this.confirmPolygonDraft();
            return;
        }

        let pointId;
        if (hitPoint) {
            if (hitPoint.id === ids[ids.length - 1]) {
                r.draw();
                return;
            }
            pointId = hitPoint.id;
        } else {
            pointId = this.resolvePointAtClick(mouseX, mouseY, null);
        }

        ids.push(pointId);
        this.selectedPoints = ids.slice();
        this.syncHighlightToRenderer();
        this.updateToolPreviewFromMouse(mouseX, mouseY);
        return;
    }

    const p1Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    this.constructionDraft = { type: 'POLYGON', vertexIds: [p1Id] };
    this.selectedPoints = [p1Id];
    this.syncHighlightToRenderer();
    r.draw();
};

// 작도 중인 다각형 확정 (꼭짓점 3개 이상)
AlgeoApp.prototype.confirmPolygonDraft = function () {
    const draft = this.constructionDraft;
    const r = this.renderer;

    if (!draft || draft.type !== 'POLYGON' || draft.vertexIds.length < 3) {
        return;
    }

    this.recordHistory('다각형 생성');
    const vertexIds = draft.vertexIds.slice();
    if (!this.engine.findPolygonByVertices(vertexIds)) {
        const name = this.buildPolygonName(vertexIds);
        this.engine.addPolygon(name, vertexIds);
        this.updateAlgebraView();
    }

    this.clearToolDraft();
    r.draw();
};

// 다각형 이름 생성 — poly + 꼭짓점 이름 연결
AlgeoApp.prototype.buildPolygonName = function (vertexIds) {
    let name = 'poly';
    let i;

    for (i = 0; i < vertexIds.length; i++) {
        const pt = this.engine.objectMap[vertexIds[i]];
        if (pt) {
            name += pt.name;
        }
    }

    return name;
};

// 꼭짓점 개수 n 입력 (3 이상, 취소 시 null)
AlgeoApp.prototype.promptRegularPolygonSides = function () {
    let str;
    let n;

    str = window.prompt('정다각형의 꼭짓점 개수 n을 입력하세요. (3 이상)', '5');
    if (str === null) {
        return null;
    }
    n = parseInt(str, 10);
    if (isNaN(n) || n < 3) {
        n = 5;
    }
    return n;
};

// 한 변 기준 정다각형 생성 (방향은 마우스 쪽으로)
AlgeoApp.prototype.handleRegularPolygonSideMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let draft;
    let p0;
    let p1;
    let math;
    let orient;
    let sides;
    let p2Id;
    let vertexIds;
    let i;
    let vt;
    let name;
    let polyName;

    if (this.constructionDraft && this.constructionDraft.type === 'REGULAR_POLYGON_SIDE' &&
        this.constructionDraft.sides) {
        draft = this.constructionDraft;
        p0 = this.engine.objectMap[draft.sideP1Id];
        p1 = this.engine.objectMap[draft.sideP2Id];
        if (!p0 || !p1) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        math = this.screenToMath(mouseX, mouseY);
        orient = r.getPreviewOrientFromMouse(p0, p1, math.x, math.y);
        this.recordHistory('정다각형(한 변) 생성');
        vertexIds = [draft.sideP1Id, draft.sideP2Id];
        for (i = 2; i < draft.sides; i++) {
            vt = this.engine.addRegularVertex(this.getNextPointName(), {
                mode: 'SIDE',
                sideP1Id: draft.sideP1Id,
                sideP2Id: draft.sideP2Id,
                index: i,
                sides: draft.sides,
                orient: orient
            });
            if (!vt) {
                this.clearToolDraft();
                r.draw();
                return;
            }
            vertexIds.push(vt.id);
        }
        polyName = this.buildPolygonName(vertexIds);
        if (!this.engine.findPolygonByVertices(vertexIds)) {
            this.engine.addPolygon(polyName, vertexIds);
        }
        this.clearToolDraft();
        this.updateAlgebraView();
        r.draw();
        return;
    }

    if (this.selectedPoints.length === 0) {
        this.selectedPoints.push(this.resolvePointAtClick(mouseX, mouseY, hitPoint));
        this.syncHighlightToRenderer();
        this.syncToolGuide();
        r.draw();
        return;
    }

    p2Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    if (p2Id === this.selectedPoints[0]) {
        r.draw();
        return;
    }

    sides = this.promptRegularPolygonSides();
    if (sides === null) {
        this.selectedPoints = [];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    this.constructionDraft = {
        type: 'REGULAR_POLYGON_SIDE',
        sideP1Id: this.selectedPoints[0],
        sideP2Id: p2Id,
        sides: sides
    };
    this.selectedPoints = [];
    this.renderer.highlightIds = [this.constructionDraft.sideP1Id, p2Id];
    this.syncToolGuide();
    this.updateToolPreviewFromMouse(mouseX, mouseY);
};

// 중심·한 점 기준 정다각형 생성
AlgeoApp.prototype.handleRegularPolygonCenterMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let centerId;
    let firstId;
    let sides;
    let vertexIds;
    let i;
    let vt;
    let polyName;

    if (this.selectedPoints.length === 0) {
        this.selectedPoints.push(this.resolvePointAtClick(mouseX, mouseY, hitPoint));
        this.syncHighlightToRenderer();
        this.syncToolGuide();
        r.draw();
        return;
    }

    centerId = this.selectedPoints[0];
    firstId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    if (firstId === centerId) {
        r.draw();
        return;
    }

    sides = this.promptRegularPolygonSides();
    if (sides === null) {
        this.selectedPoints = [];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    this.recordHistory('정다각형(중심) 생성');
    vertexIds = [firstId];
    for (i = 1; i < sides; i++) {
        vt = this.engine.addRegularVertex(this.getNextPointName(), {
            mode: 'CENTER',
            centerId: centerId,
            firstId: firstId,
            index: i,
            sides: sides
        });
        if (!vt) {
            this.selectedPoints = [];
            this.syncHighlightToRenderer();
            r.draw();
            return;
        }
        vertexIds.push(vt.id);
    }
    polyName = this.buildPolygonName(vertexIds);
    if (!this.engine.findPolygonByVertices(vertexIds)) {
        this.engine.addPolygon(polyName, vertexIds);
    }
    this.selectedPoints = [];
    this.syncHighlightToRenderer();
    this.clearToolDraft();
    this.updateAlgebraView();
    r.draw();
};

// 주어진 크기의 각: 변점 → 꼭짓점 → 각도 → 방향 클릭
AlgeoApp.prototype.handleAngleGivenMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let draft;
    let ray1;
    let vertex;
    let math;
    let orient;
    let degStr;
    let degrees;
    let tipPt;
    let name;

    if (this.constructionDraft && this.constructionDraft.type === 'ANGLE_GIVEN' &&
        this.constructionDraft.degrees) {
        draft = this.constructionDraft;
        ray1 = this.engine.objectMap[draft.ray1Id];
        vertex = this.engine.objectMap[draft.vertexId];
        if (!ray1 || !vertex) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        math = this.screenToMath(mouseX, mouseY);
        orient = r.getPreviewOrientFromMouse(vertex, ray1, math.x, math.y);
        this.recordHistory('주어진 크기 각 생성');
        tipPt = this.engine.addFixedAnglePoint(
            this.getNextPointName(),
            draft.ray1Id,
            draft.vertexId,
            draft.degrees,
            orient
        );
        if (tipPt && !this.engine.findAngleByPoints(draft.ray1Id, draft.vertexId, tipPt.id)) {
            name = '\u2220' + ray1.name + vertex.name + tipPt.name;
            this.engine.addAngle(name, draft.ray1Id, draft.vertexId, tipPt.id);
        }
        this.clearToolDraft();
        this.updateAlgebraView();
        r.draw();
        return;
    }

    if (this.selectedPoints.length === 0) {
        this.selectedPoints.push(this.resolvePointAtClick(mouseX, mouseY, hitPoint));
        this.syncHighlightToRenderer();
        this.syncToolGuide();
        r.draw();
        return;
    }

    if (this.selectedPoints.length === 1) {
        const vertexId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        if (vertexId === this.selectedPoints[0]) {
            r.draw();
            return;
        }
        degStr = window.prompt('각의 크기(도)를 입력하세요.', '60');
        if (degStr === null) {
            this.selectedPoints = [];
            this.syncHighlightToRenderer();
            r.draw();
            return;
        }
        degrees = parseFloat(degStr);
        if (!(degrees > 0) || isNaN(degrees)) {
            degrees = 60;
        }
        this.constructionDraft = {
            type: 'ANGLE_GIVEN',
            ray1Id: this.selectedPoints[0],
            vertexId: vertexId,
            degrees: degrees
        };
        this.selectedPoints = [];
        this.renderer.highlightIds = [
            this.constructionDraft.ray1Id,
            this.constructionDraft.vertexId
        ];
        this.syncToolGuide();
        this.updateToolPreviewFromMouse(mouseX, mouseY);
    }
};

// 마우스 다운 핸들러
AlgeoApp.prototype.handleMouseDown = function (e) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;

    // stub 도구 — 작도 없이 가이드만 (클릭 무시)
    if (isToolStub(this.currentTool)) {
        this.syncToolGuide();
        return;
    }

    // 1. 마우스 위치 아래에 있는 점 탐색
    const hitPoint = this.findPointAt(mouseX, mouseY);

    if (this.currentTool === 'MOVE') {
        const math = this.screenToMath(mouseX, mouseY);
        const hitSlider = this.findSliderAt(mouseX, mouseY);
        let hitObj;
        let pointIds;

        if (hitSlider) {
            if (this.isNearSliderThumb(mouseX, mouseY, hitSlider)) {
                this.activeSlider = hitSlider;
                this.sliderDragSnapshot = this.captureEngineState();
                this.sliderDragMoved = false;
                this.setCanvasCursor('grabbing');
            } else {
                this.selectAlgebraObject(hitSlider.id);
                this.beginTranslateDrag([], hitSlider.id, math.x, math.y);
            }
            this.syncToolGuide();
            return;
        }

        if (hitPoint) {
            pointIds = this.engine.collectFreePointIdsForPointRef(hitPoint.id);
            if (pointIds.length > 0) {
                if (hitPoint.type === 'POINT') {
                    this.selectAlgebraObject(hitPoint.id);
                }
                this.beginTranslateDrag(pointIds, null, math.x, math.y);
                this.syncToolGuide();
                return;
            }
        }

        hitObj = this.findObjectAt(mouseX, mouseY);
        if (hitObj) {
            if (hitObj.type === 'FUNCTION') {
                this.selectAlgebraObject(hitObj.id);
                this.syncToolGuide();
                return;
            }
            if (hitObj.type === 'SLIDER') {
                this.selectAlgebraObject(hitObj.id);
                this.beginTranslateDrag([], hitObj.id, math.x, math.y);
                this.syncToolGuide();
                return;
            }
            pointIds = this.engine.collectFreePointIdsForObject(hitObj);
            if (pointIds.length > 0) {
                this.selectAlgebraObject(hitObj.id);
                this.beginTranslateDrag(pointIds, null, math.x, math.y);
                this.syncToolGuide();
                return;
            }
        }

        this.clearAlgebraSelection();
        this.isDraggingCanvas = true;
        this.dragStart.x = mouseX;
        this.dragStart.y = mouseY;
        this.origOffset.x = r.offsetX;
        this.origOffset.y = r.offsetY;
        this.setCanvasCursor('grabbing');
    } else if (this.currentTool === 'POINT') {
        // 빈 공간에 점 생성
        if (!hitPoint) {
            const math = this.screenToMath(mouseX, mouseY);
            const name = this.getNextPointName();
            this.recordHistory('점 생성');
            this.engine.addPoint(name, math.x, math.y);
            this.updateAlgebraView();
            r.draw();
        }
    } else if (this.currentTool === 'ARC') {
        this.handleArcMouseDown(e, hitPoint);
    } else if (this.currentTool === 'CIRCLE') {
        this.handleCircleMouseDown(e, hitPoint);
    } else if (this.currentTool === 'COMPASS') {
        this.handleCompassMouseDown(e, hitPoint);
    } else if (this.currentTool === 'CIRCLE_3P') {
        this.handleCircle3PMouseDown(e, hitPoint);
    } else if (this.currentTool === 'CIRCLE_RADIUS') {
        this.handleCircleRadiusMouseDown(e, hitPoint);
    } else if (this.currentTool === 'SECTOR') {
        this.handleSectorMouseDown(e, hitPoint);
    } else if (this.currentTool === 'CIRCULAR_SEGMENT') {
        this.handleCircularSegmentMouseDown(e, hitPoint);
    } else if (this.currentTool === 'SEGMENT' || this.currentTool === 'LINE') {
        this.handleSegmentLineMouseDown(e, hitPoint);
    } else if (this.currentTool === 'RAY' || this.currentTool === 'VECTOR') {
        this.handleRayVectorMouseDown(e, hitPoint);
    } else if (this.currentTool === 'SEGMENT_GIVEN_LENGTH') {
        this.handleSegmentGivenLengthMouseDown(e, hitPoint);
    } else if (this.currentTool === 'ANGLE_BISECTOR') {
        this.handleAngleBisectorMouseDown(e, hitPoint);
    } else if (this.currentTool === 'TANGENT') {
        this.handleTangentMouseDown(e, hitPoint);
    } else if (this.currentTool === 'ANGLE') {
        this.handleAngleMouseDown(e, hitPoint);
    } else if (this.currentTool === 'PARALLEL_LINE' || this.currentTool === 'PERP_LINE') {
        this.handleParallelPerpMouseDown(e, hitPoint);
    } else if (this.currentTool === 'POLYGON') {
        this.handlePolygonMouseDown(e, hitPoint);
    } else if (this.currentTool === 'REGULAR_POLYGON_SIDE') {
        this.handleRegularPolygonSideMouseDown(e, hitPoint);
    } else if (this.currentTool === 'REGULAR_POLYGON_CENTER') {
        this.handleRegularPolygonCenterMouseDown(e, hitPoint);
    } else if (this.currentTool === 'ANGLE_GIVEN') {
        this.handleAngleGivenMouseDown(e, hitPoint);
    } else if (this.currentTool === 'SLIDER') {
        const hitSlider = this.findSliderAt(mouseX, mouseY);
        if (hitSlider) {
            if (this.isNearSliderThumb(mouseX, mouseY, hitSlider)) {
                this.activeSlider = hitSlider;
                this.sliderDragSnapshot = this.captureEngineState();
                this.sliderDragMoved = false;
                this.setCanvasCursor('grabbing');
            } else {
                this.recordHistory('슬라이더 조절');
                this.engine.setSliderValue(hitSlider.id, this.sliderValueFromScreenX(hitSlider, mouseX));
                this.updateAlgebraView();
                r.draw();
            }
        } else {
            const math = this.screenToMath(mouseX, mouseY);
            this.recordHistory('슬라이더 생성');
            this.createSliderAtMath(math.x, math.y);
            this.updateAlgebraView();
            r.draw();
        }
    } else if (this.currentTool === 'MIDPOINT' || this.currentTool === 'PERP_BISECTOR') {
        if (hitPoint) {
            this.selectedPoints.push(hitPoint.id);
            this.syncHighlightToRenderer();

            if (this.currentTool === 'MIDPOINT' && this.selectedPoints.length === 2) {
                const p1Id = this.selectedPoints[0];
                const p2Id = this.selectedPoints[1];
                if (p1Id !== p2Id) {
                    const p1 = this.engine.objectMap[p1Id];
                    const p2 = this.engine.objectMap[p2Id];
                    if (!this.engine.findMidpointByPoints(p1Id, p2Id)) {
                        const name = 'M' + p1.name + p2.name;
                        this.recordHistory('중점 생성');
                        this.engine.addMidpoint(name, p1Id, p2Id);
                        this.updateAlgebraView();
                    }
                }
                this.selectedPoints = [];
                this.syncHighlightToRenderer();
                r.draw();
            } else if (this.currentTool === 'PERP_BISECTOR' && this.selectedPoints.length === 2) {
                const p1Id = this.selectedPoints[0];
                const p2Id = this.selectedPoints[1];
                if (p1Id !== p2Id) {
                    const p1 = this.engine.objectMap[p1Id];
                    const p2 = this.engine.objectMap[p2Id];
                    if (!this.engine.findPerpBisectorByPoints(p1Id, p2Id)) {
                        const name = 'pb' + p1.name + p2.name;
                        this.recordHistory('수직이등분선 생성');
                        this.engine.addPerpBisector(name, p1Id, p2Id);
                        this.updateAlgebraView();
                    }
                }
                this.selectedPoints = [];
                this.syncHighlightToRenderer();
                r.draw();
            } else {
                r.draw();
            }
        }
    } else if (this.currentTool === 'INTERSECTION') {
        this.handleIntersectionMouseDown(mouseX, mouseY, hitPoint);
    } else if (this.currentTool === 'POINT_ON_OBJECT') {
        this.handlePointOnObjectMouseDown(mouseX, mouseY, hitPoint);
    } else if (this.currentTool === 'DELETE') {
        // 객체 삭제
        if (hitPoint) {
            this.recordHistory('객체 삭제');
            this.engine.deleteObject(hitPoint.id);
            this.validateAlgebraSelection();
            this.updateAlgebraView();
            r.draw();
        } else {
            // 다른 도형(선분, 원, 함수) 삭제 체크
            const hitObj = this.findObjectAt(mouseX, mouseY);
            if (hitObj) {
                this.recordHistory('객체 삭제');
                this.engine.deleteObject(hitObj.id);
                this.validateAlgebraSelection();
                this.updateAlgebraView();
                r.draw();
            }
        }
    } else if (this.currentTool === 'HIDE_OBJECT') {
        this.hideObjectAtClick(mouseX, mouseY, hitPoint);
    }

    this.syncToolGuide();
};

// 마우스 무브 핸들러
AlgeoApp.prototype.handleMouseMove = function (e) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;

    if (this.isDraggingCanvas) {
        // 캔버스 드래그 중
        const dx = mouseX - this.dragStart.x;
        const dy = mouseY - this.dragStart.y;
        r.offsetX = this.origOffset.x + dx;
        r.offsetY = this.origOffset.y + dy;
        r.draw();
    } else if (this.activeSlider) {
        this.sliderDragMoved = true;
        const newVal = this.sliderValueFromScreenX(this.activeSlider, mouseX);
        this.engine.setSliderValue(this.activeSlider.id, newVal);
        this.updateAlgebraView();
        r.draw();
    } else if (this.dragTranslate) {
        this.dragMoved = true;
        const math = this.screenToMath(mouseX, mouseY);
        const dx = math.x - this.dragTranslate.lastMathX;
        const dy = math.y - this.dragTranslate.lastMathY;
        let slider;

        if (this.dragTranslate.pointIds.length > 0) {
            this.engine.translateFreePoints(this.dragTranslate.pointIds, dx, dy);
        }
        if (this.dragTranslate.sliderId) {
            slider = this.engine.objectMap[this.dragTranslate.sliderId];
            if (slider && slider.type === 'SLIDER') {
                slider.anchorX += dx;
                slider.anchorY += dy;
            }
        }
        this.dragTranslate.lastMathX = math.x;
        this.dragTranslate.lastMathY = math.y;
        this.updateAlgebraView();
        r.draw();
    } else if (this.constructionDraft) {
        this.updateToolPreviewFromMouse(mouseX, mouseY);
    }
};

// 교점: 도형 2개 선택 → 교점 생성 (원–원은 최대 2점)
AlgeoApp.prototype.handleIntersectionMouseDown = function (mouseX, mouseY, hitPoint) {
    const r = this.renderer;
    let hitObj = this.findObjectAt(mouseX, mouseY);
    let obj1;
    let obj2;
    let pts;
    let i;
    let name;
    let created = 0;

    if (hitObj && !ALGEO_INTERSECTABLE_TYPES[hitObj.type]) {
        hitObj = null;
    }
    if (!hitObj) {
        return;
    }

    if (this.selectedObjects.length === 1 && this.selectedObjects[0] === hitObj.id) {
        return;
    }

    this.selectedObjects.push(hitObj.id);
    this.syncHighlightToRenderer();

    if (this.selectedObjects.length < 2) {
        r.draw();
        return;
    }

    obj1 = this.engine.objectMap[this.selectedObjects[0]];
    obj2 = this.engine.objectMap[this.selectedObjects[1]];
    this.selectedObjects = [];
    this.syncHighlightToRenderer();

    if (!obj1 || !obj2 || obj1.id === obj2.id) {
        r.draw();
        return;
    }

    pts = this.engine.computeIntersectionPoints(obj1, obj2);
    if (!pts || pts.length === 0) {
        r.draw();
        return;
    }

    this.recordHistory('교점 생성');
    for (i = 0; i < pts.length; i++) {
        if (this.engine.findIntersectionByParents(obj1.id, obj2.id, i)) {
            continue;
        }
        name = 'I' + obj1.name + obj2.name + (pts.length > 1 ? String(i + 1) : '');
        this.engine.addIntersection(name, obj1.id, obj2.id, i, pts[i].x, pts[i].y);
        created += 1;
    }
    if (created > 0) {
        this.updateAlgebraView();
    }
    r.draw();
};

// 대상 위의 점: 도형 선택 → 위치 클릭
AlgeoApp.prototype.handlePointOnObjectMouseDown = function (mouseX, mouseY, hitPoint) {
    const r = this.renderer;
    const draft = this.constructionDraft;
    let hitObj;
    let host;
    let math;
    let t;
    let name;

    if (draft && draft.type === 'POINT_ON_OBJECT') {
        host = this.engine.objectMap[draft.hostId];
        if (!host) {
            this.constructionDraft = null;
            this.syncHighlightToRenderer();
            r.draw();
            return;
        }
        math = this.screenToMath(mouseX, mouseY);
        t = this.engine.projectMathToObjectT(host, math.x, math.y);
        if (t === null) {
            return;
        }
        name = this.getNextPointName();
        this.recordHistory('대상 위의 점 생성');
        this.engine.addPointOnObject(name, host.id, t);
        this.constructionDraft = null;
        this.selectedObjects = [];
        this.syncHighlightToRenderer();
        this.updateAlgebraView();
        r.draw();
        return;
    }

    hitObj = this.findObjectAt(mouseX, mouseY);
    if (!hitObj || !ALGEO_INTERSECTABLE_TYPES[hitObj.type]) {
        return;
    }
    this.constructionDraft = { type: 'POINT_ON_OBJECT', hostId: hitObj.id };
    this.selectedObjects = [hitObj.id];
    this.syncHighlightToRenderer();
    r.draw();
};

// 마우스 업 핸들러
AlgeoApp.prototype.handleMouseUp = function (e) {
    if (this.sliderDragSnapshot && this.sliderDragMoved) {
        this.pushUndoEntry(this.sliderDragSnapshot, '슬라이더 조절');
    }
    this.sliderDragSnapshot = null;
    this.sliderDragMoved = false;
    this.activeSlider = null;
    if (this.dragSnapshot && this.dragMoved) {
        this.pushUndoEntry(this.dragSnapshot, '객체 이동');
    }
    this.dragSnapshot = null;
    this.dragMoved = false;
    this.dragTranslate = null;
    this.activePoint = null;
    this.isDraggingCanvas = false;
    this.updateCanvasCursor();
};

// 픽셀 좌표 기준 점 충돌 판단 (반경 10px 이내 영역)
AlgeoApp.prototype.findPointAt = function (screenX, screenY) {
    const list = this.engine.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (isAlgeoPointType(obj.type)) {
            if (!this.engine.isObjectVisible(obj)) {
                continue;
            }
            const sx = this.renderer.toScreenX(obj.x);
            const sy = this.renderer.toScreenY(obj.y);
            const dist = Math.sqrt((sx - screenX) * (sx - screenX) + (sy - screenY) * (sy - screenY));
            if (dist <= 10) {
                return obj;
            }
        }
    }
    return null;
};

// 픽셀 좌표 기준 선분 또는 원 충돌 판단 (삭제·숨기기 툴 대응)
AlgeoApp.prototype.findObjectAt = function (screenX, screenY) {
    const list = this.engine.objects;
    const r = this.renderer;

    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (!this.engine.isObjectVisible(obj)) {
            continue;
        }
        if (obj.type === 'SEGMENT' || obj.type === 'VECTOR') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                const s1x = r.toScreenX(p1.x);
                const s1y = r.toScreenY(p1.y);
                const s2x = r.toScreenX(p2.x);
                const s2y = r.toScreenY(p2.y);

                // 점과 선분 사이의 거리 구하기
                const d = this.distToSegment(screenX, screenY, s1x, s1y, s2x, s2y);
                if (d <= 5) {
                    return obj;
                }
            }
        } else if (obj.type === 'LINE') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                const end = r.getLineScreenEndpoints(p1, p2);
                if (end) {
                    const d = this.distToLine(screenX, screenY, end.x1, end.y1, end.x2, end.y2);
                    if (d <= 6) {
                        return obj;
                    }
                }
            }
        } else if (obj.type === 'RAY') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                const end = r.getRayScreenEndpoints(p1, p2);
                if (end) {
                    const d = this.distToSegment(screenX, screenY, end.x1, end.y1, end.x2, end.y2);
                    if (d <= 6) {
                        return obj;
                    }
                }
            }
        } else if (obj.type === 'PERP_BISECTOR') {
            const linePts = this.engine.getPerpBisectorLinePoints(obj);
            if (linePts) {
                const end = r.getLineScreenEndpoints(linePts.p1, linePts.p2);
                if (end) {
                    const d = this.distToLine(screenX, screenY, end.x1, end.y1, end.x2, end.y2);
                    if (d <= 6) {
                        return obj;
                    }
                }
            }
        } else if (obj.type === 'ANGLE_BISECTOR') {
            const linePts = this.engine.getAngleBisectorLinePoints(obj);
            if (linePts) {
                const end = r.getRayScreenEndpoints(linePts.p1, linePts.p2);
                if (end) {
                    const d = this.distToSegment(screenX, screenY, end.x1, end.y1, end.x2, end.y2);
                    if (d <= 6) {
                        return obj;
                    }
                }
            }
        } else if (obj.type === 'PARALLEL_LINE') {
            const linePts = this.engine.getParallelLinePoints(obj);
            if (linePts) {
                const end = r.getLineScreenEndpoints(linePts.p1, linePts.p2);
                if (end) {
                    const d = this.distToLine(screenX, screenY, end.x1, end.y1, end.x2, end.y2);
                    if (d <= 6) {
                        return obj;
                    }
                }
            }
        } else if (obj.type === 'PERP_LINE') {
            const linePts = this.engine.getPerpLinePoints(obj);
            if (linePts) {
                const end = r.getLineScreenEndpoints(linePts.p1, linePts.p2);
                if (end) {
                    const d = this.distToLine(screenX, screenY, end.x1, end.y1, end.x2, end.y2);
                    if (d <= 6) {
                        return obj;
                    }
                }
            }
        } else if (obj.type === 'TANGENT') {
            const linePts = this.engine.getTangentLinePoints(obj);
            if (linePts) {
                const end = r.getLineScreenEndpoints(linePts.p1, linePts.p2);
                if (end) {
                    const d = this.distToLine(screenX, screenY, end.x1, end.y1, end.x2, end.y2);
                    if (d <= 6) {
                        return obj;
                    }
                }
            }
        } else if (obj.type === 'CIRCLE' || obj.type === 'CIRCLE_3P') {
            const circ = this.engine.getCircleGeometry(obj);
            if (circ) {
                const cx = r.toScreenX(circ.center.x);
                const cy = r.toScreenY(circ.center.y);
                const screenRadius = circ.radius * r.scale;

                // 마우스와 원 둘레 사이의 거리
                const distToCenter = Math.sqrt((cx - screenX) * (cx - screenX) + (cy - screenY) * (cy - screenY));
                if (Math.abs(distToCenter - screenRadius) <= 5) {
                    return obj;
                }
            }
        } else if (obj.type === 'SECTOR') {
            const center = this.engine.objectMap[obj.centerId];
            const sp1 = this.engine.objectMap[obj.p1Id];
            const sp2 = this.engine.objectMap[obj.p2Id];
            if (center && sp1 && sp2) {
                const cx = r.toScreenX(center.x);
                const cy = r.toScreenY(center.y);
                const dx = sp1.x - center.x;
                const dy = sp1.y - center.y;
                const mathR = Math.sqrt(dx * dx + dy * dy);
                const screenR = mathR * r.scale;
                const endPt = r.getMathPointOnCircle(center, mathR, sp2.x, sp2.y);
                const sweep = r.getArcScreenSweep(
                    cx, cy,
                    r.toScreenX(sp1.x), r.toScreenY(sp1.y),
                    r.toScreenX(endPt.x), r.toScreenY(endPt.y)
                );
                if (this.distToSegment(screenX, screenY, cx, cy, r.toScreenX(sp1.x), r.toScreenY(sp1.y)) <= 6 ||
                    this.distToSegment(screenX, screenY, cx, cy, r.toScreenX(endPt.x), r.toScreenY(endPt.y)) <= 6 ||
                    this.distToArcCurve(
                        screenX, screenY, cx, cy, screenR,
                        sweep.startA, sweep.endA, sweep.ccw
                    ) <= 6) {
                    return obj;
                }
            }
        } else if (obj.type === 'CIRCULAR_SEGMENT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            const guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                const sweep = r.getArcSweepThroughGuide(p1, p2, guide);
                if (sweep && (
                    this.distToArcCurve(
                        screenX, screenY, sweep.cx, sweep.cy, sweep.r,
                        sweep.startA, sweep.endA, sweep.ccw
                    ) <= 6 ||
                    this.distToSegment(
                        screenX, screenY,
                        r.toScreenX(p1.x), r.toScreenY(p1.y),
                        r.toScreenX(p2.x), r.toScreenY(p2.y)
                    ) <= 6
                )) {
                    return obj;
                }
            }
        } else if (obj.type === 'ARC') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            const guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                const sweep = r.getArcSweepThroughGuide(p1, p2, guide);
                if (sweep && this.distToArcCurve(
                    screenX, screenY, sweep.cx, sweep.cy, sweep.r,
                    sweep.startA, sweep.endA, sweep.ccw
                ) <= 6) {
                    return obj;
                }
            }
        } else if (obj.type === 'ANGLE') {
            const ray1 = this.engine.objectMap[obj.ray1Id];
            const vertex = this.engine.objectMap[obj.vertexId];
            const ray2 = this.engine.objectMap[obj.ray2Id];
            if (ray1 && vertex && ray2) {
                const bx = r.toScreenX(vertex.x);
                const by = r.toScreenY(vertex.y);
                const sx1 = r.toScreenX(ray1.x);
                const sy1 = r.toScreenY(ray1.y);
                const sx2 = r.toScreenX(ray2.x);
                const sy2 = r.toScreenY(ray2.y);
                const sweep = r.getArcScreenSweep(bx, by, sx1, sy1, sx2, sy2);
                if (this.distToArcCurve(screenX, screenY, bx, by, 34, sweep.startA, sweep.endA, sweep.ccw) <= 8) {
                    return obj;
                }
            }
        } else if (obj.type === 'FUNCTION') {
            if (this.isNearFunction(screenX, screenY, obj)) {
                return obj;
            }
        } else if (obj.type === 'POLYGON') {
            const screenPts = [];
            let vi;
            for (vi = 0; vi < obj.vertexIds.length; vi++) {
                const vp = this.engine.objectMap[obj.vertexIds[vi]];
                if (!vp) {
                    break;
                }
                screenPts.push({
                    x: r.toScreenX(vp.x),
                    y: r.toScreenY(vp.y)
                });
            }
            if (screenPts.length === obj.vertexIds.length && screenPts.length >= 3) {
                let ei;
                for (ei = 0; ei < screenPts.length; ei++) {
                    const p1 = screenPts[ei];
                    const p2 = screenPts[(ei + 1) % screenPts.length];
                    const d = this.distToSegment(screenX, screenY, p1.x, p1.y, p2.x, p2.y);
                    if (d <= 6) {
                        return obj;
                    }
                }
                if (this.isPointInPolygon(screenX, screenY, screenPts)) {
                    return obj;
                }
            }
        } else if (obj.type === 'SLIDER') {
            if (this.isNearSlider(screenX, screenY, obj)) {
                return obj;
            }
        }
    }
    return null;
};

// 슬라이더 손잡이만 히트 판정
AlgeoApp.prototype.isNearSliderThumb = function (screenX, screenY, slider) {
    const bounds = this.renderer.getSliderScreenBounds(slider);
    const thumbDist = Math.sqrt(
        (bounds.thumbX - screenX) * (bounds.thumbX - screenX) +
        (bounds.thumbY - screenY) * (bounds.thumbY - screenY)
    );

    return thumbDist <= ALGEO_SLIDER_THUMB_R + 6;
};

// 슬라이더 트랙·손잡이 히트 판정
AlgeoApp.prototype.isNearSlider = function (screenX, screenY, slider) {
    const bounds = this.renderer.getSliderScreenBounds(slider);

    if (this.isNearSliderThumb(screenX, screenY, slider)) {
        return true;
    }

    if (screenY >= bounds.thumbY - 12 && screenY <= bounds.thumbY + 12 &&
        screenX >= bounds.left - 4 && screenX <= bounds.right + 4) {
        return true;
    }

    if (screenX >= bounds.left - 4 && screenX <= bounds.right + 4 &&
        screenY >= bounds.top - 18 && screenY <= bounds.top + 4) {
        return true;
    }

    return false;
};

// 화면 x 좌표 → 슬라이더 값
AlgeoApp.prototype.sliderValueFromScreenX = function (slider, screenX) {
    const bounds = this.renderer.getSliderScreenBounds(slider);
    const range = slider.max - slider.min;
    let t;

    if (bounds.right - bounds.left < 1) {
        return slider.value;
    }

    t = (screenX - bounds.left) / (bounds.right - bounds.left);
    if (t < 0) {
        t = 0;
    }
    if (t > 1) {
        t = 1;
    }

    return slider.min + t * range;
};

// 클릭 위치의 슬라이더 탐색 (위에 그린 슬라이더 우선)
AlgeoApp.prototype.findSliderAt = function (screenX, screenY) {
    const list = this.engine.objects;
    let i;

    for (i = list.length - 1; i >= 0; i--) {
        if (list[i].type === 'SLIDER' && this.engine.isObjectVisible(list[i]) &&
            this.isNearSlider(screenX, screenY, list[i])) {
            return list[i];
        }
    }

    return null;
};

// 슬라이더 변수 이름 자동 생성 (a, b, c …)
AlgeoApp.prototype.getNextSliderName = function () {
    let count = 0;
    let name = '';
    const base = 'abcdefghijklmnopqrstuvwxyz';

    do {
        if (count < base.length) {
            name = base.charAt(count);
        } else {
            name = 'a' + (count - base.length + 1);
        }
        count += 1;
    } while (this.engine.findSliderByName(name) !== null);

    return name;
};

// 수학 좌표에 슬라이더 배치
AlgeoApp.prototype.createSliderAtMath = function (mathX, mathY, name) {
    const sliderName = name || this.getNextSliderName();
    const slider = this.engine.addSlider(
        sliderName,
        ALGEO_SLIDER_DEFAULT_MIN,
        ALGEO_SLIDER_DEFAULT_MAX,
        ALGEO_SLIDER_DEFAULT_VALUE,
        ALGEO_SLIDER_DEFAULT_STEP,
        mathX,
        mathY
    );
    return slider;
};

// 이동 도구 — 객체·점 평행 이동 드래그 시작
AlgeoApp.prototype.beginTranslateDrag = function (pointIds, sliderId, mathX, mathY) {
    const hasPoints = pointIds && pointIds.length > 0;

    if (!hasPoints && !sliderId) {
        return;
    }

    this.dragTranslate = {
        pointIds: hasPoints ? pointIds.slice() : [],
        sliderId: sliderId || null,
        lastMathX: mathX,
        lastMathY: mathY
    };
    this.dragSnapshot = this.captureEngineState();
    this.dragMoved = false;
    this.setCanvasCursor('grabbing');
};

// 화면 좌표 기준 다각형 내부 포함 여부 (삭제 툴용)
AlgeoApp.prototype.isPointInPolygon = function (px, py, screenPts) {
    let inside = false;
    let i;
    let j;

    for (i = 0, j = screenPts.length - 1; i < screenPts.length; j = i, i++) {
        const xi = screenPts[i].x;
        const yi = screenPts[i].y;
        const xj = screenPts[j].x;
        const yj = screenPts[j].y;
        const intersect = ((yi > py) !== (yj > py)) &&
            (px < (xj - xi) * (py - yi) / (yj - yi + 1e-12) + xi);
        if (intersect) {
            inside = !inside;
        }
    }

    return inside;
};

// 마우스 위치가 함수 그래프 곡선 근처인지 판별 (삭제 툴용)
AlgeoApp.prototype.isNearFunction = function (screenX, screenY, funcObj) {
    const r = this.renderer;
    const width = r.canvas.width;
    const mathXLeft = r.toMathX(0);
    const mathXRight = r.toMathX(width);
    const left = Math.min(mathXLeft, mathXRight);
    const right = Math.max(mathXLeft, mathXRight);
    const step = (right - left) / width;
    let prevSx = 0;
    let prevSy = 0;
    let hasPrev = false;

    for (let mathX = left; mathX <= right; mathX += step) {
        const coeffs = this.engine.getFunctionCoeffs(funcObj);
        const mathY = coeffs.slope * mathX + coeffs.intercept;
        const sx = r.toScreenX(mathX);
        const sy = r.toScreenY(mathY);

        if (hasPrev) {
            const d = this.distToSegment(screenX, screenY, prevSx, prevSy, sx, sy);
            if (d <= 6) {
                return true;
            }
        }

        prevSx = sx;
        prevSy = sy;
        hasPrev = true;
    }

    return false;
};

// 점 P에서 무한 직선 AB까지의 픽셀 거리 계산
AlgeoApp.prototype.distToLine = function (px, py, ax, ay, bx, by) {
    const len = Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));
    if (len === 0) {
        return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay));
    }
    const cross = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay));
    return cross / len;
};

// 점 P에서 선분 AB까지의 픽셀 거리 계산
// 화면 좌표 호 곡선과 점 사이 최소 거리 (삭제 툴용)
AlgeoApp.prototype.distToArcCurve = function (px, py, cx, cy, r, startA, endA, ccw) {
    const steps = 24;
    let i;
    let minDist = Infinity;
    let prevX = cx + Math.cos(startA) * r;
    let prevY = cy + Math.sin(startA) * r;

    for (i = 1; i <= steps; i++) {
        const t = i / steps;
        const angle = startA + (endA - startA) * t;
        const nx = cx + Math.cos(angle) * r;
        const ny = cy + Math.sin(angle) * r;
        const d = this.distToSegment(px, py, prevX, prevY, nx, ny);
        if (d < minDist) {
            minDist = d;
        }
        prevX = nx;
        prevY = ny;
    }

    return minDist;
};

AlgeoApp.prototype.distToSegment = function (px, py, ax, ay, bx, by) {
    const l2 = (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
    if (l2 === 0) {
        return Math.sqrt((px - ax) * (px - ax) + (py - ay) * (py - ay));
    }
    let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
    t = Math.max(0, Math.min(1, t));
    const tx = ax + t * (bx - ax);
    const ty = ay + t * (by - ay);
    return Math.sqrt((px - tx) * (px - tx) + (py - ty) * (py - ty));
};

// 알파벳 순서(A, B, C...)대로 사용 가능한 포인트 이름 자동 생성
AlgeoApp.prototype.getNextPointName = function () {
    let count = 0;
    let name = '';

    do {
        const charCode = 65 + (count % 26);
        const suffix = count >= 26 ? String(Math.floor(count / 26)) : '';
        name = String.fromCharCode(charCode) + suffix;
        count += 1;
    } while (this.engine.findAnyPointLikeByName(name) !== null);

    return name;
};

// f, g, h … 순서로 사용 가능한 함수 이름 자동 생성
AlgeoApp.prototype.getNextFunctionName = function () {
    const baseNames = ['f', 'g', 'h', 'p', 'q', 'r'];
    let count = 0;
    let name = '';

    do {
        if (count < baseNames.length) {
            name = baseNames[count];
        } else {
            name = 'f' + (count - baseNames.length + 2);
        }
        count += 1;
    } while (this.engine.findFunctionByName(name) !== null);

    return name;
};

// 함수식 비교용 정규화 (공백·곱셈기호 제거, 소문자 통일)
AlgeoApp.prototype.normalizeExprKey = function (expr) {
    return (expr || '').replace(/\s+/g, '').replace(/\*/g, '').toLowerCase();
};

// 일차함수 우변 파싱 — ax + b 형태 계수 추출
AlgeoApp.prototype.parseLinearRhs = function (rhs) {
    const expr = this.normalizeExprKey(rhs);

    if (!expr) {
        return { success: false, message: '함수식이 비어 있습니다.' };
    }

    // 상수함수: y = 5
    if (expr.indexOf('x') === -1) {
        const val = parseFloat(expr);
        if (isNaN(val)) {
            return { success: false, message: '올바른 일차함수식이 아닙니다.' };
        }
        return { success: true, slope: 0, intercept: val };
    }

    const xMatches = expr.match(/x/g);
    if (!xMatches || xMatches.length > 1) {
        return { success: false, message: '일차함수만 지원합니다 (x는 한 번만).' };
    }

    const parts = expr.split('x');
    const slopePart = parts[0];
    const interceptPart = parts[1] || '';
    let slope = 0;
    let intercept = 0;

    if (slopePart === '' || slopePart === '+') {
        slope = 1;
    } else if (slopePart === '-') {
        slope = -1;
    } else {
        slope = parseFloat(slopePart);
        if (isNaN(slope)) {
            return { success: false, message: '올바른 일차함수식이 아닙니다.' };
        }
    }

    if (interceptPart === '' || interceptPart === '+') {
        intercept = 0;
    } else {
        intercept = parseFloat(interceptPart);
        if (isNaN(intercept)) {
            return { success: false, message: '올바른 일차함수식이 아닙니다.' };
        }
    }

    return { success: true, slope: slope, intercept: intercept };
};

// slope·intercept로 대수창 표시용 식 문자열 생성
AlgeoApp.prototype.formatFunctionExpression = function (slope, intercept) {
    let expr = 'y = ';

    if (slope === 0) {
        return expr + intercept;
    }

    if (slope === 1) {
        expr += 'x';
    } else if (slope === -1) {
        expr += '-x';
    } else {
        expr += slope + 'x';
    }

    if (intercept > 0) {
        expr += ' + ' + intercept;
    } else if (intercept < 0) {
        expr += ' - ' + Math.abs(intercept);
    }

    return expr;
};

// 연속된 점 이름 문자열을 두 점으로 분할 (예: "AB" → A + B)
AlgeoApp.prototype.parseTwoPointNames = function (combined) {
    const trimmed = (combined || '').replace(/\s+/g, '');
    let best = null;

    if (trimmed.length < 2) {
        return { success: false, message: '두 점 이름이 필요합니다.' };
    }

    for (let i = 1; i < trimmed.length; i++) {
        const name1 = trimmed.substring(0, i);
        const name2 = trimmed.substring(i);
        const p1 = this.engine.findPointByName(name1);
        const p2 = this.engine.findPointByName(name2);

        if (p1 && p2 && p1.id !== p2.id) {
            if (!best || name1.length > best.name1.length) {
                best = {
                    p1: p1,
                    p2: p2,
                    name1: name1,
                    name2: name2,
                    segmentName: p1.name + p2.name
                };
            }
        }
    }

    if (best) {
        return {
            success: true,
            p1: best.p1,
            p2: best.p2,
            name1: best.name1,
            name2: best.name2,
            segmentName: best.segmentName
        };
    }

    return {
        success: false,
        message: '두 점을 찾을 수 없습니다. D,E 또는 de 형식으로 입력하고, 점이 먼저 있어야 합니다.'
    };
};

// 쉼표로 구분된 두 점 이름 파싱 (예: "D, E")
AlgeoApp.prototype.parseCommaPointNames = function (name1, name2) {
    const p1 = this.engine.findPointByName(name1);
    const p2 = this.engine.findPointByName(name2);

    if (!p1) {
        return { success: false, message: '점 ' + name1 + '을(를) 찾을 수 없습니다.' };
    }
    if (!p2) {
        return { success: false, message: '점 ' + name2 + '을(를) 찾을 수 없습니다.' };
    }
    if (p1.id === p2.id) {
        return { success: false, message: '서로 다른 두 점을 지정해 주세요.' };
    }

    return {
        success: true,
        p1: p1,
        p2: p2,
        segmentName: p1.name + p2.name
    };
};

// 쉼표 구분 세 점 이름 파싱 (기준 두 점 + 통과 점)
AlgeoApp.prototype.parseTriplePointNames = function (name1, name2, name3) {
    const p1 = this.engine.findPointByName(name1);
    const p2 = this.engine.findPointByName(name2);
    const p3 = this.engine.findPointByName(name3);

    if (!p1) {
        return { success: false, message: '점 ' + name1 + '을(를) 찾을 수 없습니다.' };
    }
    if (!p2) {
        return { success: false, message: '점 ' + name2 + '을(를) 찾을 수 없습니다.' };
    }
    if (!p3) {
        return { success: false, message: '점 ' + name3 + '을(를) 찾을 수 없습니다.' };
    }
    if (p1.id === p2.id) {
        return { success: false, message: '기준이 되는 두 점은 달라야 합니다.' };
    }

    return {
        success: true,
        ref1: p1,
        ref2: p2,
        through: p3
    };
};

// 대수창 중점 정의 처리 (예: Midpoint(A, B))
AlgeoApp.prototype.handleMidpointInput = function (name1, name2) {
    const parsed = this.parseCommaPointNames(name1, name2);
    if (!parsed.success) {
        return { success: false, message: parsed.message };
    }

    const existing = this.engine.findMidpointByPoints(parsed.p1.id, parsed.p2.id);
    if (!existing) {
        const midName = 'M' + parsed.p1.name + parsed.p2.name;
        this.engine.addMidpoint(midName, parsed.p1.id, parsed.p2.id);
    }
    return { success: true, message: '' };
};

// 대수창 수직이등분선 정의 처리 (예: PerpBisector(A, B))
AlgeoApp.prototype.handlePerpBisectorInput = function (name1, name2) {
    const parsed = this.parseCommaPointNames(name1, name2);
    if (!parsed.success) {
        return { success: false, message: parsed.message };
    }

    const existing = this.engine.findPerpBisectorByPoints(parsed.p1.id, parsed.p2.id);
    if (!existing) {
        const pbName = 'pb' + parsed.p1.name + parsed.p2.name;
        this.engine.addPerpBisector(pbName, parsed.p1.id, parsed.p2.id);
    }
    return { success: true, message: '' };
};

// 대수창 평행선 정의 처리 (예: Parallel(A, B, C))
AlgeoApp.prototype.handleParallelLineInput = function (name1, name2, name3) {
    const parsed = this.parseTriplePointNames(name1, name2, name3);
    if (!parsed.success) {
        return { success: false, message: parsed.message };
    }

    const existing = this.engine.findParallelLineByRefs(
        parsed.ref1.id, parsed.ref2.id, parsed.through.id
    );
    if (!existing) {
        const plName = 'pl' + parsed.through.name + parsed.ref1.name + parsed.ref2.name;
        this.engine.addParallelLine(plName, parsed.ref1.id, parsed.ref2.id, parsed.through.id);
    }
    return { success: true, message: '' };
};

// 대수창 수직선 정의 처리 (예: Perpendicular(A, B, C))
AlgeoApp.prototype.handlePerpLineInput = function (name1, name2, name3) {
    const parsed = this.parseTriplePointNames(name1, name2, name3);
    if (!parsed.success) {
        return { success: false, message: parsed.message };
    }

    const existing = this.engine.findPerpLineByRefs(
        parsed.ref1.id, parsed.ref2.id, parsed.through.id
    );
    if (!existing) {
        const ppName = 'pp' + parsed.through.name + parsed.ref1.name + parsed.ref2.name;
        this.engine.addPerpLine(ppName, parsed.ref1.id, parsed.ref2.id, parsed.through.id);
    }
    return { success: true, message: '' };
};

// 대수창 직선 정의 처리 (예: Line(A, B))
AlgeoApp.prototype.handleLineInput = function (name1, name2) {
    const parsed = this.parseCommaPointNames(name1, name2);
    if (!parsed.success) {
        return { success: false, message: parsed.message };
    }

    const existing = this.engine.findLineByPoints(parsed.p1.id, parsed.p2.id);
    if (!existing) {
        const lineName = 'd' + parsed.p1.name + parsed.p2.name;
        this.engine.addLine(lineName, parsed.p1.id, parsed.p2.id);
    }
    return { success: true, message: '' };
};

// 대수창 각도 정의 처리 (예: Angle(A, B, C) — B가 꼭짓점)
AlgeoApp.prototype.handleAngleInput = function (name1, name2, name3) {
    const parsed = this.parseTriplePointNames(name1, name2, name3);
    if (!parsed.success) {
        return { success: false, message: parsed.message };
    }
    if (parsed.ref2.id === parsed.ref1.id || parsed.ref2.id === parsed.through.id) {
        return { success: false, message: '꼭짓점은 두 변의 점과 달라야 합니다.' };
    }

    const existing = this.engine.findAngleByPoints(
        parsed.ref1.id, parsed.ref2.id, parsed.through.id
    );
    if (!existing) {
        const angName = '\u2220' + parsed.ref1.name + parsed.ref2.name + parsed.through.name;
        this.engine.addAngle(angName, parsed.ref1.id, parsed.ref2.id, parsed.through.id);
    }
    return { success: true, message: '' };
};

// 대수창 호 정의 처리 (예: Arc(A, B, C) — C는 호 위의 점)
AlgeoApp.prototype.handleArcInput = function (name1, name2, name3) {
    const parsed = this.parseTriplePointNames(name1, name2, name3);
    if (!parsed.success) {
        return { success: false, message: parsed.message };
    }
    if (parsed.ref1.id === parsed.ref2.id || parsed.ref1.id === parsed.through.id ||
        parsed.ref2.id === parsed.through.id) {
        return { success: false, message: '호의 세 점은 서로 달라야 합니다.' };
    }

    const center = this.engine.computeCircumcenter(
        parsed.ref1.x, parsed.ref1.y,
        parsed.ref2.x, parsed.ref2.y,
        parsed.through.x, parsed.through.y
    );
    if (!center) {
        return { success: false, message: '세 점이 일직선상에 있어 호를 만들 수 없습니다.' };
    }

    const existing = this.engine.findArcByThreePoints(
        parsed.ref1.id, parsed.ref2.id, parsed.through.id
    );
    if (!existing) {
        const arcName = 'arc' + parsed.ref1.name + parsed.ref2.name + parsed.through.name;
        this.engine.addArc(arcName, parsed.ref1.id, parsed.ref2.id, parsed.through.id);
    }
    return { success: true, message: '' };
};

// 대수창 다각형 정의 처리 (예: Polygon(A, B, C, D))
AlgeoApp.prototype.handlePolygonInput = function (pointNames) {
    const vertexIds = [];
    let i;

    if (!pointNames || pointNames.length < 3) {
        return { success: false, message: '다각형은 점 3개 이상이 필요합니다.' };
    }

    for (i = 0; i < pointNames.length; i++) {
        const pt = this.engine.findPointByName(pointNames[i]);
        if (!pt) {
            return { success: false, message: '점 ' + pointNames[i] + '을(를) 찾을 수 없습니다.' };
        }
        vertexIds.push(pt.id);
    }

    if (!this.engine.findPolygonByVertices(vertexIds)) {
        const name = this.buildPolygonName(vertexIds);
        this.engine.addPolygon(name, vertexIds);
    }
    return { success: true, message: '' };
};

// 대수창 선분 정의 처리 (예: AB)
AlgeoApp.prototype.handleSegmentInput = function (p1, p2, segName) {
    const existing = this.engine.findSegmentByPoints(p1.id, p2.id);
    if (!existing) {
        this.engine.addSegment(segName, p1.id, p2.id);
    }
    return { success: true, message: '' };
};

// 대수창 원 정의 처리 (예: ⊙(A, B))
AlgeoApp.prototype.handleCircleInput = function (centerName, pointName) {
    const center = this.engine.findPointByName(centerName);
    const point = this.engine.findPointByName(pointName);

    if (!center) {
        return { success: false, message: '점 ' + centerName + '을(를) 찾을 수 없습니다.' };
    }
    if (!point) {
        return { success: false, message: '점 ' + pointName + '을(를) 찾을 수 없습니다.' };
    }
    if (center.id === point.id) {
        return { success: false, message: '원의 중심과 둘레 점은 달라야 합니다.' };
    }

    const existing = this.engine.findCircleByCenterAndPoint(center.id, point.id);
    if (!existing) {
        const circleName = '⊙' + center.name;
        this.engine.addCircle(circleName, center.id, point.id);
    }
    return { success: true, message: '' };
};

// HTML 특수문자 이스케이프 (히스토리 표시용)
function escapeHtmlText(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// 테마 적용 — UI data-theme + 캔버스 팔레트 + localStorage
AlgeoApp.prototype.setTheme = function (theme, skipSave) {
    const nextTheme = theme === 'dark' ? 'dark' : 'light';

    this.theme = nextTheme;
    $('.algeo-wrapper').attr('data-theme', nextTheme);
    ALGEO_VIS = getAlgeoVisPalette(nextTheme);

    if (!skipSave) {
        try {
            localStorage.setItem(ALGEO_THEME_STORAGE_KEY, nextTheme);
        } catch (ignoreErr) {
            // localStorage 미지원 환경 무시
        }
    }

    this.syncThemeToggleUI();
    this.renderer.draw();
};

// 테마 토글 버튼 아이콘·라벨 갱신
AlgeoApp.prototype.syncThemeToggleUI = function () {
    const $btn = $('#btnToggleTheme');
    if (!$btn.length) {
        return;
    }
    if (this.theme === 'dark') {
        $btn.html(renderAlgeoIcon('sun', 'bar-icon', true)).attr('title', '라이트 모드').attr('aria-label', '라이트 모드');
    } else {
        $btn.html(renderAlgeoIcon('theme', 'bar-icon', true)).attr('title', '다크 모드').attr('aria-label', '다크 모드');
    }
};

// 저장된 테마 복원 및 토글 버튼 바인딩
AlgeoApp.prototype.initTheme = function () {
    const self = this;
    let saved = null;

    try {
        saved = localStorage.getItem(ALGEO_THEME_STORAGE_KEY);
    } catch (ignoreErr) {
        saved = null;
    }

    if (saved === 'dark' || saved === 'light') {
        this.setTheme(saved, true);
    } else {
        this.setTheme('light', true);
    }

    $('#btnToggleTheme').on('click', function (e) {
        e.stopPropagation();
        self.setTheme(self.theme === 'light' ? 'dark' : 'light');
    });
};

// 격자·스냅 토글 초기화 (localStorage 복원)
AlgeoApp.prototype.initViewToggles = function () {
    const self = this;
    let gridSaved = null;
    let snapSaved = null;

    try {
        gridSaved = localStorage.getItem(ALGEO_GRID_VISIBLE_KEY);
        snapSaved = localStorage.getItem(ALGEO_SNAP_ENABLED_KEY);
    } catch (ignoreErr) {
        gridSaved = null;
        snapSaved = null;
    }

    if (gridSaved === '0') {
        this.renderer.showGrid = false;
    } else if (gridSaved === '1') {
        this.renderer.showGrid = true;
    }

    if (snapSaved === '1') {
        this.renderer.snapEnabled = true;
    } else if (snapSaved === '0') {
        this.renderer.snapEnabled = false;
    }

    this.syncViewToggleUI();

    $('#btnToggleGrid').on('click', function (e) {
        e.stopPropagation();
        self.setGridVisible(!self.renderer.showGrid);
        self.showViewGuide('grid');
    });

    $('#btnToggleSnap').on('click', function (e) {
        e.stopPropagation();
        self.setSnapEnabled(!self.renderer.snapEnabled);
        self.showViewGuide('snap');
    });
};

// 격자 표시 설정
AlgeoApp.prototype.setGridVisible = function (visible) {
    this.renderer.showGrid = !!visible;

    try {
        localStorage.setItem(ALGEO_GRID_VISIBLE_KEY, visible ? '1' : '0');
    } catch (ignoreErr) {
        // localStorage 미지원 환경 무시
    }

    this.syncViewToggleUI();
    this.renderer.draw();
    if (this.guideOverride === 'grid') {
        this.syncToolGuide();
    }
};

// 격자 스냅 설정
AlgeoApp.prototype.setSnapEnabled = function (enabled) {
    this.renderer.snapEnabled = !!enabled;

    try {
        localStorage.setItem(ALGEO_SNAP_ENABLED_KEY, enabled ? '1' : '0');
    } catch (ignoreErr) {
        // localStorage 미지원 환경 무시
    }

    this.syncViewToggleUI();
    if (this.guideOverride === 'snap') {
        this.syncToolGuide();
    }
};

// 격자·스냅 토글 버튼 상태 갱신
AlgeoApp.prototype.syncViewToggleUI = function () {
    const $grid = $('#btnToggleGrid');
    const $snap = $('#btnToggleSnap');

    if ($grid.length) {
        if (this.renderer.showGrid) {
            $grid.addClass('active').attr('title', '격자 숨기기 (G)').attr('aria-label', '격자 숨기기');
        } else {
            $grid.removeClass('active').attr('title', '격자 표시 (G)').attr('aria-label', '격자 표시');
        }
    }

    if ($snap.length) {
        if (this.renderer.snapEnabled) {
            $snap.addClass('active').attr('title', '격자 스냅 끄기 (N)').attr('aria-label', '격자 스냅 끄기');
        } else {
            $snap.removeClass('active').attr('title', '격자 스냅 켜기 (N)').attr('aria-label', '격자 스냅 켜기');
        }
    }
};

// Undo/Redo — 엔진 상태 캡처
AlgeoApp.prototype.captureEngineState = function () {
    return this.engine.exportState();
};

// Undo/Redo — 엔진 상태 복원 후 UI 동기화
AlgeoApp.prototype.restoreEngineState = function (state) {
    this.engine.importState(state);
};

// Undo 스택에 항목 추가 (선행 스냅샷 + 라벨)
AlgeoApp.prototype.pushUndoEntry = function (stateSnapshot, label) {
    if (this.isRestoringHistory) {
        return;
    }
    this.undoStack.push({
        label: label || '작업',
        state: stateSnapshot
    });
    if (this.undoStack.length > ALGEO_UNDO_MAX) {
        this.undoStack.shift();
    }
    this.redoStack = [];
    this.syncHistoryUI();
};

// 변경 직전 현재 상태를 Undo 스택에 기록
AlgeoApp.prototype.recordHistory = function (label) {
    this.pushUndoEntry(this.captureEngineState(), label);
};

// 실행 취소
AlgeoApp.prototype.undo = function () {
    if (this.undoStack.length === 0) {
        return;
    }
    this.isRestoringHistory = true;
    this.redoStack.push({
        label: '되돌리기 전',
        state: this.captureEngineState()
    });
    const entry = this.undoStack.pop();
    this.restoreEngineState(entry.state);
    this.isRestoringHistory = false;
    this.clearToolDraft();
    this.validateAlgebraSelection();
    this.updateAlgebraView();
    this.syncAlgebraPropsPanel();
    this.renderer.draw();
    this.syncHistoryUI();
};

// 다시 실행
AlgeoApp.prototype.redo = function () {
    if (this.redoStack.length === 0) {
        return;
    }
    this.isRestoringHistory = true;
    this.undoStack.push({
        label: '다시 실행 전',
        state: this.captureEngineState()
    });
    const entry = this.redoStack.pop();
    this.restoreEngineState(entry.state);
    this.isRestoringHistory = false;
    this.clearToolDraft();
    this.validateAlgebraSelection();
    this.updateAlgebraView();
    this.syncAlgebraPropsPanel();
    this.renderer.draw();
    this.syncHistoryUI();
};

// 대수창 수식 입력 기록 추가
AlgeoApp.prototype.addFormulaHistory = function (text) {
    let i;

    if (!text) {
        return;
    }
    for (i = 0; i < this.formulaHistory.length; i++) {
        if (this.formulaHistory[i].text === text) {
            this.formulaHistory.splice(i, 1);
            break;
        }
    }
    this.formulaHistory.unshift({ text: text });
    if (this.formulaHistory.length > ALGEO_UNDO_MAX) {
        this.formulaHistory.pop();
    }
    this.syncHistoryUI();
};

// Undo/Redo 버튼·작업 기록 UI 갱신
AlgeoApp.prototype.syncHistoryUI = function () {
    const canUndo = this.undoStack.length > 0;
    const canRedo = this.redoStack.length > 0;
    let html = '';
    let i;
    let entry;
    let formulaItem;

    $('#btnUndo').prop('disabled', !canUndo);
    $('#btnRedo').prop('disabled', !canRedo);

    if (this.undoStack.length === 0 && this.formulaHistory.length === 0) {
        $('#algebraHistoryList').html('<li class="history-empty">아직 기록이 없습니다.</li>');
        return;
    }

    for (i = this.undoStack.length - 1; i >= 0; i--) {
        entry = this.undoStack[i];
        html += '<li class="history-action-item" data-idx="' + i + '">' +
            '<span class="history-action-label">' + escapeHtmlText(entry.label) + '</span>' +
            '</li>';
    }
    for (i = 0; i < this.formulaHistory.length; i++) {
        formulaItem = this.formulaHistory[i];
        html += '<li class="history-formula-item" data-formula-idx="' + i + '">' +
            '<span class="history-formula-tag">수식</span>' +
            '<span class="history-formula-text">' + escapeHtmlText(formulaItem.text) + '</span>' +
            '</li>';
    }
    $('#algebraHistoryList').html(html);
};

// Undo/Redo·수식 기록 패널 이벤트 초기화
AlgeoApp.prototype.initHistory = function () {
    const self = this;

    $('#btnUndo').on('click', function (e) {
        e.stopPropagation();
        self.undo();
    });

    $('#btnRedo').on('click', function (e) {
        e.stopPropagation();
        self.redo();
    });

    $('#algebraHistoryList').on('click', '.history-formula-item', function (e) {
        e.stopPropagation();
        const idx = parseInt($(this).attr('data-formula-idx'), 10);
        const item = self.formulaHistory[idx];
        if (item) {
            $('#algebraInput').val(item.text);
            $('#algebraInput').focus();
            $('#algebraError').text('');
        }
    });

    $('#algebraHistoryList').on('mousedown', function (e) {
        e.stopPropagation();
    });

    this.syncHistoryUI();
};

// 객체 표시/숨김 토글 (대수창 눈 아이콘·단축키 H)
AlgeoApp.prototype.toggleObjectVisibility = function (objId) {
    const obj = this.engine.objectMap[objId];
    const snapshot = this.captureEngineState();
    let label;

    if (!obj) {
        return;
    }

    if (this.engine.isObjectVisible(obj)) {
        this.engine.setObjectVisible(objId, false);
        label = '객체 숨기기';
        if (this.selectedObjectId === objId) {
            this.clearAlgebraSelection();
        }
    } else {
        this.engine.setObjectVisible(objId, true);
        label = '객체 표시';
    }

    this.pushUndoEntry(snapshot, label + ': ' + obj.name);
    this.updateAlgebraView();
    this.renderer.draw();
};

// 숨기기 도구 — 클릭한 보이는 객체 숨김
AlgeoApp.prototype.hideObjectAtClick = function (mouseX, mouseY, hitPoint) {
    let target = null;

    if (hitPoint && this.engine.isObjectVisible(hitPoint)) {
        target = hitPoint;
    } else {
        target = this.findObjectAt(mouseX, mouseY);
    }

    if (!target || !this.engine.isObjectVisible(target)) {
        return;
    }

    this.recordHistory('객체 숨기기');
    this.engine.setObjectVisible(target.id, false);
    if (this.selectedObjectId === target.id) {
        this.clearAlgebraSelection();
    }
    this.updateAlgebraView();
    this.renderer.draw();
};

// 대수창 탭·속성 패널 초기화
AlgeoApp.prototype.initAlgebraSidebar = function () {
    const self = this;

    $('.algebra-tab-btn').on('click', function () {
        const sortMode = $(this).attr('data-sort');
        if (self.algebraSortMode === sortMode) {
            return;
        }
        self.algebraSortMode = sortMode;
        $('.algebra-tab-btn').removeClass('active');
        $(this).addClass('active');
        self.updateAlgebraView();
    });

    $('#algebraPropsPanel').on('click', '.prop-apply-btn', function (e) {
        e.stopPropagation();
        self.applyAlgebraProps();
    });

    $('#algebraPropsPanel').on('keydown', '.prop-input', function (e) {
        if (e.keyCode === 13) {
            e.preventDefault();
            self.applyAlgebraProps();
        }
    });

    $('#algebraPropsPanel').on('mousedown click', function (e) {
        e.stopPropagation();
    });

    $('#algebraList').on('click', '.obj-visibility-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const objId = $(this).closest('.algebra-item').attr('data-id');
        self.toggleObjectVisibility(objId);
    });
};

// 대수창 정렬된 객체 목록 반환
AlgeoApp.prototype.getSortedAlgebraObjects = function () {
    const list = this.engine.objects.slice();
    let i;

    if (this.algebraSortMode === 'type') {
        list.sort(function (a, b) {
            const orderA = ALGEBRA_TYPE_ORDER[a.type];
            const orderB = ALGEBRA_TYPE_ORDER[b.type];
            const oa = orderA !== undefined ? orderA : 99;
            const ob = orderB !== undefined ? orderB : 99;
            if (oa !== ob) {
                return oa - ob;
            }
            return a.name.localeCompare(b.name);
        });
    }

    return list;
};

// 선택 객체 속성 패널 HTML 생성
AlgeoApp.prototype.buildAlgebraPropsHtml = function (obj) {
    let html = '';
    let p1;
    let p2;
    let center;
    let point;
    let dx;
    let dy;
    let len;
    let radius;
    let deg;

    html += '<div class="algebra-props-title">' + obj.name + ' <span class="props-type">' + obj.type + '</span></div>';

    if (obj.type === 'POINT') {
        html += '<div class="algebra-props-form">';
        html += '<label class="prop-field">x <input type="text" class="prop-input" data-prop="x" value="' + obj.x.toFixed(2) + '" /></label>';
        html += '<label class="prop-field">y <input type="text" class="prop-input" data-prop="y" value="' + obj.y.toFixed(2) + '" /></label>';
        html += '<button type="button" class="prop-apply-btn">적용</button>';
        html += '</div>';
        return html;
    }

    if (obj.type === 'SEGMENT') {
        p1 = this.engine.objectMap[obj.p1Id];
        p2 = this.engine.objectMap[obj.p2Id];
        if (p1 && p2) {
            dx = p2.x - p1.x;
            dy = p2.y - p1.y;
            len = Math.sqrt(dx * dx + dy * dy);
            html += '<div class="algebra-props-form">';
            html += '<p class="props-readonly">끝점: ' + p1.name + ', ' + p2.name + '</p>';
            html += '<label class="prop-field">길이 <input type="text" class="prop-input" data-prop="length" value="' + len.toFixed(2) + '" /></label>';
            html += '<label class="prop-field">슬라이더 <input type="text" class="prop-input" data-prop="lengthVar" value="' + (obj.lengthVar || '') + '" placeholder="a" /></label>';
            html += '<button type="button" class="prop-apply-btn">적용</button>';
            html += '</div>';
        }
        return html;
    }

    if (obj.type === 'CIRCLE') {
        center = this.engine.objectMap[obj.centerId];
        point = this.engine.objectMap[obj.pointId];
        if (center && point) {
            dx = point.x - center.x;
            dy = point.y - center.y;
            radius = Math.sqrt(dx * dx + dy * dy);
            html += '<div class="algebra-props-form">';
            html += '<p class="props-readonly">중심: ' + center.name + '</p>';
            html += '<label class="prop-field">반지름 <input type="text" class="prop-input" data-prop="radius" value="' + radius.toFixed(2) + '" /></label>';
            html += '<label class="prop-field">슬라이더 <input type="text" class="prop-input" data-prop="radiusVar" value="' + (obj.radiusVar || '') + '" placeholder="a" /></label>';
            html += '<button type="button" class="prop-apply-btn">적용</button>';
            html += '</div>';
        }
        return html;
    }

    if (obj.type === 'SLIDER') {
        html += '<div class="algebra-props-form">';
        html += '<label class="prop-field">최소 <input type="text" class="prop-input" data-prop="min" value="' + obj.min + '" /></label>';
        html += '<label class="prop-field">최대 <input type="text" class="prop-input" data-prop="max" value="' + obj.max + '" /></label>';
        html += '<label class="prop-field">값 <input type="text" class="prop-input" data-prop="value" value="' + obj.value + '" /></label>';
        html += '<label class="prop-field">간격 <input type="text" class="prop-input" data-prop="step" value="' + obj.step + '" /></label>';
        html += '<button type="button" class="prop-apply-btn">적용</button>';
        html += '</div>';
        return html;
    }

    if (obj.type === 'FUNCTION') {
        html += '<div class="algebra-props-form">';
        html += '<label class="prop-field">기울기 a <input type="text" class="prop-input" data-prop="slope" value="' + obj.slope + '" /></label>';
        html += '<label class="prop-field">절편 b <input type="text" class="prop-input" data-prop="intercept" value="' + obj.intercept + '" /></label>';
        html += '<button type="button" class="prop-apply-btn">적용</button>';
        html += '</div>';
        return html;
    }

    html += '<div class="algebra-props-readonly">';
    if (obj.type === 'MIDPOINT') {
        html += '<p>좌표 (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')</p>';
        html += '<p class="props-note">종속 객체 — 부모 점을 이동하면 함께 바뀝니다.</p>';
    } else if (obj.type === 'INTERSECTION') {
        html += '<p>좌표 (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')</p>';
        html += '<p class="props-note">교점 — 부모 도형을 이동하면 함께 바뀝니다.</p>';
    } else if (obj.type === 'POINT_ON') {
        html += '<p>좌표 (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')</p>';
        html += '<p class="props-note">대상 위의 점 — 부모 도형을 따라 움직입니다.</p>';
    } else if (obj.type === 'REGULAR_VERTEX') {
        html += '<p>좌표 (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')</p>';
        html += '<p class="props-note">정다각형 꼭짓점 — 기준 점을 이동하면 함께 바뀝니다.</p>';
    } else if (obj.type === 'FIXED_ANGLE_POINT') {
        html += '<p>좌표 (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')</p>';
        html += '<p class="props-note">고정각 끝점 — ' + obj.degrees + '° · 부모 점을 이동하면 함께 바뀝니다.</p>';
    } else if (obj.type === 'ANGLE') {
        deg = this.engine.getAngleDegrees(obj);
        html += '<p>각도 ' + (deg !== null ? deg.toFixed(1) : '?') + '\u00B0</p>';
        html += '<p class="props-note">종속 객체 — 꼭짓점·변의 점을 이동하세요.</p>';
    } else {
        html += '<p class="props-note">이 객체는 직접 편집할 수 없습니다.<br>캔버스에서 부모 점을 이동하거나 삭제하세요.</p>';
    }
    html += '</div>';
    return html;
};

// 선택 객체 속성 패널 갱신
AlgeoApp.prototype.syncAlgebraPropsPanel = function () {
    const $panel = $('#algebraPropsPanel');
    const objId = this.selectedObjectId;
    let obj;

    if (!objId) {
        $panel.html('<p class="algebra-props-placeholder">객체를 선택하면 속성을 편집할 수 있습니다.</p>');
        return;
    }

    obj = this.engine.objectMap[objId];
    if (!obj) {
        $panel.html('<p class="algebra-props-placeholder">객체를 선택하면 속성을 편집할 수 있습니다.</p>');
        return;
    }

    $panel.html(this.buildAlgebraPropsHtml(obj));
};

// 속성 패널 입력값 적용
AlgeoApp.prototype.applyAlgebraProps = function () {
    const objId = this.selectedObjectId;
    const obj = this.engine.objectMap[objId];
    let xVal;
    let yVal;
    let numVal;
    let slopeVal;
    let interceptVal;
    let minVal;
    let maxVal;
    let stepVal;
    let varName;

    if (!obj) {
        return;
    }

    $('#algebraError').text('');

    const snapshot = this.captureEngineState();

    if (obj.type === 'POINT') {
        xVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="x"]').val());
        yVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="y"]').val());
        if (isNaN(xVal) || isNaN(yVal)) {
            $('#algebraError').text('좌표는 숫자여야 합니다.');
            return;
        }
        this.engine.movePoint(obj.id, xVal, yVal);
    } else if (obj.type === 'SEGMENT') {
        varName = ($('#algebraPropsPanel .prop-input[data-prop="lengthVar"]').val() || '').replace(/^\s+|\s+$/g, '').toLowerCase();
        if (varName) {
            if (!this.engine.findSliderByName(varName)) {
                $('#algebraError').text('슬라이더 ' + varName + '을(를) 찾을 수 없습니다.');
                return;
            }
            obj.lengthVar = varName;
            numVal = this.engine.getSliderValue(varName);
            if (!this.engine.setSegmentLength(obj.id, numVal)) {
                $('#algebraError').text('선분 길이를 변경할 수 없습니다.');
                return;
            }
        } else {
            obj.lengthVar = null;
            numVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="length"]').val());
            if (isNaN(numVal) || numVal <= 0) {
                $('#algebraError').text('길이는 0보다 큰 숫자여야 합니다.');
                return;
            }
            if (!this.engine.setSegmentLength(obj.id, numVal)) {
                $('#algebraError').text('선분 길이를 변경할 수 없습니다.');
                return;
            }
        }
    } else if (obj.type === 'CIRCLE') {
        varName = ($('#algebraPropsPanel .prop-input[data-prop="radiusVar"]').val() || '').replace(/^\s+|\s+$/g, '').toLowerCase();
        if (varName) {
            if (!this.engine.findSliderByName(varName)) {
                $('#algebraError').text('슬라이더 ' + varName + '을(를) 찾을 수 없습니다.');
                return;
            }
            obj.radiusVar = varName;
            numVal = this.engine.getSliderValue(varName);
            if (!this.engine.setCircleRadius(obj.id, numVal)) {
                $('#algebraError').text('반지름을 변경할 수 없습니다.');
                return;
            }
        } else {
            obj.radiusVar = null;
            numVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="radius"]').val());
            if (isNaN(numVal) || numVal <= 0) {
                $('#algebraError').text('반지름은 0보다 큰 숫자여야 합니다.');
                return;
            }
            if (!this.engine.setCircleRadius(obj.id, numVal)) {
                $('#algebraError').text('반지름을 변경할 수 없습니다.');
                return;
            }
        }
    } else if (obj.type === 'SLIDER') {
        minVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="min"]').val());
        maxVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="max"]').val());
        numVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="value"]').val());
        stepVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="step"]').val());
        if (isNaN(minVal) || isNaN(maxVal) || isNaN(numVal) || isNaN(stepVal) || stepVal <= 0) {
            $('#algebraError').text('슬라이더 범위·값·간격을 확인하세요.');
            return;
        }
        if (maxVal <= minVal) {
            $('#algebraError').text('최대값은 최소값보다 커야 합니다.');
            return;
        }
        obj.min = minVal;
        obj.max = maxVal;
        obj.step = stepVal;
        this.engine.setSliderValue(obj.id, numVal);
    } else if (obj.type === 'FUNCTION') {
        slopeVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="slope"]').val());
        interceptVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="intercept"]').val());
        if (isNaN(slopeVal) || isNaN(interceptVal)) {
            $('#algebraError').text('기울기·절편은 숫자여야 합니다.');
            return;
        }
        obj.slope = slopeVal;
        obj.intercept = interceptVal;
        obj.rhsRaw = null;
        obj.expression = this.formatFunctionExpression(slopeVal, interceptVal);
        obj.exprKey = this.normalizeExprKey(String(slopeVal) + 'x' + String(interceptVal));
    } else {
        return;
    }

    this.pushUndoEntry(snapshot, '속성 편집: ' + obj.name);
    this.updateAlgebraView();
    this.renderer.draw();
};

// 대수창 렌더링 업데이트
AlgeoApp.prototype.updateAlgebraView = function () {
    const $list = $('#algebraList');
    $list.empty();

    const objects = this.getSortedAlgebraObjects();
    if (objects.length === 0) {
        $list.append('<div class="empty-msg">오브젝트가 없습니다.</div>');
        return;
    }

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        let desc = '';

        if (obj.type === 'POINT') {
            desc = '(' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')';
        } else if (obj.type === 'SEGMENT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                const len = Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
                desc = '선분 ' + p1.name + p2.name + ' (길이: ' + len.toFixed(2) + ')';
            }
        } else if (obj.type === 'VECTOR') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                desc = '벡터 ' + p1.name + p2.name;
            }
        } else if (obj.type === 'LINE') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                desc = '직선 ' + p1.name + p2.name;
            }
        } else if (obj.type === 'RAY') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                desc = '반직선 ' + p1.name + p2.name;
            }
        } else if (obj.type === 'MIDPOINT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                desc = '중점 ' + p1.name + p2.name + ' (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')';
            }
        } else if (obj.type === 'INTERSECTION') {
            const o1 = this.engine.objectMap[obj.obj1Id];
            const o2 = this.engine.objectMap[obj.obj2Id];
            if (o1 && o2) {
                desc = '교점 ' + o1.name + '∩' + o2.name +
                    ' (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')';
            }
        } else if (obj.type === 'POINT_ON') {
            const host = this.engine.objectMap[obj.hostId];
            if (host) {
                desc = host.name + ' 위의 점 (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')';
            }
        } else if (obj.type === 'REGULAR_VERTEX') {
            desc = '정다각형 꼭짓점 (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')';
        } else if (obj.type === 'FIXED_ANGLE_POINT') {
            desc = '고정각 ' + obj.degrees + '° (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')';
        } else if (obj.type === 'PERP_BISECTOR') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                desc = '수직이등분선 ' + p1.name + p2.name;
            }
        } else if (obj.type === 'ANGLE_BISECTOR') {
            const r1 = this.engine.objectMap[obj.ray1Id];
            const v = this.engine.objectMap[obj.vertexId];
            const r2 = this.engine.objectMap[obj.ray2Id];
            if (r1 && v && r2) {
                desc = '각이등분선 ∠' + r1.name + v.name + r2.name;
            }
        } else if (obj.type === 'TANGENT') {
            const c = this.engine.objectMap[obj.circleId];
            const p = this.engine.objectMap[obj.pointId];
            if (c && p) {
                desc = '접선 ' + c.name + '–' + p.name;
            }
        } else if (obj.type === 'PARALLEL_LINE') {
            const ref1 = this.engine.objectMap[obj.refP1Id];
            const ref2 = this.engine.objectMap[obj.refP2Id];
            const through = this.engine.objectMap[obj.throughId];
            if (ref1 && ref2 && through) {
                desc = '평행선 ∥' + ref1.name + ref2.name + ' (통과: ' + through.name + ')';
            }
        } else if (obj.type === 'PERP_LINE') {
            const ref1 = this.engine.objectMap[obj.refP1Id];
            const ref2 = this.engine.objectMap[obj.refP2Id];
            const through = this.engine.objectMap[obj.throughId];
            if (ref1 && ref2 && through) {
                desc = '수직선 ⊥' + ref1.name + ref2.name + ' (통과: ' + through.name + ')';
            }
        } else if (obj.type === 'CIRCLE' || obj.type === 'CIRCLE_3P') {
            const circ = this.engine.getCircleGeometry(obj);
            if (circ) {
                if (obj.type === 'CIRCLE_3P') {
                    const p1 = this.engine.objectMap[obj.p1Id];
                    const p2 = this.engine.objectMap[obj.p2Id];
                    const p3 = this.engine.objectMap[obj.p3Id];
                    if (p1 && p2 && p3) {
                        desc = '원 (세 점: ' + p1.name + ',' + p2.name + ',' + p3.name +
                            ', r=' + circ.radius.toFixed(2) + ')';
                    }
                } else {
                    const center = this.engine.objectMap[obj.centerId];
                    const point = this.engine.objectMap[obj.pointId];
                    if (center && point) {
                        desc = '원 (중심: ' + center.name + ', 반지름: ' + circ.radius.toFixed(2) + ')';
                    }
                }
            }
        } else if (obj.type === 'SECTOR') {
            const center = this.engine.objectMap[obj.centerId];
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (center && p1 && p2) {
                desc = '부채꼴 ' + center.name + '-' + p1.name + '-' + p2.name;
            }
        } else if (obj.type === 'CIRCULAR_SEGMENT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            const guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                desc = '활꼴 ' + p1.name + '\u2312' + p2.name + ' (\u2191' + guide.name + ')';
            }
        } else if (obj.type === 'ANGLE') {
            const deg = this.engine.getAngleDegrees(obj);
            const ray1 = this.engine.objectMap[obj.ray1Id];
            const vertex = this.engine.objectMap[obj.vertexId];
            const ray2 = this.engine.objectMap[obj.ray2Id];
            if (ray1 && vertex && ray2 && deg !== null) {
                desc = ray1.name + vertex.name + ray2.name + ' (' + deg.toFixed(1) + '\u00B0)';
            }
        } else if (obj.type === 'ARC') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            const guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                desc = p1.name + '\u2312' + p2.name + ' (\u2191' + guide.name + ')';
            }
        } else if (obj.type === 'POLYGON') {
            const names = [];
            let vi;
            for (vi = 0; vi < obj.vertexIds.length; vi++) {
                const vp = this.engine.objectMap[obj.vertexIds[vi]];
                if (vp) {
                    names.push(vp.name);
                }
            }
            desc = names.join('-') + ' (' + obj.vertexIds.length + '\uAC01\uD615)';
        } else if (obj.type === 'FUNCTION') {
            desc = obj.rhsRaw ? ('y = ' + obj.rhsRaw) : obj.expression;
        } else if (obj.type === 'SLIDER') {
            desc = '슬라이더 [' + obj.min + ', ' + obj.max + '] = ' + obj.value.toFixed(2);
        }

        const isVisible = this.engine.isObjectVisible(obj);
        const itemClass = 'algebra-item' + (isVisible ? '' : ' algebra-item-hidden');
        const visLabel = isVisible ? '숨기기' : '표시';
        const visIcon = isVisible ? '\u25C9' : '\u25CB';

        const itemHtml =
            '<div class="' + itemClass + '" data-id="' + obj.id + '">' +
            '    <button type="button" class="obj-visibility-btn" title="' + visLabel + '" aria-label="' + visLabel + '">' + visIcon + '</button>' +
            '    <span class="obj-color-indicator ' + obj.type.toLowerCase() + '"></span>' +
            '    <div class="obj-info">' +
            '        <span class="obj-name">' + obj.name + '</span>' +
            '        <span class="obj-desc">' + desc + '</span>' +
            '    </div>' +
            '</div>';

        $list.append(itemHtml);
    }

    this.validateAlgebraSelection();
    this.syncAlgebraItemActiveState();
    this.syncAlgebraPropsPanel();
};

// 삭제 등으로 선택 객체가 없어졌는지 확인
AlgeoApp.prototype.validateAlgebraSelection = function () {
    if (this.selectedObjectId && !this.engine.objectMap[this.selectedObjectId]) {
        this.selectedObjectId = null;
        this.renderer.selectedObjectId = null;
    }
};

// 대수창 입력 보조 UI 초기화 (명령어 사전만)
AlgeoApp.prototype.initAlgebraInputAssist = function () {
    const self = this;

    self.renderCmdDict();

    $('#btnAlgebraSubmit').on('click', function () {
        self.handleAlgebraInput();
    });

    $('#btnCmdDict').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $('#btnCmdDict').on('click', function (e) {
        e.stopPropagation();
        self.toggleCmdDict();
    });

    $('#algebraInput').on('keydown', function (e) {
        if (e.keyCode === 13) {
            self.handleAlgebraInput();
            e.preventDefault();
        } else if (e.keyCode === 27) {
            self.closeCmdDict();
        }
    });

    $('#algebraCmdDict').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $('#algebraCmdDict').on('click', function (e) {
        e.stopPropagation();
    });

    // 명령어 사전 항목 클릭 → 입력창에 채우기
    $('#algebraCmdDict').on('click', '.algebra-cmd-item', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const idx = parseInt($(this).attr('data-idx'), 10);
        self.applyAlgebraCommand(ALGEBRA_COMMANDS[idx]);
        $('#algebraInput').focus();
    });

    $(document).on('click', function (e) {
        if (!self.algebraCmdDictOpen) {
            return;
        }
        if ($(e.target).closest('#btnCmdDict, #algebraCmdDict, .sidebar-input-area').length) {
            return;
        }
        self.closeCmdDict();
    });
};

// 명령어 사전 패널 렌더
AlgeoApp.prototype.renderCmdDict = function () {
    const $dict = $('#algebraCmdDict');
    let html = '';
    let i;
    let cmd;

    for (i = 0; i < ALGEBRA_COMMANDS.length; i++) {
        cmd = ALGEBRA_COMMANDS[i];
        html += '<div class="algebra-cmd-item" data-idx="' + i + '">' +
            '<span class="cmd-item-label">' + cmd.label + '</span>' +
            '<span class="cmd-item-syntax">' + cmd.syntax + '</span>' +
            '<span class="cmd-item-desc">' + cmd.desc + '</span>' +
            '</div>';
    }

    $dict.html(html);
};

// 명령어 사전 닫기
AlgeoApp.prototype.closeCmdDict = function () {
    this.algebraCmdDictOpen = false;
    $('#algebraCmdDict').removeClass('open');
};

// 명령어 사전 토글
AlgeoApp.prototype.toggleCmdDict = function () {
    this.algebraCmdDictOpen = !this.algebraCmdDictOpen;
    if (this.algebraCmdDictOpen) {
        $('#algebraCmdDict').addClass('open');
        this.closeShortcutPanel();
    } else {
        this.closeCmdDict();
    }
};

// 명령어 사전에서 선택한 예시를 입력창에 채움
AlgeoApp.prototype.applyAlgebraCommand = function (cmd) {
    if (!cmd) {
        return;
    }
    $('#algebraInput').val(cmd.example);
    $('#algebraError').text('');
    this.closeCmdDict();
};

// 대수창 수식 입력 처리 (예: A = (1, 2))
AlgeoApp.prototype.handleAlgebraInput = function () {
    const input = $('#algebraInput').val();
    const trimmed = (input || '').replace(/^\s+|\s+$/g, '');
    const snapshot = this.captureEngineState();
    const result = this.parseAlgebraInput(input);

    if (result.success) {
        this.pushUndoEntry(snapshot, '수식: ' + trimmed);
        this.addFormulaHistory(trimmed);
        $('#algebraError').text('');
        $('#algebraInput').val('');
        this.closeCmdDict();
        this.updateAlgebraView();
        this.renderer.draw();
    } else {
        $('#algebraError').text(result.message);
    }
};

/**
 * 대수창 수식 파싱 — 점·함수·선분·원 정의문 해석
 * @param {string} input 예: "A = (1, 2)", "y = 2x + 1", "AB", "⊙(A, B)"
 * @returns {{ success: boolean, message: string }}
 */
AlgeoApp.prototype.parseAlgebraInput = function (input) {
    const trimmed = (input || '').replace(/^\s+|\s+$/g, '');
    if (!trimmed) {
        return { success: false, message: '수식을 입력해 주세요.' };
    }

    // 점 좌표: A = (1, 2)
    const pointMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9]*)\s*=\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*\)$/);
    if (pointMatch) {
        const name = pointMatch[1];
        const x = parseFloat(pointMatch[2]);
        const y = parseFloat(pointMatch[3]);
        const existing = this.engine.findPointByName(name);

        if (existing) {
            this.engine.movePoint(existing.id, x, y);
        } else {
            this.engine.addPoint(name, x, y);
        }
        return { success: true, message: '' };
    }

    // 슬라이더: a = Slider(0, 10) 또는 a = Slider(0, 10, 3, 0.5)
    const sliderMatch = trimmed.match(/^([a-z])\s*=\s*slider\s*\(\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s*,\s*(-?\d+(?:\.\d+)?))?(?:\s*,\s*(-?\d+(?:\.\d+)?))?\s*\)$/i);
    if (sliderMatch) {
        const sliderName = sliderMatch[1].toLowerCase();
        const sMin = parseFloat(sliderMatch[2]);
        const sMax = parseFloat(sliderMatch[3]);
        let sValue = sliderMatch[4] !== undefined ? parseFloat(sliderMatch[4]) : ALGEO_SLIDER_DEFAULT_VALUE;
        let sStep = sliderMatch[5] !== undefined ? parseFloat(sliderMatch[5]) : ALGEO_SLIDER_DEFAULT_STEP;
        const r = this.renderer;
        let anchorX;
        let anchorY;
        let existingSlider;

        if (isNaN(sMin) || isNaN(sMax) || isNaN(sValue) || isNaN(sStep) || sMax <= sMin || sStep <= 0) {
            return { success: false, message: '슬라이더 범위·값·간격을 확인하세요.' };
        }

        existingSlider = this.engine.findSliderByName(sliderName);
        if (existingSlider) {
            existingSlider.min = sMin;
            existingSlider.max = sMax;
            existingSlider.step = sStep;
            this.engine.setSliderValue(existingSlider.id, sValue);
        } else {
            anchorX = (r.toMathX(0) + r.toMathX(r.canvas.width)) / 2;
            anchorY = (r.toMathY(r.canvas.height) + r.toMathY(0)) / 2;
            this.engine.addSlider(sliderName, sMin, sMax, sValue, sStep, anchorX, anchorY);
        }
        return { success: true, message: '' };
    }

    // 일차함수: y = 2x + 1 또는 y = ax + b (슬라이더 변수)
    const funcMatch = trimmed.match(/^y\s*=\s*(.+)$/i);
    if (funcMatch) {
        const rhsRaw = funcMatch[1].replace(/^\s+|\s+$/g, '');
        const rhsKey = this.normalizeExprKey(rhsRaw);
        let linear = this.engine.resolveLinearRhs(rhsRaw);
        let slope;
        let intercept;
        let expression;
        let hasVar;

        if (!linear) {
            const numeric = this.parseLinearRhs(rhsRaw);
            if (!numeric.success) {
                return { success: false, message: numeric.message };
            }
            slope = numeric.slope;
            intercept = numeric.intercept;
        } else {
            slope = linear.slope;
            intercept = linear.intercept;
        }

        hasVar = /[a-z]/.test(rhsKey);
        expression = hasVar ? ('y = ' + rhsRaw.replace(/\s+/g, '')) : this.formatFunctionExpression(slope, intercept);
        const exprKey = hasVar ? ('var:' + rhsKey) : this.normalizeExprKey(rhsRaw);
        const existingFunc = this.engine.findFunctionByExprKey(exprKey);

        if (existingFunc) {
            existingFunc.slope = slope;
            existingFunc.intercept = intercept;
            existingFunc.expression = expression;
            existingFunc.rhsRaw = hasVar ? rhsRaw.replace(/\s+/g, '').replace(/\*/g, '') : null;
        } else {
            const funcName = this.getNextFunctionName();
            const funcObj = this.engine.addFunction(funcName, expression, exprKey, slope, intercept);
            if (funcObj && hasVar) {
                funcObj.rhsRaw = rhsRaw.replace(/\s+/g, '').replace(/\*/g, '');
            }
        }
        return { success: true, message: '' };
    }

    // 중점: Midpoint(A, B)
    const midMatch = trimmed.match(/^midpoint\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/i);
    if (midMatch) {
        return this.handleMidpointInput(midMatch[1], midMatch[2]);
    }

    // 수직이등분선: PerpBisector(A, B)
    const pbMatch = trimmed.match(/^perpbisector\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/i);
    if (pbMatch) {
        return this.handlePerpBisectorInput(pbMatch[1], pbMatch[2]);
    }

    // 수직선: Perpendicular(A, B, C) — PerpBisector보다 먼저 검사 (Perp 접두어 충돌 방지)
    const perpLineMatch = trimmed.match(/^perpendicular\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/i);
    if (perpLineMatch) {
        return this.handlePerpLineInput(perpLineMatch[1], perpLineMatch[2], perpLineMatch[3]);
    }

    // 평행선: Parallel(A, B, C)
    const parallelMatch = trimmed.match(/^parallel\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/i);
    if (parallelMatch) {
        return this.handleParallelLineInput(parallelMatch[1], parallelMatch[2], parallelMatch[3]);
    }

    // 각도: Angle(A, B, C) — B가 꼭짓점
    const angleMatch = trimmed.match(/^angle\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/i);
    if (angleMatch) {
        return this.handleAngleInput(angleMatch[1], angleMatch[2], angleMatch[3]);
    }

    // 호: Arc(O, A, B)
    const arcMatch = trimmed.match(/^arc\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/i);
    if (arcMatch) {
        return this.handleArcInput(arcMatch[1], arcMatch[2], arcMatch[3]);
    }

    // 다각형: Polygon(A, B, C, ...)
    const polyMatch = trimmed.match(/^polygon\s*\(\s*([A-Za-z][A-Za-z0-9]*(?:\s*,\s*[A-Za-z][A-Za-z0-9]*)+)\s*\)$/i);
    if (polyMatch) {
        const parts = polyMatch[1].split(',');
        const names = [];
        let pi;
        for (pi = 0; pi < parts.length; pi++) {
            const n = parts[pi].replace(/^\s+|\s+$/g, '');
            if (n) {
                names.push(n);
            }
        }
        return this.handlePolygonInput(names);
    }

    // 직선: Line(A, B)
    const lineWordMatch = trimmed.match(/^line\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/i);
    if (lineWordMatch) {
        return this.handleLineInput(lineWordMatch[1], lineWordMatch[2]);
    }

    // 원: Circle(A, C) — ⊙ 기호 없이 영문으로 입력 (권장)
    const circleWordMatch = trimmed.match(/^circle\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/i);
    if (circleWordMatch) {
        return this.handleCircleInput(circleWordMatch[1], circleWordMatch[2]);
    }

    // 원: CircleAC — Circle(A,C) 축약형
    const circleWordShortMatch = trimmed.match(/^circle\s*([A-Za-z][A-Za-z0-9]+)$/i);
    if (circleWordShortMatch) {
        const circleWordParsed = this.parseTwoPointNames(circleWordShortMatch[1]);
        if (!circleWordParsed.success) {
            return { success: false, message: '원 정의에 필요한 두 점을 찾을 수 없습니다. 예: Circle(A, C)' };
        }
        return this.handleCircleInput(circleWordParsed.name1, circleWordParsed.name2);
    }

    // 원: ⊙(A, B) — 특수문자 입력 가능할 때
    const circleParenMatch = trimmed.match(/^⊙\s*\(\s*([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)\s*\)$/);
    if (circleParenMatch) {
        return this.handleCircleInput(circleParenMatch[1], circleParenMatch[2]);
    }

    // 원: ⊙AC — ⊙(A,C) 축약형
    const circleShortMatch = trimmed.match(/^⊙\s*([A-Za-z][A-Za-z0-9]+)$/);
    if (circleShortMatch) {
        const circleParsed = this.parseTwoPointNames(circleShortMatch[1]);
        if (!circleParsed.success) {
            return { success: false, message: '원 정의에 필요한 두 점을 찾을 수 없습니다. 예: Circle(A, C)' };
        }
        return this.handleCircleInput(circleParsed.name1, circleParsed.name2);
    }

    // 선분: D, E — 쉼표로 두 점 구분 (소문자 de보다 명확)
    const segmentCommaMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9]*)\s*,\s*([A-Za-z][A-Za-z0-9]*)$/);
    if (segmentCommaMatch) {
        const commaParsed = this.parseCommaPointNames(segmentCommaMatch[1], segmentCommaMatch[2]);
        if (!commaParsed.success) {
            return { success: false, message: commaParsed.message };
        }
        return this.handleSegmentInput(commaParsed.p1, commaParsed.p2, commaParsed.segmentName);
    }

    // 선분: AB 또는 de — 붙여 쓰기 (대소문자 무시 검색)
    const segmentMatch = trimmed.match(/^([A-Za-z][A-Za-z0-9]+)$/);
    if (segmentMatch) {
        const segParsed = this.parseTwoPointNames(segmentMatch[1]);
        if (!segParsed.success) {
            return { success: false, message: segParsed.message };
        }
        return this.handleSegmentInput(segParsed.p1, segParsed.p2, segParsed.segmentName);
    }

    return {
        success: false,
        message: '지원 형식: A=(1,2), Polygon(A,B,C), Angle(A,B,C), Arc(O,A,B), Line(A,B)'
    };
};

