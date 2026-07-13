// Settings page state management
window.SettingsState = {
    currentTab: 'hotel',
    hotelSettings: null,
    users: [],
    currentUser: null,
    loading: false,
    
    // Set active tab
    setActiveTab(tab) {
        this.currentTab = tab;
        this.updateTabUI();
    },
    
    // Update UI based on active tab
    updateTabUI() {
        // Update navigation
        document.querySelectorAll('.settings-nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.dataset.tab === this.currentTab) {
                link.classList.add('active');
            }
        });
        
        // Update sections
        document.querySelectorAll('.settings-section').forEach(section => {
            section.classList.remove('active');
        });
        
        const activeSection = document.getElementById(`${this.currentTab}Section`);
        if (activeSection) {
            activeSection.classList.add('active');
        }
    },
    
    // Set hotel settings
    setHotelSettings(settings) {
        this.hotelSettings = settings;
    },
    
    // Set users list
    setUsers(users) {
        this.users = users;
    },
    
    // Set current user
    setCurrentUser(user) {
        this.currentUser = user;
    },
    
    // Check if current user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'admin';
    },
    
    // Get user by id
    getUserById(id) {
        return this.users.find(user => user.id === id);
    },
    
    // Add new user
    addUser(user) {
        this.users.push(user);
    },
    
    // Update user
    updateUser(updatedUser) {
        const index = this.users.findIndex(user => user.id === updatedUser.id);
        if (index !== -1) {
            this.users[index] = updatedUser;
        }
    },
    
    // Remove user
    removeUser(userId) {
        this.users = this.users.filter(user => user.id !== userId);
    }
};