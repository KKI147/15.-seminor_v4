/**
 * 알지오메스 진입점 (init · UI 골격 · popscale 연동)
 * App/Engine/Renderer/상수·도구는 js/algeo-*.js · refactor_modules.md
 */
let algeoAppInstance = null;

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
            '            <div class="algebra-list-toolbar">' +
        '                <div class="algebra-list-tabs">' +
        '                    <button type="button" class="algebra-tab-btn active" data-sort="created">생성순</button>' +
        '                    <button type="button" class="algebra-tab-btn" data-sort="type">종류순</button>' +
        '                </div>' +
        '                <div class="algebra-type-filter-wrap" id="algebraTypeFilterWrap" hidden>' +
        '                    <label class="algebra-type-filter-label" for="algebraTypeFilter">종류</label>' +
        '                    <select id="algebraTypeFilter" class="algebra-type-filter" title="종류별 필터">' +
        '                        <option value="all">전체</option>' +
        '                    </select>' +
        '                </div>' +
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
        '                        <div class="history-toolbar-actions">' +
        '                            <button type="button" id="btnSaveScene" class="sidebar-undo-btn" title="JSON 저장" aria-label="JSON 저장">저장</button>' +
        '                            <button type="button" id="btnLoadScene" class="sidebar-undo-btn" title="JSON 불러오기" aria-label="JSON 불러오기">불러오기</button>' +
            '                            <input type="file" id="sceneFileInput" accept=".json,application/json" style="display:none;" />' +
            '                            <input type="file" id="imageFileInput" accept="image/*" style="display:none;" />' +
        '                        </div>' +
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
                '                <div class="algeo-settings-panel" id="settingsPanel" aria-hidden="true">' +
                '                    <div class="settings-panel-head">' +
                '                        <strong>설정</strong>' +
                '                        <button type="button" id="btnCloseSettingsPanel" class="settings-panel-close" title="닫기" aria-label="설정 닫기">✕</button>' +
                '                    </div>' +
                '                    <div class="settings-panel-body" id="settingsPanelBody"></div>' +
                '                </div>' +
            '            </div>' +
        '        </div>' +
        '    </div>' +
        '</div>';

    $container.append(layoutHtml);
}

