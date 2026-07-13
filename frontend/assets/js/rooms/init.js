// @file: assets/js/rooms/init.js
// @depends: state.js, render.js, modals.js, handlers.js

// Protect page and initialize
InnDesk.auth.redirectIfNotAuth();

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

// Load data
async function loadRoomsData() {
    try {
        const [roomsData, typesData, reservationsData] = await Promise.all([
            InnDesk.api.rooms.getAll(),
            InnDesk.api.rooms.getTypes(),
            InnDesk.api.reservations.getAll({ limit: 100 })
        ]);

        rooms = roomsData.sort((a, b) => {
            if (a.floor !== b.floor) return a.floor - b.floor;
            return a.number.localeCompare(b.number, undefined, { numeric: true });
        });

        roomTypes = typesData;
        reservations = reservationsData;

        updateStats();
        populateTypeFilters();
        renderRooms();

    } catch (error) {
        const grid = document.getElementById('roomsGrid');
        grid.innerHTML = `
            <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: var(--space-8); color: var(--text-muted);">
                Impossible de charger les chambres
            </div>
        `;
    }
}

// Event listeners
document.getElementById('statusFilters').addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-pill')) {
        setStatusFilter(e.target.dataset.filter);
    }
});

document.getElementById('modalCloseBtn').addEventListener('click', closeRoomModal);

document.getElementById('roomModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
        closeRoomModal();
    }
});

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
loadRoomsData();

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}