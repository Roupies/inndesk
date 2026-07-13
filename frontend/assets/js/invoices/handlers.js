// @file: assets/js/invoices/handlers.js
// @depends: state.js, utils.js, render.js, modals.js

// Search input handler with debounce
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchValue = e.target.value;
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        currentFilters.search = searchValue;
        renderInvoicesTable();
    }, 300);
});

// Status filter handler
document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentFilters.payment_status = e.target.value;
    renderInvoicesTable();
});

// Generate invoice button
document.getElementById('generateInvoiceBtn').addEventListener('click', openGenerateInvoiceModal);

// Reservation select change handler
document.getElementById('reservationSelect').addEventListener('change', handleReservationSelectChange);

// Payment status select change handler
document.getElementById('paymentStatusSelect').addEventListener('change', togglePaymentMethodField);

// Generate invoice form handler
document.getElementById('generateInvoiceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const reservationId = document.getElementById('reservationSelect').value;
    
    if (!reservationId) {
        showToast('Veuillez sélectionner une réservation', 'error');
        return;
    }
    
    try {
        await InnDesk.api.invoices.create({ reservation_id: parseInt(reservationId) });
        closeGenerateInvoiceModal();
        showToast('Facture générée avec succès', 'success');
        await loadData();
    } catch (error) {
        showToast(error.message || 'Erreur lors de la génération', 'error');
    }
});

// Send email form handler
document.getElementById('sendEmailForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedInvoiceForEmail) return;
    
    const email = document.getElementById('emailInput').value.trim();
    
    if (!email) {
        showToast('Veuillez saisir une adresse email', 'error');
        return;
    }
    
    try {
        await InnDesk.api.invoices.sendEmail(selectedInvoiceForEmail.id, email);
        closeSendEmailModal();
        showToast('Facture envoyée par email avec succès', 'success');
    } catch (error) {
        showToast(error.message || 'Erreur lors de l\'envoi', 'error');
    }
});

// Payment status form handler
document.getElementById('paymentStatusForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!selectedInvoiceForPayment) return;
    
    const status = document.getElementById('paymentStatusSelect').value;
    const method = document.getElementById('paymentMethodSelect').value;
    const notes = document.getElementById('paymentNotes').value.trim();
    
    const updateData = {
        payment_status: status,
        notes: notes || null
    };
    
    if (status === 'paid') {
        updateData.payment_method = method;
        updateData.paid_at = new Date().toISOString();
    }
    
    try {
        await InnDesk.api.invoices.update(selectedInvoiceForPayment.id, updateData);
        closePaymentStatusModal();
        showToast('Statut de paiement mis à jour', 'success');
        await loadData();
    } catch (error) {
        showToast(error.message || 'Erreur lors de la mise à jour', 'error');
    }
});

// Global functions for download and actions
window.downloadInvoicePDF = async function(invoiceId) {
    try {
        await InnDesk.api.invoices.downloadPDF(invoiceId);
    } catch (error) {
        showToast(error.message || 'Erreur lors du téléchargement', 'error');
    }
};

// Modal close handlers
document.getElementById('generateModalCloseBtn').addEventListener('click', closeGenerateInvoiceModal);
document.getElementById('detailModalCloseBtn').addEventListener('click', closeInvoiceDetailModal);
document.getElementById('emailModalCloseBtn').addEventListener('click', closeSendEmailModal);
document.getElementById('paymentModalCloseBtn').addEventListener('click', closePaymentStatusModal);
document.getElementById('pdfViewerCloseBtn').addEventListener('click', closePdfViewer);

// ESC key handler for modals
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('pdfViewerOverlay').classList.contains('show')) {
            closePdfViewer();
        } else if (document.getElementById('generateInvoiceModal').style.display === 'flex') {
            closeGenerateInvoiceModal();
        } else if (document.getElementById('invoiceDetailModal').style.display === 'flex') {
            closeInvoiceDetailModal();
        } else if (document.getElementById('sendEmailModal').style.display === 'flex') {
            closeSendEmailModal();
        } else if (document.getElementById('paymentStatusModal').style.display === 'flex') {
            closePaymentStatusModal();
        }
    }
});