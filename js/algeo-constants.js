// 알지오메스 — 상수·타입 헬퍼·테마/스타일
// (script.js 1단계 분리 · refactor_modules.md 참고)
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
    TRANSFORM_POINT: 5.5,
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
    MEASURE_LENGTH: 22,
    MEASURE_ANGLE: 23,
    MEASURE_AREA: 24,
    SLIDER: 25,
    FUNCTION: 26,
    TEXT: 27,
    IMAGE: 28,
    PEN: 29,
    CHECKBOX: 30,
    DECORATE_LEADER: 31,
    DECORATE_LENGTH: 32,
    DECORATE_ANGLE: 33,
    DECORATE_PARALLEL: 34
};

// 대수창 종류순 필터 그룹 (전체 + 항목별)
const ALGEBRA_TYPE_FILTERS = [
    { id: 'all', label: '전체', types: null },
    { id: 'point', label: '점', types: ['POINT', 'TRANSFORM_POINT', 'POINT_ON', 'REGULAR_VERTEX', 'FIXED_ANGLE_POINT'] },
    { id: 'midpoint', label: '중점', types: ['MIDPOINT'] },
    { id: 'intersection', label: '교점', types: ['INTERSECTION'] },
    { id: 'segment', label: '선분', types: ['SEGMENT'] },
    { id: 'vector', label: '벡터', types: ['VECTOR'] },
    { id: 'line', label: '직선', types: ['LINE', 'RAY', 'PERP_BISECTOR', 'ANGLE_BISECTOR', 'PARALLEL_LINE', 'PERP_LINE', 'TANGENT'] },
    { id: 'circle', label: '원', types: ['CIRCLE', 'CIRCLE_3P'] },
    { id: 'arc', label: '호·부채꼴·활꼴', types: ['ARC', 'SECTOR', 'CIRCULAR_SEGMENT'] },
    { id: 'angle', label: '각도', types: ['ANGLE', 'MEASURE_ANGLE'] },
    { id: 'polygon', label: '다각형', types: ['POLYGON'] },
    { id: 'measure', label: '측정', types: ['MEASURE_LENGTH', 'MEASURE_AREA'] },
    { id: 'slider', label: '슬라이더', types: ['SLIDER'] },
    { id: 'function', label: '함수', types: ['FUNCTION'] },
    { id: 'text', label: '텍스트', types: ['TEXT'] },
    { id: 'image', label: '그림', types: ['IMAGE'] },
    { id: 'pen', label: '펜', types: ['PEN'] },
    { id: 'checkbox', label: '체크박스', types: ['CHECKBOX'] },
    { id: 'decorate', label: '꾸미기', types: ['DECORATE_LEADER', 'DECORATE_LENGTH', 'DECORATE_ANGLE', 'DECORATE_PARALLEL'] }
];

// 객체 타입이 종류 필터에 맞는지
function matchesAlgebraTypeFilter(objType, filterId) {
    let i;
    let group;

    if (!filterId || filterId === 'all') {
        return true;
    }
    for (i = 0; i < ALGEBRA_TYPE_FILTERS.length; i++) {
        group = ALGEBRA_TYPE_FILTERS[i];
        if (group.id !== filterId) {
            continue;
        }
        if (!group.types) {
            return true;
        }
        return group.types.indexOf(objType) !== -1;
    }
    return true;
}

// 객체 타입 → 필터 그룹 id
function getAlgebraTypeFilterId(objType) {
    let i;
    let group;

    for (i = 0; i < ALGEBRA_TYPE_FILTERS.length; i++) {
        group = ALGEBRA_TYPE_FILTERS[i];
        if (group.types && group.types.indexOf(objType) !== -1) {
            return group.id;
        }
    }
    return null;
}

// 자유 배치 객체(좌표만 이동)인지
function isAlgeoFreePlaceType(type) {
    return type === 'TEXT' || type === 'IMAGE' || type === 'CHECKBOX';
}

// 펜 획(폴리라인) 객체인지
function isAlgeoPenType(type) {
    return type === 'PEN';
}

// 그림 기본 너비(수학 단위)
const ALGEO_IMAGE_DEFAULT_WIDTH = 4;
// 펜 샘플링 — 이전 점과 화면 거리(px)가 이 값 이상일 때만 추가
const ALGEO_PEN_MIN_SAMPLE_PX = 2;
// 펜 획으로 인정할 최소 점 개수
const ALGEO_PEN_MIN_POINTS = 2;

// 넓이 측정 가능한 도형 타입
const ALGEO_AREA_MEASURABLE_TYPES = {
    POLYGON: true,
    CIRCLE: true,
    CIRCLE_3P: true,
    SECTOR: true,
    CIRCULAR_SEGMENT: true
};

// 측정(수치) 객체 타입인지
function isAlgeoMeasureType(type) {
    return type === 'MEASURE_LENGTH' || type === 'MEASURE_ANGLE' || type === 'MEASURE_AREA';
}

// 점류 객체인지 여부 (자유점·종속점)
function isAlgeoPointType(type) {
    return type === 'POINT' || type === 'MIDPOINT' || type === 'INTERSECTION' ||
        type === 'POINT_ON' || type === 'REGULAR_VERTEX' || type === 'FIXED_ANGLE_POINT' ||
        type === 'TRANSFORM_POINT';
}

// 변환 도구인지 여부 (TILE은 스탬프 UI — 구버전 TRANSFORM_POINT 호환용으로만 포함)
function isAlgeoTransformTool(type) {
    return type === 'REFLECT_POINT' || type === 'REFLECT_LINE' ||
        type === 'ROTATE' || type === 'TRANSLATE' || type === 'DILATE' ||
        type === 'TILE';
}

// 변환 도구가 다룰 수 있는 객체 타입
const ALGEO_TRANSFORMABLE_OBJECT_TYPES = {
    POINT: true,
    MIDPOINT: true,
    INTERSECTION: true,
    POINT_ON: true,
    REGULAR_VERTEX: true,
    FIXED_ANGLE_POINT: true,
    TRANSFORM_POINT: true,
    SEGMENT: true,
    LINE: true,
    RAY: true,
    VECTOR: true,
    PERP_BISECTOR: true,
    ANGLE_BISECTOR: true,
    PARALLEL_LINE: true,
    PERP_LINE: true,
    CIRCLE: true,
    CIRCLE_3P: true,
    ARC: true,
    SECTOR: true,
    CIRCULAR_SEGMENT: true,
    ANGLE: true,
    POLYGON: true
};

// 꾸미기 대상이 될 수 있는 선형 객체
const ALGEO_LINEAR_OBJECT_TYPES = {
    SEGMENT: true,
    VECTOR: true,
    LINE: true,
    RAY: true,
    PERP_BISECTOR: true,
    ANGLE_BISECTOR: true,
    PARALLEL_LINE: true,
    PERP_LINE: true,
    TANGENT: true
};

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

// 캔버스·UI 테마 localStorage 키
const ALGEO_THEME_STORAGE_KEY = 'algeo_theme';
const ALGEO_GRID_VISIBLE_KEY = 'algeo_grid_visible';
const ALGEO_SNAP_ENABLED_KEY = 'algeo_snap_enabled';
const ALGEO_AXES_VISIBLE_KEY = 'algeo_axes_visible';

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
    measure: '#0f766e',
    measureFill: 'rgba(15, 118, 110, 0.12)',
    measureBadge: 'rgba(255, 255, 255, 0.92)',
    measureBadgeStroke: 'rgba(15, 118, 110, 0.45)',
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
    measure: '#2dd4bf',
    measureFill: 'rgba(45, 212, 191, 0.16)',
    measureBadge: 'rgba(15, 23, 42, 0.88)',
    measureBadgeStroke: 'rgba(45, 212, 191, 0.5)',
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

// 스타일 패널 색상 프리셋
const ALGEO_STYLE_PRESETS = [
    '#e11d48', '#1d4ed8', '#047857', '#b45309', '#0f172a',
    '#9333ea', '#0e7490', '#c2410c', '#64748b'
];

// 선 굵기 선택지
const ALGEO_STYLE_WIDTHS = [1.5, 2.5, 3.5, 5, 7];

// 테마에 맞는 캔버스 팔레트 반환
function getAlgeoVisPalette(theme) {
    if (theme === 'dark') {
        return ALGEO_VIS_DARK;
    }
    return ALGEO_VIS_LIGHT;
}

// 객체 타입별 기본 시각 스타일
function getTypeStyleDefaults(type) {
    const vis = ALGEO_VIS;
    const map = {
        POINT: { stroke: vis.point, fill: vis.point, lineWidth: 2, dash: [], fillOpacity: 1 },
        MIDPOINT: { stroke: vis.midpoint, fill: vis.midpoint, lineWidth: 2, dash: [], fillOpacity: 1 },
        INTERSECTION: { stroke: vis.midpoint, fill: vis.midpoint, lineWidth: 2, dash: [], fillOpacity: 1 },
        POINT_ON: { stroke: vis.midpoint, fill: vis.midpoint, lineWidth: 2, dash: [], fillOpacity: 1 },
        REGULAR_VERTEX: { stroke: vis.midpoint, fill: vis.midpoint, lineWidth: 2, dash: [], fillOpacity: 1 },
        FIXED_ANGLE_POINT: { stroke: vis.midpoint, fill: vis.midpoint, lineWidth: 2, dash: [], fillOpacity: 1 },
        TRANSFORM_POINT: { stroke: vis.midpoint, fill: vis.midpoint, lineWidth: 2, dash: [], fillOpacity: 1 },
        SEGMENT: { stroke: vis.segment, fill: null, lineWidth: 3.5, dash: [], fillOpacity: 1 },
        VECTOR: { stroke: vis.vector, fill: null, lineWidth: 3.5, dash: [], fillOpacity: 1 },
        LINE: { stroke: vis.line, fill: null, lineWidth: 3, dash: [12, 6], fillOpacity: 1 },
        RAY: { stroke: vis.ray, fill: null, lineWidth: 3, dash: [10, 5], fillOpacity: 1 },
        PERP_BISECTOR: { stroke: vis.perpBisector, fill: null, lineWidth: 3, dash: [8, 5], fillOpacity: 1 },
        ANGLE_BISECTOR: { stroke: vis.angleBisector, fill: null, lineWidth: 3, dash: [7, 4], fillOpacity: 1 },
        PARALLEL_LINE: { stroke: vis.parallel, fill: null, lineWidth: 3, dash: [10, 5], fillOpacity: 1 },
        PERP_LINE: { stroke: vis.perpLine, fill: null, lineWidth: 3, dash: [6, 4], fillOpacity: 1 },
        TANGENT: { stroke: vis.tangent, fill: null, lineWidth: 3, dash: [8, 4], fillOpacity: 1 },
        CIRCLE: { stroke: vis.circle, fill: null, lineWidth: 3, dash: [], fillOpacity: 1 },
        CIRCLE_3P: { stroke: vis.circle, fill: null, lineWidth: 3, dash: [], fillOpacity: 1 },
        ARC: { stroke: vis.arc, fill: null, lineWidth: 3.5, dash: [], fillOpacity: 1 },
        SECTOR: { stroke: vis.sector, fill: vis.sectorFill, lineWidth: 3, dash: [], fillOpacity: 1 },
        CIRCULAR_SEGMENT: {
            stroke: vis.circularSegment,
            fill: vis.circularSegmentFill,
            lineWidth: 3.5,
            dash: [],
            fillOpacity: 1
        },
        ANGLE: { stroke: vis.angle, fill: vis.angleFill, lineWidth: 2.5, dash: [], fillOpacity: 1 },
        POLYGON: { stroke: vis.polygon, fill: vis.polygonFill, lineWidth: 3, dash: [], fillOpacity: 1 },
        MEASURE_LENGTH: { stroke: vis.measure, fill: vis.measureFill, lineWidth: 2, dash: [], fillOpacity: 1 },
        MEASURE_ANGLE: { stroke: vis.measure, fill: vis.measureFill, lineWidth: 2, dash: [], fillOpacity: 1 },
        MEASURE_AREA: { stroke: vis.measure, fill: vis.measureFill, lineWidth: 2, dash: [], fillOpacity: 1 },
        TEXT: { stroke: vis.axis, fill: vis.axis, lineWidth: 1.5, dash: [], fillOpacity: 1 },
        IMAGE: { stroke: vis.axis, fill: null, lineWidth: 1.5, dash: [], fillOpacity: 1 },
        CHECKBOX: { stroke: vis.axis, fill: vis.axis, lineWidth: 1.5, dash: [], fillOpacity: 1 },
        DECORATE_LEADER: { stroke: vis.segment, fill: null, lineWidth: 2, dash: [], fillOpacity: 1 },
        DECORATE_LENGTH: { stroke: vis.segment, fill: null, lineWidth: 2, dash: [], fillOpacity: 1 },
        DECORATE_ANGLE: { stroke: vis.angle, fill: vis.angleFill, lineWidth: 2, dash: [], fillOpacity: 1 },
        DECORATE_PARALLEL: { stroke: vis.parallel, fill: null, lineWidth: 2, dash: [], fillOpacity: 1 },
        PEN: { stroke: vis.segment, fill: null, lineWidth: 2.5, dash: [], fillOpacity: 1 },
        FUNCTION: { stroke: vis.function, fill: null, lineWidth: 3, dash: [], fillOpacity: 1 },
        SLIDER: { stroke: vis.slider, fill: vis.sliderThumb, lineWidth: 4, dash: [], fillOpacity: 1 }
    };

    return map[type] || {
        stroke: vis.axis,
        fill: null,
        lineWidth: 3,
        dash: [],
        fillOpacity: 1
    };
}

// dashMode → 점선 패턴
function dashPatternFromMode(mode, fallbackDash) {
    if (mode === 'solid') {
        return [];
    }
    if (mode === 'dashed') {
        return [8, 5];
    }
    if (mode === 'dotted') {
        return [2, 4];
    }
    return fallbackDash || [];
}

// 저장된 dash에서 모드 추정 (UI 표시용)
function dashModeFromPattern(dash) {
    if (!dash || dash.length === 0) {
        return 'solid';
    }
    if (dash[0] <= 3) {
        return 'dotted';
    }
    return 'dashed';
}

// #hex 또는 rgb/rgba에 불투명도 적용
function colorWithOpacity(color, opacity) {
    let hex;
    let r;
    let g;
    let b;
    let m;
    let a;

    if (opacity === null || opacity === undefined || opacity >= 0.999) {
        return color;
    }
    a = Math.max(0, Math.min(1, opacity));

    if (!color) {
        return 'rgba(0,0,0,' + a + ')';
    }

    m = /^#([0-9a-fA-F]{6})$/.exec(color);
    if (m) {
        hex = m[1];
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    }

    m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
    if (m) {
        return 'rgba(' + m[1] + ',' + m[2] + ',' + m[3] + ',' + a + ')';
    }

    return color;
}

// 객체에 적용할 최종 그리기 스타일
function resolveObjectStyle(obj) {
    const defaults = getTypeStyleDefaults(obj.type);
    const s = obj.style || {};
    let fill = s.fill || defaults.fill;
    let fillOpacity = s.fillOpacity !== undefined && s.fillOpacity !== null
        ? s.fillOpacity
        : defaults.fillOpacity;
    const fillable = obj.type === 'POLYGON' || obj.type === 'SECTOR' ||
        obj.type === 'CIRCULAR_SEGMENT' || obj.type === 'ANGLE' ||
        isAlgeoPointType(obj.type);

    if (s.fillOpacity !== undefined && s.fillOpacity !== null && fillable) {
        fill = colorWithOpacity(s.fill || s.stroke || defaults.stroke, fillOpacity);
    } else if (!s.fill && s.stroke && (
        obj.type === 'POLYGON' || obj.type === 'SECTOR' ||
        obj.type === 'CIRCULAR_SEGMENT' || obj.type === 'ANGLE'
    )) {
        fill = colorWithOpacity(s.stroke, 0.18);
    }

    return {
        stroke: s.stroke || defaults.stroke,
        fill: fill,
        lineWidth: s.lineWidth !== undefined && s.lineWidth !== null
            ? s.lineWidth
            : defaults.lineWidth,
        dash: s.dashMode
            ? dashPatternFromMode(s.dashMode, defaults.dash)
            : (defaults.dash || []),
        dashMode: s.dashMode || dashModeFromPattern(defaults.dash),
        showLabel: s.showLabel !== false,
        fillOpacity: fillOpacity
    };
}

// 객체에 스타일 패치 병합
function applyStylePatchToObject(obj, patch) {
    let key;

    if (!obj.style) {
        obj.style = {};
    }
    for (key in patch) {
        if (Object.prototype.hasOwnProperty.call(patch, key)) {
            if (patch[key] === null || patch[key] === '') {
                delete obj.style[key];
            } else {
                obj.style[key] = patch[key];
            }
        }
    }
}
