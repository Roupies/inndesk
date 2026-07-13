// @file: assets/js/planning/init.js
// @depends: state.js, utils.js, render.js, handlers.js

InnDesk.auth.redirectIfNotAuth();

// Set window start to today (midnight)
currentWindowStart = new Date();
currentWindowStart.setHours(0, 0, 0, 0);

// Handle URL hash: restore previous window position
if (window.location.hash) {
    const hashDate = window.location.hash.substring(1);
    const parsed = new Date(hashDate);
    if (!isNaN(parsed)) {
        currentWindowStart = parsed;
        currentWindowStart.setHours(0, 0, 0, 0);
    }
}

// Load user information
async function loadUserInfo() {
    try {
        const currentUser = await InnDesk.auth.ensureCurrentUser();
        if (currentUser) {
            document.getElementById('userName').textContent = currentUser.full_name;
            document.getElementById('userRole').textContent = InnDesk.utils.statusLabel(currentUser.role);
        } else {
            document.getElementById('userName').textContent = 'Utilisateur';
            document.getElementById('userRole').textContent = '';
        }
    } catch (error) {
        document.getElementById('userName').textContent = 'Utilisateur';
        document.getElementById('userRole').textContent = '';
    }
}

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
const themeIconLight = document.getElementById('themeIconLight');
const themeIconDark = document.getElementById('themeIconDark');

function updateThemeIcon() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    if (currentTheme === 'light') {
        themeIconLight.style.display = 'none';
        themeIconDark.style.display = 'block';
    } else {
        themeIconLight.style.display = 'block';
        themeIconDark.style.display = 'none';
    }
}

// Event listeners
document.getElementById('prevWeekBtn').addEventListener('click', goToPreviousWeek);
document.getElementById('nextWeekBtn').addEventListener('click', goToNextWeek);
document.getElementById('todayBtn').addEventListener('click', goToToday);

themeToggle.addEventListener('click', () => {
    InnDesk.utils.toggleTheme();
    updateThemeIcon();
});

document.getElementById('logoutButton').addEventListener('click', () => {
    InnDesk.api.auth.logout();
});

// Initialize
loadUserInfo();
updateThemeIcon();
updateRangeLabel();
loadPlanningData();

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
