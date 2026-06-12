// @file: assets/js/invoices/init.js
// @depends: state.js, utils.js, render.js, modals.js, handlers.js

// Initialize page when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    InnDesk.auth.redirectIfNotAuth();
    loadData();
});

// Load all data needed for the invoices page
async function loadData() {
    try {
        currentUser = await InnDesk.auth.ensureCurrentUser();
        document.getElementById('userName').textContent = currentUser?.full_name || 'Utilisateur';
        document.getElementById('userRole').textContent = currentUser?.role || '';

        // Load stats, invoices and available reservations in parallel
        const [statsData, invoicesData, reservationsData] = await Promise.all([
            InnDesk.api.invoices.getStats(),
            InnDesk.api.invoices.getAll(currentFilters),
            InnDesk.api.invoices.getAvailableReservations()
        ]);
        
        stats = statsData;
        invoices = invoicesData;
        availableReservations = reservationsData;
        
        // Render everything
        renderStats();
        renderInvoicesTable();
        
    } catch (error) {
        console.error('Error loading invoices data:', error);
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

// Initialization moved to DOMContentLoaded event handler above

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}