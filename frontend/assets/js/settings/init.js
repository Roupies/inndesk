// Settings page initialization
window.SettingsInit = {
    // Load hotel settings
    async loadHotelSettings() {
        try {
            const settings = await InnDesk.api.settings.getHotelSettings();
            SettingsState.setHotelSettings(settings);
            SettingsRender.renderHotelSettings(settings);
        } catch (error) {
            console.error('Error loading hotel settings:', error);
            SettingsUtils.showToast('Erreur lors du chargement des paramètres de l\'hôtel', 'error');
        }
    },
    
    // Load users list (admin only)
    async loadUsers() {
        if (!SettingsState.isAdmin()) return;
        
        try {
            const users = await InnDesk.api.settings.getUsers();
            SettingsState.setUsers(users);
            SettingsRender.renderUsersTable(users);
        } catch (error) {
            console.error('Error loading users:', error);
            SettingsUtils.showToast('Erreur lors du chargement des utilisateurs', 'error');
        }
    },
    
    // Load current user profile
    async loadCurrentUser() {
        try {
            const user = await InnDesk.api.settings.getMe();
            SettingsState.setCurrentUser(user);
            SettingsRender.renderProfile(user);
            SettingsRender.updateRoleBasedUI();
        } catch (error) {
            console.error('Error loading current user:', error);
            SettingsUtils.showToast('Erreur lors du chargement du profil', 'error');
        }
    },
    
    // Load all data
    async loadData() {
        SettingsState.loading = true;
        
        try {
            // Load current user first to determine permissions
            await this.loadCurrentUser();
            
            // Load hotel settings (always available)
            await this.loadHotelSettings();
            
            // Load users if admin
            if (SettingsState.isAdmin()) {
                await this.loadUsers();
            }
        } catch (error) {
            console.error('Error loading settings data:', error);
            SettingsUtils.showToast('Erreur lors du chargement des données', 'error');
        } finally {
            SettingsState.loading = false;
        }
    },
    
    // Initialize the page
    async init() {
        // Check authentication
        InnDesk.auth.redirectIfNotAuth();
        
        // Initialize components
        SettingsModals.setupModals();
        SettingsHandlers.setupEventListeners();
        
        // Set initial tab based on user role
        const currentUser = InnDesk.auth.getCurrentUser();
        if (currentUser && currentUser.role !== 'admin') {
            SettingsState.setActiveTab('security');
        }
        
        // Load all data
        await this.loadData();
        
        // Initialize Lucide icons
        lucide.createIcons();
    }
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    SettingsInit.init();
});