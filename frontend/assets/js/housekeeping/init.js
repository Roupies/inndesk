// Housekeeping page initialization

// Page protection
InnDesk.auth.redirectIfNotAuth();

// Set up user info
async function setupUser() {
    try {
        const user = await InnDesk.auth.ensureCurrentUser();
        setCurrentUser(user);
        
        // Update user display
        document.getElementById('userName').textContent = user.full_name;
        document.getElementById('userRole').textContent = user.role === 'admin' ? 'Administrateur' : 'Réceptionniste';
    } catch (error) {
        InnDesk.auth.redirectIfNotAuth();
    }
}

// Initialize page
async function initHousekeeping() {
    // Set up user first
    await setupUser();
    
    // Load initial data
    await loadHousekeepingData();
    
    // Set up logout handler
    document.getElementById('logoutButton').addEventListener('click', () => {
        InnDesk.auth.clearToken();
        window.location.href = '/app/index.html';
    });
    
    // Set up theme toggle
    const themeToggle = document.getElementById('themeToggle');
    const themeIconLight = document.getElementById('themeIconLight');
    const themeIconDark = document.getElementById('themeIconDark');
    
    // Initialize theme
    const isDark = localStorage.getItem('theme') === 'dark';
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    themeIconLight.style.display = isDark ? 'block' : 'none';
    themeIconDark.style.display = isDark ? 'none' : 'block';
    
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        themeIconLight.style.display = newTheme === 'dark' ? 'block' : 'none';
        themeIconDark.style.display = newTheme === 'dark' ? 'none' : 'block';
    });
    
    // Initialize Lucide icons
    lucide.createIcons();
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHousekeeping);
} else {
    initHousekeeping();
}