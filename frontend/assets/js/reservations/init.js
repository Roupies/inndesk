// @file: assets/js/reservations/init.js
// @depends: state.js, utils.js, render.js, modals.js, handlers.js

// Initialize page
InnDesk.auth.redirectIfNotAuth();

function bindReservationEvent(id, eventName, handler) {
    const element = document.getElementById(id);
    if (element) element.addEventListener(eventName, handler);
}

// Load initial data
async function loadData() {
    try {
        currentUser = await InnDesk.auth.ensureCurrentUser();
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        if (userName) userName.textContent = currentUser?.full_name || 'Utilisateur';
        if (userRole) userRole.textContent = currentUser?.role || '';

        const [reservationsData, roomTypesData] = await Promise.all([
            InnDesk.api.reservations.getAll({ limit: 500 }),
            InnDesk.api.rooms.getTypes()
        ]);

        reservations = reservationsData.sort((a, b) => new Date(b.check_in_date) - new Date(a.check_in_date));
        roomTypes = roomTypesData;

        updateStats();
        populateRoomTypeSelect();
        renderReservations();

    } catch (error) {
        showToast('Erreur lors du chargement des données', 'error');
    }
}

// Event listeners for form validation
['roomTypeSelect', 'checkInDate', 'checkOutDate', 'adults', 'children'].forEach(id => {
    bindReservationEvent(id, 'change', updateFormState);
    bindReservationEvent(id, 'input', updateFormState);
});

// Event listeners
bindReservationEvent('searchInput', 'input', renderReservations);
bindReservationEvent('statusFilter', 'change', renderReservations);
bindReservationEvent('dateFrom', 'change', renderReservations);
bindReservationEvent('dateTo', 'change', renderReservations);

bindReservationEvent('newReservationBtn', 'click', openCreateReservationModal);
bindReservationEvent('createModalCloseBtn', 'click', closeCreateReservationModal);
bindReservationEvent('assignModalCloseBtn', 'click', closeAssignRoomModal);
bindReservationEvent('statusModalCloseBtn', 'click', closeStatusChangeModal);
bindReservationEvent('drawerCloseBtn', 'click', closeDetailModal);
bindReservationEvent('drawerOverlay', 'click', closeDetailModal);

// Close modals on outside click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('show');
        }
    });
});

// Hide dropdowns on outside click
document.addEventListener('click', (e) => {
    if (!e.target.closest('.client-search-wrapper')) {
        const dropdown = document.getElementById('clientDropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDetailModal();
});

// Theme and logout
bindReservationEvent('themeToggle', 'click', () => {
    InnDesk.utils.toggleTheme();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const lightIcon = document.getElementById('themeIconLight');
    const darkIcon = document.getElementById('themeIconDark');
    
    if (currentTheme === 'light' && lightIcon && darkIcon) {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'block';
    } else if (lightIcon && darkIcon) {
        lightIcon.style.display = 'block';
        darkIcon.style.display = 'none';
    }
});

bindReservationEvent('logoutButton', 'click', () => {
    InnDesk.api.auth.logout();
});

// Initialize
loadData();
if (typeof initCheckinTab === 'function') initCheckinTab();

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
