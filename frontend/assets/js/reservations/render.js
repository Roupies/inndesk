// @file: assets/js/reservations/render.js
// @depends: state.js, utils.js

// Update statistics
function updateStats() {
    const total = reservations.length;
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const checkedIn = reservations.filter(r => r.status === 'checked_in').length;
    const cancelled = reservations.filter(r => r.status === 'cancelled').length;

    document.getElementById('totalReservationsCard').innerHTML = `
        <div class="kpi-value">${total}</div>
        <div class="kpi-label">Total</div>
    `;
    document.getElementById('confirmedReservationsCard').innerHTML = `
        <div class="kpi-value">${confirmed}</div>
        <div class="kpi-label">Confirmées</div>
    `;
    document.getElementById('checkedInReservationsCard').innerHTML = `
        <div class="kpi-value">${checkedIn}</div>
        <div class="kpi-label">En séjour</div>
    `;
    document.getElementById('cancelledReservationsCard').innerHTML = `
        <div class="kpi-value">${cancelled}</div>
        <div class="kpi-label">Annulées</div>
    `;
}

// Render reservations table
function renderReservations() {
    const tbody = document.querySelector('#reservationsTable tbody');
    const filteredReservations = getFilteredReservations();

    if (filteredReservations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align: center; padding: var(--space-8); color: var(--text-muted); font-style: italic;">
                    Aucune réservation trouvée
                    <br>
                    <button class="btn btn-primary" style="margin-top: var(--space-3);" onclick="openCreateReservationModal()">
                        Créer la première réservation
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = '';
    filteredReservations.forEach(reservation => {
        const row = createReservationRow(reservation);
        tbody.appendChild(row);
    });
}

function getFilteredReservations() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const dateFrom = document.getElementById('dateFrom').value;
    const dateTo = document.getElementById('dateTo').value;

    return reservations.filter(reservation => {
        const clientName = `${reservation.client?.first_name || ''} ${reservation.client?.last_name || ''}`.toLowerCase();
        const roomNumber = `${reservation.room?.number || ''}`.toLowerCase();
        const searchMatch = !searchTerm || clientName.includes(searchTerm) || roomNumber.includes(searchTerm);

        const statusMatch = !statusFilter || reservation.status === statusFilter;

        const checkInDate = reservation.check_in_date;
        const dateFromMatch = !dateFrom || checkInDate >= dateFrom;
        const dateToMatch = !dateTo || checkInDate <= dateTo;

        return searchMatch && statusMatch && dateFromMatch && dateToMatch;
    });
}

function createReservationRow(reservation) {
    const row = document.createElement('tr');
    row.dataset.id = reservation.id;

    const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);
    const clientName = escapeHtml(`${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}`);
    
    // Determine room display
    let roomDisplay = '';
    if (reservation.room_id) {
        roomDisplay = reservation.room?.number || '?';
    } else {
        roomDisplay = '<span class="badge badge-warning">À assigner</span>';
    }

    row.innerHTML = `
        <td>#${reservation.id}</td>
        <td>${clientName}</td>
        <td>${reservation.room_type?.name || 'Type inconnu'}</td>
        <td>${roomDisplay}</td>
        <td>${InnDesk.utils.formatDate(reservation.check_in_date)}</td>
        <td>${InnDesk.utils.formatDate(reservation.check_out_date)}</td>
        <td>${nights}</td>
        <td></td>
        <td>${reservation.total_amount ? InnDesk.utils.formatCurrency(reservation.total_amount) : '—'}</td>
        <td></td>
    `;

    // Add status badge
    const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
    row.cells[7].appendChild(statusBadge);

    // Add actions
    const actionsCell = row.cells[9];
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'actions-cell';

    // Actions based on status and room assignment
    if (reservation.status === 'confirmed' && !reservation.room_id) {
        // Show assign room button
        const assignBtn = document.createElement('button');
        assignBtn.className = 'action-btn';
        assignBtn.innerHTML = '<i data-lucide="home" style="width: 16px; height: 16px;"></i>';
        assignBtn.title = 'Assigner chambre';
        assignBtn.onclick = () => openAssignRoomModal(reservation);
        actionsDiv.appendChild(assignBtn);
    }

    // Detail button
    const detailBtn = document.createElement('button');
    detailBtn.className = 'action-btn';
    detailBtn.innerHTML = '<i data-lucide="eye" style="width: 16px; height: 16px;"></i>';
    detailBtn.title = 'Détail';
    detailBtn.onclick = () => openReservationDrawer(reservation);
    actionsDiv.appendChild(detailBtn);

    // Status edit button
    if (['confirmed', 'checked_in'].includes(reservation.status)) {
        const statusBtn = document.createElement('button');
        statusBtn.className = 'action-btn';
        statusBtn.innerHTML = '<i data-lucide="edit-3" style="width: 16px; height: 16px;"></i>';
        statusBtn.title = 'Modifier statut';
        statusBtn.onclick = () => openStatusChangeModal(reservation);
        actionsDiv.appendChild(statusBtn);
    }

    // Delete button (only for confirmed reservations)
    if (reservation.status === 'confirmed') {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete';
        deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>';
        deleteBtn.title = 'Supprimer';
        deleteBtn.onclick = () => showDeleteConfirmation(reservation.id, row);
        actionsDiv.appendChild(deleteBtn);
    }

    actionsCell.appendChild(actionsDiv);
    return row;
}

// Populate room type select
function populateRoomTypeSelect() {
    const select = document.getElementById('roomTypeSelect');
    select.innerHTML = '<option value="">Sélectionner une catégorie...</option>';

    roomTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = `${type.name} — ${type.max_occupancy} pers. max — ${InnDesk.utils.formatCurrency(type.price_per_night)}/nuit`;
        select.appendChild(option);
    });
}