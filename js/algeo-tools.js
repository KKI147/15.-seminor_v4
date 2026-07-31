// 알지오메스 — 도구 카탈로그·가이드·단축키·레일 헬퍼
// algeo-icons.js 이후 로드 · refactor_modules.md 참고
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
            { tool: 'SELECT', label: '선택', iconId: 'select', status: 'done', hint: '클릭 선택 · Shift 토글 · 드래그 이동' },
            { tool: 'GROUP_SELECT', label: '그룹선택', iconId: 'group_select', status: 'done', shortcut: 'Shift+G', hint: '드래그 박스 · 다중 선택' }
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
            { tool: 'INSERT_IMAGE', label: '그림 넣기', iconId: 'insert_image', status: 'done', hint: '위치 클릭 → 이미지 파일 선택' },
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
            { tool: 'MEASURE_LENGTH', label: '길이', iconId: 'measure_length', status: 'done', hint: '점 2개 또는 선분·벡터' },
            { tool: 'MEASURE_ANGLE', label: '각도', iconId: 'measure_angle', status: 'done', hint: '점 3개 또는 각도 객체' },
            { tool: 'MEASURE_AREA', label: '넓이', iconId: 'measure_area', status: 'done', hint: '다각형·원·부채꼴·활꼴' },
            { tool: 'REFLECT_POINT', label: '점대칭', iconId: 'reflect_point', status: 'done', shortcut: 'R', hint: '선택 후 기준점 클릭' },
            { tool: 'REFLECT_LINE', label: '선대칭', iconId: 'reflect_line', status: 'done', hint: '선택 후 기준선의 두 점 클릭' },
            { tool: 'ROTATE', label: '회전', iconId: 'rotate', status: 'done', hint: '선택 후 중심점·각도 입력' },
            { tool: 'TRANSLATE', label: '평행이동', iconId: 'translate', status: 'done', hint: '선택 후 시작점·끝점 클릭' },
            { tool: 'DILATE', label: '점을 중심으로 확대', iconId: 'dilate', status: 'done', hint: '선택 후 중심점·배율 입력' },
            { tool: 'TILE', label: '타일', iconId: 'tile', status: 'done', hint: '도형 선택 → 위치 클릭 → 회전·대칭' }
        ]
    },
    {
        id: 'misc',
        iconId: 'cat-misc',
        title: '기타·객체',
        tools: [
            { tool: 'TEXT', label: '텍스트', iconId: 'text', status: 'done', shortcut: 'T', hint: '클릭 위치에 텍스트 배치' },
            { tool: 'SLIDER', label: '슬라이더', iconId: 'slider', status: 'done', hint: '캔버스 클릭 생성' },
            { tool: 'USER_TOOL', label: '사용자 도구', iconId: 'user_tool', status: 'stub', hint: '사용자 정의 (11-2)' },
            { tool: 'CHECKBOX', label: '체크박스', iconId: 'checkbox', status: 'done', hint: '클릭 배치 · 선택 시 토글' },
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
            { tool: 'DECORATE_LEADER', label: '꾸미기: 설명선', iconId: 'decorate_leader', status: 'done', shortcut: 'E', hint: '시작점·끝점·문구 지정' },
            { tool: 'DECORATE_LENGTH', label: '꾸미기: 길이', iconId: 'decorate_length', status: 'done', hint: '선형 객체 클릭' },
            { tool: 'DECORATE_ANGLE', label: '꾸미기: 각도', iconId: 'decorate_angle', status: 'done', hint: '각 객체 또는 세 점 선택' },
            { tool: 'DECORATE_PARALLEL', label: '꾸미기: 평행', iconId: 'decorate_parallel', status: 'done', hint: '선형 객체 두 개 선택' },
            { tool: 'PEN', label: '그리기', iconId: 'pen', status: 'done', shortcut: 'B', hint: '드래그로 자유곡선' }
        ]
    },
    {
        id: 'settings',
        iconId: 'cat-settings',
        title: '설정',
        railOnly: true,
        railHint: '테마 · 격자 · 스냅 · 축 표시를 한곳에서 조절합니다.'
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
    SELECT: {
        summary: '객체를 클릭해 선택하고, 선택한 객체를 이동·삭제합니다.',
        steps: [
            '객체를 클릭하면 선택됩니다.',
            'Shift+클릭으로 선택을 추가하거나 해제합니다.',
            '선택된 객체를 드래그하면 이동합니다.'
        ],
        tips: ['빈 곳 클릭 — 선택 해제', 'Delete — 선택 삭제', 'H — 선택 숨김', 'Esc — 이동 도구']
    },
    GROUP_SELECT: {
        summary: '드래그 상자로 여러 객체를 한꺼번에 선택합니다.',
        steps: [
            '빈 곳을 드래그해 선택 상자를 그립니다.',
            '상자 안의 객체가 선택됩니다.',
            'Shift+드래그로 기존 선택에 추가합니다.'
        ],
        tips: ['클릭으로도 단건 선택 가능', 'Delete — 선택 삭제', '단축키 Shift+G']
    },
    // ── stub 도구 (5단계 UI 맵 — 엔진 미구현) ──
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
        summary: '클릭한 위치에 그림(이미지)을 넣습니다.',
        steps: [
            '그림을 둘 위치를 클릭합니다.',
            '이미지 파일을 선택합니다.'
        ],
        tips: ['이동·선택 도구로 위치 이동', '대수창에서 너비 조절', 'JSON 저장 시 이미지도 포함']
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
        summary: '두 점 사이(또는 선분·벡터) 길이를 측정합니다.',
        steps: [
            '선분·벡터를 클릭하거나, 첫 번째 점을 클릭합니다.',
            '두 번째 점을 클릭하면 길이가 표시됩니다.'
        ],
        tips: ['값은 대수창에도 등록되며, 점을 움직이면 함께 갱신됩니다.', 'Esc — 작도 취소']
    },
    MEASURE_ANGLE: {
        summary: '세 점이 이루는 각(또는 기존 각도)을 측정합니다.',
        steps: [
            '기존 각도 객체를 클릭하거나, 첫 변의 점을 클릭합니다.',
            '꼭짓점을 클릭합니다.',
            '두 번째 변의 점을 클릭하면 각도가 표시됩니다.'
        ],
        tips: ['작도용 「각도」와 별개로, 수치 측정 객체를 만듭니다.', 'Esc — 작도 취소']
    },
    MEASURE_AREA: {
        summary: '다각형·원·부채꼴·활꼴의 넓이를 측정합니다.',
        steps: ['넓이를 구할 도형을 클릭합니다.'],
        tips: ['측정값은 도형 중심에 표시되며 부모를 움직이면 갱신됩니다.']
    },
    REFLECT_POINT: {
        summary: '선택한 점·도형을 기준점에 대해 점대칭 복제합니다.',
        steps: ['선택 또는 그룹선택으로 변환할 대상을 먼저 고릅니다.', '기준이 될 점을 클릭합니다.'],
        tips: ['단축키 R', '결과는 종속 객체로 생성되어 원본을 움직이면 함께 갱신됩니다.']
    },
    REFLECT_LINE: {
        summary: '선택한 점·도형을 기준선에 대해 선대칭 복제합니다.',
        steps: ['변환할 대상을 먼저 선택합니다.', '기준선의 첫 번째 점을 클릭합니다.', '기준선의 두 번째 점을 클릭합니다.'],
        tips: ['기준선은 두 기존 점으로 지정합니다.']
    },
    ROTATE: {
        summary: '선택한 점·도형을 중심점 기준으로 회전 복제합니다.',
        steps: ['변환할 대상을 먼저 선택합니다.', '회전 중심이 될 점을 클릭합니다.', '회전 각도를 입력합니다.'],
        tips: ['양수는 반시계 방향, 음수는 시계 방향입니다.']
    },
    TRANSLATE: {
        summary: '선택한 점·도형을 기준 벡터만큼 평행이동 복제합니다.',
        steps: ['변환할 대상을 먼저 선택합니다.', '이동 시작점을 클릭합니다.', '이동 끝점을 클릭합니다.'],
        tips: ['두 점이 정하는 방향과 거리만큼 복제됩니다.']
    },
    DILATE: {
        summary: '선택한 점·도형을 중심점 기준으로 확대·축소 복제합니다.',
        steps: ['변환할 대상을 먼저 선택합니다.', '확대 중심이 될 점을 클릭합니다.', '배율을 입력합니다.'],
        tips: ['2는 2배 확대, 0.5는 절반 축소입니다.']
    },
    TILE: {
        summary: '도형을 원하는 위치에 복제하고, 회전·대칭으로 테셀레이션을 만듭니다.',
        steps: [
            '타일링할 도형을 클릭해 선택합니다.',
            '복제본을 둘 빈 곳을 클릭합니다.',
            '복제본을 클릭한 뒤 팝업·하얀 원으로 회전·대칭합니다.'
        ],
        tips: [
            '팝업: 90° 회전, 가로·세로 대칭, 추가 복제',
            '하얀 원을 드래그하면 자유롭게 회전합니다.',
            '원본 도형을 다시 선택하면 같은 모양을 더 배치할 수 있습니다.'
        ]
    },
    TEXT: {
        summary: '클릭한 위치에 자유 텍스트를 배치합니다.',
        steps: ['텍스트를 둘 위치를 클릭합니다.', '표시할 문구를 입력합니다.'],
        tips: ['단축키 T']
    },
    USER_TOOL: {
        summary: '사용자 정의 도구입니다. (준비 중)',
        steps: ['11단계에서 구현 예정입니다.'],
        tips: []
    },
    CHECKBOX: {
        summary: '클릭한 위치에 체크박스를 둡니다. 선택 도구로 켜고 끌 수 있습니다.',
        steps: ['체크박스를 둘 위치를 클릭합니다.', '표시할 문구를 입력합니다.'],
        tips: ['선택 도구로 체크박스를 클릭하면 체크가 토글됩니다.']
    },
    BLOCK_EVENT_BTN: {
        summary: '블록코딩 이벤트 버튼을 만듭니다. (준비 중)',
        steps: ['11단계에서 구현 예정입니다.'],
        tips: []
    },
    DECORATE_LEADER: {
        summary: '설명선과 문구를 함께 배치합니다.',
        steps: ['설명선 시작 위치를 클릭합니다.', '화살표가 향할 끝 위치를 클릭합니다.', '문구를 입력합니다.'],
        tips: ['단축키 E']
    },
    DECORATE_LENGTH: {
        summary: '선형 객체 위에 길이 표시용 눈금을 추가합니다.',
        steps: ['표시를 넣을 선분·벡터·직선류를 클릭합니다.'],
        tips: []
    },
    DECORATE_ANGLE: {
        summary: '각 객체 또는 세 점에 각도 표시를 추가합니다.',
        steps: ['기존 각도 객체를 클릭하거나, 첫 번째 점을 클릭합니다.', '꼭짓점을 클릭합니다.', '세 번째 점을 클릭합니다.'],
        tips: []
    },
    DECORATE_PARALLEL: {
        summary: '두 선형 객체에 같은 평행 표시를 붙입니다.',
        steps: ['첫 번째 선형 객체를 클릭합니다.', '두 번째 선형 객체를 클릭합니다.'],
        tips: ['두 객체에는 같은 눈금 수가 표시됩니다.']
    },
    PEN: {
        summary: '마우스를 드래그해 자유곡선을 그립니다.',
        steps: [
            '캔버스에서 누른 채로 드래그합니다.',
            '손을 떼면 한 획이 확정됩니다.'
        ],
        tips: [
            '단축키 B',
            '작도 전 대수창에서 색·굵기·선 스타일을 고를 수 있습니다.',
            '이동·선택으로 획 전체를 옮길 수 있습니다.',
            'Esc — 그리는 중 취소'
        ]
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
        id: 'delete_selection',
        keys: 'Delete',
        label: '선택 삭제',
        category: 'edit',
        active: true,
        desc: '선택된 객체를 삭제합니다.'
    },
    {
        id: 'select_toggle',
        keys: 'Shift+클릭',
        label: '선택 토글',
        category: 'edit',
        active: true,
        desc: '선택·그룹선택 도구에서 객체를 선택에 추가하거나 해제합니다.'
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
        desc: '펜으로 자유곡선을 그립니다.'
    },
    {
        id: 'tool_group_select',
        keys: 'Shift+G',
        label: '그룹선택',
        category: 'tool',
        active: true,
        desc: '드래그 박스로 다중 선택. G 단독은 격자 토글.'
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
