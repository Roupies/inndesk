// @file: assets/js/planning/init.js
// @depends: state.js, utils.js, render.js, handlers.js

InnDesk.auth.redirectIfNotAuth();

async function loadUserInfo() {
    try {
        const user = await InnDesk.auth.ensureCurrentUser();
        document.getElementById('userName').textContent = user?.full_name || 'Utilisateur';
        document.getElementById('userRole').textContent = user?.role || '';
    } catch {
        document.getElementById('userName').textContent = 'Utilisateur';
        document.getElementById('userRole').textContent = '';
    }
}

const themeToggle    = document.getElementById('themeToggle');
const themeIconLight = document.getElementById('themeIconLight');
const themeIconDark  = document.getElementById('themeIconDark');

function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    themeIconLight.style.display = isDark  ? 'block' : 'none';
    themeIconDark.style.display  = !isDark ? 'block' : 'none';
}

themeToggle.addEventListener('click', () => {
    InnDesk.utils.toggleTheme();
    updateThemeIcon();
});

document.getElementById('logoutButton').addEventListener('click', () => {
    InnDesk.api.auth.logout();
});

updateThemeIcon();
loadUserInfo();
fetchData();

if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
