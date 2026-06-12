// Settings modal management
window.SettingsModals = {
    // Open create user modal
    openCreateUserModal() {
        const modal = document.getElementById('createUserModal');
        if (!modal) return;
        
        // Reset form
        document.getElementById('createUserForm').reset();
        SettingsUtils.clearFormErrors('createUserForm');
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus on first input
        const firstInput = modal.querySelector('input');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    },
    
    // Close create user modal
    closeCreateUserModal() {
        const modal = document.getElementById('createUserModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Open edit user modal
    openEditUserModal(userId) {
        const user = SettingsState.getUserById(userId);
        if (!user) return;
        
        const modal = document.getElementById('editUserModal');
        if (!modal) return;
        
        // Fill form with user data
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserName').value = user.full_name;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserRole').value = user.role;
        document.getElementById('editUserActive').checked = user.is_active;
        
        SettingsUtils.clearFormErrors('editUserForm');
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus on first input
        setTimeout(() => document.getElementById('editUserName').focus(), 100);
    },
    
    // Close edit user modal
    closeEditUserModal() {
        const modal = document.getElementById('editUserModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Open reset password modal
    openResetPasswordModal(userId) {
        const user = SettingsState.getUserById(userId);
        if (!user) return;
        
        const modal = document.getElementById('resetPasswordModal');
        if (!modal) return;
        
        // Fill form with user data
        document.getElementById('resetPasswordUserId').value = user.id;
        document.getElementById('resetPasswordUserName').textContent = user.full_name;
        document.getElementById('resetNewPassword').value = '';
        
        SettingsUtils.clearFormErrors('resetPasswordForm');
        
        // Show modal
        modal.style.display = 'flex';
        
        // Focus on password input
        setTimeout(() => document.getElementById('resetNewPassword').focus(), 100);
    },
    
    // Close reset password modal
    closeResetPasswordModal() {
        const modal = document.getElementById('resetPasswordModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    // Setup modal event listeners
    setupModals() {
        // Close buttons
        document.getElementById('createUserModalCloseBtn')?.addEventListener('click', this.closeCreateUserModal);
        document.getElementById('editUserModalCloseBtn')?.addEventListener('click', this.closeEditUserModal);
        document.getElementById('resetPasswordModalCloseBtn')?.addEventListener('click', this.closeResetPasswordModal);
        
        // Close on overlay click
        const modals = ['createUserModal', 'editUserModal', 'resetPasswordModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this[`close${modalId.charAt(0).toUpperCase() + modalId.slice(1).replace('Modal', 'Modal')}`]();
                    }
                });
            }
        });
        
        // ESC key handling
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close any open modal
                modals.forEach(modalId => {
                    const modal = document.getElementById(modalId);
                    if (modal && modal.style.display === 'flex') {
                        this[`close${modalId.charAt(0).toUpperCase() + modalId.slice(1).replace('Modal', 'Modal')}`]();
                    }
                });
            }
        });
    }
};

// Global functions for onclick handlers
window.closeCreateUserModal = () => SettingsModals.closeCreateUserModal();
window.closeEditUserModal = () => SettingsModals.closeEditUserModal();
window.closeResetPasswordModal = () => SettingsModals.closeResetPasswordModal();