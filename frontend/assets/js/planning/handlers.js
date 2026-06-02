// @file: assets/js/planning/handlers.js
// @depends: state.js, utils.js, render.js

// Navigation functions
function goToPreviousWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekLabel();
    renderPlanningGrid();
}

function goToNextWeek() {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateWeekLabel();
    renderPlanningGrid();
}

function goToToday() {
    currentWeekStart = new Date();
    setToMonday(currentWeekStart);
    updateWeekLabel();
    renderPlanningGrid();
}