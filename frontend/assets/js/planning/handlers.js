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
