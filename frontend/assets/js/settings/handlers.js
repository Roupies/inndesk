// Settings event handlers
window.SettingsHandlers = {
    // Hotel settings form submission
    async handleHotelSave(e) {
        e.preventDefault();
        
        if (!SettingsState.isAdmin()) {
            SettingsUtils.showToast('Droits administrateur requis', 'error');
            return;
        }
        
        const form = e.target;
        const formData = new FormData(form);
        
        // Clear previous errors
        SettingsUtils.clearFormErrors('hotelForm');
        
        // Validate required fields
        if (!SettingsUtils.validateRequiredFields('hotelForm')) {
            return;
        }
        
        // Prepare settings object
        const settings = {
            hotel_name: document.getElementById('hotelName').value,
            hotel_address: document.getElementById('hotelAddress').value,
            hotel_city: document.getElementById('hotelCity').value,
            hotel_zip: document.getElementById('hotelZip').value,
            hotel_country: document.getElementById('hotelCountry').value,
            hotel_phone: document.getElementById('hotelPhone').value,
            hotel_email: document.getElementById('hotelEmail').value,
            hotel_siret: document.getElementById('hotelSiret').value,
            check_in_time: document.getElementById('checkInTime').value,
            check_out_time: document.getElementById('checkOutTime').value,
            tva_rate: parseFloat(document.getElementById('tvaRate').value),
            currency: document.getElementById('currency').value
        };
        
        try {
            SettingsState.loading = true;
            const updatedSettings = await InnDesk.api.settings.updateHotelSettings(settings);
            SettingsState.setHotelSettings(updatedSettings);
            SettingsUtils.updateHotelPreview(updatedSettings);
            SettingsUtils.showToast('Paramètres de l\'hôtel sauvegardés', 'success');
        } catch (error) {
            console.error('Error updating hotel settings:', error);
            SettingsUtils.showToast(error.detail || 'Erreur lors de la sauvegarde', 'error');
        } finally {
            SettingsState.loading = false;
        }
    },
    
    // Create user form submission
    async handleUserCreate(e) {
        e.preventDefault();
        
        const form = e.target;
        SettingsUtils.clearFormErrors('createUserForm');
        
        // Validate required fields
        if (!SettingsUtils.validateRequiredFields('createUserForm')) {
            return;
        }
        
        // Get form data
        const userData = {
            full_name: document.getElementById('createUserName').value.trim(),
            email: document.getElementById('createUserEmail').value.trim(),
            password: document.getElementById('createUserPassword').value,
            role: document.getElementById('createUserRole').value,
            is_active: true
        };
        
        // Validate email
        const emailError = SettingsUtils.validateEmail(userData.email);
        if (emailError) {
            SettingsUtils.showFieldError('createUserEmail', emailError);
            return;
        }
        
        // Validate password
        const passwordError = SettingsUtils.validatePassword(userData.password);
        if (passwordError) {
            SettingsUtils.showFieldError('createUserPassword', passwordError);
            return;
        }
        
        try {
            SettingsState.loading = true;
            const newUser = await InnDesk.api.settings.createUser(userData);
            SettingsState.addUser(newUser);
            SettingsRender.renderUsersTable(SettingsState.users);
            SettingsModals.closeCreateUserModal();
            SettingsUtils.showToast('Utilisateur créé avec succès', 'success');
        } catch (error) {
            console.error('Error creating user:', error);
            if (error.status === 400 && error.detail?.includes('email')) {
                SettingsUtils.showFieldError('createUserEmail', 'Cette adresse email est déjà utilisée');
            } else {
                SettingsUtils.showToast(error.detail || 'Erreur lors de la création', 'error');
            }
        } finally {
            SettingsState.loading = false;
        }
    },
    
    // Edit user form submission
    async handleUserEdit(e) {
        e.preventDefault();
        
        SettingsUtils.clearFormErrors('editUserForm');
        
        // Validate required fields
        if (!SettingsUtils.validateRequiredFields('editUserForm')) {
            return;
        }
        
        const userId = parseInt(document.getElementById('editUserId').value);
        const userData = {
            full_name: document.getElementById('editUserName').value.trim(),
            email: document.getElementById('editUserEmail').value.trim(),
            role: document.getElementById('editUserRole').value,
            is_active: document.getElementById('editUserActive').checked
        };
        
        // Validate email
        const emailError = SettingsUtils.validateEmail(userData.email);
        if (emailError) {
            SettingsUtils.showFieldError('editUserEmail', emailError);
            return;
        }
        
        try {
            SettingsState.loading = true;
            const updatedUser = await InnDesk.api.settings.updateUser(userId, userData);
            SettingsState.updateUser(updatedUser);
            SettingsRender.renderUsersTable(SettingsState.users);
            SettingsModals.closeEditUserModal();
            SettingsUtils.showToast('Utilisateur mis à jour', 'success');
        } catch (error) {
            console.error('Error updating user:', error);
            if (error.status === 400 && error.detail?.includes('email')) {
                SettingsUtils.showFieldError('editUserEmail', 'Cette adresse email est déjà utilisée');
            } else {
                SettingsUtils.showToast(error.detail || 'Erreur lors de la mise à jour', 'error');
            }
        } finally {
            SettingsState.loading = false;
        }
    },
    
    // Reset password form submission
    async handleResetPassword(e) {
        e.preventDefault();
        
        SettingsUtils.clearFormErrors('resetPasswordForm');
        
        const userId = parseInt(document.getElementById('resetPasswordUserId').value);
        const newPassword = document.getElementById('resetNewPassword').value;
        
        // Validate password
        const passwordError = SettingsUtils.validatePassword(newPassword);
        if (passwordError) {
            SettingsUtils.showFieldError('resetNewPassword', passwordError);
            return;
        }
        
        try {
            SettingsState.loading = true;
            await InnDesk.api.settings.resetUserPassword(userId, { new_password: newPassword });
            SettingsModals.closeResetPasswordModal();
            SettingsUtils.showToast('Mot de passe réinitialisé', 'success');
        } catch (error) {
            console.error('Error resetting password:', error);
            SettingsUtils.showToast(error.detail || 'Erreur lors de la réinitialisation', 'error');
        } finally {
            SettingsState.loading = false;
        }
    },
    
    // Password change form submission
    async handlePasswordChange(e) {
        e.preventDefault();
        
        SettingsUtils.clearFormErrors('passwordForm');
        
        // Validate required fields
        if (!SettingsUtils.validateRequiredFields('passwordForm')) {
            return;
        }
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Validate new password
        const passwordError = SettingsUtils.validatePassword(newPassword);
        if (passwordError) {
            SettingsUtils.showFieldError('newPassword', passwordError);
            return;
        }
        
        // Check passwords match
        if (newPassword !== confirmPassword) {
            SettingsUtils.showFieldError('confirmPassword', 'Les mots de passe ne correspondent pas');
            return;
        }
        
        try {
            SettingsState.loading = true;
            await InnDesk.api.settings.changePassword({
                current_password: currentPassword,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            
            // Reset form
            document.getElementById('passwordForm').reset();
            SettingsUtils.showToast('Mot de passe modifié avec succès', 'success');
        } catch (error) {
            console.error('Error changing password:', error);
            if (error.status === 400 && error.detail?.includes('actuel')) {
                SettingsUtils.showFieldError('currentPassword', 'Mot de passe actuel incorrect');
            } else {
                SettingsUtils.showToast(error.detail || 'Erreur lors du changement de mot de passe', 'error');
            }
        } finally {
            SettingsState.loading = false;
        }
    },
    
    // Profile update form submission
    async handleProfileSave(e) {
        e.preventDefault();
        
        SettingsUtils.clearFormErrors('profileForm');
        
        // Validate required fields
        if (!SettingsUtils.validateRequiredFields('profileForm')) {
            return;
        }
        
        const profileData = {
            full_name: document.getElementById('profileName').value.trim(),
            email: document.getElementById('profileEmail').value.trim()
        };
        
        // Validate email
        const emailError = SettingsUtils.validateEmail(profileData.email);
        if (emailError) {
            SettingsUtils.showFieldError('profileEmail', emailError);
            return;
        }
        
        try {
            SettingsState.loading = true;
            const updatedUser = await InnDesk.api.settings.updateMe(profileData);
            SettingsState.setCurrentUser(updatedUser);
            
            // Update avatar
            const avatarElement = document.getElementById('profileAvatar');
            if (avatarElement) {
                avatarElement.textContent = SettingsUtils.getUserInitials(updatedUser.full_name);
            }
            
            SettingsUtils.showToast('Profil mis à jour', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            if (error.status === 400 && error.detail?.includes('email')) {
                SettingsUtils.showFieldError('profileEmail', 'Cette adresse email est déjà utilisée');
            } else {
                SettingsUtils.showToast(error.detail || 'Erreur lors de la mise à jour', 'error');
            }
        } finally {
            SettingsState.loading = false;
        }
    },
    
    // Toggle user active status
    async toggleUserStatus(userId) {
        if (userId === SettingsState.currentUser?.id) {
            SettingsUtils.showToast('Impossible de désactiver votre propre compte', 'error');
            return;
        }
        
        const user = SettingsState.getUserById(userId);
        if (!user) return;
        
        const action = user.is_active ? 'désactiver' : 'activer';
        const confirmed = confirm(`Êtes-vous sûr de vouloir ${action} l'utilisateur ${user.full_name} ?`);
        if (!confirmed) return;
        
        try {
            SettingsState.loading = true;
            const updatedUser = await InnDesk.api.settings.updateUser(userId, {
                full_name: user.full_name,
                email: user.email,
                role: user.role,
                is_active: !user.is_active
            });
            
            SettingsState.updateUser(updatedUser);
            SettingsRender.renderUsersTable(SettingsState.users);
            SettingsUtils.showToast(`Utilisateur ${user.is_active ? 'désactivé' : 'activé'}`, 'success');
        } catch (error) {
            console.error('Error toggling user status:', error);
            SettingsUtils.showToast(error.detail || 'Erreur lors de la modification', 'error');
        } finally {
            SettingsState.loading = false;
        }
    },
    
    // Tab navigation
    handleTabClick(e) {
        e.preventDefault();
        const tab = e.target.closest('[data-tab]')?.dataset.tab;
        if (tab) {
            SettingsState.setActiveTab(tab);
        }
    },
    
    // Open create user modal
    openCreateUserModal() {
        if (!SettingsState.isAdmin()) {
            SettingsUtils.showToast('Droits administrateur requis', 'error');
            return;
        }
        SettingsModals.openCreateUserModal();
    },
    
    // Open edit user modal
    openEditUserModal(userId) {
        if (!SettingsState.isAdmin()) {
            SettingsUtils.showToast('Droits administrateur requis', 'error');
            return;
        }
        SettingsModals.openEditUserModal(userId);
    },
    
    // Open reset password modal
    openResetPasswordModal(userId) {
        if (!SettingsState.isAdmin()) {
            SettingsUtils.showToast('Droits administrateur requis', 'error');
            return;
        }
        SettingsModals.openResetPasswordModal(userId);
    },
    
    // Setup all event listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', this.handleTabClick);
        });
        
        // Form submissions
        document.getElementById('hotelForm')?.addEventListener('submit', this.handleHotelSave);
        document.getElementById('createUserForm')?.addEventListener('submit', this.handleUserCreate);
        document.getElementById('editUserForm')?.addEventListener('submit', this.handleUserEdit);
        document.getElementById('resetPasswordForm')?.addEventListener('submit', this.handleResetPassword);
        document.getElementById('passwordForm')?.addEventListener('submit', this.handlePasswordChange);
        document.getElementById('profileForm')?.addEventListener('submit', this.handleProfileSave);
        
        // Buttons
        document.getElementById('newUserBtn')?.addEventListener('click', this.openCreateUserModal);
        
        // Real-time preview updates for hotel settings
        const hotelFields = ['hotelName', 'hotelAddress', 'hotelCity', 'hotelZip', 'hotelCountry', 'hotelPhone', 'hotelEmail', 'hotelSiret'];
        hotelFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', () => {
                    if (SettingsState.hotelSettings) {
                        const fieldMapping = {
                            'hotelName': 'hotel_name',
                            'hotelAddress': 'hotel_address',
                            'hotelCity': 'hotel_city',
                            'hotelZip': 'hotel_zip',
                            'hotelCountry': 'hotel_country',
                            'hotelPhone': 'hotel_phone',
                            'hotelEmail': 'hotel_email',
                            'hotelSiret': 'hotel_siret'
                        };
                        
                        const settingKey = fieldMapping[fieldId];
                        if (settingKey) {
                            const updatedSettings = { ...SettingsState.hotelSettings };
                            updatedSettings[settingKey] = field.value;
                            SettingsUtils.updateHotelPreview(updatedSettings);
                        }
                    }
                });
            }
        });
    }
};