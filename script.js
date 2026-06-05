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
    }
];

// 좌측 도구 레일 카테고리 (플라이아웃 서브메뉴 구성)
const ALGEO_TOOL_CATEGORIES = [
    {
        id: 'pointer',
        icon: '✋',
        title: '이동·선택',
        tools: [
            { tool: 'MOVE', label: '이동', icon: '✋', hint: '드래그로 이동' }
        ]
    },
    {
        id: 'point',
        icon: '●',
        title: '점',
        tools: [
            { tool: 'POINT', label: '점', icon: '●', shortcut: 'D', hint: '빈 곳 클릭' },
            { tool: 'MIDPOINT', label: '중점', icon: '◎', shortcut: 'M', hint: '점 2개 선택' }
        ]
    },
    {
        id: 'line',
        icon: '／',
        title: '선',
        tools: [
            { tool: 'SEGMENT', label: '선분', icon: '―', hint: '점1 → 드래그 → 점2' },
            { tool: 'LINE', label: '직선', icon: '↔', hint: '점1 → 드래그 → 점2' },
            { tool: 'PERP_BISECTOR', label: '수직이등분선', icon: '⊥', hint: '점 2개 선택' },
            { tool: 'PARALLEL_LINE', label: '평행선', icon: '∥', hint: '기준2점 → 통과점' },
            { tool: 'PERP_LINE', label: '수직선', icon: '┴', hint: '기준2점 → 통과점' },
            { tool: 'ANGLE', label: '각도', icon: '∠', hint: '변1 → 꼭짓점 → 조절' }
        ]
    },
    {
        id: 'circle',
        icon: '◯',
        title: '원',
        tools: [
            { tool: 'CIRCLE', label: '원', icon: '◯', hint: '중심 → 드래그 → 확정' },
            { tool: 'ARC', label: '호', icon: '◠', hint: '끝점2 → 호위점' }
        ]
    },
    {
        id: 'edit',
        icon: '⌫',
        title: '편집',
        tools: [
            { tool: 'DELETE', label: '삭제', icon: '⌫', hint: '객체 클릭' }
        ]
    }
];

// 캔버스 객체 가시성 팔레트 (AlgeoMath 스타일 — 선명한 색·굵은 선)
const ALGEO_VIS = {
    point: '#e11d48',
    midpoint: '#7c3aed',
    segment: '#1d4ed8',
    line: '#4338ca',
    perpBisector: '#0e7490',
    parallel: '#c2410c',
    perpLine: '#be123c',
    circle: '#047857',
    arc: '#0f766e',
    angle: '#9333ea',
    angleFill: 'rgba(147, 51, 234, 0.14)',
    function: '#6d28d9',
    pointRadius: 7,
    midpointRadius: 6,
    pointStroke: '#1e293b',
    grid: '#d8e0ea',
    gridLabel: '#475569',
    axis: '#0f172a'
};

// 도구 ID가 속한 카테고리 검색
function findToolCategoryId(toolId) {
    let i;
    let j;
    for (i = 0; i < ALGEO_TOOL_CATEGORIES.length; i++) {
        const cat = ALGEO_TOOL_CATEGORIES[i];
        for (j = 0; j < cat.tools.length; j++) {
            if (cat.tools[j].tool === toolId) {
                return cat.id;
            }
        }
    }
    return 'pointer';
}

// 좌측 도구 레일 버튼 HTML 생성
function buildToolRailHtml() {
    let html = '';
    let i;
    for (i = 0; i < ALGEO_TOOL_CATEGORIES.length; i++) {
        const cat = ALGEO_TOOL_CATEGORIES[i];
        html += '<button type="button" class="tool-rail-btn" data-category="' + cat.id + '" title="' + cat.title + '">';
        html += '<span class="rail-icon">' + cat.icon + '</span>';
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
        '<div class="algeo-wrapper">' +
        '    <div class="algeo-left-panel">' +
        '        <div class="algeo-mode-rail">' +
        '            <button type="button" class="mode-rail-btn active" title="기하 작도" disabled>⌗</button>' +
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
        '                <h3>대수창</h3>' +
        '                <button type="button" id="btnToggleAlgebra" class="sidebar-toggle-btn" title="대수창 숨기기" aria-label="대수창 숨기기">◀</button>' +
        '            </div>' +
        '            <div class="sidebar-content" id="algebraList">' +
        '                <div class="empty-msg">오브젝트가 없습니다.</div>' +
        '            </div>' +
        '            <div class="sidebar-input-area">' +
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
        '            <canvas id="algeoCanvas"></canvas>' +
        '            <div class="algeo-right-bar">' +
        '                <button type="button" class="right-bar-btn" id="btnZoomIn" title="확대">+</button>' +
        '                <button type="button" class="right-bar-btn" id="btnZoomOut" title="축소">−</button>' +
        '                <button type="button" class="right-bar-btn" id="btnResetView" title="원점 이동">⌂</button>' +
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

// 이름으로 점 객체 검색 (대소문자 구분 후, 없으면 대소문자 무시 재검색)
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
    if (obj.type === 'MIDPOINT') {
        const p1 = this.objectMap[obj.p1Id];
        const p2 = this.objectMap[obj.p2Id];
        if (p1 && p2) {
            obj.x = (p1.x + p2.x) / 2;
            obj.y = (p1.y + p2.y) / 2;
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
        parents: [centerId, pointId],
        children: []
    };

    center.children.push(id);
    point.children.push(id);

    this.objects.push(circle);
    this.objectMap[id] = circle;
    return circle;
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
        parents: [],
        children: []
    };
    this.objects.push(funcObj);
    this.objectMap[id] = funcObj;
    return funcObj;
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
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 배경 격자(Grid) 그리기
    this.drawGrid();

    // 2. 수학 객체들 그리기
    this.drawObjects();

    // 3. 호·원 작도 미리보기
    if (this.toolPreview) {
        this.drawToolPreview(this.toolPreview);
    }
};

AlgeoRenderer.prototype.drawGrid = function () {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 스케일에 기반하여 격자 간격 동적 조정
    let gridSpacing = 1;
    if (this.scale < 10) { gridSpacing = 10; }
    else if (this.scale < 25) { gridSpacing = 5; }
    else if (this.scale < 80) { gridSpacing = 1; }
    else if (this.scale < 200) { gridSpacing = 0.5; }
    else { gridSpacing = 0.1; }

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

    // 1단계: 함수 → 직선 → 선분 → 원 순으로 그리기 (점보다 뒤에 오도록)
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'FUNCTION') {
            this.drawFunction(obj, obj.id === this.selectedObjectId);
        }
    }

    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        const isSelected = obj.id === this.selectedObjectId;

        if (obj.type === 'LINE') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                this.drawLine(p1, p2, isSelected, ALGEO_VIS.line, [12, 6], 3);
            }
        } else if (obj.type === 'PERP_BISECTOR') {
            const linePts = this.engine.getPerpBisectorLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, isSelected, ALGEO_VIS.perpBisector, [8, 5], 3);
            }
        } else if (obj.type === 'PARALLEL_LINE') {
            const linePts = this.engine.getParallelLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, isSelected, ALGEO_VIS.parallel, [10, 5], 3);
            }
        } else if (obj.type === 'PERP_LINE') {
            const linePts = this.engine.getPerpLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, isSelected, ALGEO_VIS.perpLine, [6, 4], 3);
            }
        } else if (obj.type === 'SEGMENT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
                ctx.lineTo(this.toScreenX(p2.x), this.toScreenY(p2.y));
                ctx.strokeStyle = ALGEO_VIS.segment;
                ctx.lineWidth = isSelected ? 5 : 3.5;
                ctx.lineCap = 'round';
                ctx.stroke();
            }
        } else if (obj.type === 'CIRCLE') {
            const center = this.engine.objectMap[obj.centerId];
            const point = this.engine.objectMap[obj.pointId];
            if (center && point) {
                const dx = point.x - center.x;
                const dy = point.y - center.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                const cx = this.toScreenX(center.x);
                const cy = this.toScreenY(center.y);
                const screenRadius = radius * this.scale;

                ctx.beginPath();
                ctx.arc(cx, cy, screenRadius, 0, 2 * Math.PI);
                ctx.strokeStyle = ALGEO_VIS.circle;
                ctx.lineWidth = isSelected ? 4 : 3;
                ctx.stroke();
            }
        } else if (obj.type === 'ARC') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            const guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                this.drawArcThreePoints(p1, p2, guide, isSelected, ALGEO_VIS.arc, 3.5);
            }
        } else if (obj.type === 'ANGLE') {
            const ray1 = this.engine.objectMap[obj.ray1Id];
            const vertex = this.engine.objectMap[obj.vertexId];
            const ray2 = this.engine.objectMap[obj.ray2Id];
            if (ray1 && vertex && ray2) {
                this.drawAngleShape(ray1, vertex, ray2, isSelected);
            }
        }
    }

    // 2단계: 점(Point)·중점(Midpoint) 그리기 (모든 선/원 위에 보이도록)
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'POINT' || obj.type === 'MIDPOINT') {
            this.drawPointShape(obj);
        }
    }
};

// 점·중점 렌더 (AlgeoMath 스타일 — 굵은 테두리·흰색 외곽 라벨)
AlgeoRenderer.prototype.drawPointShape = function (obj) {
    const ctx = this.ctx;
    const isMid = obj.type === 'MIDPOINT';
    const radius = isMid ? ALGEO_VIS.midpointRadius : ALGEO_VIS.pointRadius;
    const sx = this.toScreenX(obj.x);
    const sy = this.toScreenY(obj.y);
    const isHighlighted = this.highlightIds.indexOf(obj.id) >= 0;
    const isSelected = obj.id === this.selectedObjectId;

    if (isSelected) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius + 6, 0, 2 * Math.PI);
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }

    if (isHighlighted) {
        ctx.beginPath();
        ctx.arc(sx, sy, radius + 9, 0, 2 * Math.PI);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, 2 * Math.PI);
    if (isHighlighted) {
        ctx.fillStyle = '#f59e0b';
    } else if (isMid) {
        ctx.fillStyle = ALGEO_VIS.midpoint;
    } else {
        ctx.fillStyle = ALGEO_VIS.point;
    }
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
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.lineJoin = 'round';
        ctx.strokeText(text, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'left';
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
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.65)';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
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
        this.drawLine({ x: p1.x, y: p1.y }, p2, false, 'rgba(79, 70, 229, 0.55)', [8, 5], 2.5);
        ctx.restore();
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
            ? 'rgba(234, 88, 12, 0.55)' : 'rgba(225, 29, 72, 0.55)';
        const dash = preview.type === 'PARALLEL_LINE' ? [10, 5] : [6, 4];
        ctx.save();
        this.drawLine(linePts.p1, linePts.p2, false, color, dash, 2.5);
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
        ctx.strokeStyle = 'rgba(4, 120, 87, 0.55)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(this.toScreenX(preview.mathX), this.toScreenY(preview.mathY));
        ctx.strokeStyle = 'rgba(4, 120, 87, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
        ctx.strokeStyle = 'rgba(4, 120, 87, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sweep.cx, sweep.cy, sweep.r, sweep.startA, sweep.endA, sweep.ccw);
        ctx.strokeStyle = ALGEO_VIS.arc;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
    }
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
AlgeoRenderer.prototype.drawArcThreePoints = function (p1, p2, guide, isSelected, color, baseWidth) {
    const sweep = this.getArcSweepThroughGuide(p1, p2, guide);
    if (!sweep || sweep.r < 1) { return; }

    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(sweep.cx, sweep.cy, sweep.r, sweep.startA, sweep.endA, sweep.ccw);
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? baseWidth + 2 : baseWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
};

// 각도 표시 (꼭짓점 호 + 도 단위 라벨)
AlgeoRenderer.prototype.drawAngleShape = function (ray1, vertex, ray2, isSelected) {
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
    ctx.strokeStyle = isSelected ? '#6d28d9' : ALGEO_VIS.angle;
    ctx.lineWidth = isSelected ? 3.5 : 2.5;
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
            color: '#5b21b6'
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

AlgeoRenderer.prototype.drawLine = function (p1, p2, isSelected, color, dashPattern, baseWidth) {
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
    ctx.lineWidth = isSelected ? width + 1.5 : width;
    ctx.globalAlpha = isSelected ? 1 : 0.92;
    ctx.stroke();
    ctx.restore();
};

// 일차함수 그래프를 현재 뷰포트 x범위에 맞춰 그리기
AlgeoRenderer.prototype.drawFunction = function (obj, isSelected) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const mathXLeft = this.toMathX(0);
    const mathXRight = this.toMathX(width);
    const left = Math.min(mathXLeft, mathXRight);
    const right = Math.max(mathXLeft, mathXRight);
    const step = (right - left) / width;
    let started = false;

    ctx.beginPath();
    for (let mathX = left; mathX <= right; mathX += step) {
        const mathY = obj.slope * mathX + obj.intercept;
        const sx = this.toScreenX(mathX);
        const sy = this.toScreenY(mathY);

        if (!started) {
            ctx.moveTo(sx, sy);
            started = true;
        } else {
            ctx.lineTo(sx, sy);
        }
    }

    ctx.strokeStyle = ALGEO_VIS.function;
    ctx.lineWidth = isSelected ? 4 : 3;
    ctx.lineCap = 'round';
    ctx.stroke();
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

    this.activePoint = null;          // 현재 마우스 드래그 중인 점 객체
    this.selectedPoints = [];         // 선분/원 작도를 위해 선택된 점 배열
    this.selectedObjectId = null;     // 대수창에서 선택된 객체 ID
    this.algebraCmdDictOpen = false;  // 명령어 사전 패널 표시 여부
    this.algebraPanelOpen = true;     // 대수창 표시 여부
    this.openToolCategoryId = null;   // 열린 도구 플라이아웃 카테고리 ID
    this.constructionDraft = null;    // 인터랙티브 작도: type별 임시 상태 + 마우스 미리보기
}

AlgeoApp.prototype.init = function () {
    const self = this;

    // 캔버스 사이즈 조절 및 최초 렌더링 (뷰포트 스케일은 popscale이 담당)
    self.renderer.resize();
    self.renderer.draw();

    // 1. 좌측 도구 레일·플라이아웃
    self.initToolRail();
    self.initAlgebraPanelToggle();

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
        const mouseX = origEvent.offsetX;
        const mouseY = origEvent.offsetY;

        // 마우스 휠 줌 처리 (마우스 위치 기준 줌 구현)
        const zoomFactor = delta < 0 ? 1.1 : 0.9;
        self.zoomAt(zoomFactor, mouseX, mouseY);
    });

    // 4. 대수창 수식 입력·자동완성·명령어 사전
    self.initAlgebraInputAssist();

    // 5. 대수창 항목 클릭 → 캔버스 객체 하이라이트
    $('#algebraList').on('click', '.algebra-item', function () {
        const objId = $(this).attr('data-id');
        self.selectAlgebraObject(objId);
    });

    self.selectTool('MOVE');
    self.updateCanvasCursor();

    // Esc — 호·원 작도 중 취소
    $(document).on('keydown', function (e) {
        if (e.keyCode !== 27) {
            return;
        }
        if (self.constructionDraft || self.selectedPoints.length > 0) {
            self.clearToolDraft();
            self.renderer.draw();
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

// 도구 카테고리 플라이아웃 토글
AlgeoApp.prototype.toggleToolCategory = function (categoryId) {
    if (this.openToolCategoryId === categoryId) {
        this.closeToolFlyout();
        return;
    }
    this.openToolCategoryId = categoryId;
    this.renderToolFlyout(categoryId);
    $('#toolFlyout').addClass('open');
    this.syncToolRailUI();
};

// 플라이아웃 닫기
AlgeoApp.prototype.closeToolFlyout = function () {
    this.openToolCategoryId = null;
    $('#toolFlyout').removeClass('open');
    this.syncToolRailUI();
};

// 플라이아웃 본문 렌더링
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
    if (!cat) {
        return;
    }

    $('#flyoutHeader').text(cat.title);

    let bodyHtml = '';
    for (j = 0; j < cat.tools.length; j++) {
        const item = cat.tools[j];
        const isActive = item.tool === this.currentTool;
        const activeClass = isActive ? ' active' : '';
        const shortcutHtml = item.shortcut
            ? '<span class="flyout-shortcut">' + item.shortcut + '</span>'
            : '';

        const hintHtml = item.hint
            ? '<span class="flyout-tool-hint">' + item.hint + '</span>'
            : '';

        bodyHtml += '<button type="button" class="flyout-tool-item' + activeClass + '" data-tool="' + item.tool + '">';
        bodyHtml += '<span class="flyout-tool-icon">' + item.icon + '</span>';
        bodyHtml += '<span class="flyout-tool-text">';
        bodyHtml += '<span class="flyout-tool-label">' + item.label + '</span>';
        bodyHtml += hintHtml;
        bodyHtml += '</span>';
        bodyHtml += shortcutHtml;
        bodyHtml += '</button>';
    }

    $('#flyoutBody').html(bodyHtml);
};

// 작도 도구 선택 및 UI 동기화
AlgeoApp.prototype.selectTool = function (toolId) {
    this.currentTool = toolId;
    this.clearToolDraft();
    this.syncToolRailUI();
    this.updateCanvasCursor();
    this.renderer.draw();
};

// 인터랙티브 작도 상태 초기화
AlgeoApp.prototype.clearToolDraft = function () {
    this.selectedPoints = [];
    this.constructionDraft = null;
    this.renderer.toolPreview = null;
    this.syncHighlightToRenderer();
};

// 클릭 위치의 점 ID 반환 — 없으면 새 점 생성
AlgeoApp.prototype.resolvePointAtClick = function (mouseX, mouseY, hitPoint) {
    if (hitPoint) {
        return hitPoint.id;
    }
    const r = this.renderer;
    const mathX = r.toMathX(mouseX);
    const mathY = r.toMathY(mouseY);
    const name = this.getNextPointName();
    const pt = this.engine.addPoint(name, mathX, mathY);
    this.updateAlgebraView();
    return pt.id;
};

// 마우스 위치로 작도 미리보기 갱신
AlgeoApp.prototype.updateToolPreviewFromMouse = function (mouseX, mouseY) {
    const r = this.renderer;
    const draft = this.constructionDraft;
    if (!draft) { return; }

    const mathX = r.toMathX(mouseX);
    const mathY = r.toMathY(mouseY);
    const preview = { type: draft.type, mathX: mathX, mathY: mathY };

    if (draft.type === 'SEGMENT' || draft.type === 'LINE') {
        preview.p1Id = draft.p1Id;
    } else if (draft.type === 'ARC') {
        preview.p1Id = draft.p1Id;
        preview.p2Id = draft.p2Id;
    } else if (draft.type === 'CIRCLE') {
        preview.centerId = draft.centerId;
    } else if (draft.type === 'ANGLE') {
        preview.ray1Id = draft.ray1Id;
        preview.vertexId = draft.vertexId;
    } else if (draft.type === 'PARALLEL_LINE' || draft.type === 'PERP_LINE') {
        preview.refP1Id = draft.refP1Id;
        preview.refP2Id = draft.refP2Id;
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

// 대수창 항목 선택 및 캔버스 하이라이트 연동
AlgeoApp.prototype.selectAlgebraObject = function (objId) {
    if (this.selectedObjectId === objId) {
        this.selectedObjectId = null;
    } else {
        this.selectedObjectId = objId;
    }
    this.renderer.selectedObjectId = this.selectedObjectId;
    this.syncAlgebraItemActiveState();
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
    this.renderer.draw();
};

// 캔버스 커서 직접 설정
AlgeoApp.prototype.setCanvasCursor = function (cursor) {
    $(this.renderer.canvas).css('cursor', cursor);
};

// 현재 도구에 맞는 캔버스 커서 설정
AlgeoApp.prototype.updateCanvasCursor = function () {
    let cursor = 'default';

    if (this.currentTool === 'MOVE') {
        cursor = 'grab';
    } else if (this.currentTool === 'POINT') {
        cursor = 'crosshair';
    } else if (this.currentTool === 'SEGMENT' || this.currentTool === 'LINE' ||
        this.currentTool === 'MIDPOINT' || this.currentTool === 'PERP_BISECTOR' ||
        this.currentTool === 'PARALLEL_LINE' || this.currentTool === 'PERP_LINE' ||
        this.currentTool === 'ANGLE' || this.currentTool === 'ARC' || this.currentTool === 'CIRCLE') {
        cursor = 'pointer';
    } else if (this.currentTool === 'DELETE') {
        cursor = 'not-allowed';
    }

    this.setCanvasCursor(cursor);
};

// 작도 중 선택된 점을 렌더러에 전달
AlgeoApp.prototype.syncHighlightToRenderer = function () {
    this.renderer.highlightIds = this.selectedPoints.slice();
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
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    const toolType = this.currentTool;

    if (this.constructionDraft && this.constructionDraft.type === toolType) {
        const draft = this.constructionDraft;
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

// 각도: 변1 → 꼭짓점 → 마우스 조절 → 확정
AlgeoApp.prototype.handleAngleMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    if (this.constructionDraft && this.constructionDraft.type === 'ANGLE') {
        const draft = this.constructionDraft;
        let ray2Id = null;
        if (hitPoint && hitPoint.id !== draft.vertexId && hitPoint.id !== draft.ray1Id) {
            ray2Id = hitPoint.id;
        } else {
            const vertex = this.engine.objectMap[draft.vertexId];
            const mathX = r.toMathX(mouseX);
            const mathY = r.toMathY(mouseY);
            const dx = mathX - vertex.x;
            const dy = mathY - vertex.y;
            if (Math.sqrt(dx * dx + dy * dy) < 0.05) {
                r.draw();
                return;
            }
            const ray2Name = this.getNextPointName();
            const ray2Pt = this.engine.addPoint(ray2Name, mathX, mathY);
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
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    const toolType = this.currentTool;

    if (this.constructionDraft &&
        (this.constructionDraft.type === 'PARALLEL_LINE' || this.constructionDraft.type === 'PERP_LINE')) {
        const draft = this.constructionDraft;
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
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

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
        const mathX = r.toMathX(mouseX);
        const mathY = r.toMathY(mouseY);
        const guidePt = r.getGuidePointOnCircumcircle(p1, p2, mathX, mathY);
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
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

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
        const mathX = r.toMathX(mouseX);
        const mathY = r.toMathY(mouseY);
        const dx = mathX - center.x;
        const dy = mathY - center.y;
        if (Math.sqrt(dx * dx + dy * dy) < 0.05) {
            r.draw();
            return;
        }
        const ptName = this.getNextPointName();
        const pt = this.engine.addPoint(ptName, mathX, mathY);
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

// 마우스 다운 핸들러
AlgeoApp.prototype.handleMouseDown = function (e) {
    const r = this.renderer;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    // 1. 마우스 위치 아래에 있는 점 탐색
    const hitPoint = this.findPointAt(mouseX, mouseY);

    if (this.currentTool === 'MOVE') {
        if (hitPoint && hitPoint.type === 'POINT') {
            // 자유 점만 드래그 가능 (중점은 종속 객체)
            this.activePoint = hitPoint;
            this.setCanvasCursor('grabbing');
        } else if (!hitPoint) {
            // 빈 공간 클릭 -> 선택 해제 후 캔버스 패닝 시작
            this.clearAlgebraSelection();
            this.isDraggingCanvas = true;
            this.dragStart.x = mouseX;
            this.dragStart.y = mouseY;
            this.origOffset.x = r.offsetX;
            this.origOffset.y = r.offsetY;
            this.setCanvasCursor('grabbing');
        }
        // 중점(MIDPOINT) 클릭 시 별도 동작 없음
    } else if (this.currentTool === 'POINT') {
        // 빈 공간에 점 생성
        if (!hitPoint) {
            const mathX = r.toMathX(mouseX);
            const mathY = r.toMathY(mouseY);
            const name = this.getNextPointName();
            this.engine.addPoint(name, mathX, mathY);
            this.updateAlgebraView();
            r.draw();
        }
    } else if (this.currentTool === 'ARC') {
        this.handleArcMouseDown(e, hitPoint);
    } else if (this.currentTool === 'CIRCLE') {
        this.handleCircleMouseDown(e, hitPoint);
    } else if (this.currentTool === 'SEGMENT' || this.currentTool === 'LINE') {
        this.handleSegmentLineMouseDown(e, hitPoint);
    } else if (this.currentTool === 'ANGLE') {
        this.handleAngleMouseDown(e, hitPoint);
    } else if (this.currentTool === 'PARALLEL_LINE' || this.currentTool === 'PERP_LINE') {
        this.handleParallelPerpMouseDown(e, hitPoint);
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
    } else if (this.currentTool === 'DELETE') {
        // 객체 삭제
        if (hitPoint) {
            this.engine.deleteObject(hitPoint.id);
            this.validateAlgebraSelection();
            this.updateAlgebraView();
            r.draw();
        } else {
            // 다른 도형(선분, 원, 함수) 삭제 체크
            const hitObj = this.findObjectAt(mouseX, mouseY);
            if (hitObj) {
                this.engine.deleteObject(hitObj.id);
                this.validateAlgebraSelection();
                this.updateAlgebraView();
                r.draw();
            }
        }
    }
};

// 마우스 무브 핸들러
AlgeoApp.prototype.handleMouseMove = function (e) {
    const r = this.renderer;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    if (this.isDraggingCanvas) {
        // 캔버스 드래그 중
        const dx = mouseX - this.dragStart.x;
        const dy = mouseY - this.dragStart.y;
        r.offsetX = this.origOffset.x + dx;
        r.offsetY = this.origOffset.y + dy;
        r.draw();
    } else if (this.activePoint) {
        // 점 드래그 이동 중
        const mathX = r.toMathX(mouseX);
        const mathY = r.toMathY(mouseY);
        this.engine.movePoint(this.activePoint.id, mathX, mathY);
        this.updateAlgebraView();
        r.draw();
    } else if (this.constructionDraft) {
        this.updateToolPreviewFromMouse(mouseX, mouseY);
    }
};

// 마우스 업 핸들러
AlgeoApp.prototype.handleMouseUp = function (e) {
    this.isDraggingCanvas = false;
    this.activePoint = null;
    this.updateCanvasCursor();
};

// 픽셀 좌표 기준 점 충돌 판단 (반경 10px 이내 영역)
AlgeoApp.prototype.findPointAt = function (screenX, screenY) {
    const list = this.engine.objects;
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'POINT' || obj.type === 'MIDPOINT') {
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

// 픽셀 좌표 기준 선분 또는 원 충돌 판단 (삭제 툴 대응)
AlgeoApp.prototype.findObjectAt = function (screenX, screenY) {
    const list = this.engine.objects;
    const r = this.renderer;

    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'SEGMENT') {
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
        } else if (obj.type === 'CIRCLE') {
            const center = this.engine.objectMap[obj.centerId];
            const point = this.engine.objectMap[obj.pointId];
            if (center && point) {
                const cx = r.toScreenX(center.x);
                const cy = r.toScreenY(center.y);
                const dx = point.x - center.x;
                const dy = point.y - center.y;
                const mathRadius = Math.sqrt(dx * dx + dy * dy);
                const screenRadius = mathRadius * r.scale;

                // 마우스와 원 둘레 사이의 거리
                const distToCenter = Math.sqrt((cx - screenX) * (cx - screenX) + (cy - screenY) * (cy - screenY));
                if (Math.abs(distToCenter - screenRadius) <= 5) {
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
        }
    }
    return null;
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
        const mathY = funcObj.slope * mathX + funcObj.intercept;
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
    } while (this.engine.findPointByName(name) !== null);

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

// 대수창 렌더링 업데이트
AlgeoApp.prototype.updateAlgebraView = function () {
    const $list = $('#algebraList');
    $list.empty();

    const objects = this.engine.objects;
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
        } else if (obj.type === 'LINE') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                desc = '직선 ' + p1.name + p2.name;
            }
        } else if (obj.type === 'MIDPOINT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                desc = '중점 ' + p1.name + p2.name + ' (' + obj.x.toFixed(2) + ', ' + obj.y.toFixed(2) + ')';
            }
        } else if (obj.type === 'PERP_BISECTOR') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                desc = '수직이등분선 ' + p1.name + p2.name;
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
        } else if (obj.type === 'CIRCLE') {
            const center = this.engine.objectMap[obj.centerId];
            const point = this.engine.objectMap[obj.pointId];
            if (center && point) {
                const dx = point.x - center.x;
                const dy = point.y - center.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                desc = '원 (중심: ' + center.name + ', 반지름: ' + radius.toFixed(2) + ')';
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
        } else if (obj.type === 'FUNCTION') {
            desc = obj.expression;
        }

        const itemHtml = 
            '<div class="algebra-item" data-id="' + obj.id + '">' +
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
    const result = this.parseAlgebraInput(input);

    if (result.success) {
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

    // 일차함수: y = 2x + 1
    const funcMatch = trimmed.match(/^y\s*=\s*(.+)$/i);
    if (funcMatch) {
        const linear = this.parseLinearRhs(funcMatch[1]);
        if (!linear.success) {
            return { success: false, message: linear.message };
        }

        const exprKey = this.normalizeExprKey(funcMatch[1]);
        const expression = this.formatFunctionExpression(linear.slope, linear.intercept);
        const existingFunc = this.engine.findFunctionByExprKey(exprKey);

        if (existingFunc) {
            existingFunc.slope = linear.slope;
            existingFunc.intercept = linear.intercept;
            existingFunc.expression = expression;
        } else {
            const funcName = this.getNextFunctionName();
            this.engine.addFunction(funcName, expression, exprKey, linear.slope, linear.intercept);
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
        message: '지원 형식: A=(1,2), Angle(A,B,C), Arc(O,A,B), Line(A,B)'
    };
};

