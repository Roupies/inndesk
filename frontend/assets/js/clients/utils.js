// @file: assets/js/clients/utils.js
// @depends: state.js

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR') + ' ' + 
           new Date(dateString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function getFullName(client) {
    return `${client.first_name} ${client.last_name}`;
}

function filterClients() {
    const searchTerm = currentFilters.search.toLowerCase();
    const nationalityFilter = currentFilters.nationality;

    return clients.filter(client => {
        const matchesSearch = !searchTerm || 
            client.first_name.toLowerCase().includes(searchTerm) ||
            client.last_name.toLowerCase().includes(searchTerm) ||
            (client.email && client.email.toLowerCase().includes(searchTerm)) ||
            (client.phone && client.phone.includes(searchTerm));
        
        const matchesNationality = !nationalityFilter || 
            (client.nationality && client.nationality.toLowerCase().includes(nationalityFilter.toLowerCase()));

        return matchesSearch && matchesNationality;
    });
}

function getUniqueNationalities() {
    const nationalities = clients
        .map(client => client.nationality)
        .filter(nationality => nationality && nationality.trim())
        .map(nationality => nationality.trim());
    
    return [...new Set(nationalities)].sort();
}

function showToast(message, type = 'info') {
    // Reuse existing toast system
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    
    const container = document.querySelector('.toast-container') || createToastContainer();
    container.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}