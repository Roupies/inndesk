// Settings utility functions
window.SettingsUtils = {
    // Show toast notification
    showToast(message, type = 'info') {
        // Reuse existing toast system
        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.textContent = message;
        
        const container = document.querySelector('.toast-container') || this.createToastContainer();
        container.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.remove();
        }, 3000);
    },

    // Create toast container if it doesn't exist
    createToastContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    },
    
    // Format date for display
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    },
    
    // Get role display label
    getRoleLabel(role) {
        const labels = {
            'admin': 'Administrateur',
            'receptionist': 'Réceptionniste'
        };
        return labels[role] || role;
    },
    
    // Get role badge HTML
    getRoleBadge(role) {
        const variant = role === 'admin' ? 'primary' : 'secondary';
        return `<span class="badge badge-${variant}">${this.getRoleLabel(role)}</span>`;
    },
    
    // Get status badge HTML
    getStatusBadge(isActive) {
        const variant = isActive ? 'success' : 'danger';
        const label = isActive ? 'Actif' : 'Inactif';
        return `<span class="badge badge-${variant}">${label}</span>`;
    },
    
    // Get user initials for avatar
    getUserInitials(fullName) {
        if (!fullName) return 'U';
        
        const names = fullName.trim().split(' ');
        if (names.length >= 2) {
            return (names[0][0] + names[names.length - 1][0]).toUpperCase();
        }
        return names[0][0].toUpperCase();
    },
    
    // Validate password strength
    validatePassword(password) {
        if (password.length < 8) {
            return 'Le mot de passe doit contenir au moins 8 caractères';
        }
        return null;
    },
    
    // Validate email format
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return 'Format d\'email invalide';
        }
        return null;
    },
    
    // Clear form errors
    clearFormErrors(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const errorElements = form.querySelectorAll('.form-error');
        errorElements.forEach(error => error.remove());
        
        const inputElements = form.querySelectorAll('.form-input');
        inputElements.forEach(input => input.classList.remove('error'));
    },
    
    // Show field error
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        // Remove existing error
        const existingError = field.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error class
        field.classList.add('error');
        
        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        
        // Insert after field
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    },
    
    // Validate required fields
    validateRequiredFields(formId) {
        const form = document.getElementById(formId);
        if (!form) return false;
        
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                this.showFieldError(field.id, 'Ce champ est obligatoire');
                isValid = false;
            }
        });
        
        return isValid;
    },
    
    // Update hotel preview
    updateHotelPreview(settings) {
        const nameElement = document.getElementById('previewHotelName');
        const addressElement = document.getElementById('previewHotelAddress');
        
        if (nameElement) {
            nameElement.textContent = settings.hotel_name || 'Nom de l\'hôtel';
        }
        
        if (addressElement) {
            const addressParts = [];
            if (settings.hotel_address) addressParts.push(settings.hotel_address);
            
            const cityLine = [];
            if (settings.hotel_zip) cityLine.push(settings.hotel_zip);
            if (settings.hotel_city) cityLine.push(settings.hotel_city);
            if (settings.hotel_country && settings.hotel_country !== 'France') {
                cityLine.push(settings.hotel_country);
            } else if (!settings.hotel_country) {
                cityLine.push('France');
            }
            if (cityLine.length > 0) addressParts.push(cityLine.join(' '));
            
            if (settings.hotel_phone) addressParts.push(`Tél: ${settings.hotel_phone}`);
            if (settings.hotel_email) addressParts.push(`Email: ${settings.hotel_email}`);
            if (settings.hotel_siret) addressParts.push(`SIRET: ${settings.hotel_siret}`);
            
            addressElement.innerHTML = addressParts.join('<br>');
        }
    }
};