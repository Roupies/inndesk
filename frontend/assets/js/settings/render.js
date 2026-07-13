// Settings rendering functions
window.SettingsRender = {
    // Render hotel settings form
    renderHotelSettings(settings) {
        if (!settings) return;
        
        // Fill form fields
        const fields = [
            'hotel_name', 'hotel_address', 'hotel_city', 'hotel_zip', 
            'hotel_country', 'hotel_phone', 'hotel_email', 'hotel_siret',
            'check_in_time', 'check_out_time', 'tva_rate', 'currency'
        ];
        
        fields.forEach(field => {
            const element = document.getElementById(field.replace('hotel_', 'hotel').replace('_', ''));
            if (element && settings[field] !== undefined) {
                element.value = settings[field];
            }
        });
        
        // Map field names to element IDs
        const fieldMapping = {
            'hotel_name': 'hotelName',
            'hotel_address': 'hotelAddress',
            'hotel_city': 'hotelCity',
            'hotel_zip': 'hotelZip',
            'hotel_country': 'hotelCountry',
            'hotel_phone': 'hotelPhone',
            'hotel_email': 'hotelEmail',
            'hotel_siret': 'hotelSiret',
            'check_in_time': 'checkInTime',
            'check_out_time': 'checkOutTime',
            'tva_rate': 'tvaRate',
            'currency': 'currency'
        };
        
        Object.entries(fieldMapping).forEach(([settingKey, elementId]) => {
            const element = document.getElementById(elementId);
            if (element && settings[settingKey] !== undefined) {
                element.value = settings[settingKey];
            }
        });
        
        // Update preview
        SettingsUtils.updateHotelPreview(settings);
    },
    
    // Render users table
    renderUsersTable(users) {
        const tbody = document.querySelector('#usersTable tbody');
        if (!tbody) return;
        
        if (!users || users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <div style="text-align: center; padding: var(--space-8); color: var(--text-muted);">
                            <i data-lucide="users" style="width: 48px; height: 48px; margin-bottom: var(--space-4);"></i>
                            <p>Aucun utilisateur trouvé</p>
                        </div>
                    </td>
                </tr>
            `;
            lucide.createIcons();
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>
                    <div style="font-weight: 500;">${user.full_name}</div>
                </td>
                <td>
                    <div style="color: var(--text-muted);">${user.email}</div>
                </td>
                <td>${SettingsUtils.getRoleBadge(user.role)}</td>
                <td>${SettingsUtils.getStatusBadge(user.is_active)}</td>
                <td>
                    <div style="color: var(--text-muted); font-size: var(--text-sm);">
                        ${SettingsUtils.formatDate(user.created_at)}
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: var(--space-2);">
                        <button class="btn btn-sm btn-ghost" onclick="SettingsHandlers.openEditUserModal(${user.id})" title="Modifier">
                            <i data-lucide="edit" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost" onclick="SettingsHandlers.openResetPasswordModal(${user.id})" title="Réinitialiser mot de passe">
                            <i data-lucide="key" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="btn btn-sm btn-ghost text-red" onclick="SettingsHandlers.toggleUserStatus(${user.id})" title="${user.is_active ? 'Désactiver' : 'Activer'}" ${user.id === SettingsState.currentUser?.id ? 'disabled' : ''}>
                            <i data-lucide="${user.is_active ? 'user-x' : 'user-check'}" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Re-initialize Lucide icons
        lucide.createIcons();
    },
    
    // Render current user profile
    renderProfile(user) {
        if (!user) return;
        
        // Fill profile form
        const nameElement = document.getElementById('profileName');
        const emailElement = document.getElementById('profileEmail');
        const roleElement = document.getElementById('profileRole');
        const avatarElement = document.getElementById('profileAvatar');
        
        if (nameElement) nameElement.value = user.full_name || '';
        if (emailElement) emailElement.value = user.email || '';
        if (roleElement) roleElement.value = SettingsUtils.getRoleLabel(user.role);
        
        if (avatarElement) {
            avatarElement.textContent = SettingsUtils.getUserInitials(user.full_name);
        }
    },
    
    // Show admin-only elements
    showAdminElements() {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            if (element.classList.contains('admin-only')) {
                element.classList.add('visible');
                // For flex elements
                if (element.style.display === 'flex' || element.classList.contains('visible-flex')) {
                    element.classList.add('visible-flex');
                }
            }
        });
    },
    
    // Hide admin-only elements
    hideAdminElements() {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.classList.remove('visible', 'visible-flex');
        });
    },
    
    // Update UI based on user role
    updateRoleBasedUI() {
        if (SettingsState.isAdmin()) {
            this.showAdminElements();
        } else {
            this.hideAdminElements();
            // Switch to security tab if on admin-only tab
            if (SettingsState.currentTab === 'hotel' || SettingsState.currentTab === 'users') {
                SettingsState.setActiveTab('security');
            }
        }
    }
};