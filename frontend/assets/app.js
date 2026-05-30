// InnDesk Shared Utilities

// API Configuration
const API_BASE = "/api/v1";
const TOKEN_KEY = "inndesk_token";
const USER_KEY = "inndesk_user";

// API Fetch Utility
async function apiFetch(path, options = {}) {
    const token = getToken();
    
    const config = {
        redirect: 'follow',
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...options
    };

    try {
        const response = await fetch(`${API_BASE}${path}`, config);
        
        // Handle authentication errors
        if (response.status === 401) {
            clearToken();
            window.location.href = '/app/index.html';
            return;
        }

        // Handle other errors
        if (!response.ok) {
            const error = await response.json().catch(() => ({
                detail: 'Une erreur réseau est survenue'
            }));
            throw new Error(error.detail || 'Erreur de communication avec le serveur');
        }

        // Handle empty responses
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        throw error;
    }
}

// Token Management
function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
}

// User Management
function getCurrentUser() {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
}

async function ensureCurrentUser() {
    let user = getCurrentUser();
    if (!user && getToken()) {
        try {
            user = await apiFetch('/users/me');
            setCurrentUser(user);
        } catch (error) {
        }
    }
    return user;
}

function setCurrentUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Authentication Helpers
function redirectIfNotAuth() {
    if (!getToken()) {
        window.location.href = '/app/index.html';
    }
}

function redirectIfAuth() {
    if (getToken()) {
        window.location.href = '/app/dashboard.html';
    }
}

// Date Formatting
function formatDate(isoString) {
    if (!isoString) return '-';
    
    const date = new Date(isoString);
    const options = { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric',
        timeZone: 'Europe/Paris'
    };
    
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

function formatShortDate(isoString) {
    if (!isoString) return '-';
    
    const date = new Date(isoString);
    const options = { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        timeZone: 'Europe/Paris'
    };
    
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    
    const date = new Date(isoString);
    const options = { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Paris'
    };
    
    return new Intl.DateTimeFormat('fr-FR', options).format(date);
}

function isToday(dateString) {
    if (!dateString) return false;
    const today = new Date();
    const checkDate = new Date(dateString);
    
    return today.getFullYear() === checkDate.getFullYear() &&
           today.getMonth() === checkDate.getMonth() &&
           today.getDate() === checkDate.getDate();
}

// Currency Formatting
function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(amount);
}

// Status Label Mapping
function statusLabel(status) {
    const statusMap = {
        // Room statuses
        'available': 'Disponible',
        'occupied': 'Occupée', 
        'dirty': 'À nettoyer',
        'cleaning': 'En cours',
        'maintenance': 'Maintenance',
        
        // Reservation statuses
        'confirmed': 'Confirmée',
        'checked_in': 'Arrivée',
        'checked_out': 'Départ',
        'cancelled': 'Annulée',
        'no_show': 'No-show',
        
        // Payment statuses
        'pending': 'En attente',
        'paid': 'Payée'
    };
    
    return statusMap[status] || status;
}

// Status Badge Generation
function createStatusBadge(status) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = statusLabel(status);
    
    // Add appropriate color class
    switch (status) {
        case 'available':
        case 'checked_in':
        case 'paid':
            badge.classList.add('badge-green');
            break;
        case 'occupied':
        case 'dirty':
        case 'pending':
        case 'confirmed':
            badge.classList.add('badge-amber');
            break;
        case 'maintenance':
        case 'cancelled':
        case 'no_show':
            badge.classList.add('badge-red');
            break;
        case 'cleaning':
            badge.classList.add('badge-blue');
            break;
        case 'checked_out':
        default:
            badge.classList.add('badge-gray');
            break;
    }
    
    return badge;
}

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('inndesk_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    return savedTheme;
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('inndesk_theme', newTheme);
    
    return newTheme;
}

// Loading State Management
function showSkeleton(container, type = 'text', count = 1) {
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton skeleton-${type}`;
        container.appendChild(skeleton);
        
        if (i < count - 1) {
            const spacer = document.createElement('div');
            spacer.style.height = '8px';
            container.appendChild(spacer);
        }
    }
}

function showError(container, message = 'Données indisponibles') {
    container.innerHTML = `<div class="error-message">${message}</div>`;
}

// DOM Utilities
function createElement(tag, className = '', textContent = '') {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (textContent) element.textContent = textContent;
    return element;
}

function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// Form Utilities
function getFormData(form) {
    const formData = new FormData(form);
    const data = {};
    
    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }
    
    return data;
}

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    if (!field) return;
    
    // Remove existing error
    const existingError = field.parentNode.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }
    
    // Add new error
    const errorDiv = createElement('div', 'form-error', message);
    field.parentNode.appendChild(errorDiv);
    
    // Add error styling to field
    field.style.borderColor = 'var(--color-red)';
}

function clearFieldErrors(container) {
    const errors = container.querySelectorAll('.form-error');
    errors.forEach(error => error.remove());
    
    const fields = container.querySelectorAll('.form-input');
    fields.forEach(field => {
        field.style.borderColor = '';
    });
}

// Validation Utilities
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function validateRequired(value) {
    return value && value.trim().length > 0;
}


// Mobile Navigation
function initMobileNav() {
    const hamburger = document.querySelector('.mobile-menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.mobile-overlay');
    
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            document.body.classList.toggle('mobile-menu-open');
        });
    }
    
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            document.body.classList.remove('mobile-menu-open');
        });
    }
}

// Initialize app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileNav();
    
    // Initialize Lucide icons if available
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
});

