// 알지오메스 — 캔버스 렌더러 (AlgeoRenderer)
// engine 이후 로드 · refactor_modules.md 3단계
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
    this.selectedObjectId = null; // 대수창·선택 도구의 주 선택 객체 ID
    this.selectionIds = [];     // 캔버스 다중 선택 ID 목록
    this.marqueeRect = null;    // 그룹선택 드래그 상자 { x1, y1, x2, y2 }
    this.toolPreview = null;    // 호·원 작도 중 실시간 미리보기
    this.showGrid = true;       // 격자·눈금 표시
    this.snapEnabled = false;   // 격자 스냅(자석)
    this.showAxes = true;       // X·Y 축 표시
    this.imageCache = {};       // dataURL → HTMLImageElement 캐시

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

    // 1. 배경 격자(Grid) · 축
    if (this.showGrid) {
        this.drawGrid();
    }
    if (this.showAxes) {
        this.drawAxes(ctx, this.canvas.width, this.canvas.height);
    }

    // 2. 수학 객체들 그리기
    this.drawObjects();

    // 3. 호·원 작도 미리보기
    if (this.toolPreview) {
        this.drawToolPreview(this.toolPreview);
    }

    // 4. 선택된 객체 — 표시 중일 때만 강조 (다중 선택 지원)
    this.drawSelectionHighlights();

    // 5. 그룹선택 마퀴 상자
    if (this.marqueeRect) {
        this.drawMarqueeRect(this.marqueeRect);
    }
};

// 선택 집합 하이라이트 (selectionIds 우선, 없으면 selectedObjectId)
AlgeoRenderer.prototype.drawSelectionHighlights = function () {
    let ids = this.selectionIds;
    let i;
    let obj;

    if (!ids || ids.length === 0) {
        if (!this.selectedObjectId) {
            return;
        }
        ids = [this.selectedObjectId];
    }

    for (i = 0; i < ids.length; i++) {
        obj = this.engine.objectMap[ids[i]];
        if (obj && this.engine.isObjectVisible(obj)) {
            this.drawSelectedObjectHighlight(obj);
        }
    }
};

// 그룹선택 드래그 상자
AlgeoRenderer.prototype.drawMarqueeRect = function (rect) {
    const ctx = this.ctx;
    const x = Math.min(rect.x1, rect.x2);
    const y = Math.min(rect.y1, rect.y2);
    const w = Math.abs(rect.x2 - rect.x1);
    const h = Math.abs(rect.y2 - rect.y1);

    ctx.save();
    ctx.fillStyle = ALGEO_VIS.selectionFill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = ALGEO_VIS.selectionStroke;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
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
    let style;
    let p1;
    let p2;
    let circ;
    let linePts;
    let center;
    let guide;
    let ray1;
    let vertex;
    let ray2;

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

        style = resolveObjectStyle(obj);

        if (obj.type === 'LINE') {
            p1 = this.engine.objectMap[obj.p1Id];
            p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                this.drawLine(p1, p2, style.stroke, style.dash, style.lineWidth);
            }
        } else if (obj.type === 'RAY') {
            p1 = this.engine.objectMap[obj.p1Id];
            p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                this.drawRay(p1, p2, style.stroke, style.dash, style.lineWidth);
            }
        } else if (obj.type === 'PERP_BISECTOR') {
            linePts = this.engine.getPerpBisectorLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, style.stroke, style.dash, style.lineWidth);
            }
        } else if (obj.type === 'ANGLE_BISECTOR') {
            linePts = this.engine.getAngleBisectorLinePoints(obj);
            if (linePts) {
                this.drawRay(linePts.p1, linePts.p2, style.stroke, style.dash, style.lineWidth);
            }
        } else if (obj.type === 'PARALLEL_LINE') {
            linePts = this.engine.getParallelLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, style.stroke, style.dash, style.lineWidth);
            }
        } else if (obj.type === 'PERP_LINE') {
            linePts = this.engine.getPerpLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, style.stroke, style.dash, style.lineWidth);
            }
        } else if (obj.type === 'TANGENT') {
            linePts = this.engine.getTangentLinePoints(obj);
            if (linePts) {
                this.drawLine(linePts.p1, linePts.p2, style.stroke, style.dash, style.lineWidth);
            }
        } else if (obj.type === 'SEGMENT') {
            p1 = this.engine.objectMap[obj.p1Id];
            p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                ctx.save();
                ctx.beginPath();
                ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
                ctx.lineTo(this.toScreenX(p2.x), this.toScreenY(p2.y));
                ctx.strokeStyle = style.stroke;
                ctx.lineWidth = style.lineWidth;
                ctx.lineCap = 'round';
                ctx.setLineDash(style.dash || []);
                ctx.stroke();
                ctx.restore();
            }
        } else if (obj.type === 'VECTOR') {
            p1 = this.engine.objectMap[obj.p1Id];
            p2 = this.engine.objectMap[obj.p2Id];
            if (p1 && p2) {
                this.drawVectorShape(p1, p2, style.stroke, style.lineWidth);
            }
        } else if (obj.type === 'CIRCLE' || obj.type === 'CIRCLE_3P') {
            circ = this.engine.getCircleGeometry(obj);
            if (circ) {
                const cx = this.toScreenX(circ.center.x);
                const cy = this.toScreenY(circ.center.y);
                const screenRadius = circ.radius * this.scale;

                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, screenRadius, 0, 2 * Math.PI);
                ctx.strokeStyle = style.stroke;
                ctx.lineWidth = style.lineWidth;
                ctx.setLineDash(style.dash || []);
                ctx.stroke();
                ctx.restore();
            }
        } else if (obj.type === 'SECTOR') {
            center = this.engine.objectMap[obj.centerId];
            p1 = this.engine.objectMap[obj.p1Id];
            p2 = this.engine.objectMap[obj.p2Id];
            if (center && p1 && p2) {
                this.drawSectorShape(center, p1, p2, style.stroke, style.fill || ALGEO_VIS.sectorFill, style.lineWidth);
            }
        } else if (obj.type === 'CIRCULAR_SEGMENT') {
            p1 = this.engine.objectMap[obj.p1Id];
            p2 = this.engine.objectMap[obj.p2Id];
            guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                this.drawCircularSegmentShape(
                    p1, p2, guide,
                    style.stroke,
                    style.fill || ALGEO_VIS.circularSegmentFill,
                    style.lineWidth
                );
            }
        } else if (obj.type === 'ARC') {
            p1 = this.engine.objectMap[obj.p1Id];
            p2 = this.engine.objectMap[obj.p2Id];
            guide = this.engine.objectMap[obj.guideId];
            if (p1 && p2 && guide) {
                this.drawArcThreePoints(p1, p2, guide, style.stroke, style.lineWidth);
            }
        } else if (obj.type === 'ANGLE') {
            ray1 = this.engine.objectMap[obj.ray1Id];
            vertex = this.engine.objectMap[obj.vertexId];
            ray2 = this.engine.objectMap[obj.ray2Id];
            if (ray1 && vertex && ray2) {
                this.drawAngleShape(ray1, vertex, ray2, obj);
            }
        } else if (obj.type === 'TEXT') {
            this.drawTextObject(obj);
        } else if (obj.type === 'IMAGE') {
            this.drawImageObject(obj);
        } else if (obj.type === 'PEN') {
            this.drawPenStroke(obj);
        } else if (obj.type === 'DECORATE_LEADER') {
            this.drawDecorateLeader(obj);
        } else if (obj.type === 'DECORATE_LENGTH') {
            this.drawDecorateLength(obj);
        } else if (obj.type === 'DECORATE_ANGLE') {
            this.drawDecorateAngle(obj);
        } else if (obj.type === 'DECORATE_PARALLEL') {
            this.drawDecorateParallel(obj);
        }
    }

    // 2단계: 점(Point)·중점(Midpoint) 그리기 (모든 선/원 위에 보이도록)
    for (let i = 0; i < list.length; i++) {
        const obj = list[i];
        if (isAlgeoPointType(obj.type) && engine.isObjectVisible(obj)) {
            this.drawPointShape(obj);
        }
    }

    // 측정 라벨 — 점 위 레이어 (배지 가독성)
    for (let i = 0; i < list.length; i++) {
        const mObj = list[i];
        if (isAlgeoMeasureType(mObj.type) && engine.isObjectVisible(mObj)) {
            this.drawMeasureObject(mObj);
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
    const style = resolveObjectStyle(obj);
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
    } else {
        fillColor = style.fill || style.stroke;
    }
    ctx.fillStyle = fillColor;
    ctx.fill();
    ctx.strokeStyle = ALGEO_VIS.pointStroke;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (style.showLabel) {
        this.drawCanvasLabel(obj.name, sx + 10, sy - 10, {
            font: 'bold 13px Outfit, sans-serif',
            color: ALGEO_VIS.axis
        });
    }
};

// 자유 텍스트 렌더
AlgeoRenderer.prototype.drawTextObject = function (obj) {
    const style = resolveObjectStyle(obj);
    const sx = this.toScreenX(obj.x);
    const sy = this.toScreenY(obj.y);

    this.drawCanvasLabel(obj.text || '', sx, sy, {
        font: 'bold 16px Outfit, sans-serif',
        color: style.stroke,
        align: 'left'
    });
};

// 그림 객체 화면 사각 (픽셀)
AlgeoRenderer.prototype.getImageScreenRect = function (obj) {
    const halfW = (obj.width || 0) * this.scale / 2;
    const halfH = (obj.height || 0) * this.scale / 2;
    const cx = this.toScreenX(obj.x);
    const cy = this.toScreenY(obj.y);

    return {
        x: cx - halfW,
        y: cy - halfH,
        w: halfW * 2,
        h: halfH * 2,
        cx: cx,
        cy: cy
    };
};

// dataURL 이미지 로드·캐시 (로드 완료 시 재그리기)
AlgeoRenderer.prototype.getCachedImage = function (src) {
    const self = this;
    let img;

    if (!src) {
        return null;
    }
    img = this.imageCache[src];
    if (img) {
        return img;
    }
    img = new Image();
    img.onload = function () {
        self.draw();
    };
    img.src = src;
    this.imageCache[src] = img;
    return img;
};

// 그림 객체 렌더
AlgeoRenderer.prototype.drawImageObject = function (obj) {
    const ctx = this.ctx;
    const rect = this.getImageScreenRect(obj);
    const img = this.getCachedImage(obj.src);
    const style = resolveObjectStyle(obj);

    if (img && img.complete && img.naturalWidth > 0) {
        ctx.save();
        ctx.drawImage(img, rect.x, rect.y, rect.w, rect.h);
        ctx.restore();
    } else {
        ctx.save();
        ctx.strokeStyle = style.stroke;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = ALGEO_VIS.gridLabel;
        ctx.font = '12px Outfit, sans-serif';
        ctx.fillText('그림…', rect.cx - 16, rect.cy + 4);
        ctx.restore();
    }

    if (style.showLabel && obj.name) {
        this.drawCanvasLabel(obj.name, rect.x, rect.y - 6, {
            font: '600 12px Outfit, sans-serif',
            color: style.stroke,
            align: 'left'
        });
    }
};

// 펜 획 렌더
AlgeoRenderer.prototype.drawPenStroke = function (obj) {
    const ctx = this.ctx;
    const style = resolveObjectStyle(obj);
    const pts = obj.points;
    let i;
    let sx;
    let sy;

    if (!pts || pts.length < 1) {
        return;
    }

    ctx.save();
    ctx.beginPath();
    sx = this.toScreenX(pts[0].x);
    sy = this.toScreenY(pts[0].y);
    ctx.moveTo(sx, sy);
    for (i = 1; i < pts.length; i++) {
        ctx.lineTo(this.toScreenX(pts[i].x), this.toScreenY(pts[i].y));
    }
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(style.dash || []);
    ctx.stroke();
    ctx.restore();

    if (style.showLabel && obj.name) {
        this.drawCanvasLabel(obj.name, sx + 6, sy - 6, {
            font: '600 12px Outfit, sans-serif',
            color: style.stroke,
            align: 'left'
        });
    }
};

// 설명선 렌더
AlgeoRenderer.prototype.drawDecorateLeader = function (obj) {
    const ctx = this.ctx;
    const style = resolveObjectStyle(obj);
    const x1 = this.toScreenX(obj.x1);
    const y1 = this.toScreenY(obj.y1);
    const x2 = this.toScreenX(obj.x2);
    const y2 = this.toScreenY(obj.y2);
    const ang = Math.atan2(y2 - y1, x2 - x1);
    const head = 10;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(ang - Math.PI / 6) * head, y2 - Math.sin(ang - Math.PI / 6) * head);
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - Math.cos(ang + Math.PI / 6) * head, y2 - Math.sin(ang + Math.PI / 6) * head);
    ctx.stroke();
    ctx.restore();

    if (obj.text) {
        this.drawCanvasLabel(obj.text, x1 + 10, y1 - 10, {
            font: 'bold 13px Outfit, sans-serif',
            color: style.stroke
        });
    }
};

// 길이 꾸미기 렌더
AlgeoRenderer.prototype.drawDecorateLength = function (obj) {
    const style = resolveObjectStyle(obj);
    const pair = this.engine.getObjectLineAB(this.engine.objectMap[obj.targetId]);
    let midX;
    let midY;
    let dx;
    let dy;
    let len;
    let nx;
    let ny;
    const ctx = this.ctx;

    if (!pair) {
        return;
    }
    midX = (pair.a.x + pair.b.x) / 2;
    midY = (pair.a.y + pair.b.y) / 2;
    dx = pair.b.x - pair.a.x;
    dy = pair.b.y - pair.a.y;
    len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) {
        return;
    }
    nx = -dy / len;
    ny = dx / len;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(this.toScreenX(midX - nx * 0.18), this.toScreenY(midY - ny * 0.18));
    ctx.lineTo(this.toScreenX(midX + nx * 0.18), this.toScreenY(midY + ny * 0.18));
    ctx.moveTo(this.toScreenX(midX - dx / len * 0.2 - nx * 0.18), this.toScreenY(midY - dy / len * 0.2 - ny * 0.18));
    ctx.lineTo(this.toScreenX(midX - dx / len * 0.2 + nx * 0.18), this.toScreenY(midY - dy / len * 0.2 + ny * 0.18));
    ctx.moveTo(this.toScreenX(midX + dx / len * 0.2 - nx * 0.18), this.toScreenY(midY + dy / len * 0.2 - ny * 0.18));
    ctx.lineTo(this.toScreenX(midX + dx / len * 0.2 + nx * 0.18), this.toScreenY(midY + dy / len * 0.2 + ny * 0.18));
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.stroke();
    ctx.restore();
};

// 각도 꾸미기 렌더
AlgeoRenderer.prototype.drawDecorateAngle = function (obj) {
    const ray1 = this.engine.objectMap[obj.ray1Id];
    const vertex = this.engine.objectMap[obj.vertexId];
    const ray2 = this.engine.objectMap[obj.ray2Id];

    if (!ray1 || !vertex || !ray2) {
        return;
    }
    this.drawAngleShape(ray1, vertex, ray2, obj);
};

// 평행 꾸미기 렌더
AlgeoRenderer.prototype.drawDecorateParallel = function (obj) {
    const ctx = this.ctx;
    const style = resolveObjectStyle(obj);
    const target = this.engine.objectMap[obj.targetId];
    const line = this.engine.getObjectLineAB(target);
    let mx;
    let my;
    let dx;
    let dy;
    let len;
    let nx;
    let ny;
    let count;
    let i;
    let offset;

    if (!line) {
        return;
    }
    mx = (line.a.x + line.b.x) / 2;
    my = (line.a.y + line.b.y) / 2;
    dx = line.b.x - line.a.x;
    dy = line.b.y - line.a.y;
    len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1e-10) {
        return;
    }
    nx = -dy / len;
    ny = dx / len;
    count = ((obj.groupId - 1) % 3) + 1;
    ctx.save();
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    for (i = 0; i < count; i++) {
        offset = (i - (count - 1) / 2) * 0.32;
        ctx.beginPath();
        ctx.moveTo(
            this.toScreenX(mx + dx / len * offset - nx * 0.22),
            this.toScreenY(my + dy / len * offset - ny * 0.22)
        );
        ctx.lineTo(
            this.toScreenX(mx + dx / len * offset + nx * 0.22),
            this.toScreenY(my + dy / len * offset + ny * 0.22)
        );
        ctx.stroke();
    }
    ctx.restore();
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
    const style = resolveObjectStyle(obj);
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

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(screenPts[0].x, screenPts[0].y);
    for (i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = style.fill || ALGEO_VIS.polygonFill;
    ctx.fill();
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.lineJoin = 'round';
    ctx.setLineDash(style.dash || []);
    ctx.stroke();
    ctx.restore();

    if (style.showLabel) {
        this.drawCanvasLabel(obj.name, cx, cy - 8, {
            font: 'bold 12px Outfit, sans-serif',
            color: style.stroke,
            align: 'center'
        });
    }
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

    if (preview.type === 'DECORATE_LEADER') {
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(this.toScreenX(preview.x1), this.toScreenY(preview.y1));
        ctx.lineTo(this.toScreenX(preview.mathX), this.toScreenY(preview.mathY));
        ctx.strokeStyle = ALGEO_VIS.previewSegment;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
        return;
    }

    if (preview.type === 'PEN') {
        if (!preview.points || preview.points.length < 1) {
            return;
        }
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(this.toScreenX(preview.points[0].x), this.toScreenY(preview.points[0].y));
        for (let pi = 1; pi < preview.points.length; pi++) {
            ctx.lineTo(
                this.toScreenX(preview.points[pi].x),
                this.toScreenY(preview.points[pi].y)
            );
        }
        ctx.strokeStyle = preview.stroke || ALGEO_VIS.previewSegment;
        ctx.lineWidth = preview.lineWidth || 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.setLineDash(preview.dash || []);
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
AlgeoRenderer.prototype.drawAngleShape = function (ray1, vertex, ray2, angleObj) {
    const bx = this.toScreenX(vertex.x);
    const by = this.toScreenY(vertex.y);
    const sx1 = this.toScreenX(ray1.x);
    const sy1 = this.toScreenY(ray1.y);
    const sx2 = this.toScreenX(ray2.x);
    const sy2 = this.toScreenY(ray2.y);
    const arcR = 34;
    const sweep = this.getArcScreenSweep(bx, by, sx1, sy1, sx2, sy2);
    const ctx = this.ctx;
    const style = angleObj ? resolveObjectStyle(angleObj) : {
        stroke: ALGEO_VIS.angle,
        fill: ALGEO_VIS.angleFill,
        lineWidth: 2.5,
        showLabel: true
    };
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
    ctx.fillStyle = style.fill || ALGEO_VIS.angleFill;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(bx, by, arcR, sweep.startA, sweep.endA, sweep.ccw);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    if (degrees !== null && style.showLabel !== false) {
        const midA = sweep.startA + (sweep.endA - sweep.startA) / 2;
        const labelR = arcR + 16;
        const lx = bx + Math.cos(midA) * labelR;
        const ly = by + Math.sin(midA) * labelR;
        this.drawCanvasLabel(degrees.toFixed(1) + '\u00B0', lx, ly + 4, {
            align: 'center',
            font: 'bold 12px Outfit, sans-serif',
            color: style.stroke
        });
    }
};

// 측정값 배지 텍스트
AlgeoRenderer.prototype.formatMeasureLabel = function (obj) {
    let val = obj.value;

    if (val === null || val === undefined || isNaN(val)) {
        return obj.name + ' = ?';
    }
    if (obj.type === 'MEASURE_ANGLE') {
        return obj.name + ' = ' + val.toFixed(1) + '\u00B0';
    }
    return obj.name + ' = ' + val.toFixed(2);
};

// 측정 객체 그리기 (길이 보조선 + 각도 호 + 배지)
AlgeoRenderer.prototype.drawMeasureObject = function (obj) {
    const engine = this.engine;
    const ctx = this.ctx;
    const style = resolveObjectStyle(obj);
    const anchor = engine.getMeasureLabelAnchor(obj);
    let p1;
    let p2;
    let ray1;
    let vertex;
    let ray2;
    let sx;
    let sy;
    let text;
    let metrics;
    let padX = 8;
    let padY = 5;
    let bw;
    let bh;
    let bx;
    let by;

    if (!anchor || style.showLabel === false) {
        return;
    }

    if (obj.type === 'MEASURE_LENGTH') {
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        if (p1 && p2) {
            ctx.save();
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(this.toScreenX(p1.x), this.toScreenY(p1.y));
            ctx.lineTo(this.toScreenX(p2.x), this.toScreenY(p2.y));
            ctx.strokeStyle = style.stroke;
            ctx.globalAlpha = 0.35;
            ctx.lineWidth = 1.5;
            ctx.stroke();
            ctx.restore();
        }
    } else if (obj.type === 'MEASURE_ANGLE') {
        ray1 = engine.objectMap[obj.ray1Id];
        vertex = engine.objectMap[obj.vertexId];
        ray2 = engine.objectMap[obj.ray2Id];
        if (ray1 && vertex && ray2) {
            bx = this.toScreenX(vertex.x);
            by = this.toScreenY(vertex.y);
            const sweep = this.getArcScreenSweep(
                bx, by,
                this.toScreenX(ray1.x), this.toScreenY(ray1.y),
                this.toScreenX(ray2.x), this.toScreenY(ray2.y)
            );
            ctx.save();
            ctx.beginPath();
            ctx.arc(bx, by, 28, sweep.startA, sweep.endA, sweep.ccw);
            ctx.strokeStyle = style.stroke;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.85;
            ctx.stroke();
            ctx.restore();
        }
    }

    sx = this.toScreenX(anchor.x);
    sy = this.toScreenY(anchor.y);
    text = this.formatMeasureLabel(obj);

    ctx.save();
    ctx.font = 'bold 12px Outfit, sans-serif';
    metrics = ctx.measureText(text);
    bw = metrics.width + padX * 2;
    bh = 18 + padY;
    bx = sx - bw / 2;
    by = sy - bh / 2;

    ctx.beginPath();
    if (ctx.roundRect) {
        ctx.roundRect(bx, by, bw, bh, 6);
    } else {
        ctx.rect(bx, by, bw, bh);
    }
    ctx.fillStyle = ALGEO_VIS.measureBadge;
    ctx.fill();
    ctx.strokeStyle = style.stroke || ALGEO_VIS.measureBadgeStroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    this.drawCanvasLabel(text, sx, sy + 4, {
        align: 'center',
        font: 'bold 12px Outfit, sans-serif',
        color: style.stroke,
        halo: false
    });
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
    const dash = Array.isArray(dashPattern) ? dashPattern : [10, 6];
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
    const dash = Array.isArray(dashPattern) ? dashPattern : [10, 5];
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
    let style;

    coeffs = this.engine.getFunctionCoeffs(obj);

    ctx.save();
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

    style = resolveObjectStyle(obj);
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.lineWidth;
    ctx.lineCap = 'round';
    ctx.setLineDash(style.dash || []);
    ctx.stroke();
    ctx.restore();
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
    let anchor;

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

    if (isAlgeoMeasureType(obj.type)) {
        anchor = this.engine.getMeasureLabelAnchor(obj);
        if (!anchor) { return; }
        sx = this.toScreenX(anchor.x);
        sy = this.toScreenY(anchor.y);
        ctx.beginPath();
        ctx.rect(sx - 48, sy - 14, 96, 28);
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'TEXT') {
        sx = this.toScreenX(obj.x);
        sy = this.toScreenY(obj.y);
        ctx.beginPath();
        ctx.rect(sx - 4, sy - 18, 110, 26);
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'IMAGE') {
        bounds = this.getImageScreenRect(obj);
        ctx.beginPath();
        ctx.rect(bounds.x - 2, bounds.y - 2, bounds.w + 4, bounds.h + 4);
        this.strokeSelectionPath();
        return;
    }

    if (obj.type === 'PEN') {
        if (!obj.points || obj.points.length < 1) {
            return;
        }
        ctx.beginPath();
        ctx.moveTo(this.toScreenX(obj.points[0].x), this.toScreenY(obj.points[0].y));
        for (i = 1; i < obj.points.length; i++) {
            ctx.lineTo(this.toScreenX(obj.points[i].x), this.toScreenY(obj.points[i].y));
        }
        this.strokeSelectionPath();
        return;
    }
};

