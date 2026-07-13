// @file: assets/js/clients/render.js
// @depends: state.js, utils.js

function renderStats() {
    const totalCard = document.getElementById('totalClientsCard');
    const emailCard = document.getElementById('clientsWithEmailCard');
    const phoneCard = document.getElementById('clientsWithPhoneCard');
    const monthCard = document.getElementById('clientsThisMonthCard');

    totalCard.innerHTML = `
        <div class="kpi-value">${stats.total_clients || 0}</div>
        <div class="kpi-label">Total clients</div>
    `;

    emailCard.innerHTML = `
        <div class="kpi-value">${stats.clients_with_email || 0}</div>
        <div class="kpi-label">Avec email</div>
    `;

    phoneCard.innerHTML = `
        <div class="kpi-value">${stats.clients_with_phone || 0}</div>
        <div class="kpi-label">Avec téléphone</div>
    `;

    monthCard.innerHTML = `
        <div class="kpi-value">${stats.clients_this_month || 0}</div>
        <div class="kpi-label">Ce mois-ci</div>
    `;
}

function renderClientsTable() {
    const tableBody = document.querySelector('#clientsTable tbody');
    const filteredClients = filterClients();

    if (filteredClients.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <i data-lucide="users"></i>
                        <h3>Aucun client trouvé</h3>
                        <p>Créez votre premier client ou modifiez vos filtres de recherche.</p>
                        <button class="btn btn-primary" onclick="openCreateClientModal()">
                            <i data-lucide="plus" style="width: 16px; height: 16px; margin-right: 6px;"></i>
                            Créer le premier client
                        </button>
                    </div>
                </td>
            </tr>
        `;
        lucide.createIcons();
        return;
    }

    tableBody.innerHTML = filteredClients.map((client, index) => `
        <tr>
            <td>${client.id}</td>
            <td>
                <div style="font-weight: 500;">${getFullName(client)}</div>
            </td>
            <td>${client.email || '-'}</td>
            <td>${client.phone || '-'}</td>
            <td>${client.nationality || '-'}</td>
            <td>-</td> <!-- Last stay - we'll populate this later -->
            <td>0</td> <!-- Reservation count - we'll populate this later -->
            <td>${formatDate(client.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-ghost btn-sm" onclick="openDetailModal(${client.id})" title="Voir les détails">
                        <i data-lucide="eye" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm" onclick="openEditModal(${client.id})" title="Modifier">
                        <i data-lucide="edit" style="width: 14px; height: 14px;"></i>
                    </button>
                    <button class="btn btn-ghost btn-sm text-danger" onclick="openDeleteModal(${client.id})" title="Supprimer">
                        <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    lucide.createIcons();
}

function renderNationalityFilter() {
    const select = document.getElementById('nationalityFilter');
    const nationalities = getUniqueNationalities();

    const currentValue = select.value;
    select.innerHTML = '<option value="">Toutes</option>';

    nationalities.forEach(nationality => {
        const option = document.createElement('option');
        option.value = nationality;
        option.textContent = nationality;
        select.appendChild(option);
    });

    select.value = currentValue;
}

function renderClientDetail(client, reservations) {
    const grid = document.getElementById('detailGrid');
    
    grid.innerHTML = `
        <div class="detail-group">
            <div class="detail-label">Identité</div>
            <div class="detail-value">${getFullName(client)}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Email</div>
            <div class="detail-value">${client.email || 'Non renseigné'}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Téléphone</div>
            <div class="detail-value">${client.phone || 'Non renseigné'}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Nationalité</div>
            <div class="detail-value">${client.nationality || 'Non renseignée'}</div>
        </div>
        
        <div class="detail-group">
            <div class="detail-label">Créé le</div>
            <div class="detail-value">${formatDateTime(client.created_at)}</div>
        </div>
        

        <div class="reservations-section">
            <div class="detail-label" style="margin-bottom: var(--space-3);">
                Historique des réservations (${reservations.length})
            </div>
            ${renderReservationsHistory(reservations)}
        </div>
    `;
}

function renderReservationsHistory(reservations) {
    if (!reservations || reservations.length === 0) {
        return `
            <div class="empty-state" style="padding: var(--space-4);">
                <i data-lucide="calendar-x"></i>
                <p>Aucune réservation pour ce client</p>
            </div>
        `;
    }

    return `
        <div class="reservations-list">
            ${reservations.map(reservation => `
                <div class="reservation-item">
                    <div class="reservation-info">
                        <div>
                            <strong>Réservation #${reservation.id}</strong>
                            ${getStatusBadge(reservation.status)}
                        </div>
                        <div class="reservation-dates">
                            ${formatDate(reservation.check_in_date)} - ${formatDate(reservation.check_out_date)}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: 500;">${reservation.total_amount ? `${reservation.total_amount}€` : '-'}</div>
                        <div style="font-size: var(--text-sm); color: var(--text-muted);">
                            Chambre ${reservation.room?.number || 'N/A'}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function getStatusBadge(status) {
    const badges = {
        'confirmed': 'badge-blue',
        'checked_in': 'badge-green', 
        'checked_out': 'badge-gray',
        'cancelled': 'badge-red',
        'no_show': 'badge-orange'
    };

    const labels = {
        'confirmed': 'Confirmée',
        'checked_in': 'En séjour',
        'checked_out': 'Terminée',
        'cancelled': 'Annulée',
        'no_show': 'No show'
    };

    const badgeClass = badges[status] || 'badge-gray';
    const label = labels[status] || status;

    return `<span class="badge ${badgeClass}" style="margin-left: var(--space-2);">${label}</span>`;
}