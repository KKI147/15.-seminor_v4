/**
 * AlgeoMath 스타일 기하 도구 아이콘 (인라인 SVG)
 * 규칙·체크리스트: icon_guidelines.md
 * 신규 도구: ALGEO_ICON_PATHS에 id 추가 → ALGEO_TOOL_CATEGORIES[].iconId 연결
 */
const ALGEO_ICON_INK = '#1a1a1a';
const ALGEO_ICON_RED = '#e53935';
const ALGEO_ICON_BLUE = '#2563eb';
const ALGEO_ICON_MUTED = '#64748b';

const ALGEO_ICON_PATHS = {
    // ── 카테고리 레일 ──
    'cat-pointer': '' +
        '<path d="M6 4v14M6 4l4.5 4" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="17" cy="17" r="2.2" fill="' + ALGEO_ICON_RED + '"/>',
    'cat-point': '' +
        '<circle cx="8" cy="12" r="2" fill="' + ALGEO_ICON_RED + '"/>' +
        '<circle cx="16" cy="12" r="2" fill="' + ALGEO_ICON_BLUE + '"/>',
    'cat-line': '' +
        '<circle cx="6" cy="12" r="1.8" fill="' + ALGEO_ICON_RED + '"/>' +
        '<circle cx="18" cy="12" r="1.8" fill="' + ALGEO_ICON_RED + '"/>' +
        '<line x1="6" y1="12" x2="18" y2="12" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.6" stroke-linecap="round"/>',
    'cat-polygon': '' +
        '<path d="M12 5 L18 9.5 L16 17 L8 17 L6 9.5 Z" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="5" r="1.6" fill="' + ALGEO_ICON_RED + '"/>',
    'cat-circle': '' +
        '<circle cx="12" cy="12" r="7" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.5"/>' +
        '<circle cx="12" cy="12" r="1.6" fill="' + ALGEO_ICON_RED + '"/>',
    'cat-slider': '' +
        '<line x1="5" y1="14" x2="19" y2="14" stroke="' + ALGEO_ICON_MUTED + '" stroke-width="2" stroke-linecap="round"/>' +
        '<circle cx="14" cy="14" r="3" fill="' + ALGEO_ICON_BLUE + '"/>',
    'cat-edit': '' +
        '<rect x="6" y="7" width="9" height="9" rx="1" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4"/>' +
        '<rect x="9" y="10" width="9" height="9" rx="1" fill="#fff" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4"/>' +
        '<circle cx="13.5" cy="14.5" r="1.4" fill="' + ALGEO_ICON_RED + '"/>',

    // ── 도구 ──
    move: '' +
        '<path d="M6 4v14M6 4l4.5 4" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="17" cy="17" r="2" fill="' + ALGEO_ICON_RED + '"/>',
    point: '<circle cx="12" cy="12" r="3" fill="' + ALGEO_ICON_RED + '"/>',
    midpoint: '' +
        '<circle cx="6" cy="12" r="1.8" fill="' + ALGEO_ICON_BLUE + '"/>' +
        '<circle cx="12" cy="12" r="2.2" fill="' + ALGEO_ICON_RED + '"/>' +
        '<circle cx="18" cy="12" r="1.8" fill="' + ALGEO_ICON_BLUE + '"/>' +
        '<line x1="6" y1="12" x2="18" y2="12" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linecap="round"/>',
    segment: '' +
        '<circle cx="6" cy="12" r="2" fill="' + ALGEO_ICON_RED + '"/>' +
        '<circle cx="18" cy="12" r="2" fill="' + ALGEO_ICON_RED + '"/>' +
        '<line x1="6" y1="12" x2="18" y2="12" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.6" stroke-linecap="round"/>',
    line: '' +
        '<line x1="4" y1="12" x2="20" y2="12" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M4 12l3-2.5M4 12l3 2.5M20 12l-3-2.5M20 12l-3 2.5" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    perp_bisector: '' +
        '<circle cx="6" cy="12" r="1.8" fill="' + ALGEO_ICON_RED + '"/>' +
        '<circle cx="18" cy="12" r="1.8" fill="' + ALGEO_ICON_RED + '"/>' +
        '<line x1="6" y1="12" x2="18" y2="12" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
        '<line x1="12" y1="6" x2="12" y2="18" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="2 2"/>',
    parallel_line: '' +
        '<line x1="5" y1="9" x2="19" y2="9" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="7" y1="15" x2="17" y2="15" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
        '<circle cx="7" cy="9" r="1.5" fill="' + ALGEO_ICON_RED + '"/>',
    perp_line: '' +
        '<line x1="6" y1="17" x2="18" y2="17" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
        '<line x1="12" y1="17" x2="12" y2="6" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.5" stroke-linecap="round"/>' +
        '<rect x="10.5" y="15" width="3" height="3" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.2"/>',
    angle: '' +
        '<path d="M6 17 L12 7 L18 17" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="7" r="1.8" fill="' + ALGEO_ICON_RED + '"/>' +
        '<path d="M12 11a4 4 0 0 1 3.5 2" fill="none" stroke="' + ALGEO_ICON_RED + '" stroke-width="1.3" stroke-linecap="round"/>',
    polygon: '' +
        '<path d="M12 5 L18 9.5 L16 17 L8 17 L6 9.5 Z" fill="rgba(180,83,9,0.12)" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="5" r="1.6" fill="' + ALGEO_ICON_RED + '"/>',
    circle: '' +
        '<circle cx="12" cy="12" r="7" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.5"/>' +
        '<circle cx="12" cy="12" r="1.8" fill="' + ALGEO_ICON_RED + '"/>' +
        '<circle cx="17" cy="12" r="1.6" fill="' + ALGEO_ICON_BLUE + '"/>',
    arc: '' +
        '<path d="M7 16a8 8 0 0 1 10-10" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="7" cy="16" r="1.8" fill="' + ALGEO_ICON_RED + '"/>' +
        '<circle cx="17" cy="6" r="1.8" fill="' + ALGEO_ICON_RED + '"/>',
    slider: '' +
        '<line x1="4" y1="14" x2="20" y2="14" stroke="' + ALGEO_ICON_MUTED + '" stroke-width="2.2" stroke-linecap="round"/>' +
        '<circle cx="15" cy="14" r="3.2" fill="' + ALGEO_ICON_BLUE + '" stroke="#fff" stroke-width="1"/>',
    hide_object: '' +
        '<path d="M12 7c-4 0-7 3-7 5s3 5 7 5 7-3 7-5-3-5-7-5z" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<circle cx="12" cy="12" r="2" fill="' + ALGEO_ICON_INK + '"/>' +
        '<line x1="7" y1="17" x2="17" y2="7" stroke="' + ALGEO_ICON_RED + '" stroke-width="1.5" stroke-linecap="round"/>',
    delete: '' +
        '<path d="M8 8h8l-1 11H9L8 8z" fill="none" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<line x1="6" y1="8" x2="18" y2="8" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linecap="round"/>' +
        '<line x1="10" y1="5" x2="14" y2="5" stroke="' + ALGEO_ICON_INK + '" stroke-width="1.4" stroke-linecap="round"/>',

    // ── 우측 바·기타 ──
    'zoom-in': '<line x1="12" y1="7" x2="12" y2="17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    'zoom-out': '<line x1="7" y1="12" x2="17" y2="12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    'reset-view': '<path d="M12 6v3M12 6l-2 2M12 6l2 2M6 12h3M6 12l2-2M6 12l2 2M12 18v-3M12 18l-2-2M12 18l2-2M18 12h-3M18 12l-2-2M18 12l-2 2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="12" r="2" fill="currentColor"/>',
    theme: '<path d="M12 4a8 8 0 1 0 8 8 4 4 0 0 1-8-8z" fill="currentColor"/>',
    sun: '' +
        '<circle cx="12" cy="12" r="3.5" fill="currentColor"/>' +
        '<g fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">' +
        '<line x1="12" y1="3" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="21"/>' +
        '<line x1="3" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="21" y2="12"/>' +
        '<line x1="5.6" y1="5.6" x2="7" y2="7"/><line x1="17" y1="17" x2="18.4" y2="18.4"/>' +
        '<line x1="18.4" y1="5.6" x2="17" y2="7"/><line x1="7" y1="17" x2="5.6" y2="18.4"/>' +
        '</g>',
    shortcuts: '' +
        '<rect x="5" y="7" width="14" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
        '<line x1="8" y1="11" x2="11" y2="11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' +
        '<line x1="8" y1="14" x2="16" y2="14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>',
    grid: '' +
        '<line x1="5" y1="9" x2="19" y2="9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line x1="5" y1="15" x2="19" y2="15" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line x1="9" y1="7" x2="9" y2="17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
        '<line x1="15" y1="7" x2="15" y2="17" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
    snap: '' +
        '<path d="M8 8c0-3 2.5-5 4-5s4 2 4 5v5c0 1.5-1 2.5-2 3l-2 3-2-3c-1-.5-2-1.5-2-3V8z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<line x1="10" y1="18" x2="14" y2="18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    geometry: '' +
        '<line x1="5" y1="9" x2="19" y2="9" stroke="currentColor" stroke-width="1.3"/>' +
        '<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="1.3"/>' +
        '<line x1="5" y1="15" x2="19" y2="15" stroke="currentColor" stroke-width="1.3"/>' +
        '<line x1="9" y1="6" x2="9" y2="18" stroke="currentColor" stroke-width="1.3"/>' +
        '<line x1="15" y1="6" x2="15" y2="18" stroke="currentColor" stroke-width="1.3"/>'
};

/** 도구 ID → 아이콘 ID (카테고리·도구 공통) */
function resolveAlgeoIconId(toolOrCatId) {
    if (!toolOrCatId) {
        return 'point';
    }
    if (ALGEO_ICON_PATHS[toolOrCatId]) {
        return toolOrCatId;
    }
    const catKey = 'cat-' + toolOrCatId;
    if (ALGEO_ICON_PATHS[catKey]) {
        return catKey;
    }
    const lower = String(toolOrCatId).toLowerCase().replace(/_/g, '_');
    if (ALGEO_ICON_PATHS[lower]) {
        return lower;
    }
    return 'point';
}

/**
 * AlgeoMath 스타일 아이콘 HTML 생성
 * @param {string} iconId ALGEO_ICON_PATHS 키
 * @param {string} [extraClass] rail-icon-tile | flyout-icon-tile | guide-icon-tile | bar-icon
 * @param {boolean} [noTile] 타일 없이 SVG만 (우측 바 등)
 */
function renderAlgeoIcon(iconId, extraClass, noTile) {
    const resolved = resolveAlgeoIconId(iconId);
    let inner = ALGEO_ICON_PATHS[resolved];
    let cls = 'algeo-icon';

    if (!inner) {
        inner = '<circle cx="12" cy="12" r="3" fill="' + ALGEO_ICON_INK + '"/>';
    }
    if (extraClass) {
        cls += ' ' + extraClass;
    }

    const svg = '<svg class="algeo-icon-svg" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
        inner + '</svg>';

    if (noTile) {
        return '<span class="' + cls + '">' + svg + '</span>';
    }

    return '<span class="' + cls + '"><span class="algeo-icon-tile">' + svg + '</span></span>';
}
