// @file: assets/js/invoices/render.js
// @depends: state.js, utils.js

function renderStats() {
    const calculatedStats = calculateStats();
    
    const totalCard = document.getElementById('totalInvoicesCard');
    totalCard.innerHTML = `
        <div class="kpi-value">${calculatedStats.total_invoices}</div>
        <div class="kpi-label">Total factures</div>
    `;
    
    const paidAmountCard = document.getElementById('paidAmountCard');
    paidAmountCard.innerHTML = `
        <div class="kpi-value">${formatCurrency(calculatedStats.total_paid_amount)}</div>
        <div class="kpi-label">Montant encaissé</div>
    `;
    
    const pendingCard = document.getElementById('pendingCountCard');
    pendingCard.innerHTML = `
        <div class="kpi-value">${calculatedStats.pending_count}</div>
        <div class="kpi-label">En attente</div>
    `;
    
    const recoveryCard = document.getElementById('recoveryRateCard');
    recoveryCard.innerHTML = `
        <div class="kpi-value">${calculatedStats.recovery_rate.toFixed(1)}%</div>
        <div class="kpi-label">Taux de recouvrement</div>
    `;
}

function renderInvoicesTable() {
    const tableBody = document.querySelector('#invoicesTable tbody');
    const filteredInvoices = filterInvoices();

    if (filteredInvoices.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <i data-lucide="file-text"></i>
                        <p>Aucune facture trouvée</p>
                    </div>
                </td>
            </tr>
        `;
        // Initialize Lucide icons
        if (window.lucide && window.lucide.createIcons) {
            window.lucide.createIcons();
        }
        return;
    }

    tableBody.innerHTML = filteredInvoices.map(invoice => {
        const dateRange = `${formatDate(invoice.check_in_date)} - ${formatDate(invoice.check_out_date)}`;
        
        return `
            <tr>
                <td><strong>#${invoice.id}</strong></td>
                <td>${escapeHtml(invoice.client_name) || '-'}</td>
                <td>${escapeHtml(invoice.room_number) || '-'}</td>
                <td>${dateRange}</td>
                <td>${formatCurrency(invoice.total_amount)}</td>
                <td>${formatCurrency(invoice.tva_amount)}</td>
                <td><strong>${formatCurrency(invoice.total_ttc)}</strong></td>
                <td>${getPaymentStatusBadge(invoice.payment_status)}</td>
                <td>
                    <div class="invoice-actions">
                        <button class="btn btn-ghost btn-icon" onclick="openInvoiceDetailModal(${invoice.id})" title="Voir les détails">
                            <i data-lucide="eye" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="btn btn-ghost btn-icon" onclick="downloadInvoicePDF(${invoice.id})" title="Télécharger PDF">
                            <i data-lucide="download" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="btn btn-ghost btn-icon" onclick="openSendEmailModal(${invoice.id})" title="Envoyer par email">
                            <i data-lucide="mail" style="width: 16px; height: 16px;"></i>
                        </button>
                        <button class="btn btn-ghost btn-icon" onclick="openPaymentStatusModal(${invoice.id})" title="Modifier le statut">
                            <i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Initialize Lucide icons
    if (window.lucide && window.lucide.createIcons) {
        window.lucide.createIcons();
    }
}

function renderReservationSelect() {
    const select = document.getElementById('reservationSelect');
    
    if (availableReservations.length === 0) {
        select.innerHTML = '<option value="">Aucune réservation disponible</option>';
        return;
    }
    
    select.innerHTML = [
        '<option value="">Sélectionnez une réservation...</option>',
        ...availableReservations.map(reservation => 
            `<option value="${reservation.id}" 
                data-client="${reservation.client_name}"
                data-room="${reservation.room_number} (${reservation.room_type})"
                data-nights="${reservation.nights}"
                data-amount="${reservation.estimated_amount}">
                ${reservation.client_name} - Ch. ${reservation.room_number} - ${formatDate(reservation.check_in_date)} → ${formatDate(reservation.check_out_date)}
            </option>`
        )
    ].join('');
}

function renderInvoiceDetail(invoice) {
    const grid = document.getElementById('invoiceDetailGrid');
    
    grid.innerHTML = `
        <div class="detail-group">
            <div class="detail-label">N° Facture</div>
            <div class="detail-value"><strong>#${invoice.id}</strong></div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Client</div>
            <div class="detail-value">${escapeHtml(invoice.client_name) || '-'}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Email client</div>
            <div class="detail-value">${escapeHtml(invoice.client_email) || '-'}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Chambre</div>
            <div class="detail-value">${escapeHtml(invoice.room_number)} - ${escapeHtml(invoice.room_type_name)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Dates du séjour</div>
            <div class="detail-value">${formatDate(invoice.check_in_date)} → ${formatDate(invoice.check_out_date)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Nombre de nuits</div>
            <div class="detail-value">${invoice.nights_count}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Prix par nuit (HT)</div>
            <div class="detail-value">${formatCurrency(invoice.room_rate)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Total HT</div>
            <div class="detail-value">${formatCurrency(invoice.total_amount)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">TVA (${invoice.tva_rate}%)</div>
            <div class="detail-value">${formatCurrency(invoice.tva_amount)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Total TTC</div>
            <div class="detail-value amount-highlight">${formatCurrency(invoice.total_ttc)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Statut de paiement</div>
            <div class="detail-value">${getPaymentStatusBadge(invoice.payment_status)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Méthode de paiement</div>
            <div class="detail-value">${getPaymentMethodLabel(invoice.payment_method)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Créée le</div>
            <div class="detail-value">${formatDateTime(invoice.created_at)}</div>
        </div>
        
        ${invoice.paid_at ? `
        <div class="detail-group">
            <div class="detail-label">Payée le</div>
            <div class="detail-value">${formatDateTime(invoice.paid_at)}</div>
        </div>
        ` : ''}
        
        ${invoice.notes ? `
        <div class="detail-group" style="grid-column: 1 / -1;">
            <div class="detail-label">Notes</div>
            <div class="detail-value">${escapeHtml(invoice.notes)}</div>
        </div>
        ` : ''}
    `;
}