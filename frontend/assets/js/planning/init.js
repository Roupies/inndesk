// @file: assets/js/planning/init.js
// @depends: state.js, utils.js, render.js, handlers.js

// Protect page and initialize
InnDesk.auth.redirectIfNotAuth();

// Initialize current week start
setToMonday(currentWeekStart);

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

// Theme toggle functionality
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

// Logout functionality
document.getElementById('logoutButton').addEventListener('click', () => {
    InnDesk.api.auth.logout();
});

// Handle URL hash on page load
if (window.location.hash) {
    const hashDate = window.location.hash.substring(1);
    const parsedDate = new Date(hashDate);
    if (!isNaN(parsedDate)) {
        currentWeekStart = parsedDate;
        setToMonday(currentWeekStart);
    }
}

// Initialize
loadUserInfo();
updateThemeIcon();
updateWeekLabel();
loadPlanningData();

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}