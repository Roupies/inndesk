// @file: assets/js/reservations/init.js
// @depends: state.js, utils.js, render.js, modals.js, handlers.js

// Initialize page
InnDesk.auth.redirectIfNotAuth();

// Load initial data
async function loadData() {
    try {
        currentUser = await InnDesk.auth.ensureCurrentUser();
        document.getElementById('userName').textContent = currentUser?.full_name || 'Utilisateur';
        document.getElementById('userRole').textContent = currentUser?.role || '';

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
    document.getElementById(id).addEventListener('change', updateFormState);
    document.getElementById(id).addEventListener('input', updateFormState);
});

// Event listeners
document.getElementById('searchInput').addEventListener('input', renderReservations);
document.getElementById('statusFilter').addEventListener('change', renderReservations);
document.getElementById('dateFrom').addEventListener('change', renderReservations);
document.getElementById('dateTo').addEventListener('change', renderReservations);

document.getElementById('newReservationBtn').addEventListener('click', openCreateReservationModal);
document.getElementById('createModalCloseBtn').addEventListener('click', closeCreateReservationModal);
document.getElementById('assignModalCloseBtn').addEventListener('click', closeAssignRoomModal);
document.getElementById('statusModalCloseBtn').addEventListener('click', closeStatusChangeModal);
document.getElementById('drawerCloseBtn').addEventListener('click', closeReservationDrawer);
document.getElementById('drawerOverlay').addEventListener('click', closeReservationDrawer);

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
        document.getElementById('clientDropdown').style.display = 'none';
    }
});

// Theme and logout
document.getElementById('themeToggle').addEventListener('click', () => {
    InnDesk.utils.toggleTheme();
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const lightIcon = document.getElementById('themeIconLight');
    const darkIcon = document.getElementById('themeIconDark');
    
    if (currentTheme === 'light') {
        lightIcon.style.display = 'none';
        darkIcon.style.display = 'block';
    } else {
        lightIcon.style.display = 'block';
        darkIcon.style.display = 'none';
    }
});

document.getElementById('logoutButton').addEventListener('click', () => {
    InnDesk.api.auth.logout();
});

// Initialize
_initCheckInListener();
initCheckinTab();
loadData();

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}