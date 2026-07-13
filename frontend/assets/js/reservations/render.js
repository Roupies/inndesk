// @file: assets/js/reservations/render.js
// @depends: state.js, utils.js

// Update statistics
function updateStats() {
    const total = reservations.length;
    const confirmed = reservations.filter(r => r.status === 'confirmed').length;
    const checkedIn = reservations.filter(r => r.status === 'checked_in').length;
    const cancelled = reservations.filter(r => r.status === 'cancelled').length;

    setReservationKpi('totalReservationsCard', total, 'Total');
    setReservationKpi('confirmedReservationsCard', confirmed, 'Confirmées');
    setReservationKpi('checkedInReservationsCard', checkedIn, 'En séjour');
    setReservationKpi('cancelledReservationsCard', cancelled, 'Annulées');
}

function setReservationKpi(id, value, label) {
    const card = document.getElementById(id);
    if (!card) return;
    card.replaceChildren(
        InnDesk.utils.createElement('div', { className: 'kpi-value', text: value }),
        InnDesk.utils.createElement('div', { className: 'kpi-label', text: label })
    );
}

// Render reservations table
function renderReservations() {
    const tbody = document.querySelector('#reservationsTable tbody');
    const filteredReservations = getFilteredReservations();

    tbody.replaceChildren();
    if (filteredReservations.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 10;
        cell.style.cssText = 'text-align: center; padding: var(--space-8); color: var(--text-muted); font-style: italic;';
        const message = document.createTextNode('Aucune réservation trouvée');
        const lineBreak = document.createElement('br');
        const button = InnDesk.utils.createElement('button', {
            className: 'btn btn-primary',
            text: 'Créer la première réservation',
            attributes: { type: 'button' }
        });
        button.style.marginTop = 'var(--space-3)';
        button.addEventListener('click', openCreateReservationModal);
        cell.append(message, lineBreak, button);
        row.appendChild(cell);
        tbody.appendChild(row);
        return;
    }

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
    const clientName = `${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}`;
    
    [
        `#${reservation.id}`,
        clientName,
        reservation.room_type?.name || 'Type inconnu'
    ].forEach(value => row.appendChild(InnDesk.utils.createElement('td', { text: value })));

    const roomCell = document.createElement('td');
    if (reservation.room_id) {
        roomCell.textContent = String(reservation.room?.number || '?');
    } else {
        roomCell.appendChild(InnDesk.utils.createElement('span', {
            className: 'badge badge-warning',
            text: 'À assigner'
        }));
    }
    row.appendChild(roomCell);
    [
        InnDesk.utils.formatDate(reservation.check_in_date),
        InnDesk.utils.formatDate(reservation.check_out_date),
        nights
    ].forEach(value => row.appendChild(InnDesk.utils.createElement('td', { text: value })));
    row.appendChild(document.createElement('td'));
    row.appendChild(InnDesk.utils.createElement('td', {
        text: reservation.total_amount ? InnDesk.utils.formatCurrency(reservation.total_amount) : '—'
    }));
    row.appendChild(document.createElement('td'));

    // Add status badge
    const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
    row.cells[7].appendChild(statusBadge);

    // Add actions
    const actionsCell = row.cells[9];
    const actionSelect = document.createElement('select');
    actionSelect.className = 'form-input reservation-action-select';
    actionSelect.setAttribute('aria-label', `Actions pour la réservation ${reservation.id}`);
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Choisir une action…';
    actionSelect.appendChild(placeholder);

    function addAction(value, label) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        actionSelect.appendChild(option);
    }

    addAction('detail', 'Voir les détails');
    if (reservation.status === 'confirmed' && !reservation.room_id) {
        addAction('assign', 'Assigner une chambre');
    }
    if (['confirmed', 'checked_in'].includes(reservation.status)) {
        addAction('status', 'Changer le statut');
    }
    if (reservation.status === 'confirmed') {
        addAction('delete', 'Supprimer la réservation');
    }

    actionSelect.addEventListener('change', () => {
        const action = actionSelect.value;
        actionSelect.value = '';
        if (action === 'detail') openDetailModal(reservation);
        else if (action === 'assign') openAssignRoomModal(reservation);
        else if (action === 'status') openStatusChangeModal(reservation);
        else if (action === 'delete') showDeleteConfirmation(reservation.id, row);
    });

    actionsCell.appendChild(actionSelect);
    return row;
}

// Populate room type select
function populateRoomTypeSelect() {
    const select = document.getElementById('roomTypeSelect');
    select.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Sélectionner une catégorie...';
    select.appendChild(placeholder);

    roomTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.id;
        option.textContent = `${type.name} — ${type.max_occupancy} pers. max — ${InnDesk.utils.formatCurrency(type.price_per_night)}/nuit`;
        select.appendChild(option);
    });
}
