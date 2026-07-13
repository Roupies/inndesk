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
        tbody.replaceChildren();

        if (!users || users.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 6;
            cell.className = 'empty-state';
            const content = document.createElement('div');
            content.style.cssText = 'text-align: center; padding: var(--space-8); color: var(--text-muted);';
            const icon = document.createElement('i');
            icon.setAttribute('data-lucide', 'users');
            icon.style.cssText = 'width: 48px; height: 48px; margin-bottom: var(--space-4);';
            content.append(icon, InnDesk.utils.createElement('p', { text: 'Aucun utilisateur trouvé' }));
            cell.appendChild(content);
            row.appendChild(cell);
            tbody.appendChild(row);
            if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.dataset.id = String(user.id);

            const nameCell = document.createElement('td');
            const name = InnDesk.utils.createElement('div', { text: user.full_name || '' });
            name.style.fontWeight = '500';
            nameCell.appendChild(name);

            const emailCell = document.createElement('td');
            const email = InnDesk.utils.createElement('div', { text: user.email || '' });
            email.style.color = 'var(--text-muted)';
            emailCell.appendChild(email);

            const roleCell = document.createElement('td');
            roleCell.appendChild(SettingsUtils.getRoleBadge(user.role));
            const statusCell = document.createElement('td');
            statusCell.appendChild(SettingsUtils.getStatusBadge(user.is_active));

            const dateCell = document.createElement('td');
            const date = InnDesk.utils.createElement('div', { text: SettingsUtils.formatDate(user.created_at) });
            date.style.cssText = 'color: var(--text-muted); font-size: var(--text-sm);';
            dateCell.appendChild(date);

            const actionsCell = document.createElement('td');
            const actions = document.createElement('div');
            actions.style.cssText = 'display: flex; gap: var(--space-2);';
            actions.append(
                createSettingsAction('edit', 'Modifier', () => SettingsHandlers.openEditUserModal(user.id)),
                createSettingsAction('key', 'Réinitialiser mot de passe', () => SettingsHandlers.openResetPasswordModal(user.id)),
                createSettingsAction(
                    user.is_active ? 'user-x' : 'user-check',
                    user.is_active ? 'Désactiver' : 'Activer',
                    () => SettingsHandlers.toggleUserStatus(user.id),
                    true,
                    user.id === SettingsState.currentUser?.id
                )
            );
            actionsCell.appendChild(actions);
            row.append(nameCell, emailCell, roleCell, statusCell, dateCell, actionsCell);
            tbody.appendChild(row);
        });
        
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

function createSettingsAction(iconName, label, handler, isDanger = false, disabled = false) {
    const button = InnDesk.utils.createElement('button', {
        className: `btn btn-sm btn-ghost${isDanger ? ' text-red' : ''}`,
        attributes: { type: 'button', title: label, 'aria-label': label }
    });
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', iconName);
    icon.style.cssText = 'width: 14px; height: 14px;';
    button.appendChild(icon);
    button.disabled = disabled;
    button.addEventListener('click', handler);
    return button;
}
