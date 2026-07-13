// @file: assets/js/invoices/modals.js
// @depends: state.js, utils.js, render.js

function openGenerateInvoiceModal() {
    document.getElementById('generateInvoiceModal').style.display = 'flex';
    document.getElementById('reservationSelect').value = '';
    document.getElementById('reservationPreview').style.display = 'none';
    renderReservationSelect();
}

function closeGenerateInvoiceModal() {
    document.getElementById('generateInvoiceModal').style.display = 'none';
}

function openInvoiceDetailModal(invoiceId) {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    selectedInvoiceForDetail = invoice;
    document.getElementById('detailModalTitle').textContent = `Facture #${invoice.id}`;
    renderInvoiceDetail(invoice);
    
    const downloadBtn = document.getElementById('downloadPdfBtn');
    downloadBtn.onclick = () => downloadInvoicePDF(invoiceId);

    const previewBtn = document.getElementById('previewPdfBtn');
    previewBtn.onclick = () => openPdfViewer(invoiceId);
    
    document.getElementById('invoiceDetailModal').style.display = 'flex';
}

function closeInvoiceDetailModal() {
    document.getElementById('invoiceDetailModal').style.display = 'none';
    selectedInvoiceForDetail = null;
}

async function openPdfViewer(invoiceId) {
    const overlay = document.getElementById('pdfViewerOverlay');
    const frame = document.getElementById('pdfViewerFrame');

    frame.src = '';
    overlay.classList.add('show');

    try {
        const objectUrl = await InnDesk.api.invoices.previewPDF(invoiceId);
        frame.src = objectUrl;
        frame._objectUrl = objectUrl;
    } catch (error) {
        overlay.classList.remove('show');
        showToast(error.detail || 'Erreur lors du chargement du PDF', 'error');
    }
}

function closePdfViewer() {
    const overlay = document.getElementById('pdfViewerOverlay');
    const frame = document.getElementById('pdfViewerFrame');
    overlay.classList.remove('show');
    if (frame._objectUrl) {
        window.URL.revokeObjectURL(frame._objectUrl);
        frame._objectUrl = null;
    }
    frame.src = '';
}

function openSendEmailModal(invoiceId) {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    selectedInvoiceForEmail = invoice;
    
    // Pre-fill email field with client email
    const emailInput = document.getElementById('emailInput');
    emailInput.value = invoice.client_email || '';
    
    // Show Resend warning banner
    const warningBanner = document.getElementById('resendWarning');
    warningBanner.style.display = 'block';
    
    document.getElementById('sendEmailModal').style.display = 'flex';
    emailInput.focus();
}

function closeSendEmailModal() {
    document.getElementById('sendEmailModal').style.display = 'none';
    selectedInvoiceForEmail = null;
    document.getElementById('sendEmailForm').reset();
}

function openPaymentStatusModal(invoiceId) {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    selectedInvoiceForPayment = invoice;
    
    // Pre-fill form with current values
    document.getElementById('paymentStatusSelect').value = invoice.payment_status;
    document.getElementById('paymentMethodSelect').value = invoice.payment_method || 'espèces';
    document.getElementById('paymentNotes').value = invoice.notes || '';
    
    // Show/hide payment method based on status
    togglePaymentMethodField();
    
    document.getElementById('paymentStatusModal').style.display = 'flex';
}

function closePaymentStatusModal() {
    document.getElementById('paymentStatusModal').style.display = 'none';
    selectedInvoiceForPayment = null;
    document.getElementById('paymentStatusForm').reset();
}

function togglePaymentMethodField() {
    const statusSelect = document.getElementById('paymentStatusSelect');
    const methodGroup = document.getElementById('paymentMethodGroup');
    
    if (statusSelect.value === 'paid') {
        methodGroup.style.display = 'block';
    } else {
        methodGroup.style.display = 'none';
    }
}

// Preview reservation details when selected
function handleReservationSelectChange() {
    const select = document.getElementById('reservationSelect');
    const preview = document.getElementById('reservationPreview');
    
    if (!select.value) {
        preview.style.display = 'none';
        return;
    }
    
    const option = select.selectedOptions[0];
    const client = option.dataset.client;
    const room = option.dataset.room;
    const nights = option.dataset.nights;
    const amount = parseFloat(option.dataset.amount);
    
    document.getElementById('previewClient').textContent = client;
    document.getElementById('previewRoom').textContent = room;
    document.getElementById('previewNights').textContent = nights;
    document.getElementById('previewAmount').textContent = formatCurrency(amount);
    
    preview.style.display = 'block';
}

// Global functions for HTML onclick handlers
window.openGenerateInvoiceModal = openGenerateInvoiceModal;
window.closeGenerateInvoiceModal = closeGenerateInvoiceModal;
window.openInvoiceDetailModal = openInvoiceDetailModal;
window.closeInvoiceDetailModal = closeInvoiceDetailModal;
window.openSendEmailModal = openSendEmailModal;
window.closeSendEmailModal = closeSendEmailModal;
window.openPaymentStatusModal = openPaymentStatusModal;
window.closePaymentStatusModal = closePaymentStatusModal;
window.closePdfViewer = closePdfViewer;