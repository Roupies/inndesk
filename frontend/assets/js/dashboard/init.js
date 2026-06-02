// @file: assets/js/dashboard/init.js
// @depends: render.js

// Protect page and initialize
InnDesk.auth.redirectIfNotAuth();

// Initialize current date
document.getElementById('currentDate').textContent = InnDesk.utils.formatDate(new Date().toISOString());

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

// Load dashboard data
async function loadDashboardData() {
    try {
        await Promise.all([
            loadKPIs(),
            loadActiveReservations(),
            loadRoomStatus(),
            loadRecentActivity()
        ]);
    } catch (error) {
        // Error handling is done in individual functions
    }
}

// Event listeners
themeToggle.addEventListener('click', () => {
    InnDesk.utils.toggleTheme();
    updateThemeIcon();
});

// Logout functionality
document.getElementById('logoutButton').addEventListener('click', () => {
    InnDesk.api.auth.logout();
});

// Initialize
loadUserInfo();
updateThemeIcon();
loadDashboardData();