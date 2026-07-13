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

function setDashboardKpi(id, value, label) {
    const card = document.getElementById(id);
    if (!card) return;
    card.replaceChildren(
        InnDesk.utils.createElement('div', { className: 'kpi-value', text: value }),
        InnDesk.utils.createElement('div', { className: 'kpi-label', text: label })
    );
}

function setDashboardMessage(container, message, className = 'dashboard-list-empty') {
    if (!container) return;
    container.replaceChildren(InnDesk.utils.createElement('p', { className, text: message }));
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

        setDashboardKpi('availableRoomsCard', availableRooms, 'Chambres disponibles');
        setDashboardKpi('arrivalsCard', arrivalsToday, "Arrivées aujourd'hui");
        setDashboardKpi('departuresCard', departuresToday, "Départs aujourd'hui");
        setDashboardKpi('occupancyCard', `${occupancyRate}%`, "Taux d'occupation");

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

    const avatar = InnDesk.utils.createElement('div', {
        className: 'dashboard-avatar',
        text: initials,
        attributes: { 'aria-hidden': 'true' }
    });
    avatar.style.backgroundColor = avatarColor;
    const info = InnDesk.utils.createElement('div', { className: 'dashboard-list-info' });
    info.append(
        InnDesk.utils.createElement('span', { className: 'dashboard-list-name', text: `${firstName} ${lastName}` }),
        InnDesk.utils.createElement('span', {
            className: 'dashboard-list-room',
            text: `Chambre ${roomNumber}${roomType ? ` · ${roomType}` : ''}`
        })
    );
    const badgeContainer = InnDesk.utils.createElement('div', { className: 'dashboard-list-badge' });
    badgeContainer.appendChild(badge);
    item.append(avatar, info, badgeContainer);
    return item;
}

// Load arrivals today
async function loadArrivalsToday() {
    const container = document.getElementById('arrivalsList');
    try {
        const today = new Date().toISOString().split('T')[0];
        const reservations = await InnDesk.api.reservations.getAll({
            start: today,
            end: today,
            status: 'confirmed',
            limit: 50
        });

        const arrivals = reservations.filter(r => r.check_in_date === today && r.status === 'confirmed');

        container.replaceChildren();
        if (arrivals.length === 0) {
            setDashboardMessage(container, "Aucune arrivée aujourd'hui");
            return;
        }
        arrivals.forEach((res, i) => container.appendChild(renderListItem(res, i)));

    } catch (error) {
        setDashboardMessage(container, 'Données indisponibles');
    }
}

// Load departures today
async function loadDeparturesToday() {
    const container = document.getElementById('departuresList');
    try {
        const today = new Date().toISOString().split('T')[0];
        const reservations = await InnDesk.api.reservations.getAll({
            start: today,
            end: today,
            status: 'checked_in',
            limit: 50
        });

        const departures = reservations.filter(r => r.check_out_date === today && r.status === 'checked_in');

        container.replaceChildren();
        if (departures.length === 0) {
            setDashboardMessage(container, "Aucun départ aujourd'hui");
            return;
        }
        departures.forEach((res, i) => container.appendChild(renderListItem(res, i)));

    } catch (error) {
        setDashboardMessage(container, 'Données indisponibles');
    }
}

// Load active reservations table
async function loadActiveReservations() {
    try {
        const reservations = await InnDesk.api.reservations.getAll({
            limit: 8,
            status: 'confirmed,checked_in'
        });

        const tbody = document.querySelector('#reservationsTable tbody');
        tbody.replaceChildren();

        if (reservations.length === 0) {
            const row = document.createElement('tr');
            const cell = InnDesk.utils.createElement('td', {
                className: 'text-center',
                text: 'Aucune réservation active'
            });
            cell.colSpan = 6;
            cell.style.cssText = 'color: var(--text-muted); font-style: italic;';
            row.appendChild(cell);
            tbody.appendChild(row);
        } else {
            reservations
                .sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date))
                .forEach(reservation => {
                    const row = document.createElement('tr');
                    const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
                    [
                        `${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}`,
                        `Chambre ${reservation.room?.number || '?'}`,
                        InnDesk.utils.formatShortDate(reservation.check_in_date),
                        InnDesk.utils.formatShortDate(reservation.check_out_date)
                    ].forEach(value => row.appendChild(InnDesk.utils.createElement('td', { text: value })));
                    row.appendChild(document.createElement('td'));
                    row.appendChild(InnDesk.utils.createElement('td', {
                        text: InnDesk.utils.formatCurrency(reservation.total_amount)
                    }));
                    row.cells[4].appendChild(statusBadge);
                    tbody.appendChild(row);
                });
        }

    } catch (error) {
        const tbody = document.querySelector('#reservationsTable tbody');
        const row = document.createElement('tr');
        const cell = InnDesk.utils.createElement('td', {
            className: 'error-message',
            text: 'Erreur lors du chargement des réservations'
        });
        cell.colSpan = 6;
        row.appendChild(cell);
        tbody.replaceChildren(row);
    }
}

// Load room status
async function loadRoomStatus() {
    try {
        const rooms = await InnDesk.api.rooms.getAll();
        const roomsGrid = document.getElementById('roomsGrid');
        roomsGrid.replaceChildren();

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
                const number = InnDesk.utils.createElement('div', { text: `Chambre ${room.number}` });
                number.style.cssText = 'font-weight: 600; margin-bottom: 4px;';
                const details = InnDesk.utils.createElement('div', {
                    text: `Étage ${room.floor} · ${room.room_type?.name || 'Type inconnu'}`
                });
                details.style.cssText = 'font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: 8px;';
                const badgeContainer = document.createElement('div');
                badgeContainer.appendChild(InnDesk.utils.createStatusBadge(room.status));
                roomCard.append(number, details, badgeContainer);
                roomsGrid.appendChild(roomCard);
            });
        }

    } catch (error) {
        InnDesk.utils.showError(document.getElementById('roomsGrid'));
    }
}
