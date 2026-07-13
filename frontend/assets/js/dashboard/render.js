// @file: assets/js/dashboard/render.js

const AVATAR_COLORS = [
    '#3F6E8C',
    '#0C5A4B',
    '#9F5544',
    '#4F7A5E',
    '#C0892F'
];

function getAvatarColor(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function getInitials(firstName, lastName) {
    const f = firstName ? firstName.charAt(0).toUpperCase() : '';
    const l = lastName ? lastName.charAt(0).toUpperCase() : '';
    return f + l || '?';
}

// Load KPI data
async function loadKPIs() {
    try {
        const [rooms, reservations] = await Promise.all([
            InnDesk.api.rooms.getAll(),
            InnDesk.api.reservations.getAll({ limit: 100 })
        ]);

        const availableRooms = rooms.filter(room => room.status === 'available').length;
        const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
        const totalRooms = rooms.length;
        const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

        const today = new Date().toISOString().split('T')[0];
        const arrivalsToday = reservations.filter(res =>
            res.status === 'confirmed' && res.check_in_date === today
        ).length;
        const departuresToday = reservations.filter(res =>
            res.status === 'checked_in' && res.check_out_date === today
        ).length;

        document.getElementById('availableRoomsCard').innerHTML = `
            <div class="kpi-value">${availableRooms}</div>
            <div class="kpi-label">Chambres disponibles</div>
        `;
        document.getElementById('arrivalsCard').innerHTML = `
            <div class="kpi-value">${arrivalsToday}</div>
            <div class="kpi-label">Arrivées aujourd'hui</div>
        `;
        document.getElementById('departuresCard').innerHTML = `
            <div class="kpi-value">${departuresToday}</div>
            <div class="kpi-label">Départs aujourd'hui</div>
        `;
        document.getElementById('occupancyCard').innerHTML = `
            <div class="kpi-value">${occupancyRate}%</div>
            <div class="kpi-label">Taux d'occupation</div>
        `;

    } catch (error) {
        ['availableRoomsCard', 'arrivalsCard', 'departuresCard', 'occupancyCard'].forEach(id => {
            InnDesk.utils.showError(document.getElementById(id));
        });
    }
}

// Render a single reservation list item with avatar
function renderListItem(reservation, index) {
    const item = document.createElement('div');
    item.className = 'dashboard-list-item';

    const firstName = reservation.client?.first_name || '';
    const lastName = reservation.client?.last_name || 'Client';
    const roomNumber = reservation.room?.number || '?';
    const roomType = reservation.room?.room_type?.name || reservation.room_type?.name || '';
    const initials = getInitials(firstName, lastName);
    const avatarColor = getAvatarColor(index);

    const badge = InnDesk.utils.createStatusBadge(reservation.status);

    item.innerHTML = `
        <div class="dashboard-avatar" style="background-color: ${avatarColor};" aria-hidden="true">${initials}</div>
        <div class="dashboard-list-info">
            <span class="dashboard-list-name">${firstName} ${lastName}</span>
            <span class="dashboard-list-room">Chambre ${roomNumber}${roomType ? ' · ' + roomType : ''}</span>
        </div>
        <div class="dashboard-list-badge"></div>
    `;
    item.querySelector('.dashboard-list-badge').appendChild(badge);
    return item;
}

// Load arrivals today
async function loadArrivalsToday() {
    const container = document.getElementById('arrivalsList');
    try {
        const today = new Date().toISOString().split('T')[0];
        const reservations = await InnDesk.api.reservations.getAll({
            reservation_status: 'confirmed',
            limit: 100
        });

        const arrivals = reservations.filter(r => r.check_in_date === today);

        container.innerHTML = '';
        if (arrivals.length === 0) {
            container.innerHTML = '<p class="dashboard-list-empty">Aucune arrivée aujourd\'hui</p>';
            return;
        }
        arrivals.forEach((res, i) => container.appendChild(renderListItem(res, i)));

    } catch (error) {
        container.innerHTML = '<p class="dashboard-list-empty">Données indisponibles</p>';
    }
}

// Load departures today
async function loadDeparturesToday() {
    const container = document.getElementById('departuresList');
    try {
        const today = new Date().toISOString().split('T')[0];
        const reservations = await InnDesk.api.reservations.getAll({
            reservation_status: 'checked_in',
            limit: 100
        });

        const departures = reservations.filter(r => r.check_out_date === today);

        container.innerHTML = '';
        if (departures.length === 0) {
            container.innerHTML = '<p class="dashboard-list-empty">Aucun départ aujourd\'hui</p>';
            return;
        }
        departures.forEach((res, i) => container.appendChild(renderListItem(res, i)));

    } catch (error) {
        container.innerHTML = '<p class="dashboard-list-empty">Données indisponibles</p>';
    }
}

// Load active reservations table
async function loadActiveReservations() {
    try {
        const [confirmed, checkedIn] = await Promise.all([
            InnDesk.api.reservations.getAll({ reservation_status: 'confirmed', limit: 100 }),
            InnDesk.api.reservations.getAll({ reservation_status: 'checked_in', limit: 100 })
        ]);
        const active = [...confirmed, ...checkedIn]
            .sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date))
            .slice(0, 8);

        const tbody = document.querySelector('#reservationsTable tbody');
        tbody.innerHTML = '';

        if (active.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center" style="color: var(--text-muted); font-style: italic;">
                        Aucune réservation active
                    </td>
                </tr>
            `;
        } else {
            active.forEach(reservation => {
                    const row = document.createElement('tr');
                    const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
                    const amount = reservation.total_amount != null
                        ? InnDesk.utils.formatCurrency(reservation.total_amount)
                        : '—';
                    row.innerHTML = `
                        <td>${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}</td>
                        <td>Chambre ${reservation.room?.number || '?'}</td>
                        <td>${InnDesk.utils.formatShortDate(reservation.check_in_date)}</td>
                        <td>${InnDesk.utils.formatShortDate(reservation.check_out_date)}</td>
                        <td></td>
                        <td>${amount}</td>
                    `;
                    row.cells[4].appendChild(statusBadge);
                    tbody.appendChild(row);
                });
        }

    } catch (error) {
        const tbody = document.querySelector('#reservationsTable tbody');
        tbody.innerHTML = `<tr><td colspan="6" class="error-message">Erreur lors du chargement des réservations</td></tr>`;
    }
}

// Load room status
async function loadRoomStatus() {
    try {
        const rooms = await InnDesk.api.rooms.getAll();
        const roomsGrid = document.getElementById('roomsGrid');
        roomsGrid.innerHTML = '';

        if (rooms.length === 0) {
            InnDesk.utils.showError(roomsGrid, 'Aucune chambre trouvée');
        } else {
            rooms.sort((a, b) => {
                if (a.floor !== b.floor) return a.floor - b.floor;
                return a.number.localeCompare(b.number, undefined, { numeric: true });
            });
            rooms.forEach(room => {
                const roomCard = document.createElement('div');
                roomCard.className = `room-card status-${room.status}`;
                roomCard.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 4px;">Chambre ${room.number}</div>
                    <div style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: 8px;">
                        Étage ${room.floor} · ${room.room_type?.name || 'Type inconnu'}
                    </div>
                    <div></div>
                `;
                roomCard.lastElementChild.appendChild(InnDesk.utils.createStatusBadge(room.status));
                roomsGrid.appendChild(roomCard);
            });
        }

    } catch (error) {
        InnDesk.utils.showError(document.getElementById('roomsGrid'));
    }
}
