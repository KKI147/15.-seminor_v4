var algeoAppInstance = null;

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
    var tries = 0;
    var maxTries = 50;

    function isWrapScaled() {
        var wrap = document.getElementById('wrap');
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
    var resizeTimer = null;

    function onResize() {
        if (resizeTimer) {
            clearTimeout(resizeTimer);
        }
        resizeTimer = setTimeout(function () {
            resizeTimer = null;
            if (typeof FORTEACHERCD === 'undefined' || !FORTEACHERCD.responsive) {
                return;
            }
            var wrap = document.getElementById('wrap');
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

    // 알지오메스 메인 컨테이너 구조 생성
    const layoutHtml = 
        '<div class="algeo-wrapper">' +
        '    <!-- 상단 도구바 -->' +
        '    <div class="algeo-toolbar">' +
        '        <button class="tool-btn active" data-tool="MOVE" title="이동 (손 도구)"></button>' +
        '        <button class="tool-btn" data-tool="POINT" title="점"></button>' +
        '        <button class="tool-btn" data-tool="SEGMENT" title="선분"></button>' +
        '        <button class="tool-btn" data-tool="LINE" title="직선"></button>' +
        '        <button class="tool-btn" data-tool="CIRCLE" title="원"></button>' +
        '        <button class="tool-btn" data-tool="DELETE" title="삭제"></button>' +
        '        <span class="toolbar-divider"></span>' +
        '        <button class="action-btn" id="btnZoomIn" title="확대">+</button>' +
        '        <button class="action-btn" id="btnZoomOut" title="축소">-</button>' +
        '        <button class="action-btn" id="btnResetView" title="원점 이동">⌂</button>' +
        '    </div>' +
        '    <!-- 메인 레이아웃 (사이드바 + 캔버스) -->' +
        '    <div class="algeo-main">' +
        '        <!-- 좌측 대수창 sidebar -->' +
        '        <div class="algeo-sidebar">' +
        '            <div class="sidebar-header">' +
        '                <h3>대수창</h3>' +
        '            </div>' +
        '            <div class="sidebar-content" id="algebraList">' +
        '                <div class="empty-msg">오브젝트가 없습니다.</div>' +
        '            </div>' +
        '            <div class="sidebar-input-area">' +
        '                <input type="text" id="algebraInput" placeholder="D,E  Circle(A,C)  A=(1,2)" autocomplete="off" />' +
        '                <button type="button" id="btnAlgebraSubmit">입력</button>' +
        '                <div class="algebra-hint">선분: <b>AB</b> · 직선: <b>Line(A,B)</b> · 원: <b>Circle(A,C)</b></div>' +
        '                <div class="algebra-error" id="algebraError"></div>' +
        '            </div>' +
        '        </div>' +
        '        <!-- 우측 작도 영역 -->' +
        '        <div class="algeo-canvas-container">' +
        '            <canvas id="algeoCanvas"></canvas>' +
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
            // 필요 시 자식 객체의 종속성 업데이트 계산 (예: 점의 이동으로 인한 원 반지름이나 중심 궤적 계산 등)
            // 여기서는 렌더러가 좌표 정보를 즉석에서 읽어가므로 단순 업데이트 전파만 하면 됨
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
    ctx.strokeStyle = '#e2e8f0';
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
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Outfit, sans-serif';
            ctx.fillText(mathX, x - 5, this.offsetY + 15);
        }
    }

    // 가로 격자선 그리기 (위에서 아래로)
    const startY = this.offsetY % pxSpacing;
    for (let y = startY; y < height; y += pxSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();

        // 눈금 숫자 라벨 그리기 (수직축)
        const mathY = Number(this.toMathY(y).toFixed(2));
        if (mathY !== 0 && Math.abs(y - this.offsetY) > 5) {
            ctx.fillStyle = '#64748b';
            ctx.font = '10px Outfit, sans-serif';
            ctx.fillText(mathY, this.offsetX + 8, y + 4);
        }
    }

    // X-Y 축 그리기
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;

    // X축
    ctx.beginPath();
    ctx.moveTo(0, this.offsetY);
    ctx.lineTo(width, this.offsetY);
    ctx.stroke();

    // Y축
    ctx.beginPath();
    ctx.moveTo(this.offsetX, 0);
    ctx.lineTo(this.offsetX, height);
    ctx.stroke();

    // 원점 표시
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.fillText('O', this.offsetX - 12, this.offsetY + 14);
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
                this.drawLine(p1, p2, isSelected);
            }
        } else if (obj.type === 'SEGMENT') {
            const p1 = this.engine.objectMap[obj.p1Id];
            const p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
                ctx.lineTo(this.toScreenX(p2.x), this.toScreenY(p2.y));
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = isSelected ? 4 : 3;
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
                ctx.strokeStyle = '#059669';
                ctx.lineWidth = isSelected ? 3 : 2;
                ctx.stroke();
            }
        }
    }

    // 2단계: 점(Point) 그리기 (모든 선/원 위에 보이도록)
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (obj.type === 'POINT') {
            const sx = this.toScreenX(obj.x);
            const sy = this.toScreenY(obj.y);
            const isHighlighted = this.highlightIds.indexOf(obj.id) >= 0;
            const isSelected = obj.id === this.selectedObjectId;

            // 대수창 선택 — 얇은 링 한 겹만 (색상 유지)
            if (isSelected) {
                ctx.beginPath();
                ctx.arc(sx, sy, 9, 0, 2 * Math.PI);
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // 작도 선택 중인 점 강조 링
            if (isHighlighted) {
                ctx.beginPath();
                ctx.arc(sx, sy, 12, 0, 2 * Math.PI);
                ctx.strokeStyle = '#f59e0b';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            // 점 중심 원
            ctx.beginPath();
            ctx.arc(sx, sy, 6, 0, 2 * Math.PI);
            if (isHighlighted) {
                ctx.fillStyle = '#f59e0b';
            } else {
                ctx.fillStyle = '#ef4444';
            }
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // 점 이름 표시
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 12px Outfit, sans-serif';
            ctx.fillText(obj.name, sx + 8, sy - 8);
        }
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

AlgeoRenderer.prototype.drawLine = function (p1, p2, isSelected) {
    const ctx = this.ctx;
    const end = this.getLineScreenEndpoints(p1, p2);

    if (!end) {
        return;
    }

    ctx.save();
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(end.x1, end.y1);
    ctx.lineTo(end.x2, end.y2);
    ctx.strokeStyle = '#4f46e5';
    ctx.lineWidth = isSelected ? 3.5 : 2.5;
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

    ctx.strokeStyle = '#7c3aed';
    ctx.lineWidth = isSelected ? 3.5 : 2.5;
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

    this.currentTool = 'MOVE';        // MOVE, POINT, SEGMENT, LINE, CIRCLE, DELETE
    this.isDraggingCanvas = false;    // 캔버스 드래그 여부
    this.dragStart = { x: 0, y: 0 };  // 캔버스 드래그 시작 픽셀 좌표
    this.origOffset = { x: 0, y: 0 }; // 드래그 시작 시점 뷰포트 오프셋

    this.activePoint = null;          // 현재 마우스 드래그 중인 점 객체
    this.selectedPoints = [];         // 선분/원 작도를 위해 선택된 점 배열
    this.selectedObjectId = null;     // 대수창에서 선택된 객체 ID
}

AlgeoApp.prototype.init = function () {
    const self = this;

    // 캔버스 사이즈 조절 및 최초 렌더링 (뷰포트 스케일은 popscale이 담당)
    self.renderer.resize();
    self.renderer.draw();

    // 1. 도구바 버튼 클릭 처리 (jQuery 위임 활용)
    $('.algeo-toolbar').on('click', '.tool-btn', function () {
        $('.tool-btn').removeClass('active');
        $(this).addClass('active');

        self.currentTool = $(this).attr('data-tool');
        self.selectedPoints = []; // 도구 변경 시 선택 점 리스트 초기화
        self.syncHighlightToRenderer();
        self.updateCanvasCursor();
        self.renderer.draw();
    });

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

    // 4. 대수창 수식 입력 이벤트
    $('#btnAlgebraSubmit').on('click', function () {
        self.handleAlgebraInput();
    });

    $('#algebraInput').on('keydown', function (e) {
        if (e.keyCode === 13) {
            self.handleAlgebraInput();
        }
    });

    // 5. 대수창 항목 클릭 → 캔버스 객체 하이라이트
    $('#algebraList').on('click', '.algebra-item', function () {
        const objId = $(this).attr('data-id');
        self.selectAlgebraObject(objId);
    });

    self.updateCanvasCursor();
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
    } else if (this.currentTool === 'SEGMENT' || this.currentTool === 'LINE' || this.currentTool === 'CIRCLE') {
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

// 마우스 다운 핸들러
AlgeoApp.prototype.handleMouseDown = function (e) {
    const r = this.renderer;
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;

    // 1. 마우스 위치 아래에 있는 점 탐색
    const hitPoint = this.findPointAt(mouseX, mouseY);

    if (this.currentTool === 'MOVE') {
        if (hitPoint) {
            // 점 드래그 시작
            this.activePoint = hitPoint;
            this.setCanvasCursor('grabbing');
        } else {
            // 빈 공간 클릭 -> 선택 해제 후 캔버스 패닝 시작
            this.clearAlgebraSelection();
            this.isDraggingCanvas = true;
            this.dragStart.x = mouseX;
            this.dragStart.y = mouseY;
            this.origOffset.x = r.offsetX;
            this.origOffset.y = r.offsetY;
            this.setCanvasCursor('grabbing');
        }
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
    } else if (this.currentTool === 'SEGMENT' || this.currentTool === 'LINE' || this.currentTool === 'CIRCLE') {
        if (hitPoint) {
            this.selectedPoints.push(hitPoint.id);
            this.syncHighlightToRenderer();

            // 선분: 두 점 선택 완료 시 작도
            if (this.currentTool === 'SEGMENT' && this.selectedPoints.length === 2) {
                const p1Id = this.selectedPoints[0];
                const p2Id = this.selectedPoints[1];

                if (p1Id !== p2Id) {
                    const p1 = this.engine.objectMap[p1Id];
                    const p2 = this.engine.objectMap[p2Id];
                    const name = p1.name + p2.name;
                    this.engine.addSegment(name, p1Id, p2Id);
                    this.updateAlgebraView();
                }
                this.selectedPoints = [];
                this.syncHighlightToRenderer();
                r.draw();
            }
            // 직선: 두 점 선택 완료 시 작도
            else if (this.currentTool === 'LINE' && this.selectedPoints.length === 2) {
                const p1Id = this.selectedPoints[0];
                const p2Id = this.selectedPoints[1];

                if (p1Id !== p2Id) {
                    const p1 = this.engine.objectMap[p1Id];
                    const p2 = this.engine.objectMap[p2Id];
                    const name = 'd' + p1.name + p2.name;
                    if (!this.engine.findLineByPoints(p1Id, p2Id)) {
                        this.engine.addLine(name, p1Id, p2Id);
                        this.updateAlgebraView();
                    }
                }
                this.selectedPoints = [];
                this.syncHighlightToRenderer();
                r.draw();
            }
            // 원: 중심점과 둘레 점 선택 시 작도
            else if (this.currentTool === 'CIRCLE' && this.selectedPoints.length === 2) {
                const centerId = this.selectedPoints[0];
                const pointId = this.selectedPoints[1];

                if (centerId !== pointId) {
                    const center = this.engine.objectMap[centerId];
                    const name = '⊙' + center.name;
                    this.engine.addCircle(name, centerId, pointId);
                    this.updateAlgebraView();
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
        if (obj.type === 'POINT') {
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
        } else if (obj.type === 'CIRCLE') {
            const center = this.engine.objectMap[obj.centerId];
            const point = this.engine.objectMap[obj.pointId];
            if (center && point) {
                const dx = point.x - center.x;
                const dy = point.y - center.y;
                const radius = Math.sqrt(dx * dx + dy * dy);
                desc = '원 (중심: ' + center.name + ', 반지름: ' + radius.toFixed(2) + ')';
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

// 대수창 수식 입력 처리 (예: A = (1, 2))
AlgeoApp.prototype.handleAlgebraInput = function () {
    const input = $('#algebraInput').val();
    const result = this.parseAlgebraInput(input);

    if (result.success) {
        $('#algebraError').text('');
        $('#algebraInput').val('');
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
        message: '지원 형식: A=(1,2), y=2x+1, D,E, Line(A,B), Circle(A,C)'
    };
};

