// @file: assets/js/planning/handlers.js
// @depends: state.js, utils.js, render.js

function goToPreviousWeek() {
    currentWindowStart.setDate(currentWindowStart.getDate() - 7);
    updateRangeLabel();
    loadPlanningData();
}

function goToNextWeek() {
    currentWindowStart.setDate(currentWindowStart.getDate() + 7);
    updateRangeLabel();
    loadPlanningData();
}

function goToToday() {
    currentWindowStart = new Date();
    currentWindowStart.setHours(0, 0, 0, 0);
    updateRangeLabel();
    loadPlanningData();
}

function setWindowSize(size) {
    if (![7, 14, 28].includes(size) || size === daysInWindow) return;
    daysInWindow = size;
    updateRangeLabel();
    updateWindowSizeButtons();
    loadPlanningData();
}

function updateWindowSizeButtons() {
    [7, 14, 28].forEach(size => {
        const button = document.getElementById(`pgBtn${size}`);
        if (!button) return;
        const isActive = size === daysInWindow;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));
    });
}

function closePlanningDetail() {
    const overlay = document.getElementById('pgDetailOverlay');
    const modal = document.getElementById('pgDetailModal');
    if (overlay) {
        overlay.classList.remove('show');
        overlay.setAttribute('aria-hidden', 'true');
    }
    if (modal) modal.classList.remove('show');
}
