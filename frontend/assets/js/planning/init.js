// @file: assets/js/planning/init.js
// @depends: state.js, utils.js, render.js, handlers.js

InnDesk.auth.redirectIfNotAuth();

currentWindowStart = new Date();
currentWindowStart.setHours(0, 0, 0, 0);

if (window.location.hash) {
    const parsed = new Date(window.location.hash.substring(1));
    if (!Number.isNaN(parsed.getTime())) {
        currentWindowStart = parsed;
        currentWindowStart.setHours(0, 0, 0, 0);
    }
}

function bindPlanningClick(id, handler) {
    const element = document.getElementById(id);
    if (element) element.addEventListener('click', handler);
}

async function loadUserInfo() {
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');
    try {
        const currentUser = await InnDesk.auth.ensureCurrentUser();
        if (userName) userName.textContent = currentUser?.full_name || 'Utilisateur';
        if (userRole) userRole.textContent = currentUser ? InnDesk.utils.statusLabel(currentUser.role) : '';
    } catch (error) {
        if (userName) userName.textContent = 'Utilisateur';
        if (userRole) userRole.textContent = '';
    }
}

bindPlanningClick('pgPrev', goToPreviousWeek);
bindPlanningClick('pgNext', goToNextWeek);
bindPlanningClick('pgToday', goToToday);
[7, 14, 28].forEach(size => bindPlanningClick(`pgBtn${size}`, () => setWindowSize(size)));
bindPlanningClick('pgDetailClose', closePlanningDetail);
bindPlanningClick('pgDetailOverlay', closePlanningDetail);
bindPlanningClick('themeToggle', () => InnDesk.utils.toggleTheme());
bindPlanningClick('logoutButton', () => InnDesk.api.auth.logout());

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closePlanningDetail();
});

loadUserInfo();
updateWindowSizeButtons();
updateRangeLabel();
loadPlanningData();
