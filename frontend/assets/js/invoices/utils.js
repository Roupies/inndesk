// @file: assets/js/invoices/utils.js
// @depends: state.js

function formatCurrency(amount) {
    if (amount === null || amount === undefined) return '-';
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2
    }).format(amount);
}

function formatDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).format(date);
}

function formatDateTime(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function getPaymentStatusBadge(status) {
    const statusMap = {
        'pending': { text: 'En attente', class: 'badge-amber' },
        'paid': { text: 'Payée', class: 'badge-green' }
    };
    
    const config = statusMap[status] || { text: status, class: 'badge-gray' };
    return `<span class="badge ${config.class}">${config.text}</span>`;
}

function getPaymentMethodLabel(method) {
    const methodMap = {
        'cash': 'Espèces',
        'card': 'Carte bancaire',
        'virement': 'Virement bancaire',
        'TPE': 'TPE'
    };
    return methodMap[method] || method || '-';
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span>${message}</span>
            <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i data-lucide="x" style="width: 14px; height: 14px;"></i>
            </button>
        </div>
    `;
    
    // Add to page
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    toastContainer.appendChild(toast);
    
    // Initialize Lucide icons in toast
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (toast.parentElement) {
            toast.remove();
        }
    }, 5000);
}

function calculateStats() {
    return {
        total_invoices: stats.total_invoices || 0,
        total_paid_amount: stats.total_paid_amount || 0,
        pending_count: stats.pending_count || 0,
        recovery_rate: stats.recovery_rate || 0
    };
}

function filterInvoices() {
    return invoices.filter(invoice => {
        // Search filter
        if (currentFilters.search) {
            const searchLower = currentFilters.search.toLowerCase();
            const clientName = invoice.client_name?.toLowerCase() || '';
            const invoiceId = invoice.id?.toString() || '';
            
            if (!clientName.includes(searchLower) && !invoiceId.includes(searchLower)) {
                return false;
            }
        }
        
        // Status filter
        if (currentFilters.payment_status && invoice.payment_status !== currentFilters.payment_status) {
            return false;
        }
        
        return true;
    });
}