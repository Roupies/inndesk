// @file: assets/js/invoices/render.js
// @depends: state.js, utils.js

function renderStats() {
    const calculatedStats = calculateStats();
    setInvoiceKpi('totalInvoicesCard', calculatedStats.total_invoices, 'Total factures');
    setInvoiceKpi('paidAmountCard', formatCurrency(calculatedStats.total_paid_amount), 'Montant encaissé');
    setInvoiceKpi('pendingCountCard', calculatedStats.pending_count, 'En attente');
    setInvoiceKpi('recoveryRateCard', `${calculatedStats.recovery_rate.toFixed(1)}%`, 'Taux de recouvrement');
}

function setInvoiceKpi(id, value, label) {
    const card = document.getElementById(id);
    if (!card) return;
    card.replaceChildren(
        InnDesk.utils.createElement('div', { className: 'kpi-value', text: value }),
        InnDesk.utils.createElement('div', { className: 'kpi-label', text: label })
    );
}

function createInvoiceIcon(name) {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', name);
    icon.style.cssText = 'width: 16px; height: 16px;';
    return icon;
}

function createInvoiceAction(iconName, label, handler) {
    const button = InnDesk.utils.createElement('button', {
        className: 'btn btn-ghost btn-icon',
        attributes: { type: 'button', title: label, 'aria-label': label }
    });
    button.appendChild(createInvoiceIcon(iconName));
    button.addEventListener('click', handler);
    return button;
}

function appendInvoiceDetail(grid, label, value, options = {}) {
    const group = InnDesk.utils.createElement('div', { className: 'detail-group' });
    if (options.fullWidth) group.style.gridColumn = '1 / -1';
    group.appendChild(InnDesk.utils.createElement('div', { className: 'detail-label', text: label }));
    const valueElement = InnDesk.utils.createElement('div', {
        className: `detail-value${options.highlight ? ' amount-highlight' : ''}`
    });
    if (value instanceof Node) valueElement.appendChild(value);
    else valueElement.textContent = String(value ?? '');
    if (options.strong) {
        const strong = InnDesk.utils.createElement('strong', { text: valueElement.textContent });
        valueElement.replaceChildren(strong);
    }
    group.appendChild(valueElement);
    grid.appendChild(group);
}

function renderInvoicesTable() {
    const tableBody = document.querySelector('#invoicesTable tbody');
    const filteredInvoices = filterInvoices();

    tableBody.replaceChildren();
    if (filteredInvoices.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 9;
        const empty = InnDesk.utils.createElement('div', { className: 'empty-state' });
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'file-text');
        empty.append(icon, InnDesk.utils.createElement('p', { text: 'Aucune facture trouvée' }));
        cell.appendChild(empty);
        row.appendChild(cell);
        tableBody.appendChild(row);
        // Initialize Lucide icons
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }
        return;
    }

    filteredInvoices.forEach(invoice => {
        const dateRange = `${formatDate(invoice.check_in_date)} - ${formatDate(invoice.check_out_date)}`;
        const row = document.createElement('tr');
        row.dataset.id = String(invoice.id);
        const idCell = document.createElement('td');
        idCell.appendChild(InnDesk.utils.createElement('strong', { text: `#${invoice.id}` }));
        row.appendChild(idCell);
        [
            invoice.client_name || '-',
            invoice.room_number || '-',
            dateRange,
            formatCurrency(invoice.total_amount),
            formatCurrency(invoice.tva_amount)
        ].forEach(value => row.appendChild(InnDesk.utils.createElement('td', { text: value })));
        const totalCell = document.createElement('td');
        totalCell.appendChild(InnDesk.utils.createElement('strong', { text: formatCurrency(invoice.total_ttc) }));
        row.appendChild(totalCell);
        const statusCell = document.createElement('td');
        statusCell.appendChild(getPaymentStatusBadge(invoice.payment_status));
        row.appendChild(statusCell);
        const actionsCell = document.createElement('td');
        const actions = InnDesk.utils.createElement('div', { className: 'invoice-actions' });
        actions.append(
            createInvoiceAction('eye', 'Voir les détails', () => openInvoiceDetailModal(invoice.id)),
            createInvoiceAction('download', 'Télécharger PDF', () => downloadInvoicePDF(invoice.id)),
            createInvoiceAction('mail', 'Envoyer par email', () => openSendEmailModal(invoice.id)),
            createInvoiceAction('edit-3', 'Modifier le statut', () => openPaymentStatusModal(invoice.id))
        );
        actionsCell.appendChild(actions);
        row.appendChild(actionsCell);
        tableBody.appendChild(row);
    });
    
    // Initialize Lucide icons
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
}

function renderReservationSelect() {
    const select = document.getElementById('reservationSelect');
    select.replaceChildren();

    if (availableReservations.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Aucune réservation disponible';
        select.appendChild(option);
        return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Sélectionnez une réservation...';
    select.appendChild(placeholder);
    availableReservations.forEach(reservation => {
        const option = document.createElement('option');
        option.value = String(reservation.id);
        option.dataset.client = reservation.client_name || '';
        option.dataset.room = `${reservation.room_number || ''} (${reservation.room_type || ''})`;
        option.dataset.nights = String(reservation.nights ?? '');
        option.dataset.amount = String(reservation.estimated_amount ?? '');
        option.textContent = `${reservation.client_name || '-'} - Ch. ${reservation.room_number || '-'} - ${formatDate(reservation.check_in_date)} → ${formatDate(reservation.check_out_date)}`;
        select.appendChild(option);
    });
}

function renderInvoiceDetail(invoice) {
    const grid = document.getElementById('invoiceDetailGrid');
    
    grid.replaceChildren();
    appendInvoiceDetail(grid, 'N° Facture', `#${invoice.id}`, { strong: true });
    appendInvoiceDetail(grid, 'Client', invoice.client_name || '-');
    appendInvoiceDetail(grid, 'Email client', invoice.client_email || '-');
    appendInvoiceDetail(grid, 'Chambre', `${invoice.room_number || '-'} - ${invoice.room_type_name || '-'}`);
    appendInvoiceDetail(grid, 'Dates du séjour', `${formatDate(invoice.check_in_date)} → ${formatDate(invoice.check_out_date)}`);
    appendInvoiceDetail(grid, 'Nombre de nuits', invoice.nights_count ?? '-');
    appendInvoiceDetail(grid, 'Prix par nuit (HT)', formatCurrency(invoice.room_rate));
    appendInvoiceDetail(grid, 'Total HT', formatCurrency(invoice.total_amount));
    appendInvoiceDetail(grid, `TVA (${invoice.tva_rate ?? '-'}%)`, formatCurrency(invoice.tva_amount));
    appendInvoiceDetail(grid, 'Total TTC', formatCurrency(invoice.total_ttc), { highlight: true });
    appendInvoiceDetail(grid, 'Statut de paiement', getPaymentStatusBadge(invoice.payment_status));
    appendInvoiceDetail(grid, 'Méthode de paiement', getPaymentMethodLabel(invoice.payment_method));
    appendInvoiceDetail(grid, 'Créée le', formatDateTime(invoice.created_at));
    if (invoice.paid_at) appendInvoiceDetail(grid, 'Payée le', formatDateTime(invoice.paid_at));
    if (invoice.notes) appendInvoiceDetail(grid, 'Notes', invoice.notes, { fullWidth: true });
}
