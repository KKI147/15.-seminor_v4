// 알지오메스 — 기하 종속성 엔진 (AlgeoEngine)
// constants/tools 이후 로드 · refactor_modules.md 2단계
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

// 두 점 사이 거리
AlgeoEngine.prototype.getDistanceByPointIds = function (p1Id, p2Id) {
    const p1 = this.objectMap[p1Id];
    const p2 = this.objectMap[p2Id];
    let dx;
    let dy;

    if (!p1 || !p2) {
        return null;
    }
    dx = p2.x - p1.x;
    dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
};

// 점을 기준점에 대해 점대칭한 좌표
AlgeoEngine.prototype.reflectPointCoords = function (source, center) {
    if (!source || !center) {
        return null;
    }
    return {
        x: center.x * 2 - source.x,
        y: center.y * 2 - source.y
    };
};

// 점을 두 점이 정하는 직선에 대해 선대칭한 좌표
AlgeoEngine.prototype.reflectLineCoords = function (source, lineP1, lineP2) {
    let dx;
    let dy;
    let len2;
    let t;
    let px;
    let py;

    if (!source || !lineP1 || !lineP2) {
        return null;
    }
    dx = lineP2.x - lineP1.x;
    dy = lineP2.y - lineP1.y;
    len2 = dx * dx + dy * dy;
    if (len2 < 1e-12) {
        return null;
    }
    t = ((source.x - lineP1.x) * dx + (source.y - lineP1.y) * dy) / len2;
    px = lineP1.x + dx * t;
    py = lineP1.y + dy * t;
    return {
        x: px * 2 - source.x,
        y: py * 2 - source.y
    };
};

// 점을 기준점 중심으로 회전한 좌표
AlgeoEngine.prototype.rotatePointCoords = function (source, center, degrees) {
    const rad = (degrees || 0) * Math.PI / 180;
    const dx = source.x - center.x;
    const dy = source.y - center.y;
    const cosVal = Math.cos(rad);
    const sinVal = Math.sin(rad);

    if (!source || !center) {
        return null;
    }
    return {
        x: center.x + dx * cosVal - dy * sinVal,
        y: center.y + dx * sinVal + dy * cosVal
    };
};

// 점을 기준 벡터만큼 평행이동한 좌표
AlgeoEngine.prototype.translatePointCoords = function (source, fromPoint, toPoint) {
    if (!source || !fromPoint || !toPoint) {
        return null;
    }
    return {
        x: source.x + (toPoint.x - fromPoint.x),
        y: source.y + (toPoint.y - fromPoint.y)
    };
};

// 점을 기준점 중심으로 확대/축소한 좌표
AlgeoEngine.prototype.dilatePointCoords = function (source, center, scale) {
    if (!source || !center || scale === null || scale === undefined || isNaN(scale)) {
        return null;
    }
    return {
        x: center.x + (source.x - center.x) * scale,
        y: center.y + (source.y - center.y) * scale
    };
};

// 변환 종속점 좌표 재계산
AlgeoEngine.prototype.getTransformedPointCoords = function (obj) {
    const source = this.objectMap[obj.sourceId];
    const ref1 = this.objectMap[obj.ref1Id];
    const ref2 = this.objectMap[obj.ref2Id];

    if (!source) {
        return null;
    }
    if (obj.transformType === 'REFLECT_POINT') {
        return this.reflectPointCoords(source, ref1);
    }
    if (obj.transformType === 'REFLECT_LINE') {
        return this.reflectLineCoords(source, ref1, ref2);
    }
    if (obj.transformType === 'ROTATE') {
        return this.rotatePointCoords(source, ref1, obj.degrees || 0);
    }
    if (obj.transformType === 'TRANSLATE') {
        return this.translatePointCoords(source, ref1, ref2);
    }
    if (obj.transformType === 'DILATE') {
        return this.dilatePointCoords(source, ref1, obj.scale || 1);
    }
    return null;
};

// 변환 종속점 추가
AlgeoEngine.prototype.addTransformPoint = function (name, sourceId, config) {
    const source = this.objectMap[sourceId];
    const ref1 = config && config.ref1Id ? this.objectMap[config.ref1Id] : null;
    const ref2 = config && config.ref2Id ? this.objectMap[config.ref2Id] : null;
    let coords;
    let parents;
    let id;
    let obj;

    if (!source || !config || !isAlgeoTransformTool(config.transformType)) {
        return null;
    }
    coords = this.getTransformedPointCoords({
        sourceId: sourceId,
        ref1Id: config.ref1Id || null,
        ref2Id: config.ref2Id || null,
        transformType: config.transformType,
        degrees: config.degrees || 0,
        scale: config.scale !== undefined ? config.scale : 1
    });
    if (!coords) {
        return null;
    }
    parents = [sourceId];
    if (config.ref1Id) {
        parents.push(config.ref1Id);
    }
    if (config.ref2Id) {
        parents.push(config.ref2Id);
    }
    id = this.generateId();
    obj = {
        id: id,
        type: 'TRANSFORM_POINT',
        name: name,
        sourceId: sourceId,
        ref1Id: config.ref1Id || null,
        ref2Id: config.ref2Id || null,
        transformType: config.transformType,
        degrees: config.degrees || 0,
        scale: config.scale !== undefined ? config.scale : 1,
        x: coords.x,
        y: coords.y,
        parents: parents,
        children: []
    };
    source.children.push(id);
    if (ref1) {
        ref1.children.push(id);
    }
    if (ref2) {
        ref2.children.push(id);
    }
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 세 점 각도(도) — ray1–vertex–ray2
AlgeoEngine.prototype.getDegreesByPointIds = function (ray1Id, vertexId, ray2Id) {
    return this.getAngleDegrees({
        ray1Id: ray1Id,
        vertexId: vertexId,
        ray2Id: ray2Id
    });
};

// 다각형 넓이 (신발끈 공식, 절대값)
AlgeoEngine.prototype.getPolygonArea = function (obj) {
    let i;
    let p;
    let q;
    let sum = 0;
    let pts;

    if (!obj || obj.type !== 'POLYGON' || !obj.vertexIds || obj.vertexIds.length < 3) {
        return null;
    }
    pts = [];
    for (i = 0; i < obj.vertexIds.length; i++) {
        p = this.objectMap[obj.vertexIds[i]];
        if (!p) {
            return null;
        }
        pts.push(p);
    }
    for (i = 0; i < pts.length; i++) {
        p = pts[i];
        q = pts[(i + 1) % pts.length];
        sum += p.x * q.y - q.x * p.y;
    }
    return Math.abs(sum) / 2;
};

// 원 넓이
AlgeoEngine.prototype.getCircleArea = function (obj) {
    const circ = this.getCircleGeometry(obj);
    if (!circ) {
        return null;
    }
    return Math.PI * circ.radius * circ.radius;
};

// 부채꼴 넓이
AlgeoEngine.prototype.getSectorArea = function (obj) {
    const center = this.objectMap[obj.centerId];
    const p1 = this.objectMap[obj.p1Id];
    const p2 = this.objectMap[obj.p2Id];
    let dx;
    let dy;
    let r;
    let deg;

    if (!center || !p1 || !p2) {
        return null;
    }
    dx = p1.x - center.x;
    dy = p1.y - center.y;
    r = Math.sqrt(dx * dx + dy * dy);
    if (r < 1e-12) {
        return null;
    }
    deg = this.getDegreesByPointIds(obj.p1Id, obj.centerId, obj.p2Id);
    if (deg === null) {
        return null;
    }
    return Math.PI * r * r * (deg / 360);
};

// 활꼴 넓이 (호–현 사이 영역)
AlgeoEngine.prototype.getCircularSegmentArea = function (obj) {
    const p1 = this.objectMap[obj.p1Id];
    const p2 = this.objectMap[obj.p2Id];
    const guide = this.objectMap[obj.guideId];
    let center;
    let dx;
    let dy;
    let r;
    let a1;
    let a2;
    let ag;
    let diff1;
    let diff2;
    let t;
    let useDiff;
    let theta;

    if (!p1 || !p2 || !guide) {
        return null;
    }
    center = this.computeCircumcenter(p1.x, p1.y, p2.x, p2.y, guide.x, guide.y);
    if (!center) {
        return null;
    }
    dx = p1.x - center.x;
    dy = p1.y - center.y;
    r = Math.sqrt(dx * dx + dy * dy);
    if (r < 1e-12) {
        return null;
    }

    a1 = Math.atan2(p1.y - center.y, p1.x - center.x);
    a2 = Math.atan2(p2.y - center.y, p2.x - center.x);
    ag = Math.atan2(guide.y - center.y, guide.x - center.x);

    diff1 = a2 - a1;
    while (diff1 > Math.PI) { diff1 -= 2 * Math.PI; }
    while (diff1 < -Math.PI) { diff1 += 2 * Math.PI; }

    diff2 = diff1 > 0 ? diff1 - 2 * Math.PI : diff1 + 2 * Math.PI;
    t = ag - a1;
    while (t > Math.PI) { t -= 2 * Math.PI; }
    while (t < -Math.PI) { t += 2 * Math.PI; }

    useDiff = diff1;
    if (diff1 >= 0) {
        if (t < 0 || t > diff1) { useDiff = diff2; }
    } else if (t > 0 || t < diff1) {
        useDiff = diff2;
    }

    theta = Math.abs(useDiff);
    return 0.5 * r * r * (theta - Math.sin(theta));
};

// 측정 대상 도형의 넓이
AlgeoEngine.prototype.getAreaOfTarget = function (targetId) {
    const target = this.objectMap[targetId];
    if (!target) {
        return null;
    }
    if (target.type === 'POLYGON') {
        return this.getPolygonArea(target);
    }
    if (target.type === 'CIRCLE' || target.type === 'CIRCLE_3P') {
        return this.getCircleArea(target);
    }
    if (target.type === 'SECTOR') {
        return this.getSectorArea(target);
    }
    if (target.type === 'CIRCULAR_SEGMENT') {
        return this.getCircularSegmentArea(target);
    }
    return null;
};

// 측정 객체의 수치 갱신
AlgeoEngine.prototype.refreshMeasureValue = function (obj) {
    let val = null;

    if (!obj) {
        return;
    }
    if (obj.type === 'MEASURE_LENGTH') {
        val = this.getDistanceByPointIds(obj.p1Id, obj.p2Id);
    } else if (obj.type === 'MEASURE_ANGLE') {
        val = this.getDegreesByPointIds(obj.ray1Id, obj.vertexId, obj.ray2Id);
    } else if (obj.type === 'MEASURE_AREA') {
        val = this.getAreaOfTarget(obj.targetId);
    }
    obj.value = val;
};

// 측정 라벨 앵커(수학 좌표)
AlgeoEngine.prototype.getMeasureLabelAnchor = function (obj) {
    let p1;
    let p2;
    let vertex;
    let ray1;
    let ray2;
    let target;
    let circ;
    let dx;
    let dy;
    let len;
    let i;
    let sx;
    let sy;
    let n;
    let vp;

    if (!obj) {
        return null;
    }

    if (obj.type === 'MEASURE_LENGTH') {
        p1 = this.objectMap[obj.p1Id];
        p2 = this.objectMap[obj.p2Id];
        if (!p1 || !p2) {
            return null;
        }
        dx = p2.x - p1.x;
        dy = p2.y - p1.y;
        len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-10) {
            return { x: p1.x, y: p1.y + 0.4 };
        }
        return {
            x: (p1.x + p2.x) / 2 - (dy / len) * 0.45,
            y: (p1.y + p2.y) / 2 + (dx / len) * 0.45
        };
    }

    if (obj.type === 'MEASURE_ANGLE') {
        ray1 = this.objectMap[obj.ray1Id];
        vertex = this.objectMap[obj.vertexId];
        ray2 = this.objectMap[obj.ray2Id];
        if (!ray1 || !vertex || !ray2) {
            return null;
        }
        dx = (ray1.x - vertex.x) / (Math.sqrt(
            (ray1.x - vertex.x) * (ray1.x - vertex.x) +
            (ray1.y - vertex.y) * (ray1.y - vertex.y)
        ) || 1);
        dy = (ray1.y - vertex.y) / (Math.sqrt(
            (ray1.x - vertex.x) * (ray1.x - vertex.x) +
            (ray1.y - vertex.y) * (ray1.y - vertex.y)
        ) || 1);
        // 두 변 단위벡터의 합 방향(각 이등분 쪽)으로 라벨 배치
        p1 = {
            x: (ray1.x - vertex.x),
            y: (ray1.y - vertex.y)
        };
        p2 = {
            x: (ray2.x - vertex.x),
            y: (ray2.y - vertex.y)
        };
        len = Math.sqrt(p1.x * p1.x + p1.y * p1.y);
        if (len > 1e-10) {
            p1.x /= len;
            p1.y /= len;
        }
        len = Math.sqrt(p2.x * p2.x + p2.y * p2.y);
        if (len > 1e-10) {
            p2.x /= len;
            p2.y /= len;
        }
        dx = p1.x + p2.x;
        dy = p1.y + p2.y;
        len = Math.sqrt(dx * dx + dy * dy);
        if (len < 1e-10) {
            dx = -p1.y;
            dy = p1.x;
            len = 1;
        }
        return {
            x: vertex.x + (dx / len) * 1.15,
            y: vertex.y + (dy / len) * 1.15
        };
    }

    if (obj.type === 'MEASURE_AREA') {
        target = this.objectMap[obj.targetId];
        if (!target) {
            return null;
        }
        if (target.type === 'POLYGON') {
            sx = 0;
            sy = 0;
            n = 0;
            for (i = 0; i < target.vertexIds.length; i++) {
                vp = this.objectMap[target.vertexIds[i]];
                if (vp) {
                    sx += vp.x;
                    sy += vp.y;
                    n += 1;
                }
            }
            if (n === 0) {
                return null;
            }
            return { x: sx / n, y: sy / n };
        }
        if (target.type === 'CIRCLE' || target.type === 'CIRCLE_3P') {
            circ = this.getCircleGeometry(target);
            if (!circ) {
                return null;
            }
            return { x: circ.center.x, y: circ.center.y };
        }
        if (target.type === 'SECTOR') {
            vertex = this.objectMap[target.centerId];
            if (!vertex) {
                return null;
            }
            return { x: vertex.x, y: vertex.y };
        }
        if (target.type === 'CIRCULAR_SEGMENT') {
            p1 = this.objectMap[target.p1Id];
            p2 = this.objectMap[target.p2Id];
            ray1 = this.objectMap[target.guideId];
            if (!p1 || !p2 || !ray1) {
                return null;
            }
            return {
                x: (p1.x + p2.x + ray1.x) / 3,
                y: (p1.y + p2.y + ray1.y) / 3
            };
        }
    }

    return null;
};

// 길이 측정 중복 검색
AlgeoEngine.prototype.findMeasureLengthByPoints = function (p1Id, p2Id) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type === 'MEASURE_LENGTH' &&
            ((obj.p1Id === p1Id && obj.p2Id === p2Id) ||
                (obj.p1Id === p2Id && obj.p2Id === p1Id))) {
            return obj;
        }
    }
    return null;
};

// 각도 측정 중복 검색
AlgeoEngine.prototype.findMeasureAngleByPoints = function (ray1Id, vertexId, ray2Id) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type === 'MEASURE_ANGLE' && obj.vertexId === vertexId &&
            ((obj.ray1Id === ray1Id && obj.ray2Id === ray2Id) ||
                (obj.ray1Id === ray2Id && obj.ray2Id === ray1Id))) {
            return obj;
        }
    }
    return null;
};

// 넓이 측정 중복 검색
AlgeoEngine.prototype.findMeasureAreaByTarget = function (targetId) {
    const list = this.objects;
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (obj.type === 'MEASURE_AREA' && obj.targetId === targetId) {
            return obj;
        }
    }
    return null;
};

// 슬라이더·측정 변수 이름 충돌 검사
AlgeoEngine.prototype.findValueNameOwner = function (name) {
    const list = this.objects;
    const lower = (name || '').toLowerCase();
    let i;
    let obj;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if ((obj.type === 'SLIDER' || isAlgeoMeasureType(obj.type)) &&
            obj.name.toLowerCase() === lower) {
            return obj;
        }
    }
    return null;
};

// 길이 측정 객체 추가
AlgeoEngine.prototype.addMeasureLength = function (name, p1Id, p2Id) {
    const p1 = this.objectMap[p1Id];
    const p2 = this.objectMap[p2Id];
    let id;
    let obj;

    if (!p1 || !p2) {
        return null;
    }
    id = this.generateId();
    obj = {
        id: id,
        type: 'MEASURE_LENGTH',
        name: name,
        p1Id: p1Id,
        p2Id: p2Id,
        parents: [p1Id, p2Id],
        children: [],
        value: null
    };
    p1.children.push(id);
    p2.children.push(id);
    this.objects.push(obj);
    this.objectMap[id] = obj;
    this.refreshMeasureValue(obj);
    return obj;
};

// 각도 측정 객체 추가
AlgeoEngine.prototype.addMeasureAngle = function (name, ray1Id, vertexId, ray2Id) {
    const ray1 = this.objectMap[ray1Id];
    const vertex = this.objectMap[vertexId];
    const ray2 = this.objectMap[ray2Id];
    let id;
    let obj;

    if (!ray1 || !vertex || !ray2) {
        return null;
    }
    id = this.generateId();
    obj = {
        id: id,
        type: 'MEASURE_ANGLE',
        name: name,
        ray1Id: ray1Id,
        vertexId: vertexId,
        ray2Id: ray2Id,
        parents: [ray1Id, vertexId, ray2Id],
        children: [],
        value: null
    };
    ray1.children.push(id);
    vertex.children.push(id);
    ray2.children.push(id);
    this.objects.push(obj);
    this.objectMap[id] = obj;
    this.refreshMeasureValue(obj);
    return obj;
};

// 넓이 측정 객체 추가
AlgeoEngine.prototype.addMeasureArea = function (name, targetId) {
    const target = this.objectMap[targetId];
    let id;
    let obj;

    if (!target || !ALGEO_AREA_MEASURABLE_TYPES[target.type]) {
        return null;
    }
    id = this.generateId();
    obj = {
        id: id,
        type: 'MEASURE_AREA',
        name: name,
        targetId: targetId,
        parents: [targetId],
        children: [],
        value: null
    };
    target.children.push(id);
    this.objects.push(obj);
    this.objectMap[id] = obj;
    this.refreshMeasureValue(obj);
    return obj;
};

// 자유 텍스트 객체 추가
AlgeoEngine.prototype.addText = function (text, x, y) {
    const id = this.generateId();
    const obj = {
        id: id,
        type: 'TEXT',
        name: '텍스트',
        text: text,
        x: x,
        y: y,
        parents: [],
        children: []
    };
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 그림(이미지) 객체 추가 — src는 data URL (저장·Undo용)
AlgeoEngine.prototype.addImage = function (name, x, y, width, height, src, fileName) {
    const id = this.generateId();
    const obj = {
        id: id,
        type: 'IMAGE',
        name: name || '그림',
        x: x,
        y: y,
        width: width,
        height: height,
        src: src || '',
        fileName: fileName || '',
        style: { showLabel: false },
        parents: [],
        children: []
    };
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 펜 획(자유곡선) 추가
AlgeoEngine.prototype.addPenStroke = function (name, points, style) {
    const id = this.generateId();
    const pts = [];
    let i;
    let styleCopy;

    if (!points || points.length < ALGEO_PEN_MIN_POINTS) {
        return null;
    }
    for (i = 0; i < points.length; i++) {
        pts.push({ x: points[i].x, y: points[i].y });
    }
    styleCopy = { showLabel: false };
    if (style) {
        if (style.stroke) {
            styleCopy.stroke = style.stroke;
        }
        if (style.lineWidth !== undefined && style.lineWidth !== null) {
            styleCopy.lineWidth = style.lineWidth;
        }
        if (style.dashMode) {
            styleCopy.dashMode = style.dashMode;
        }
        if (style.showLabel !== undefined) {
            styleCopy.showLabel = !!style.showLabel;
        }
    }
    const obj = {
        id: id,
        type: 'PEN',
        name: name || '펜',
        points: pts,
        style: styleCopy,
        parents: [],
        children: []
    };
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 펜 획을 Δ만큼 평행 이동
AlgeoEngine.prototype.translatePenStroke = function (id, dx, dy) {
    const obj = this.objectMap[id];
    let i;

    if (!obj || obj.type !== 'PEN' || !obj.points) {
        return;
    }
    for (i = 0; i < obj.points.length; i++) {
        obj.points[i].x += dx;
        obj.points[i].y += dy;
    }
};

// 설명선 꾸미기 추가
AlgeoEngine.prototype.addDecorateLeader = function (text, x1, y1, x2, y2) {
    const id = this.generateId();
    const obj = {
        id: id,
        type: 'DECORATE_LEADER',
        name: '설명선',
        text: text || '',
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
        parents: [],
        children: []
    };
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 길이 꾸미기 추가
AlgeoEngine.prototype.addDecorateLength = function (targetId) {
    const target = this.objectMap[targetId];
    const id = this.generateId();
    const obj = {
        id: id,
        type: 'DECORATE_LENGTH',
        name: '길이표시',
        targetId: targetId,
        style: { showLabel: false },
        parents: [targetId],
        children: []
    };

    if (!target || !ALGEO_LINEAR_OBJECT_TYPES[target.type]) {
        return null;
    }
    target.children.push(id);
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 각도 꾸미기 추가
AlgeoEngine.prototype.addDecorateAngle = function (ray1Id, vertexId, ray2Id) {
    const ray1 = this.objectMap[ray1Id];
    const vertex = this.objectMap[vertexId];
    const ray2 = this.objectMap[ray2Id];
    const id = this.generateId();
    const obj = {
        id: id,
        type: 'DECORATE_ANGLE',
        name: '각도표시',
        ray1Id: ray1Id,
        vertexId: vertexId,
        ray2Id: ray2Id,
        style: { showLabel: false },
        parents: [ray1Id, vertexId, ray2Id],
        children: []
    };

    if (!ray1 || !vertex || !ray2) {
        return null;
    }
    ray1.children.push(id);
    vertex.children.push(id);
    ray2.children.push(id);
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
};

// 평행 표시 꾸미기 추가
AlgeoEngine.prototype.addDecorateParallel = function (targetId, groupId) {
    const target = this.objectMap[targetId];
    const id = this.generateId();
    const obj = {
        id: id,
        type: 'DECORATE_PARALLEL',
        name: '평행표시',
        targetId: targetId,
        groupId: groupId,
        style: { showLabel: false },
        parents: [targetId],
        children: []
    };

    if (!target || !ALGEO_LINEAR_OBJECT_TYPES[target.type]) {
        return null;
    }
    target.children.push(id);
    this.objects.push(obj);
    this.objectMap[id] = obj;
    return obj;
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
    } else if (obj.type === 'TRANSFORM_POINT') {
        coords = this.getTransformedPointCoords(obj);
        if (coords) {
            obj.x = coords.x;
            obj.y = coords.y;
        }
    } else if (isAlgeoMeasureType(obj.type)) {
        this.refreshMeasureValue(obj);
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
    } else if (obj.type === 'MEASURE_LENGTH') {
        this.collectFreePointIdsInto(obj.p1Id, seen, result);
        this.collectFreePointIdsInto(obj.p2Id, seen, result);
    } else if (obj.type === 'MEASURE_ANGLE') {
        this.collectFreePointIdsInto(obj.ray1Id, seen, result);
        this.collectFreePointIdsInto(obj.vertexId, seen, result);
        this.collectFreePointIdsInto(obj.ray2Id, seen, result);
    } else if (obj.type === 'MEASURE_AREA') {
        this.mergeFreePointIds(this.collectFreePointIdsForObject(this.objectMap[obj.targetId]), seen, result);
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
