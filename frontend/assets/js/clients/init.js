// @file: assets/js/clients/init.js
// @depends: state.js, utils.js, render.js, modals.js, handlers.js

// Initialize page
InnDesk.auth.redirectIfNotAuth();

// Load all data needed for the clients page
async function loadData() {
    try {
        currentUser = await InnDesk.auth.ensureCurrentUser();
        document.getElementById('userName').textContent = currentUser?.full_name || 'Utilisateur';
        document.getElementById('userRole').textContent = currentUser?.role || '';

        // Load stats and clients data in parallel
        const [statsData, clientsData] = await Promise.all([
            InnDesk.api.clients.getStats(),
            InnDesk.api.clients.getAll(currentFilters)
        ]);
        
        stats = statsData;
        clients = clientsData;
        
        // Render everything
        renderStats();
        renderClientsTable();
        renderNationalityFilter();
        
    } catch (error) {
        console.error('Error loading clients data:', error);
        showToast('Erreur lors du chargement des données', 'error');
    }
}

// Theme and logout handlers
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
loadData();

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}

// Global functions for HTML onclick handlers
window.openCreateClientModal = openCreateClientModal;
window.closeCreateClientModal = closeCreateClientModal;
window.openDetailModal = openDetailModal;
window.closeDetailModal = closeDetailModal;
window.openEditModal = openEditModal;
window.closeEditClientModal = closeEditClientModal;
window.openDeleteModal = openDeleteModal;
window.closeDeleteClientModal = closeDeleteClientModal;