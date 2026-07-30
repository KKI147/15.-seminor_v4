// 알지오메스 — 앱 컨트롤러 (AlgeoApp)
// renderer 이후 로드 · refactor_modules.md 4단계
// 도구 이벤트·대수창·저장/테마·작도 핸들러
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
    this.selectedObjectId = null;     // 대수창·선택 도구의 주 선택 객체 ID
    this.selectionIds = [];           // 캔버스 다중 선택 ID 목록
    this.marqueeDrag = null;          // 그룹선택 마퀴 { startX, startY, additive }
    this.pendingSelectClick = null;   // 마우스업에서 확정할 단건 선택 { id, additive, wasSelected }
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
    this.settingsPanelOpen = false;   // 설정 패널 표시 여부
    this.pendingImagePlace = null;    // 그림 넣기 대기 좌표 { x, y }
    // 펜 작도 전 기본 스타일 (새 획에 적용)
    this.penDraftStyle = {
        stroke: null,
        lineWidth: 2.5,
        dashMode: 'solid',
        showLabel: false
    };
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
    self.initSettingsPanel();
    self.initSaveLoad();
    self.initImageInsert();

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
    // 문자 단축키 — ALGEO_TOOL_KEY_MAP (Shift+G = 그룹선택)
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
        // Delete — 선택 객체 삭제
        if (e.keyCode === 46 && !e.ctrlKey && !e.altKey) {
            if ($(e.target).closest('input, textarea').length) {
                return;
            }
            if (self.selectionIds.length > 0) {
                self.deleteSelectedObjects();
                e.preventDefault();
            }
            return;
        }
        if (e.keyCode === 72 && !e.ctrlKey && !e.altKey) {
            if ($(e.target).closest('input, textarea').length) {
                return;
            }
            if (self.selectionIds.length > 0) {
                self.toggleSelectionVisibility();
            } else if (self.selectedObjectId) {
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
            if (self.currentTool === 'SELECT' || self.currentTool === 'GROUP_SELECT') {
                self.clearSelection();
            }
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

// 도구 카테고리 플라이아웃 토글 (railOnly: 블록코딩 안내 / 설정 패널)
AlgeoApp.prototype.toggleToolCategory = function (categoryId) {
    const cat = findCategoryMeta(categoryId);

    if (cat && cat.railOnly) {
        this.closeToolFlyout();
        if (categoryId === 'settings') {
            this.closeShortcutPanel();
            this.toggleSettingsPanel();
            return;
        }
        this.closeSettingsPanel();
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
    // 펜 도구 — 작도 전 스타일 패널이 보이도록 선택 해제
    if (toolId === 'PEN') {
        this.clearSelection();
    }
    this.syncToolRailUI();
    this.updateCanvasCursor();
    this.syncToolGuide();
    this.syncAlgebraPropsPanel();
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
    } else if (draft.type === 'ANGLE' || draft.type === 'ANGLE_BISECTOR' ||
        draft.type === 'MEASURE_ANGLE') {
        preview.ray1Id = draft.ray1Id;
        preview.vertexId = draft.vertexId;
        if (draft.type === 'MEASURE_ANGLE') {
            preview.type = 'ANGLE';
        }
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
    } else if (draft.type === 'DECORATE_LEADER') {
        preview.x1 = draft.x1;
        preview.y1 = draft.y1;
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
    if (this.settingsPanelOpen) {
        $('.tool-rail-btn[data-category="settings"]').addClass('active open');
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
        self.closeSettingsPanel();
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
    this.closeSettingsPanel();
};

// 단축키 안내 패널 토글
AlgeoApp.prototype.toggleShortcutPanel = function () {
    if (this.shortcutPanelOpen) {
        this.closeShortcutPanel();
    } else {
        this.closeSettingsPanel();
        this.openShortcutPanel();
    }
};

// 설정 패널 초기화
AlgeoApp.prototype.initSettingsPanel = function () {
    const self = this;

    self.renderSettingsPanel();

    $('#btnCloseSettingsPanel').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $('#btnCloseSettingsPanel').on('click', function (e) {
        e.stopPropagation();
        self.closeSettingsPanel();
    });

    $('#settingsPanel').on('mousedown', function (e) {
        e.stopPropagation();
    });

    $('#settingsPanel').on('click', function (e) {
        e.stopPropagation();
    });

    $('#settingsPanelBody').on('click', '[data-settings-action]', function (e) {
        const action = $(this).attr('data-settings-action');
        e.stopPropagation();
        if (action === 'theme') {
            self.setTheme(self.theme === 'light' ? 'dark' : 'light');
        } else if (action === 'grid') {
            self.setGridVisible(!self.renderer.showGrid);
        } else if (action === 'snap') {
            self.setSnapEnabled(!self.renderer.snapEnabled);
        } else if (action === 'axes') {
            self.setAxesVisible(!self.renderer.showAxes);
        } else if (action === 'save') {
            self.saveSceneToFile();
        } else if (action === 'load') {
            $('#sceneFileInput').val('');
            $('#sceneFileInput').trigger('click');
        }
        self.syncSettingsPanelUI();
    });

    $(document).on('click.settingsPanel', function (e) {
        if (!self.settingsPanelOpen) {
            return;
        }
        if ($(e.target).closest('#settingsPanel, .tool-rail-btn[data-category="settings"], .algeo-right-bar-wrap').length) {
            return;
        }
        self.closeSettingsPanel();
    });
};

// 설정 패널 본문 HTML
AlgeoApp.prototype.renderSettingsPanel = function () {
    let html = '';

    html += '<div class="settings-section">';
    html += '<div class="settings-section-title">화면</div>';
    html += '<button type="button" class="settings-toggle-row" data-settings-action="theme" id="settingsBtnTheme">';
    html += '<span class="settings-toggle-label">테마</span>';
    html += '<span class="settings-toggle-value" id="settingsThemeValue">라이트</span>';
    html += '</button>';
    html += '<button type="button" class="settings-toggle-row" data-settings-action="grid" id="settingsBtnGrid">';
    html += '<span class="settings-toggle-label">격자</span>';
    html += '<span class="settings-toggle-value" id="settingsGridValue">켜짐</span>';
    html += '</button>';
    html += '<button type="button" class="settings-toggle-row" data-settings-action="axes" id="settingsBtnAxes">';
    html += '<span class="settings-toggle-label">좌표축</span>';
    html += '<span class="settings-toggle-value" id="settingsAxesValue">켜짐</span>';
    html += '</button>';
    html += '<button type="button" class="settings-toggle-row" data-settings-action="snap" id="settingsBtnSnap">';
    html += '<span class="settings-toggle-label">격자 스냅</span>';
    html += '<span class="settings-toggle-value" id="settingsSnapValue">꺼짐</span>';
    html += '</button>';
    html += '</div>';

    html += '<div class="settings-section">';
    html += '<div class="settings-section-title">파일</div>';
    html += '<button type="button" class="settings-action-btn" data-settings-action="save">장면 JSON 저장</button>';
    html += '<button type="button" class="settings-action-btn" data-settings-action="load">장면 JSON 불러오기</button>';
    html += '</div>';

    html += '<p class="settings-note">우측 바의 테마·격자·스냅과 동기화됩니다.</p>';

    $('#settingsPanelBody').html(html);
    this.syncSettingsPanelUI();
};

// 설정 패널 토글 상태 문구·active 동기화
AlgeoApp.prototype.syncSettingsPanelUI = function () {
    const themeLabel = this.theme === 'dark' ? '다크' : '라이트';
    const gridOn = !!this.renderer.showGrid;
    const axesOn = !!this.renderer.showAxes;
    const snapOn = !!this.renderer.snapEnabled;

    $('#settingsThemeValue').text(themeLabel);
    $('#settingsGridValue').text(gridOn ? '켜짐' : '꺼짐');
    $('#settingsAxesValue').text(axesOn ? '켜짐' : '꺼짐');
    $('#settingsSnapValue').text(snapOn ? '켜짐' : '꺼짐');

    $('#settingsBtnGrid').toggleClass('is-on', gridOn);
    $('#settingsBtnAxes').toggleClass('is-on', axesOn);
    $('#settingsBtnSnap').toggleClass('is-on', snapOn);
    $('#settingsBtnTheme').toggleClass('is-on', this.theme === 'dark');
};

// 설정 패널 닫기
AlgeoApp.prototype.closeSettingsPanel = function () {
    this.settingsPanelOpen = false;
    $('#settingsPanel').removeClass('open').attr('aria-hidden', 'true');
    this.syncToolRailUI();
};

// 설정 패널 열기
AlgeoApp.prototype.openSettingsPanel = function () {
    this.settingsPanelOpen = true;
    this.closeShortcutPanel();
    this.syncSettingsPanelUI();
    $('#settingsPanel').addClass('open').attr('aria-hidden', 'false');
    this.closeCmdDict();
    this.syncToolRailUI();
};

// 설정 패널 토글
AlgeoApp.prototype.toggleSettingsPanel = function () {
    if (this.settingsPanelOpen) {
        this.closeSettingsPanel();
    } else {
        this.openSettingsPanel();
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
    if (tool === 'REFLECT_POINT' || tool === 'ROTATE' || tool === 'DILATE') {
        return 0;
    }
    if (tool === 'REFLECT_LINE' || tool === 'TRANSLATE') {
        return Math.min(n, 1);
    }
    if (tool === 'TEXT' || tool === 'INSERT_IMAGE') {
        return 0;
    }
    if (tool === 'PEN') {
        if (draft && draft.type === 'PEN' && draft.points && draft.points.length > 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'DECORATE_LEADER') {
        if (draft && draft.type === 'DECORATE_LEADER') {
            return 1;
        }
        return 0;
    }
    if (tool === 'DECORATE_LENGTH' || tool === 'DECORATE_PARALLEL') {
        return Math.min(this.selectedObjects.length, tool === 'DECORATE_PARALLEL' ? 1 : 0);
    }
    if (tool === 'DECORATE_ANGLE') {
        if (n >= 1) {
            return Math.min(n, 2);
        }
        return 0;
    }
    if (tool === 'MEASURE_LENGTH') {
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'MEASURE_ANGLE') {
        if (draft && draft.type === 'MEASURE_ANGLE') {
            return 2;
        }
        if (n >= 1) {
            return 1;
        }
        return 0;
    }
    if (tool === 'MEASURE_AREA') {
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
    if (this.isIdSelected(objId) && this.selectionIds.length === 1) {
        this.clearSelection();
        return;
    }
    this.setSelection([objId], objId);
};

// 선택 집합에 ID가 포함되는지
AlgeoApp.prototype.isIdSelected = function (objId) {
    let i;
    for (i = 0; i < this.selectionIds.length; i++) {
        if (this.selectionIds[i] === objId) {
            return true;
        }
    }
    return false;
};

// 선택 집합을 렌더러·대수창에 동기화
AlgeoApp.prototype.syncSelectionToRenderer = function () {
    this.renderer.selectionIds = this.selectionIds.slice();
    this.renderer.selectedObjectId = this.selectedObjectId;
    this.syncAlgebraItemActiveState();
    this.syncAlgebraPropsPanel();
};

// 선택 집합 교체 (primaryId: 대수 속성 패널용 주 선택)
AlgeoApp.prototype.setSelection = function (ids, primaryId) {
    const unique = [];
    const seen = {};
    let i;
    let id;

    for (i = 0; i < ids.length; i++) {
        id = ids[i];
        if (!id || seen[id] || !this.engine.objectMap[id]) {
            continue;
        }
        seen[id] = true;
        unique.push(id);
    }

    this.selectionIds = unique;
    if (primaryId && seen[primaryId]) {
        this.selectedObjectId = primaryId;
    } else if (unique.length > 0) {
        this.selectedObjectId = unique[unique.length - 1];
    } else {
        this.selectedObjectId = null;
    }
    this.syncSelectionToRenderer();
    this.renderer.draw();
};

// 선택에 ID 추가
AlgeoApp.prototype.addToSelection = function (objId) {
    if (!objId || !this.engine.objectMap[objId] || this.isIdSelected(objId)) {
        return;
    }
    this.selectionIds.push(objId);
    this.selectedObjectId = objId;
    this.syncSelectionToRenderer();
    this.renderer.draw();
};

// 선택에서 ID 제거
AlgeoApp.prototype.removeFromSelection = function (objId) {
    const next = [];
    let i;

    for (i = 0; i < this.selectionIds.length; i++) {
        if (this.selectionIds[i] !== objId) {
            next.push(this.selectionIds[i]);
        }
    }
    this.selectionIds = next;
    if (this.selectedObjectId === objId) {
        this.selectedObjectId = next.length > 0 ? next[next.length - 1] : null;
    }
    this.syncSelectionToRenderer();
    this.renderer.draw();
};

// Shift 토글 선택
AlgeoApp.prototype.toggleSelectionId = function (objId) {
    if (this.isIdSelected(objId)) {
        this.removeFromSelection(objId);
    } else {
        this.addToSelection(objId);
    }
};

// 선택 전부 해제
AlgeoApp.prototype.clearSelection = function () {
    if (this.selectionIds.length === 0 && !this.selectedObjectId) {
        return;
    }
    this.selectionIds = [];
    this.selectedObjectId = null;
    this.syncSelectionToRenderer();
    this.renderer.draw();
};

// 대수창 선택 해제 (삭제·캔버스 빈 곳 클릭 시)
AlgeoApp.prototype.clearAlgebraSelection = function () {
    this.clearSelection();
};

// 대수창 리스트의 선택(active) 스타일 갱신
AlgeoApp.prototype.syncAlgebraItemActiveState = function () {
    let i;

    $('#algebraList .algebra-item').removeClass('active');
    for (i = 0; i < this.selectionIds.length; i++) {
        $('#algebraList .algebra-item[data-id="' + this.selectionIds[i] + '"]').addClass('active');
    }
    if (this.selectionIds.length === 0 && this.selectedObjectId) {
        $('#algebraList .algebra-item[data-id="' + this.selectedObjectId + '"]').addClass('active');
    }
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
    } else if (this.currentTool === 'SELECT' || this.currentTool === 'GROUP_SELECT') {
        cursor = 'default';
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
        this.currentTool === 'POINT_ON_OBJECT' ||
        this.currentTool === 'REFLECT_POINT' ||
        this.currentTool === 'REFLECT_LINE' ||
        this.currentTool === 'ROTATE' ||
        this.currentTool === 'TRANSLATE' ||
        this.currentTool === 'DILATE' ||
        this.currentTool === 'MEASURE_LENGTH' ||
        this.currentTool === 'MEASURE_ANGLE' ||
        this.currentTool === 'MEASURE_AREA' ||
        this.currentTool === 'TEXT' ||
        this.currentTool === 'INSERT_IMAGE' ||
        this.currentTool === 'PEN' ||
        this.currentTool === 'DECORATE_LEADER' ||
        this.currentTool === 'DECORATE_LENGTH' ||
        this.currentTool === 'DECORATE_ANGLE' ||
        this.currentTool === 'DECORATE_PARALLEL') {
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
            if (isAlgeoFreePlaceType(hitObj.type) || isAlgeoPenType(hitObj.type)) {
                this.selectAlgebraObject(hitObj.id);
                this.beginTranslateDrag([], null, math.x, math.y, null, [hitObj.id]);
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
    } else if (this.currentTool === 'SELECT' || this.currentTool === 'GROUP_SELECT') {
        this.handleSelectToolMouseDown(e, mouseX, mouseY, hitPoint);
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
    } else if (this.currentTool === 'REFLECT_POINT') {
        this.handleReflectPointMouseDown(e, hitPoint);
    } else if (this.currentTool === 'REFLECT_LINE') {
        this.handleReflectLineMouseDown(e, hitPoint);
    } else if (this.currentTool === 'ROTATE') {
        this.handleRotateMouseDown(e, hitPoint);
    } else if (this.currentTool === 'TRANSLATE') {
        this.handleTranslateMouseDown(e, hitPoint);
    } else if (this.currentTool === 'DILATE') {
        this.handleDilateMouseDown(e, hitPoint);
    } else if (this.currentTool === 'MEASURE_LENGTH') {
        this.handleMeasureLengthMouseDown(e, hitPoint);
    } else if (this.currentTool === 'MEASURE_ANGLE') {
        this.handleMeasureAngleMouseDown(e, hitPoint);
    } else if (this.currentTool === 'MEASURE_AREA') {
        this.handleMeasureAreaMouseDown(e, hitPoint);
    } else if (this.currentTool === 'TEXT') {
        this.handleTextMouseDown(e);
    } else if (this.currentTool === 'INSERT_IMAGE') {
        this.handleInsertImageMouseDown(e);
    } else if (this.currentTool === 'PEN') {
        this.handlePenMouseDown(e);
    } else if (this.currentTool === 'DECORATE_LEADER') {
        this.handleDecorateLeaderMouseDown(e);
    } else if (this.currentTool === 'DECORATE_LENGTH') {
        this.handleDecorateLengthMouseDown(e, hitPoint);
    } else if (this.currentTool === 'DECORATE_ANGLE') {
        this.handleDecorateAngleMouseDown(e, hitPoint);
    } else if (this.currentTool === 'DECORATE_PARALLEL') {
        this.handleDecorateParallelMouseDown(e);
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
    } else if (this.marqueeDrag) {
        this.renderer.marqueeRect = {
            x1: this.marqueeDrag.startX,
            y1: this.marqueeDrag.startY,
            x2: mouseX,
            y2: mouseY
        };
        r.draw();
    } else if (this.activeSlider) {
        this.sliderDragMoved = true;
        const newVal = this.sliderValueFromScreenX(this.activeSlider, mouseX);
        this.engine.setSliderValue(this.activeSlider.id, newVal);
        this.updateAlgebraView();
        r.draw();
    } else if (this.dragTranslate) {
        this.dragMoved = true;
        this.pendingSelectClick = null;
        const math = this.screenToMath(mouseX, mouseY);
        const dx = math.x - this.dragTranslate.lastMathX;
        const dy = math.y - this.dragTranslate.lastMathY;
        let slider;
        let si;

        if (this.dragTranslate.pointIds.length > 0) {
            this.engine.translateFreePoints(this.dragTranslate.pointIds, dx, dy);
        }
        if (this.dragTranslate.sliderIds && this.dragTranslate.sliderIds.length > 0) {
            for (si = 0; si < this.dragTranslate.sliderIds.length; si++) {
                slider = this.engine.objectMap[this.dragTranslate.sliderIds[si]];
                if (slider && slider.type === 'SLIDER') {
                    slider.anchorX += dx;
                    slider.anchorY += dy;
                }
            }
        } else if (this.dragTranslate.sliderId) {
            slider = this.engine.objectMap[this.dragTranslate.sliderId];
            if (slider && slider.type === 'SLIDER') {
                slider.anchorX += dx;
                slider.anchorY += dy;
            }
        }
        if (this.dragTranslate.freeIds && this.dragTranslate.freeIds.length > 0) {
            for (si = 0; si < this.dragTranslate.freeIds.length; si++) {
                slider = this.engine.objectMap[this.dragTranslate.freeIds[si]];
                if (slider && isAlgeoFreePlaceType(slider.type)) {
                    slider.x += dx;
                    slider.y += dy;
                } else if (slider && isAlgeoPenType(slider.type)) {
                    this.engine.translatePenStroke(slider.id, dx, dy);
                }
            }
        }
        this.dragTranslate.lastMathX = math.x;
        this.dragTranslate.lastMathY = math.y;
        this.updateAlgebraView();
        r.draw();
    } else if (this.constructionDraft && this.constructionDraft.type === 'PEN') {
        this.handlePenMouseMove(mouseX, mouseY);
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
    const pos = e ? this.getEventCanvasPos(e) : null;
    let mouseX;
    let mouseY;

    if (this.marqueeDrag) {
        mouseX = pos ? pos.x : this.marqueeDrag.startX;
        mouseY = pos ? pos.y : this.marqueeDrag.startY;
        this.finishMarqueeSelection(mouseX, mouseY);
    }

    if (this.pendingSelectClick && !this.dragMoved) {
        this.applyPendingSelectClick();
    }
    this.pendingSelectClick = null;

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

    if (this.constructionDraft && this.constructionDraft.type === 'PEN') {
        this.finishPenStroke();
    }

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
        } else if (obj.type === 'TEXT') {
            if (Math.abs(this.renderer.toScreenX(obj.x) - screenX) <= 80 &&
                Math.abs(this.renderer.toScreenY(obj.y) - screenY) <= 20) {
                return obj;
            }
        } else if (obj.type === 'IMAGE') {
            const imgRect = this.renderer.getImageScreenRect(obj);
            if (screenX >= imgRect.x && screenX <= imgRect.x + imgRect.w &&
                screenY >= imgRect.y && screenY <= imgRect.y + imgRect.h) {
                return obj;
            }
        } else if (obj.type === 'PEN') {
            if (this.isNearPenStroke(screenX, screenY, obj)) {
                return obj;
            }
        } else if (obj.type === 'DECORATE_LEADER') {
            if (this.distToSegment(
                screenX, screenY,
                r.toScreenX(obj.x1), r.toScreenY(obj.y1),
                r.toScreenX(obj.x2), r.toScreenY(obj.y2)
            ) <= 6) {
                return obj;
            }
        } else if (obj.type === 'DECORATE_LENGTH') {
            const lenBounds = this.getObjectScreenBounds(obj);
            if (lenBounds &&
                screenX >= lenBounds.x1 && screenX <= lenBounds.x2 &&
                screenY >= lenBounds.y1 && screenY <= lenBounds.y2) {
                return obj;
            }
        } else if (obj.type === 'DECORATE_ANGLE') {
            const ray1 = this.engine.objectMap[obj.ray1Id];
            const vertex = this.engine.objectMap[obj.vertexId];
            const ray2 = this.engine.objectMap[obj.ray2Id];
            if (ray1 && vertex && ray2) {
                const bx = r.toScreenX(vertex.x);
                const by = r.toScreenY(vertex.y);
                const sweep = r.getArcScreenSweep(
                    bx, by,
                    r.toScreenX(ray1.x), r.toScreenY(ray1.y),
                    r.toScreenX(ray2.x), r.toScreenY(ray2.y)
                );
                if (this.distToArcCurve(screenX, screenY, bx, by, 34, sweep.startA, sweep.endA, sweep.ccw) <= 8) {
                    return obj;
                }
            }
        } else if (obj.type === 'DECORATE_PARALLEL') {
            const parallelBounds = this.getObjectScreenBounds(obj);
            if (parallelBounds &&
                screenX >= parallelBounds.x1 && screenX <= parallelBounds.x2 &&
                screenY >= parallelBounds.y1 && screenY <= parallelBounds.y2) {
                return obj;
            }
        } else if (obj.type === 'SLIDER') {
            if (this.isNearSlider(screenX, screenY, obj)) {
                return obj;
            }
        } else if (isAlgeoMeasureType(obj.type)) {
            if (this.isNearMeasure(screenX, screenY, obj)) {
                return obj;
            }
        }
    }
    return null;
};

// 측정 배지 근처 히트 판정
AlgeoApp.prototype.isNearMeasure = function (screenX, screenY, obj) {
    const anchor = this.engine.getMeasureLabelAnchor(obj);
    let sx;
    let sy;

    if (!anchor) {
        return false;
    }
    sx = this.renderer.toScreenX(anchor.x);
    sy = this.renderer.toScreenY(anchor.y);
    return screenX >= sx - 52 && screenX <= sx + 52 &&
        screenY >= sy - 16 && screenY <= sy + 16;
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

// 슬라이더 변수 이름 자동 생성 (a, b, c …) — 측정 이름과 공유
AlgeoApp.prototype.getNextSliderName = function () {
    return this.getNextValueName();
};

// 측정·슬라이더 공통 소문자 변수명
AlgeoApp.prototype.getNextValueName = function () {
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
    } while (this.engine.findValueNameOwner(name) !== null);

    return name;
};

// 측정 변수 이름
AlgeoApp.prototype.getNextMeasureName = function () {
    return this.getNextValueName();
};

// 길이 측정: 선분·벡터 클릭 또는 점 2개
AlgeoApp.prototype.handleMeasureLengthMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let hitObj;
    let p1Id;
    let p2Id;
    let p1;
    let p2;
    let name;

    hitObj = this.findObjectAt(mouseX, mouseY);
    if (this.selectedPoints.length === 0 && hitObj &&
        (hitObj.type === 'SEGMENT' || hitObj.type === 'VECTOR')) {
        p1Id = hitObj.p1Id;
        p2Id = hitObj.p2Id;
        if (!this.engine.findMeasureLengthByPoints(p1Id, p2Id)) {
            name = this.getNextMeasureName();
            this.recordHistory('길이 측정');
            this.engine.addMeasureLength(name, p1Id, p2Id);
            this.updateAlgebraView();
        }
        this.selectedPoints = [];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    p1Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    this.selectedPoints.push(p1Id);
    this.syncHighlightToRenderer();

    if (this.selectedPoints.length < 2) {
        r.draw();
        return;
    }

    p1Id = this.selectedPoints[0];
    p2Id = this.selectedPoints[1];
    if (p1Id === p2Id) {
        this.selectedPoints = [p1Id];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    if (!this.engine.findMeasureLengthByPoints(p1Id, p2Id)) {
        p1 = this.engine.objectMap[p1Id];
        p2 = this.engine.objectMap[p2Id];
        name = this.getNextMeasureName();
        this.recordHistory('길이 측정');
        this.engine.addMeasureLength(name, p1Id, p2Id);
        if (p1 && p2) {
            this.updateAlgebraView();
        }
    }
    this.selectedPoints = [];
    this.syncHighlightToRenderer();
    r.draw();
};

// 각도 측정: 기존 ANGLE 또는 점 3개
AlgeoApp.prototype.handleMeasureAngleMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let hitObj;
    let draft;
    let ray2Id;
    let name;

    if (this.constructionDraft && this.constructionDraft.type === 'MEASURE_ANGLE') {
        draft = this.constructionDraft;
        ray2Id = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
        if (ray2Id === draft.ray1Id || ray2Id === draft.vertexId) {
            r.draw();
            return;
        }
        if (!this.engine.findMeasureAngleByPoints(draft.ray1Id, draft.vertexId, ray2Id)) {
            name = this.getNextMeasureName();
            this.recordHistory('각도 측정');
            this.engine.addMeasureAngle(name, draft.ray1Id, draft.vertexId, ray2Id);
            this.updateAlgebraView();
        }
        this.clearToolDraft();
        r.draw();
        return;
    }

    hitObj = this.findObjectAt(mouseX, mouseY);
    if (this.selectedPoints.length === 0 && hitObj && hitObj.type === 'ANGLE') {
        if (!this.engine.findMeasureAngleByPoints(hitObj.ray1Id, hitObj.vertexId, hitObj.ray2Id)) {
            name = this.getNextMeasureName();
            this.recordHistory('각도 측정');
            this.engine.addMeasureAngle(name, hitObj.ray1Id, hitObj.vertexId, hitObj.ray2Id);
            this.updateAlgebraView();
        }
        r.draw();
        return;
    }

    if (this.selectedPoints.length === 0) {
        this.selectedPoints.push(this.resolvePointAtClick(mouseX, mouseY, hitPoint));
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }

    const vertexId = this.resolvePointAtClick(mouseX, mouseY, hitPoint);
    if (vertexId === this.selectedPoints[0]) {
        r.draw();
        return;
    }

    this.constructionDraft = {
        type: 'MEASURE_ANGLE',
        ray1Id: this.selectedPoints[0],
        vertexId: vertexId
    };
    this.selectedPoints = [];
    this.renderer.highlightIds = [
        this.constructionDraft.ray1Id,
        this.constructionDraft.vertexId
    ];
    this.updateToolPreviewFromMouse(mouseX, mouseY);
    this.syncToolGuide();
};

// 넓이 측정: 다각형·원·부채꼴·활꼴 클릭
AlgeoApp.prototype.handleMeasureAreaMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const mouseX = pos.x;
    const mouseY = pos.y;
    let hitObj;
    let name;

    hitObj = this.findAreaMeasurableAt(mouseX, mouseY);
    if (!hitObj) {
        r.draw();
        return;
    }
    if (!this.engine.findMeasureAreaByTarget(hitObj.id)) {
        name = this.getNextMeasureName();
        this.recordHistory('넓이 측정');
        this.engine.addMeasureArea(name, hitObj.id);
        this.updateAlgebraView();
    }
    r.draw();
};

// 넓이 측정용 도형 탐색 (원·부채꼴은 내부 클릭 허용)
AlgeoApp.prototype.findAreaMeasurableAt = function (screenX, screenY) {
    const hit = this.findObjectAt(screenX, screenY);
    const list = this.engine.objects;
    const r = this.renderer;
    let i;
    let obj;
    let circ;
    let cx;
    let cy;
    let dist;
    let center;
    let p1;
    let p2;
    let dx;
    let dy;
    let mathR;
    let screenR;
    let ang;
    let a1;
    let a2;
    let inSector;

    if (hit && ALGEO_AREA_MEASURABLE_TYPES[hit.type]) {
        return hit;
    }

    for (i = list.length - 1; i >= 0; i--) {
        obj = list[i];
        if (!this.engine.isObjectVisible(obj) || !ALGEO_AREA_MEASURABLE_TYPES[obj.type]) {
            continue;
        }
        if (obj.type === 'CIRCLE' || obj.type === 'CIRCLE_3P') {
            circ = this.engine.getCircleGeometry(obj);
            if (!circ) {
                continue;
            }
            cx = r.toScreenX(circ.center.x);
            cy = r.toScreenY(circ.center.y);
            screenR = circ.radius * r.scale;
            dist = Math.sqrt((cx - screenX) * (cx - screenX) + (cy - screenY) * (cy - screenY));
            if (dist <= screenR) {
                return obj;
            }
        } else if (obj.type === 'SECTOR') {
            center = this.engine.objectMap[obj.centerId];
            p1 = this.engine.objectMap[obj.p1Id];
            p2 = this.engine.objectMap[obj.p2Id];
            if (!center || !p1 || !p2) {
                continue;
            }
            cx = r.toScreenX(center.x);
            cy = r.toScreenY(center.y);
            dx = p1.x - center.x;
            dy = p1.y - center.y;
            mathR = Math.sqrt(dx * dx + dy * dy);
            screenR = mathR * r.scale;
            dist = Math.sqrt((cx - screenX) * (cx - screenX) + (cy - screenY) * (cy - screenY));
            if (dist > screenR) {
                continue;
            }
            ang = Math.atan2(screenY - cy, screenX - cx);
            a1 = Math.atan2(r.toScreenY(p1.y) - cy, r.toScreenX(p1.x) - cx);
            a2 = Math.atan2(r.toScreenY(p2.y) - cy, r.toScreenX(p2.x) - cx);
            inSector = this.isAngleBetween(ang, a1, a2);
            if (inSector) {
                return obj;
            }
        }
    }
    return null;
};

// 각 ang이 a1→a2 작은 호 구간에 있는지
AlgeoApp.prototype.isAngleBetween = function (ang, a1, a2) {
    let diff = a2 - a1;
    let t;

    while (diff > Math.PI) { diff -= 2 * Math.PI; }
    while (diff < -Math.PI) { diff += 2 * Math.PI; }
    t = ang - a1;
    while (t > Math.PI) { t -= 2 * Math.PI; }
    while (t < -Math.PI) { t += 2 * Math.PI; }
    if (diff >= 0) {
        return t >= 0 && t <= diff;
    }
    return t <= 0 && t >= diff;
};

// 변환 도구에 사용할 선택 대상이 있는지 확인
AlgeoApp.prototype.ensureTransformSelection = function (mouseX, mouseY, hitPoint) {
    let hitObj;

    if (this.getTransformSelectionInfo().pointIds.length > 0 ||
        this.getTransformSelectionInfo().objectIds.length > 0) {
        return true;
    }
    if (hitPoint) {
        this.setSelection([hitPoint.id], hitPoint.id);
        this.syncToolGuide();
        this.renderer.draw();
        return false;
    }
    hitObj = this.findObjectAt(mouseX, mouseY);
    if (hitObj && ALGEO_TRANSFORMABLE_OBJECT_TYPES[hitObj.type]) {
        this.setSelection([hitObj.id], hitObj.id);
        this.syncToolGuide();
        this.renderer.draw();
        return false;
    }
    window.alert('먼저 변환할 점 또는 도형을 선택하세요.');
    return false;
};

// 현재 선택에 변환 적용
AlgeoApp.prototype.applyTransformToSelection = function (historyLabel, config) {
    const result = this.cloneSelectionWithTransform(config);

    if (!result.createdIds || result.createdIds.length === 0) {
        window.alert('변환할 수 있는 선택 대상이 없습니다.');
        return false;
    }
    this.setSelection(result.createdIds, result.createdIds[result.createdIds.length - 1]);
    this.clearToolDraft();
    this.updateAlgebraView();
    this.renderer.draw();
    return true;
};

// 점대칭: 선택 대상 + 기준점
AlgeoApp.prototype.handleReflectPointMouseDown = function (e, hitPoint) {
    const pos = this.getEventCanvasPos(e);
    const center = hitPoint;

    if (!this.ensureTransformSelection(pos.x, pos.y, hitPoint)) {
        return;
    }
    if (!center) {
        this.renderer.draw();
        return;
    }
    this.recordHistory('점대칭');
    this.applyTransformToSelection('점대칭', {
        transformType: 'REFLECT_POINT',
        ref1Id: center.id
    });
};

// 선대칭: 선택 대상 + 기준선의 두 점
AlgeoApp.prototype.handleReflectLineMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);

    if (!this.ensureTransformSelection(pos.x, pos.y, hitPoint)) {
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
    if (this.selectedPoints[0] === this.selectedPoints[1]) {
        this.selectedPoints = [];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }
    this.recordHistory('선대칭');
    this.applyTransformToSelection('선대칭', {
        transformType: 'REFLECT_LINE',
        ref1Id: this.selectedPoints[0],
        ref2Id: this.selectedPoints[1]
    });
};

// 회전: 선택 대상 + 중심점 + 각도 입력
AlgeoApp.prototype.handleRotateMouseDown = function (e, hitPoint) {
    const pos = this.getEventCanvasPos(e);
    let degreesStr;
    let degrees;

    if (!this.ensureTransformSelection(pos.x, pos.y, hitPoint)) {
        return;
    }
    if (!hitPoint) {
        this.renderer.draw();
        return;
    }
    degreesStr = window.prompt('회전 각도를 입력하세요. (도 단위)', '90');
    if (degreesStr === null) {
        return;
    }
    degrees = parseFloat(degreesStr);
    if (isNaN(degrees)) {
        window.alert('회전 각도는 숫자로 입력해 주세요.');
        return;
    }
    this.recordHistory('회전');
    this.applyTransformToSelection('회전', {
        transformType: 'ROTATE',
        ref1Id: hitPoint.id,
        degrees: degrees
    });
};

// 평행이동: 기준 시작점 + 끝점
AlgeoApp.prototype.handleTranslateMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);

    if (!this.ensureTransformSelection(pos.x, pos.y, hitPoint)) {
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
    if (this.selectedPoints[0] === this.selectedPoints[1]) {
        this.selectedPoints = [];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }
    this.recordHistory('평행이동');
    this.applyTransformToSelection('평행이동', {
        transformType: 'TRANSLATE',
        ref1Id: this.selectedPoints[0],
        ref2Id: this.selectedPoints[1]
    });
};

// 확대: 중심점 + 배율 입력
AlgeoApp.prototype.handleDilateMouseDown = function (e, hitPoint) {
    const pos = this.getEventCanvasPos(e);
    let scaleStr;
    let scale;

    if (!this.ensureTransformSelection(pos.x, pos.y, hitPoint)) {
        return;
    }
    if (!hitPoint) {
        this.renderer.draw();
        return;
    }
    scaleStr = window.prompt('확대 배율을 입력하세요. (예: 2, 0.5)', '2');
    if (scaleStr === null) {
        return;
    }
    scale = parseFloat(scaleStr);
    if (isNaN(scale) || Math.abs(scale) < 1e-8) {
        window.alert('확대 배율은 0이 아닌 숫자로 입력해 주세요.');
        return;
    }
    this.recordHistory('확대');
    this.applyTransformToSelection('확대', {
        transformType: 'DILATE',
        ref1Id: hitPoint.id,
        scale: scale
    });
};

// 텍스트 추가
AlgeoApp.prototype.handleTextMouseDown = function (e) {
    const pos = this.getEventCanvasPos(e);
    const math = this.screenToMath(pos.x, pos.y);
    const text = window.prompt('텍스트 내용을 입력하세요.', '설명');

    if (text === null) {
        return;
    }
    if (!text.replace(/^\s+|\s+$/g, '')) {
        return;
    }
    this.recordHistory('텍스트 추가');
    this.engine.addText(text, math.x, math.y);
    this.updateAlgebraView();
    this.renderer.draw();
};

// 그림 넣기 — 클릭 위치 기억 후 파일 선택
AlgeoApp.prototype.handleInsertImageMouseDown = function (e) {
    const pos = this.getEventCanvasPos(e);
    const math = this.screenToMath(pos.x, pos.y);

    this.pendingImagePlace = { x: math.x, y: math.y };
    $('#imageFileInput').val('');
    $('#imageFileInput').trigger('click');
};

// 그림 파일 입력 초기화
AlgeoApp.prototype.initImageInsert = function () {
    const self = this;

    $('#imageFileInput').on('change', function (e) {
        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        if (!file) {
            self.pendingImagePlace = null;
            return;
        }
        self.loadImageFile(file);
    });
};

// 선택한 이미지 파일을 캔버스 객체로 추가
AlgeoApp.prototype.loadImageFile = function (file) {
    const self = this;
    const reader = new FileReader();
    const place = this.pendingImagePlace;

    if (!place) {
        return;
    }

    reader.onload = function () {
        const dataUrl = reader.result;
        const probe = new Image();

        probe.onload = function () {
            let width = ALGEO_IMAGE_DEFAULT_WIDTH;
            let height;
            let name;

            if (!probe.naturalWidth || probe.naturalWidth <= 0) {
                self.pendingImagePlace = null;
                return;
            }
            height = width * (probe.naturalHeight / probe.naturalWidth);
            name = self.getNextImageName();
            self.recordHistory('그림 추가');
            self.engine.addImage(name, place.x, place.y, width, height, dataUrl, file.name || '');
            self.pendingImagePlace = null;
            self.updateAlgebraView();
            self.renderer.draw();
        };
        probe.onerror = function () {
            self.pendingImagePlace = null;
            window.alert('이미지를 불러오지 못했습니다.');
        };
        probe.src = dataUrl;
    };
    reader.onerror = function () {
        self.pendingImagePlace = null;
        window.alert('파일을 읽지 못했습니다.');
    };
    reader.readAsDataURL(file);
};

// 그림 이름 자동 생성 (그림1, 그림2 …)
AlgeoApp.prototype.getNextImageName = function () {
    let n = 1;
    let name = '';
    let i;
    let obj;
    let used;

    do {
        name = '그림' + n;
        used = false;
        for (i = 0; i < this.engine.objects.length; i++) {
            obj = this.engine.objects[i];
            if (obj.type === 'IMAGE' && obj.name === name) {
                used = true;
                break;
            }
        }
        n += 1;
    } while (used);

    return name;
};

// 펜 획 그리기 시작
AlgeoApp.prototype.handlePenMouseDown = function (e) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const math = {
        x: r.toMathX(pos.x),
        y: r.toMathY(pos.y)
    };
    const previewStyle = this.getPenDraftPreviewStyle();

    this.constructionDraft = {
        type: 'PEN',
        points: [{ x: math.x, y: math.y }],
        lastScreenX: pos.x,
        lastScreenY: pos.y
    };
    r.toolPreview = {
        type: 'PEN',
        points: this.constructionDraft.points,
        stroke: previewStyle.stroke,
        lineWidth: previewStyle.lineWidth,
        dash: previewStyle.dash
    };
    this.syncToolGuide();
    r.draw();
};

// 펜 드래그 중 점 샘플링
AlgeoApp.prototype.handlePenMouseMove = function (mouseX, mouseY) {
    const r = this.renderer;
    const draft = this.constructionDraft;
    let dx;
    let dy;
    let math;
    let previewStyle;

    if (!draft || draft.type !== 'PEN') {
        return;
    }

    dx = mouseX - draft.lastScreenX;
    dy = mouseY - draft.lastScreenY;
    if (Math.sqrt(dx * dx + dy * dy) < ALGEO_PEN_MIN_SAMPLE_PX) {
        return;
    }

    math = {
        x: r.toMathX(mouseX),
        y: r.toMathY(mouseY)
    };
    draft.points.push({ x: math.x, y: math.y });
    draft.lastScreenX = mouseX;
    draft.lastScreenY = mouseY;
    previewStyle = this.getPenDraftPreviewStyle();
    r.toolPreview = {
        type: 'PEN',
        points: draft.points,
        stroke: previewStyle.stroke,
        lineWidth: previewStyle.lineWidth,
        dash: previewStyle.dash
    };
    this.syncToolGuide();
    r.draw();
};

// 펜 획 확정 (또는 너무 짧으면 취소)
AlgeoApp.prototype.finishPenStroke = function () {
    const draft = this.constructionDraft;
    let name;
    let obj;

    if (!draft || draft.type !== 'PEN') {
        return;
    }

    if (!draft.points || draft.points.length < ALGEO_PEN_MIN_POINTS) {
        this.clearToolDraft();
        this.renderer.draw();
        return;
    }

    name = this.getNextPenName();
    this.recordHistory('펜 그리기');
    obj = this.engine.addPenStroke(name, draft.points, this.getPenDraftStyleForObject());
    this.clearToolDraft();
    if (obj) {
        this.updateAlgebraView();
    }
    this.renderer.draw();
};

// 펜 이름 자동 생성 (펜1, 펜2 …)
AlgeoApp.prototype.getNextPenName = function () {
    let n = 1;
    let name = '';
    let i;
    let obj;
    let used;

    do {
        name = '펜' + n;
        used = false;
        for (i = 0; i < this.engine.objects.length; i++) {
            obj = this.engine.objects[i];
            if (obj.type === 'PEN' && obj.name === name) {
                used = true;
                break;
            }
        }
        n += 1;
    } while (used);

    return name;
};

// 펜 획 히트 테스트 (화면 좌표)
AlgeoApp.prototype.isNearPenStroke = function (screenX, screenY, obj) {
    const r = this.renderer;
    const pts = obj.points;
    let i;
    let p1;
    let p2;
    let d;

    if (!pts || pts.length < 1) {
        return false;
    }
    if (pts.length === 1) {
        p1 = pts[0];
        d = Math.sqrt(
            Math.pow(r.toScreenX(p1.x) - screenX, 2) +
            Math.pow(r.toScreenY(p1.y) - screenY, 2)
        );
        return d <= 8;
    }
    for (i = 0; i < pts.length - 1; i++) {
        p1 = pts[i];
        p2 = pts[i + 1];
        d = this.distToSegment(
            screenX, screenY,
            r.toScreenX(p1.x), r.toScreenY(p1.y),
            r.toScreenX(p2.x), r.toScreenY(p2.y)
        );
        if (d <= 7) {
            return true;
        }
    }
    return false;
};

// 설명선 꾸미기: 시작점 → 끝점 → 텍스트
AlgeoApp.prototype.handleDecorateLeaderMouseDown = function (e) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    const math = this.screenToMath(pos.x, pos.y);
    let draft;
    let text;

    if (this.constructionDraft && this.constructionDraft.type === 'DECORATE_LEADER') {
        draft = this.constructionDraft;
        text = window.prompt('설명선 문구를 입력하세요.', '설명');
        if (text === null) {
            this.clearToolDraft();
            r.draw();
            return;
        }
        this.recordHistory('설명선 추가');
        this.engine.addDecorateLeader(text, draft.x1, draft.y1, math.x, math.y);
        this.clearToolDraft();
        this.updateAlgebraView();
        r.draw();
        return;
    }
    this.constructionDraft = {
        type: 'DECORATE_LEADER',
        x1: math.x,
        y1: math.y
    };
    this.renderer.toolPreview = {
        type: 'DECORATE_LEADER',
        x1: math.x,
        y1: math.y,
        mathX: math.x,
        mathY: math.y
    };
    r.draw();
};

// 길이 꾸미기: 선형 객체 선택
AlgeoApp.prototype.handleDecorateLengthMouseDown = function (e, hitPoint) {
    const pos = this.getEventCanvasPos(e);
    let hitObj = null;

    if (hitPoint) {
        hitObj = this.findObjectAt(pos.x, pos.y);
    } else {
        hitObj = this.findObjectAt(pos.x, pos.y);
    }
    if (!hitObj || !ALGEO_LINEAR_OBJECT_TYPES[hitObj.type]) {
        this.renderer.draw();
        return;
    }
    this.recordHistory('길이 꾸미기');
    this.engine.addDecorateLength(hitObj.id);
    this.updateAlgebraView();
    this.renderer.draw();
};

// 각도 꾸미기: 각 객체 또는 세 점
AlgeoApp.prototype.handleDecorateAngleMouseDown = function (e, hitPoint) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    let hitObj;

    hitObj = this.findObjectAt(pos.x, pos.y);
    if (this.selectedPoints.length === 0 && hitObj && hitObj.type === 'ANGLE') {
        this.recordHistory('각도 꾸미기');
        this.engine.addDecorateAngle(hitObj.ray1Id, hitObj.vertexId, hitObj.ray2Id);
        this.updateAlgebraView();
        r.draw();
        return;
    }
    if (!hitPoint) {
        r.draw();
        return;
    }
    this.selectedPoints.push(hitPoint.id);
    this.syncHighlightToRenderer();
    if (this.selectedPoints.length < 3) {
        r.draw();
        return;
    }
    if (this.selectedPoints[0] === this.selectedPoints[1] ||
        this.selectedPoints[1] === this.selectedPoints[2] ||
        this.selectedPoints[0] === this.selectedPoints[2]) {
        this.selectedPoints = [];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }
    this.recordHistory('각도 꾸미기');
    this.engine.addDecorateAngle(
        this.selectedPoints[0],
        this.selectedPoints[1],
        this.selectedPoints[2]
    );
    this.selectedPoints = [];
    this.syncHighlightToRenderer();
    this.updateAlgebraView();
    r.draw();
};

// 평행 꾸미기: 선형 객체 두 개를 같은 그룹으로 표시
AlgeoApp.prototype.handleDecorateParallelMouseDown = function (e) {
    const r = this.renderer;
    const pos = this.getEventCanvasPos(e);
    let hitObj;
    let groupId;

    hitObj = this.findObjectAt(pos.x, pos.y);
    if (!hitObj || !ALGEO_LINEAR_OBJECT_TYPES[hitObj.type]) {
        r.draw();
        return;
    }
    this.selectedObjects.push(hitObj.id);
    this.selectedObjects = this.selectedObjects.slice(-2);
    this.syncHighlightToRenderer();
    if (this.selectedObjects.length < 2) {
        r.draw();
        return;
    }
    if (this.selectedObjects[0] === this.selectedObjects[1]) {
        this.selectedObjects = [];
        this.syncHighlightToRenderer();
        r.draw();
        return;
    }
    groupId = this.getNextParallelDecorationGroupId();
    this.recordHistory('평행 꾸미기');
    this.engine.addDecorateParallel(this.selectedObjects[0], groupId);
    this.engine.addDecorateParallel(this.selectedObjects[1], groupId);
    this.selectedObjects = [];
    this.syncHighlightToRenderer();
    this.updateAlgebraView();
    r.draw();
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
AlgeoApp.prototype.beginTranslateDrag = function (pointIds, sliderId, mathX, mathY, sliderIds, freeIds) {
    const hasPoints = pointIds && pointIds.length > 0;
    const ids = sliderIds && sliderIds.length > 0
        ? sliderIds.slice()
        : (sliderId ? [sliderId] : []);
    const free = freeIds && freeIds.length > 0 ? freeIds.slice() : [];

    if (!hasPoints && ids.length === 0 && free.length === 0) {
        return;
    }

    this.dragTranslate = {
        pointIds: hasPoints ? pointIds.slice() : [],
        sliderId: ids.length === 1 ? ids[0] : null,
        sliderIds: ids,
        freeIds: free,
        lastMathX: mathX,
        lastMathY: mathY
    };
    this.dragSnapshot = this.captureEngineState();
    this.dragMoved = false;
    this.setCanvasCursor('grabbing');
};

// 선택·그룹선택 도구 마우스 다운
AlgeoApp.prototype.handleSelectToolMouseDown = function (e, mouseX, mouseY, hitPoint) {
    const math = this.screenToMath(mouseX, mouseY);
    const additive = !!(e && e.shiftKey);
    let target = null;
    let hitSlider;

    hitSlider = this.findSliderAt(mouseX, mouseY);
    if (hitSlider) {
        target = hitSlider;
    } else if (hitPoint) {
        target = hitPoint;
    } else {
        target = this.findObjectAt(mouseX, mouseY);
    }

    if (target) {
        if (additive) {
            this.toggleSelectionId(target.id);
            this.pendingSelectClick = null;
            this.syncToolGuide();
            return;
        }

        if (this.isIdSelected(target.id)) {
            // 이미 선택된 객체 — 드래그로 집단 이동, 클릭만이면 유지
            this.pendingSelectClick = null;
            this.beginSelectionTranslate(math.x, math.y);
            this.syncToolGuide();
            return;
        }

        this.setSelection([target.id], target.id);
        this.pendingSelectClick = null;
        this.beginSelectionTranslate(math.x, math.y);
        this.syncToolGuide();
        return;
    }

    // 빈 곳 — 그룹선택은 마퀴, 선택은 해제
    if (this.currentTool === 'GROUP_SELECT') {
        this.marqueeDrag = {
            startX: mouseX,
            startY: mouseY,
            additive: additive
        };
        this.renderer.marqueeRect = {
            x1: mouseX,
            y1: mouseY,
            x2: mouseX,
            y2: mouseY
        };
        if (!additive) {
            this.clearSelection();
        }
        this.renderer.draw();
    } else if (!additive) {
        this.clearSelection();
    }
    this.syncToolGuide();
};

// 선택 집합의 자유점·슬라이더·자유배치를 한꺼번에 이동
AlgeoApp.prototype.beginSelectionTranslate = function (mathX, mathY) {
    const pointSeen = {};
    const pointIds = [];
    const sliderIds = [];
    const freeIds = [];
    let i;
    let obj;
    let collected;
    let j;

    for (i = 0; i < this.selectionIds.length; i++) {
        obj = this.engine.objectMap[this.selectionIds[i]];
        if (!obj) {
            continue;
        }
        if (obj.type === 'SLIDER') {
            sliderIds.push(obj.id);
            continue;
        }
        if (isAlgeoFreePlaceType(obj.type) || isAlgeoPenType(obj.type)) {
            freeIds.push(obj.id);
            continue;
        }
        if (obj.type === 'FUNCTION') {
            continue;
        }
        if (isAlgeoPointType(obj.type)) {
            collected = this.engine.collectFreePointIdsForPointRef(obj.id);
        } else {
            collected = this.engine.collectFreePointIdsForObject(obj);
        }
        for (j = 0; j < collected.length; j++) {
            if (!pointSeen[collected[j]]) {
                pointSeen[collected[j]] = true;
                pointIds.push(collected[j]);
            }
        }
    }

    this.beginTranslateDrag(pointIds, null, mathX, mathY, sliderIds, freeIds);
};

// 마우스업 시 단건 선택 확정 (드래그 없이 클릭만 한 경우)
AlgeoApp.prototype.applyPendingSelectClick = function () {
    const pending = this.pendingSelectClick;
    if (!pending) {
        return;
    }
    if (pending.additive) {
        this.toggleSelectionId(pending.id);
    } else {
        this.setSelection([pending.id], pending.id);
    }
};

// 마퀴 상자 선택 확정
AlgeoApp.prototype.finishMarqueeSelection = function (endX, endY) {
    const drag = this.marqueeDrag;
    let rect;
    let ids;
    let combined;
    let i;
    let dx;
    let dy;

    if (!drag) {
        return;
    }

    dx = endX - drag.startX;
    dy = endY - drag.startY;
    this.marqueeDrag = null;
    this.renderer.marqueeRect = null;

    // 클릭에 가까운 드래그는 선택 상자로 취급하지 않음
    if (Math.abs(dx) < 4 && Math.abs(dy) < 4) {
        this.renderer.draw();
        return;
    }

    rect = {
        x1: Math.min(drag.startX, endX),
        y1: Math.min(drag.startY, endY),
        x2: Math.max(drag.startX, endX),
        y2: Math.max(drag.startY, endY)
    };
    ids = this.findObjectsInScreenRect(rect);

    if (drag.additive) {
        combined = this.selectionIds.slice();
        for (i = 0; i < ids.length; i++) {
            if (!this.isIdSelected(ids[i])) {
                combined.push(ids[i]);
            }
        }
        this.setSelection(combined, ids.length > 0 ? ids[ids.length - 1] : this.selectedObjectId);
    } else {
        this.setSelection(ids, ids.length > 0 ? ids[ids.length - 1] : null);
    }
};

// 화면 사각형과 교차하는 객체 ID 목록
AlgeoApp.prototype.findObjectsInScreenRect = function (rect) {
    const list = this.engine.objects;
    const result = [];
    let i;
    let obj;
    let bounds;

    for (i = 0; i < list.length; i++) {
        obj = list[i];
        if (!this.engine.isObjectVisible(obj)) {
            continue;
        }
        bounds = this.getObjectScreenBounds(obj);
        if (bounds && this.rectsIntersect(rect, bounds)) {
            result.push(obj.id);
        }
    }
    return result;
};

// 두 축정렬 사각형 교차 여부
AlgeoApp.prototype.rectsIntersect = function (a, b) {
    return !(a.x2 < b.x1 || a.x1 > b.x2 || a.y2 < b.y1 || a.y1 > b.y2);
};

// 객체의 화면 좌표 경계 상자 (마퀴 교차용)
AlgeoApp.prototype.getObjectScreenBounds = function (obj) {
    const r = this.renderer;
    const engine = this.engine;
    let p1;
    let p2;
    let end;
    let linePts;
    let circ;
    let pad = 6;
    let minX;
    let minY;
    let maxX;
    let maxY;
    let sx;
    let sy;
    let i;
    let vp;
    let sweep;
    let bounds;
    let left;
    let right;
    let step;
    let mathX;
    let yVal;
    let first;
    let coeffs;

    function expand(x, y) {
        if (minX === undefined) {
            minX = x;
            minY = y;
            maxX = x;
            maxY = y;
            return;
        }
        if (x < minX) { minX = x; }
        if (y < minY) { minY = y; }
        if (x > maxX) { maxX = x; }
        if (y > maxY) { maxY = y; }
    }

    function expandSeg(x1, y1, x2, y2) {
        expand(x1, y1);
        expand(x2, y2);
    }

    if (isAlgeoPointType(obj.type)) {
        sx = r.toScreenX(obj.x);
        sy = r.toScreenY(obj.y);
        return { x1: sx - 10, y1: sy - 10, x2: sx + 10, y2: sy + 10 };
    }

    if (obj.type === 'SEGMENT' || obj.type === 'VECTOR') {
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        if (!p1 || !p2) { return null; }
        expandSeg(r.toScreenX(p1.x), r.toScreenY(p1.y), r.toScreenX(p2.x), r.toScreenY(p2.y));
    } else if (obj.type === 'RAY') {
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        if (!p1 || !p2) { return null; }
        end = r.getRayScreenEndpoints(p1, p2);
        if (!end) { return null; }
        expandSeg(end.x1, end.y1, end.x2, end.y2);
    } else if (obj.type === 'LINE' || obj.type === 'PERP_BISECTOR' ||
        obj.type === 'PARALLEL_LINE' || obj.type === 'PERP_LINE' ||
        obj.type === 'ANGLE_BISECTOR' || obj.type === 'TANGENT') {
        if (obj.type === 'LINE') {
            p1 = engine.objectMap[obj.p1Id];
            p2 = engine.objectMap[obj.p2Id];
        } else if (obj.type === 'PERP_BISECTOR') {
            linePts = engine.getPerpBisectorLinePoints(obj);
            if (!linePts) { return null; }
            p1 = linePts.p1;
            p2 = linePts.p2;
        } else if (obj.type === 'ANGLE_BISECTOR') {
            linePts = engine.getAngleBisectorLinePoints(obj);
            if (!linePts) { return null; }
            end = r.getRayScreenEndpoints(linePts.p1, linePts.p2);
            if (!end) { return null; }
            expandSeg(end.x1, end.y1, end.x2, end.y2);
            p1 = null;
        } else if (obj.type === 'TANGENT') {
            linePts = engine.getTangentLinePoints(obj);
            if (!linePts) { return null; }
            p1 = linePts.p1;
            p2 = linePts.p2;
        } else if (obj.type === 'PARALLEL_LINE') {
            linePts = engine.getParallelLinePoints(obj);
            if (!linePts) { return null; }
            p1 = linePts.p1;
            p2 = linePts.p2;
        } else {
            linePts = engine.getPerpLinePoints(obj);
            if (!linePts) { return null; }
            p1 = linePts.p1;
            p2 = linePts.p2;
        }
        if (p1 && p2) {
            end = r.getLineScreenEndpoints(p1, p2);
            if (!end) { return null; }
            expandSeg(end.x1, end.y1, end.x2, end.y2);
        }
    } else if (obj.type === 'CIRCLE' || obj.type === 'CIRCLE_3P') {
        circ = engine.getCircleGeometry(obj);
        if (!circ) { return null; }
        sx = r.toScreenX(circ.center.x);
        sy = r.toScreenY(circ.center.y);
        pad = circ.radius * r.scale;
        return { x1: sx - pad, y1: sy - pad, x2: sx + pad, y2: sy + pad };
    } else if (obj.type === 'SECTOR') {
        p1 = engine.objectMap[obj.centerId];
        if (!p1) { return null; }
        expand(r.toScreenX(p1.x), r.toScreenY(p1.y));
        vp = engine.objectMap[obj.p1Id];
        if (vp) { expand(r.toScreenX(vp.x), r.toScreenY(vp.y)); }
        vp = engine.objectMap[obj.p2Id];
        if (vp) { expand(r.toScreenX(vp.x), r.toScreenY(vp.y)); }
    } else if (obj.type === 'ARC' || obj.type === 'CIRCULAR_SEGMENT') {
        p1 = engine.objectMap[obj.p1Id];
        p2 = engine.objectMap[obj.p2Id];
        vp = engine.objectMap[obj.guideId];
        if (!p1 || !p2 || !vp) { return null; }
        sweep = r.getArcSweepThroughGuide(p1, p2, vp);
        if (!sweep) { return null; }
        return {
            x1: sweep.cx - sweep.r,
            y1: sweep.cy - sweep.r,
            x2: sweep.cx + sweep.r,
            y2: sweep.cy + sweep.r
        };
    } else if (obj.type === 'ANGLE') {
        vp = engine.objectMap[obj.vertexId];
        if (!vp) { return null; }
        sx = r.toScreenX(vp.x);
        sy = r.toScreenY(vp.y);
        return { x1: sx - 40, y1: sy - 40, x2: sx + 40, y2: sy + 40 };
    } else if (obj.type === 'POLYGON') {
        for (i = 0; i < obj.vertexIds.length; i++) {
            vp = engine.objectMap[obj.vertexIds[i]];
            if (!vp) { return null; }
            expand(r.toScreenX(vp.x), r.toScreenY(vp.y));
        }
    } else if (obj.type === 'TEXT') {
        sx = r.toScreenX(obj.x);
        sy = r.toScreenY(obj.y);
        return { x1: sx - 4, y1: sy - 18, x2: sx + 110, y2: sy + 8 };
    } else if (obj.type === 'IMAGE') {
        bounds = r.getImageScreenRect(obj);
        return {
            x1: bounds.x,
            y1: bounds.y,
            x2: bounds.x + bounds.w,
            y2: bounds.y + bounds.h
        };
    } else if (obj.type === 'PEN') {
        if (!obj.points || obj.points.length < 1) {
            return null;
        }
        for (i = 0; i < obj.points.length; i++) {
            expand(r.toScreenX(obj.points[i].x), r.toScreenY(obj.points[i].y));
        }
        return {
            x1: minX - 4,
            y1: minY - 4,
            x2: maxX + 4,
            y2: maxY + 4
        };
    } else if (obj.type === 'DECORATE_LEADER') {
        expandSeg(r.toScreenX(obj.x1), r.toScreenY(obj.y1), r.toScreenX(obj.x2), r.toScreenY(obj.y2));
    } else if (obj.type === 'DECORATE_LENGTH') {
        bounds = this.getObjectScreenBounds(engine.objectMap[obj.targetId]);
        if (!bounds) { return null; }
        return bounds;
    } else if (obj.type === 'DECORATE_ANGLE') {
        vp = engine.objectMap[obj.vertexId];
        if (!vp) { return null; }
        sx = r.toScreenX(vp.x);
        sy = r.toScreenY(vp.y);
        return { x1: sx - 44, y1: sy - 44, x2: sx + 44, y2: sy + 44 };
    } else if (obj.type === 'DECORATE_PARALLEL') {
        bounds = this.getObjectScreenBounds(engine.objectMap[obj.targetId]);
        if (!bounds) { return null; }
        return bounds;
    } else if (obj.type === 'SLIDER') {
        bounds = r.getSliderScreenBounds(obj);
        return {
            x1: bounds.left - 4,
            y1: bounds.top - 18,
            x2: bounds.right + 4,
            y2: bounds.thumbY + 12
        };
    } else if (isAlgeoMeasureType(obj.type)) {
        vp = engine.getMeasureLabelAnchor(obj);
        if (!vp) { return null; }
        sx = r.toScreenX(vp.x);
        sy = r.toScreenY(vp.y);
        return { x1: sx - 52, y1: sy - 16, x2: sx + 52, y2: sy + 16 };
    } else if (obj.type === 'FUNCTION') {
        left = Math.min(r.toMathX(0), r.toMathX(r.canvas.width));
        right = Math.max(r.toMathX(0), r.toMathX(r.canvas.width));
        step = (right - left) / 40;
        first = true;
        for (mathX = left; mathX <= right; mathX += step) {
            coeffs = engine.getFunctionCoeffs(obj);
            yVal = coeffs.slope * mathX + coeffs.intercept;
            if (yVal === null || isNaN(yVal) || !isFinite(yVal)) {
                continue;
            }
            sx = r.toScreenX(mathX);
            sy = r.toScreenY(yVal);
            if (first) {
                minX = sx;
                minY = sy;
                maxX = sx;
                maxY = sy;
                first = false;
            } else {
                expand(sx, sy);
            }
        }
        if (first) { return null; }
    } else {
        return null;
    }

    if (minX === undefined) {
        return null;
    }
    return {
        x1: minX - pad,
        y1: minY - pad,
        x2: maxX + pad,
        y2: maxY + pad
    };
};

// 선택된 객체 전부 삭제
AlgeoApp.prototype.deleteSelectedObjects = function () {
    const ids = this.selectionIds.slice();
    let i;

    if (ids.length === 0) {
        return;
    }

    this.recordHistory(ids.length > 1 ? '선택 객체 삭제' : '객체 삭제');
    for (i = 0; i < ids.length; i++) {
        if (this.engine.objectMap[ids[i]]) {
            this.engine.deleteObject(ids[i]);
        }
    }
    this.clearSelection();
    this.validateAlgebraSelection();
    this.updateAlgebraView();
    this.renderer.draw();
};

// 선택 집합 표시/숨김 토글 (주 선택 기준과 동일하게 일괄)
AlgeoApp.prototype.toggleSelectionVisibility = function () {
    const ids = this.selectionIds.slice();
    const snapshot = this.captureEngineState();
    let i;
    let obj;
    let makeVisible = false;

    if (ids.length === 0) {
        return;
    }

    // 하나라도 보이면 전부 숨김, 전부 숨김이면 표시
    for (i = 0; i < ids.length; i++) {
        obj = this.engine.objectMap[ids[i]];
        if (obj && this.engine.isObjectVisible(obj)) {
            makeVisible = false;
            break;
        }
        makeVisible = true;
    }

    for (i = 0; i < ids.length; i++) {
        if (this.engine.objectMap[ids[i]]) {
            this.engine.setObjectVisible(ids[i], makeVisible);
        }
    }

    if (!makeVisible) {
        this.clearSelection();
    }

    this.pushUndoEntry(snapshot, makeVisible ? '선택 표시' : '선택 숨기기');
    this.updateAlgebraView();
    this.renderer.draw();
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

// 객체가 참조하는 점 ID 목록 반환
AlgeoApp.prototype.getObjectPointRefs = function (obj) {
    if (!obj) {
        return [];
    }
    if (isAlgeoPointType(obj.type)) {
        return [obj.id];
    }
    if (obj.type === 'SEGMENT' || obj.type === 'LINE' || obj.type === 'RAY' ||
        obj.type === 'VECTOR' || obj.type === 'PERP_BISECTOR') {
        return [obj.p1Id, obj.p2Id];
    }
    if (obj.type === 'ANGLE_BISECTOR' || obj.type === 'ANGLE' || obj.type === 'DECORATE_ANGLE') {
        return [obj.ray1Id, obj.vertexId, obj.ray2Id];
    }
    if (obj.type === 'PARALLEL_LINE' || obj.type === 'PERP_LINE') {
        return [obj.refP1Id, obj.refP2Id, obj.throughId];
    }
    if (obj.type === 'TANGENT') {
        return [obj.pointId];
    }
    if (obj.type === 'CIRCLE') {
        return [obj.centerId, obj.pointId];
    }
    if (obj.type === 'CIRCLE_3P') {
        return [obj.p1Id, obj.p2Id, obj.p3Id];
    }
    if (obj.type === 'ARC' || obj.type === 'CIRCULAR_SEGMENT') {
        return [obj.p1Id, obj.p2Id, obj.guideId];
    }
    if (obj.type === 'SECTOR') {
        return [obj.centerId, obj.p1Id, obj.p2Id];
    }
    if (obj.type === 'POLYGON') {
        return obj.vertexIds ? obj.vertexIds.slice() : [];
    }
    return [];
};

// 새 객체에 시각 스타일을 복사
AlgeoApp.prototype.copyObjectStyle = function (srcObj, dstObj) {
    if (!srcObj || !dstObj || !srcObj.style) {
        return;
    }
    dstObj.style = JSON.parse(JSON.stringify(srcObj.style));
};

// 현재 선택에서 변환 가능한 대상 수집
AlgeoApp.prototype.getTransformSelectionInfo = function () {
    const ids = this.selectionIds.slice();
    const pointIds = [];
    const objectIds = [];
    const pointSeen = {};
    const objectSeen = {};
    let i;
    let obj;
    let refs;
    let j;
    let id;

    for (i = 0; i < ids.length; i++) {
        obj = this.engine.objectMap[ids[i]];
        if (!obj || !ALGEO_TRANSFORMABLE_OBJECT_TYPES[obj.type]) {
            continue;
        }
        if (isAlgeoPointType(obj.type)) {
            if (!pointSeen[obj.id]) {
                pointSeen[obj.id] = true;
                pointIds.push(obj.id);
            }
            continue;
        }
        if (!objectSeen[obj.id]) {
            objectSeen[obj.id] = true;
            objectIds.push(obj.id);
        }
        refs = this.getObjectPointRefs(obj);
        for (j = 0; j < refs.length; j++) {
            id = refs[j];
            if (id && !pointSeen[id]) {
                pointSeen[id] = true;
                pointIds.push(id);
            }
        }
    }
    return {
        pointIds: pointIds,
        objectIds: objectIds
    };
};

// 선형 객체의 두 점 참조 반환
AlgeoApp.prototype.getLinearObjectPointPair = function (obj) {
    if (!obj) {
        return null;
    }
    if (obj.type === 'SEGMENT' || obj.type === 'VECTOR' || obj.type === 'LINE' || obj.type === 'RAY') {
        return {
            p1: this.engine.objectMap[obj.p1Id],
            p2: this.engine.objectMap[obj.p2Id]
        };
    }
    if (obj.type === 'PERP_BISECTOR') {
        return {
            p1: this.engine.objectMap[obj.p1Id],
            p2: this.engine.objectMap[obj.p2Id]
        };
    }
    if (obj.type === 'ANGLE_BISECTOR') {
        return {
            p1: this.engine.objectMap[obj.vertexId],
            p2: this.engine.objectMap[obj.ray1Id]
        };
    }
    if (obj.type === 'PARALLEL_LINE' || obj.type === 'PERP_LINE') {
        return {
            p1: this.engine.objectMap[obj.refP1Id],
            p2: this.engine.objectMap[obj.refP2Id]
        };
    }
    if (obj.type === 'TANGENT') {
        return this.engine.getTangentLinePoints(obj);
    }
    return null;
};

// 선택한 변환 대상을 복제해 새 객체로 생성
AlgeoApp.prototype.cloneSelectionWithTransform = function (transformConfig) {
    const info = this.getTransformSelectionInfo();
    const pointMap = {};
    const createdIds = [];
    let i;
    let pointId;
    let name;
    let pointObj;
    let obj;
    let newObj;

    if (info.pointIds.length === 0 && info.objectIds.length === 0) {
        return { createdIds: [], skipped: 0 };
    }
    for (i = 0; i < info.pointIds.length; i++) {
        pointId = info.pointIds[i];
        name = this.getNextPointName();
        pointObj = this.engine.addTransformPoint(name, pointId, transformConfig);
        if (pointObj) {
            pointMap[pointId] = pointObj.id;
            createdIds.push(pointObj.id);
        }
    }
    for (i = 0; i < info.objectIds.length; i++) {
        obj = this.engine.objectMap[info.objectIds[i]];
        newObj = this.cloneObjectFromPointMap(obj, pointMap);
        if (newObj) {
            createdIds.push(newObj.id);
        }
    }
    return {
        createdIds: createdIds,
        skipped: (info.pointIds.length + info.objectIds.length) - createdIds.length
    };
};

// 점 매핑을 이용해 객체 복제
AlgeoApp.prototype.cloneObjectFromPointMap = function (obj, pointMap) {
    let clone = null;
    let pointNames = [];
    let p1;
    let p2;
    let p3;
    let center;
    let through;
    let ray1;
    let vertex;
    let ray2;
    let i;
    let groupId;

    function mapId(oldId) {
        return pointMap[oldId] || null;
    }

    if (!obj) {
        return null;
    }
    if (obj.type === 'SEGMENT') {
        clone = this.engine.addSegment('tmp', mapId(obj.p1Id), mapId(obj.p2Id));
        if (clone) {
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            clone.name = p1.name + p2.name;
        }
    } else if (obj.type === 'LINE') {
        clone = this.engine.addLine('tmp', mapId(obj.p1Id), mapId(obj.p2Id));
        if (clone) {
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            clone.name = 'd' + p1.name + p2.name;
        }
    } else if (obj.type === 'RAY') {
        clone = this.engine.addRay('tmp', mapId(obj.p1Id), mapId(obj.p2Id));
        if (clone) {
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            clone.name = 'ray' + p1.name + p2.name;
        }
    } else if (obj.type === 'VECTOR') {
        clone = this.engine.addVector('tmp', mapId(obj.p1Id), mapId(obj.p2Id));
        if (clone) {
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            clone.name = 'vec' + p1.name + p2.name;
        }
    } else if (obj.type === 'PERP_BISECTOR') {
        clone = this.engine.addPerpBisector('tmp', mapId(obj.p1Id), mapId(obj.p2Id));
        if (clone) {
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            clone.name = 'pb' + p1.name + p2.name;
        }
    } else if (obj.type === 'ANGLE_BISECTOR') {
        clone = this.engine.addAngleBisector('tmp', mapId(obj.ray1Id), mapId(obj.vertexId), mapId(obj.ray2Id));
        if (clone) {
            ray1 = this.engine.objectMap[clone.ray1Id];
            vertex = this.engine.objectMap[clone.vertexId];
            ray2 = this.engine.objectMap[clone.ray2Id];
            clone.name = 'bis' + ray1.name + vertex.name + ray2.name;
        }
    } else if (obj.type === 'PARALLEL_LINE') {
        clone = this.engine.addParallelLine('tmp', mapId(obj.refP1Id), mapId(obj.refP2Id), mapId(obj.throughId));
        if (clone) {
            p1 = this.engine.objectMap[clone.refP1Id];
            p2 = this.engine.objectMap[clone.refP2Id];
            through = this.engine.objectMap[clone.throughId];
            clone.name = 'pl' + through.name + p1.name + p2.name;
        }
    } else if (obj.type === 'PERP_LINE') {
        clone = this.engine.addPerpLine('tmp', mapId(obj.refP1Id), mapId(obj.refP2Id), mapId(obj.throughId));
        if (clone) {
            p1 = this.engine.objectMap[clone.refP1Id];
            p2 = this.engine.objectMap[clone.refP2Id];
            through = this.engine.objectMap[clone.throughId];
            clone.name = 'pp' + through.name + p1.name + p2.name;
        }
    } else if (obj.type === 'TANGENT') {
        clone = this.engine.addTangent('tmp', obj.circleId, mapId(obj.pointId), obj.index);
        if (clone) {
            p1 = this.engine.objectMap[clone.pointId];
            clone.name = 'tg' + (obj.circleId || '') + p1.name;
        }
    } else if (obj.type === 'CIRCLE') {
        clone = this.engine.addCircle('tmp', mapId(obj.centerId), mapId(obj.pointId));
        if (clone) {
            center = this.engine.objectMap[clone.centerId];
            clone.name = '\u2299' + center.name;
        }
    } else if (obj.type === 'CIRCLE_3P') {
        clone = this.engine.addCircle3P('tmp', mapId(obj.p1Id), mapId(obj.p2Id), mapId(obj.p3Id));
        if (clone) {
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            p3 = this.engine.objectMap[clone.p3Id];
            clone.name = '\u2299' + p1.name + p2.name + p3.name;
        }
    } else if (obj.type === 'ARC') {
        clone = this.engine.addArc('tmp', mapId(obj.p1Id), mapId(obj.p2Id), mapId(obj.guideId));
        if (clone) {
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            p3 = this.engine.objectMap[clone.guideId];
            clone.name = 'arc' + p1.name + p2.name + p3.name;
        }
    } else if (obj.type === 'SECTOR') {
        clone = this.engine.addSector('tmp', mapId(obj.centerId), mapId(obj.p1Id), mapId(obj.p2Id));
        if (clone) {
            center = this.engine.objectMap[clone.centerId];
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            clone.name = 'sec' + center.name + p1.name + p2.name;
        }
    } else if (obj.type === 'CIRCULAR_SEGMENT') {
        clone = this.engine.addCircularSegment('tmp', mapId(obj.p1Id), mapId(obj.p2Id), mapId(obj.guideId));
        if (clone) {
            p1 = this.engine.objectMap[clone.p1Id];
            p2 = this.engine.objectMap[clone.p2Id];
            p3 = this.engine.objectMap[clone.guideId];
            clone.name = 'sg' + p1.name + p2.name + p3.name;
        }
    } else if (obj.type === 'ANGLE') {
        clone = this.engine.addAngle('tmp', mapId(obj.ray1Id), mapId(obj.vertexId), mapId(obj.ray2Id));
        if (clone) {
            ray1 = this.engine.objectMap[clone.ray1Id];
            vertex = this.engine.objectMap[clone.vertexId];
            ray2 = this.engine.objectMap[clone.ray2Id];
            clone.name = '\u2220' + ray1.name + vertex.name + ray2.name;
        }
    } else if (obj.type === 'POLYGON') {
        for (i = 0; i < obj.vertexIds.length; i++) {
            if (!mapId(obj.vertexIds[i])) {
                return null;
            }
            pointNames.push(mapId(obj.vertexIds[i]));
        }
        clone = this.engine.addPolygon('tmp', pointNames);
        if (clone) {
            pointNames = [];
            for (i = 0; i < clone.vertexIds.length; i++) {
                p1 = this.engine.objectMap[clone.vertexIds[i]];
                if (p1) {
                    pointNames.push(p1.name);
                }
            }
            clone.name = 'poly' + pointNames.join('');
        }
    } else if (obj.type === 'DECORATE_LENGTH') {
        clone = this.engine.addDecorateLength(obj.targetId);
    } else if (obj.type === 'DECORATE_ANGLE') {
        clone = this.engine.addDecorateAngle(mapId(obj.ray1Id), mapId(obj.vertexId), mapId(obj.ray2Id));
    } else if (obj.type === 'DECORATE_PARALLEL') {
        groupId = obj.groupId;
        clone = this.engine.addDecorateParallel(obj.targetId, groupId);
    }
    if (clone) {
        this.copyObjectStyle(obj, clone);
    }
    return clone;
};

// 평행 표시용 다음 그룹 번호
AlgeoApp.prototype.getNextParallelDecorationGroupId = function () {
    const list = this.engine.objects;
    let maxGroup = 0;
    let i;

    for (i = 0; i < list.length; i++) {
        if (list[i].type === 'DECORATE_PARALLEL' && list[i].groupId > maxGroup) {
            maxGroup = list[i].groupId;
        }
    }
    return maxGroup + 1;
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
    this.syncSettingsPanelUI();
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

// 격자·스냅·축 토글 초기화 (localStorage 복원)
AlgeoApp.prototype.initViewToggles = function () {
    const self = this;
    let gridSaved = null;
    let snapSaved = null;
    let axesSaved = null;

    try {
        gridSaved = localStorage.getItem(ALGEO_GRID_VISIBLE_KEY);
        snapSaved = localStorage.getItem(ALGEO_SNAP_ENABLED_KEY);
        axesSaved = localStorage.getItem(ALGEO_AXES_VISIBLE_KEY);
    } catch (ignoreErr) {
        gridSaved = null;
        snapSaved = null;
        axesSaved = null;
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

    if (axesSaved === '0') {
        this.renderer.showAxes = false;
    } else if (axesSaved === '1') {
        this.renderer.showAxes = true;
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
    this.syncSettingsPanelUI();
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
    this.syncSettingsPanelUI();
    if (this.guideOverride === 'snap') {
        this.syncToolGuide();
    }
};

// 좌표축 표시 설정
AlgeoApp.prototype.setAxesVisible = function (visible) {
    this.renderer.showAxes = !!visible;

    try {
        localStorage.setItem(ALGEO_AXES_VISIBLE_KEY, visible ? '1' : '0');
    } catch (ignoreErr) {
        // localStorage 미지원 환경 무시
    }

    this.syncSettingsPanelUI();
    this.renderer.draw();
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

// 장면 저장/불러오기 버튼 초기화
AlgeoApp.prototype.initSaveLoad = function () {
    const self = this;

    $('#btnSaveScene').on('click', function (e) {
        e.stopPropagation();
        self.saveSceneToFile();
    });

    $('#btnLoadScene').on('click', function (e) {
        e.stopPropagation();
        $('#sceneFileInput').val('');
        $('#sceneFileInput').trigger('click');
    });

    $('#sceneFileInput').on('change', function (e) {
        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        if (file) {
            self.loadSceneFromFile(file);
        }
    });
};

// 현재 장면을 JSON 파일로 저장
AlgeoApp.prototype.saveSceneToFile = function () {
    const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        state: this.captureEngineState()
    };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'algeomath-scene.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () {
        URL.revokeObjectURL(url);
    }, 0);
};

// JSON 파일에서 장면 복원
AlgeoApp.prototype.loadSceneFromFile = function (file) {
    const self = this;
    const reader = new FileReader();

    reader.onload = function () {
        let parsed;
        let state;
        try {
            parsed = JSON.parse(reader.result);
            state = parsed && parsed.state ? parsed.state : parsed;
            if (!state || !state.objects || state.nextId === undefined) {
                throw new Error('invalid-state');
            }
            self.recordHistory('JSON 불러오기');
            self.restoreEngineState(state);
            self.clearToolDraft();
            self.clearSelection();
            self.updateAlgebraView();
            self.syncAlgebraPropsPanel();
            self.renderer.draw();
            self.syncHistoryUI();
        } catch (err) {
            window.alert('올바른 JSON 장면 파일이 아닙니다.');
        }
    };
    reader.readAsText(file, 'utf-8');
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
        if (this.isIdSelected(objId)) {
            this.removeFromSelection(objId);
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
    if (this.isIdSelected(target.id)) {
        this.removeFromSelection(target.id);
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

    $('#algebraPropsPanel').on('click', '.style-swatch', function (e) {
        e.preventDefault();
        e.stopPropagation();
        self.applyStylePatchToSelection({
            stroke: $(this).attr('data-color')
        }, '스타일: 색상');
    });

    $('#algebraPropsPanel').on('change', '.style-color-input', function (e) {
        e.stopPropagation();
        self.applyStylePatchToSelection({
            stroke: $(this).val()
        }, '스타일: 색상');
    });

    $('#algebraPropsPanel').on('change', '.style-width-select', function (e) {
        e.stopPropagation();
        self.applyStylePatchToSelection({
            lineWidth: parseFloat($(this).val())
        }, '스타일: 굵기');
    });

    $('#algebraPropsPanel').on('change', '.style-dash-select', function (e) {
        e.stopPropagation();
        self.applyStylePatchToSelection({
            dashMode: $(this).val()
        }, '스타일: 선 종류');
    });

    $('#algebraPropsPanel').on('change', '.style-label-check', function (e) {
        e.stopPropagation();
        self.applyStylePatchToSelection({
            showLabel: $(this).prop('checked')
        }, '스타일: 라벨');
    });

    $('#algebraPropsPanel').on('change', '.style-opacity-range', function (e) {
        const pct = parseInt($(this).val(), 10);
        e.stopPropagation();
        $(this).closest('.style-form-row').find('.style-opacity-value').text(pct + '%');
        self.applyStylePatchToSelection({
            fillOpacity: pct / 100
        }, '스타일: 채움');
    });

    $('#algebraPropsPanel').on('input', '.style-opacity-range', function () {
        const pct = parseInt($(this).val(), 10);
        $(this).closest('.style-form-row').find('.style-opacity-value').text(pct + '%');
    });

    $('#algebraPropsPanel').on('click', '.style-reset-btn', function (e) {
        e.preventDefault();
        e.stopPropagation();
        self.resetStyleOfSelection();
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
    } else if (obj.type === 'SEGMENT') {
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
    } else if (obj.type === 'CIRCLE') {
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
    } else if (obj.type === 'SLIDER') {
        html += '<div class="algebra-props-form">';
        html += '<label class="prop-field">최소 <input type="text" class="prop-input" data-prop="min" value="' + obj.min + '" /></label>';
        html += '<label class="prop-field">최대 <input type="text" class="prop-input" data-prop="max" value="' + obj.max + '" /></label>';
        html += '<label class="prop-field">값 <input type="text" class="prop-input" data-prop="value" value="' + obj.value + '" /></label>';
        html += '<label class="prop-field">간격 <input type="text" class="prop-input" data-prop="step" value="' + obj.step + '" /></label>';
        html += '<button type="button" class="prop-apply-btn">적용</button>';
        html += '</div>';
    } else if (obj.type === 'IMAGE') {
        html += '<div class="algebra-props-form">';
        html += '<label class="prop-field">x <input type="text" class="prop-input" data-prop="x" value="' + obj.x.toFixed(2) + '" /></label>';
        html += '<label class="prop-field">y <input type="text" class="prop-input" data-prop="y" value="' + obj.y.toFixed(2) + '" /></label>';
        html += '<label class="prop-field">너비 <input type="text" class="prop-input" data-prop="width" value="' + Number(obj.width).toFixed(2) + '" /></label>';
        html += '<button type="button" class="prop-apply-btn">적용</button>';
        html += '</div>';
        if (obj.fileName) {
            html += '<p class="props-note">파일: ' + escapeHtmlText(obj.fileName) + '</p>';
        }
    } else if (obj.type === 'FUNCTION') {
        html += '<div class="algebra-props-form">';
        html += '<label class="prop-field">기울기 a <input type="text" class="prop-input" data-prop="slope" value="' + obj.slope + '" /></label>';
        html += '<label class="prop-field">절편 b <input type="text" class="prop-input" data-prop="intercept" value="' + obj.intercept + '" /></label>';
        html += '<button type="button" class="prop-apply-btn">적용</button>';
        html += '</div>';
    } else {
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
        } else if (obj.type === 'MEASURE_LENGTH') {
            html += '<p>길이 ' + (obj.value !== null && obj.value !== undefined ? obj.value.toFixed(2) : '?') + '</p>';
            html += '<p class="props-note">측정값 — 두 점을 이동하면 함께 바뀝니다.</p>';
        } else if (obj.type === 'MEASURE_ANGLE') {
            html += '<p>각도 ' + (obj.value !== null && obj.value !== undefined ? obj.value.toFixed(1) + '\u00B0' : '?') + '</p>';
            html += '<p class="props-note">측정값 — 꼭짓점·변의 점을 이동하면 함께 바뀝니다.</p>';
        } else if (obj.type === 'MEASURE_AREA') {
            html += '<p>넓이 ' + (obj.value !== null && obj.value !== undefined ? obj.value.toFixed(2) : '?') + '</p>';
            html += '<p class="props-note">측정값 — 대상 도형을 바꾸면 함께 바뀝니다.</p>';
        } else {
            html += '<p class="props-note">이 객체는 좌표를 직접 편집할 수 없습니다.<br>아래에서 시각 스타일을 바꿀 수 있습니다.</p>';
        }
        html += '</div>';
    }

    html += this.buildStylePropsHtml(obj);
    return html;
};

// 채움 투명도를 쓰는 타입인지
AlgeoApp.prototype.objectSupportsFillOpacity = function (type) {
    return type === 'POLYGON' || type === 'SECTOR' ||
        type === 'CIRCULAR_SEGMENT' || type === 'ANGLE' ||
        isAlgeoPointType(type);
};

// 스타일 편집 UI HTML (options.penDraft면 작도 전 펜 패널 표시)
AlgeoApp.prototype.buildStylePropsHtml = function (obj, options) {
    const style = resolveObjectStyle(obj);
    let html = '';
    let i;
    let w;
    let activeClass;
    let supportsFill = this.objectSupportsFillOpacity(obj.type);
    let penDraft = options && options.penDraft;

    html += '<div class="algebra-style-section" data-style-root="1"' +
        (penDraft ? ' data-pen-draft="1"' : '') + '>';
    html += '<div class="algebra-style-heading">스타일</div>';
    html += '<div class="style-swatch-row">';
    for (i = 0; i < ALGEO_STYLE_PRESETS.length; i++) {
        activeClass = style.stroke.toLowerCase() === ALGEO_STYLE_PRESETS[i].toLowerCase() ? ' active' : '';
        html += '<button type="button" class="style-swatch' + activeClass + '" data-color="' +
            ALGEO_STYLE_PRESETS[i] + '" title="' + ALGEO_STYLE_PRESETS[i] +
            '" style="background-color:' + ALGEO_STYLE_PRESETS[i] + '"></button>';
    }
    html += '<label class="style-color-picker" title="사용자 색">';
    html += '<input type="color" class="style-color-input" value="' + this.normalizeHexColor(style.stroke) + '" />';
    html += '</label>';
    html += '</div>';

    html += '<div class="algebra-props-form style-form-row">';
    html += '<label class="prop-field">굵기 <select class="prop-input style-width-select">';
    for (i = 0; i < ALGEO_STYLE_WIDTHS.length; i++) {
        w = ALGEO_STYLE_WIDTHS[i];
        html += '<option value="' + w + '"' +
            (Math.abs(style.lineWidth - w) < 0.01 ? ' selected' : '') + '>' + w + '</option>';
    }
    html += '</select></label>';

    html += '<label class="prop-field">선 스타일 <select class="prop-input style-dash-select">';
    html += '<option value="solid"' + (style.dashMode === 'solid' ? ' selected' : '') + '>실선</option>';
    html += '<option value="dashed"' + (style.dashMode === 'dashed' ? ' selected' : '') + '>파선</option>';
    html += '<option value="dotted"' + (style.dashMode === 'dotted' ? ' selected' : '') + '>점선</option>';
    html += '</select></label>';

    html += '<label class="prop-field style-check-field">' +
        '<span>라벨</span>' +
        '<input type="checkbox" class="style-label-check"' + (style.showLabel ? ' checked' : '') + ' />' +
        '</label>';
    html += '</div>';

    if (supportsFill) {
        html += '<div class="algebra-props-form style-form-row">';
        html += '<label class="prop-field">채움 투명도 <input type="range" class="style-opacity-range" min="0" max="100" step="5" value="' +
            Math.round(style.fillOpacity * 100) + '" /></label>';
        html += '<span class="style-opacity-value">' + Math.round(style.fillOpacity * 100) + '%</span>';
        html += '</div>';
    }

    html += '<button type="button" class="style-reset-btn">스타일 초기화</button>';
    html += '</div>';
    return html;
};

// 다중 선택 시 스타일만 일괄 편집
AlgeoApp.prototype.buildMultiStylePropsHtml = function () {
    const n = this.selectionIds.length;
    const primary = this.engine.objectMap[this.selectedObjectId] ||
        this.engine.objectMap[this.selectionIds[0]];
    let html = '';

    html += '<div class="algebra-props-title">' + n + '개 선택 <span class="props-type">스타일 일괄</span></div>';
    html += '<p class="props-note">아래 스타일은 선택된 모든 객체에 적용됩니다.</p>';
    if (primary) {
        html += this.buildStylePropsHtml(primary);
    }
    return html;
};

// 색상을 #rrggbb 로 정규화 (color input용)
AlgeoApp.prototype.normalizeHexColor = function (color) {
    let m;
    let r;
    let g;
    let b;
    let toHex;

    if (!color) {
        return '#1d4ed8';
    }
    m = /^#([0-9a-fA-F]{6})$/.exec(color);
    if (m) {
        return '#' + m[1].toLowerCase();
    }
    m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(color);
    if (m) {
        toHex = function (n) {
            const h = parseInt(n, 10).toString(16);
            return h.length === 1 ? '0' + h : h;
        };
        r = toHex(m[1]);
        g = toHex(m[2]);
        b = toHex(m[3]);
        return '#' + r + g + b;
    }
    return '#1d4ed8';
};

// 선택 객체(들)에 스타일 패치 적용 + Undo
AlgeoApp.prototype.applyStylePatchToSelection = function (patch, label) {
    const ids = this.selectionIds.length > 0
        ? this.selectionIds.slice()
        : (this.selectedObjectId ? [this.selectedObjectId] : []);
    let i;
    let obj;
    let snapshot;
    let key;

    // 펜 작도 전 기본 스타일 (Undo 없음)
    if (this.isEditingPenDraftStyle() ||
        $('#algebraPropsPanel [data-pen-draft="1"]').length > 0) {
        if (!this.penDraftStyle) {
            this.penDraftStyle = {};
        }
        for (key in patch) {
            if (Object.prototype.hasOwnProperty.call(patch, key)) {
                if (patch[key] === null || patch[key] === '') {
                    delete this.penDraftStyle[key];
                } else {
                    this.penDraftStyle[key] = patch[key];
                }
            }
        }
        this.syncAlgebraPropsPanel();
        return;
    }

    if (ids.length === 0) {
        return;
    }

    snapshot = this.captureEngineState();
    for (i = 0; i < ids.length; i++) {
        obj = this.engine.objectMap[ids[i]];
        if (obj) {
            applyStylePatchToObject(obj, patch);
        }
    }
    this.pushUndoEntry(snapshot, label || '스타일 변경');
    this.updateAlgebraView();
    this.syncAlgebraPropsPanel();
    this.renderer.draw();
};

// 선택 객체 스타일 초기화
AlgeoApp.prototype.resetStyleOfSelection = function () {
    const ids = this.selectionIds.length > 0
        ? this.selectionIds.slice()
        : (this.selectedObjectId ? [this.selectedObjectId] : []);
    let i;
    let obj;
    let snapshot;

    if (this.isEditingPenDraftStyle() ||
        $('#algebraPropsPanel [data-pen-draft="1"]').length > 0) {
        this.penDraftStyle = {
            stroke: null,
            lineWidth: 2.5,
            dashMode: 'solid',
            showLabel: false
        };
        this.syncAlgebraPropsPanel();
        return;
    }

    if (ids.length === 0) {
        return;
    }

    snapshot = this.captureEngineState();
    for (i = 0; i < ids.length; i++) {
        obj = this.engine.objectMap[ids[i]];
        if (obj) {
            delete obj.style;
        }
    }
    this.pushUndoEntry(snapshot, '스타일 초기화');
    this.updateAlgebraView();
    this.syncAlgebraPropsPanel();
    this.renderer.draw();
};

// 선택 객체 속성 패널 갱신
AlgeoApp.prototype.syncAlgebraPropsPanel = function () {
    const $panel = $('#algebraPropsPanel');
    const objId = this.selectedObjectId;
    let obj;

    if (this.selectionIds.length > 1) {
        $panel.html(this.buildMultiStylePropsHtml());
        return;
    }

    if (!objId) {
        // 펜 도구 + 무선택 → 작도 전 기본 스타일
        if (this.currentTool === 'PEN') {
            $panel.html(this.buildPenDraftStyleHtml());
            return;
        }
        $panel.html('<p class="algebra-props-placeholder">객체를 선택하면 속성·스타일을 편집할 수 있습니다.</p>');
        return;
    }

    obj = this.engine.objectMap[objId];
    if (!obj) {
        if (this.currentTool === 'PEN') {
            $panel.html(this.buildPenDraftStyleHtml());
            return;
        }
        $panel.html('<p class="algebra-props-placeholder">객체를 선택하면 속성·스타일을 편집할 수 있습니다.</p>');
        return;
    }

    $panel.html(this.buildAlgebraPropsHtml(obj));
};

// 펜 작도 전 스타일 편집 중인지
AlgeoApp.prototype.isEditingPenDraftStyle = function () {
    return this.currentTool === 'PEN' &&
        this.selectionIds.length === 0 &&
        !this.selectedObjectId;
};

// 펜 기본 스타일을 resolveObjectStyle 형태로
AlgeoApp.prototype.resolvePenDraftStyle = function () {
    return resolveObjectStyle({
        type: 'PEN',
        style: this.penDraftStyle || {}
    });
};

// 미리보기용 획 스타일
AlgeoApp.prototype.getPenDraftPreviewStyle = function () {
    const style = this.resolvePenDraftStyle();
    return {
        stroke: style.stroke,
        lineWidth: style.lineWidth,
        dash: style.dash || []
    };
};

// 새 PEN 객체에 넣을 style 패치
AlgeoApp.prototype.getPenDraftStyleForObject = function () {
    const draft = this.penDraftStyle || {};
    const resolved = this.resolvePenDraftStyle();
    const out = {
        stroke: resolved.stroke,
        lineWidth: resolved.lineWidth,
        dashMode: resolved.dashMode,
        showLabel: draft.showLabel === true
    };
    return out;
};

// 펜 작도 전 스타일 패널 HTML
AlgeoApp.prototype.buildPenDraftStyleHtml = function () {
    let html = '';

    html += '<div class="algebra-props-title">펜 기본 스타일 <span class="props-type">작도 전</span></div>';
    html += '<p class="props-note">아래에서 고른 색·굵기·선 스타일이 다음에 그리는 획에 적용됩니다.</p>';
    html += this.buildStylePropsHtml({
        type: 'PEN',
        style: this.penDraftStyle || {}
    }, { penDraft: true });
    return html;
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
    } else if (obj.type === 'IMAGE') {
        xVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="x"]').val());
        yVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="y"]').val());
        numVal = parseFloat($('#algebraPropsPanel .prop-input[data-prop="width"]').val());
        if (isNaN(xVal) || isNaN(yVal)) {
            $('#algebraError').text('좌표는 숫자여야 합니다.');
            return;
        }
        if (isNaN(numVal) || numVal <= 0) {
            $('#algebraError').text('너비는 0보다 큰 숫자여야 합니다.');
            return;
        }
        if (!obj.width || obj.width <= 0) {
            $('#algebraError').text('그림 크기를 확인할 수 없습니다.');
            return;
        }
        obj.x = xVal;
        obj.y = yVal;
        obj.height = numVal * (obj.height / obj.width);
        obj.width = numVal;
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
        } else if (obj.type === 'MEASURE_LENGTH') {
            const mp1 = this.engine.objectMap[obj.p1Id];
            const mp2 = this.engine.objectMap[obj.p2Id];
            if (mp1 && mp2) {
                desc = 'Distance(' + mp1.name + ', ' + mp2.name + ') = ' +
                    (obj.value !== null && obj.value !== undefined ? obj.value.toFixed(2) : '?');
            }
        } else if (obj.type === 'MEASURE_ANGLE') {
            const mr1 = this.engine.objectMap[obj.ray1Id];
            const mv = this.engine.objectMap[obj.vertexId];
            const mr2 = this.engine.objectMap[obj.ray2Id];
            if (mr1 && mv && mr2) {
                desc = 'Angle(' + mr1.name + ', ' + mv.name + ', ' + mr2.name + ') = ' +
                    (obj.value !== null && obj.value !== undefined ? obj.value.toFixed(1) + '\u00B0' : '?');
            }
        } else if (obj.type === 'MEASURE_AREA') {
            const mt = this.engine.objectMap[obj.targetId];
            if (mt) {
                desc = 'Area(' + mt.name + ') = ' +
                    (obj.value !== null && obj.value !== undefined ? obj.value.toFixed(2) : '?');
            }
        } else if (obj.type === 'TEXT') {
            desc = obj.text || '';
        } else if (obj.type === 'IMAGE') {
            desc = '그림' + (obj.fileName ? ' (' + obj.fileName + ')' : '') +
                ' ' + Number(obj.width).toFixed(1) + '\u00D7' + Number(obj.height).toFixed(1);
        } else if (obj.type === 'PEN') {
            desc = '점의 수: ' + (obj.points ? obj.points.length : 0);
        } else if (obj.type === 'DECORATE_LEADER') {
            desc = '설명선' + (obj.text ? ' - ' + obj.text : '');
        } else if (obj.type === 'DECORATE_LENGTH') {
            const lenTarget = this.engine.objectMap[obj.targetId];
            if (lenTarget) {
                desc = '길이 표시 (' + lenTarget.name + ')';
            }
        } else if (obj.type === 'DECORATE_ANGLE') {
            const da1 = this.engine.objectMap[obj.ray1Id];
            const dav = this.engine.objectMap[obj.vertexId];
            const da2 = this.engine.objectMap[obj.ray2Id];
            if (da1 && dav && da2) {
                desc = '각도 표시 ' + da1.name + dav.name + da2.name;
            }
        } else if (obj.type === 'DECORATE_PARALLEL') {
            const dpTarget = this.engine.objectMap[obj.targetId];
            if (dpTarget) {
                desc = '평행 표시 (' + dpTarget.name + ', 그룹 ' + obj.groupId + ')';
            }
        }

        const isVisible = this.engine.isObjectVisible(obj);
        const itemClass = 'algebra-item' + (isVisible ? '' : ' algebra-item-hidden');
        const visLabel = isVisible ? '숨기기' : '표시';
        const visIcon = isVisible ? '\u25C9' : '\u25CB';
        const styleStroke = resolveObjectStyle(obj).stroke;
        const colorStyle = ' style="background-color:' + styleStroke + '"';

        const itemHtml =
            '<div class="' + itemClass + '" data-id="' + obj.id + '">' +
            '    <button type="button" class="obj-visibility-btn" title="' + visLabel + '" aria-label="' + visLabel + '">' + visIcon + '</button>' +
            '    <span class="obj-color-indicator ' + obj.type.toLowerCase() + '"' + colorStyle + '></span>' +
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
    const next = [];
    let i;
    let id;

    for (i = 0; i < this.selectionIds.length; i++) {
        id = this.selectionIds[i];
        if (this.engine.objectMap[id]) {
            next.push(id);
        }
    }
    this.selectionIds = next;

    if (this.selectedObjectId && !this.engine.objectMap[this.selectedObjectId]) {
        this.selectedObjectId = next.length > 0 ? next[next.length - 1] : null;
    }
    if (this.selectedObjectId && next.indexOf(this.selectedObjectId) < 0 && next.length > 0) {
        this.selectedObjectId = next[next.length - 1];
    }
    if (next.length === 0) {
        this.selectedObjectId = null;
    }

    this.renderer.selectionIds = this.selectionIds.slice();
    this.renderer.selectedObjectId = this.selectedObjectId;
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
        this.closeSettingsPanel();
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
