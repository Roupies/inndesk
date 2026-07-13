// @file: assets/js/planning/render.js
// @depends: state.js, utils.js, handlers.js

async function loadPlanningData() {
    const grid = document.getElementById('pgGrid');
    if (!grid) return;

    showPlanningMessage(grid, 'Chargement…', 'pg-loading');

    try {
        const [roomsData, reservationsData] = await Promise.all([
            InnDesk.api.rooms.getAll(),
            InnDesk.api.reservations.getAll({ limit: 500 })
        ]);

        rooms = roomsData.slice().sort((a, b) => {
            if (a.floor !== b.floor) return a.floor - b.floor;
            return String(a.number).localeCompare(String(b.number), undefined, { numeric: true });
        });
        reservations = reservationsData.filter(reservation =>
            !['cancelled', 'no_show'].includes(reservation.status)
        );

        renderPlanningGrid();
    } catch (error) {
        console.warn('InnDesk: impossible de charger le planning.', error);
        showPlanningMessage(grid, 'Impossible de charger le planning', 'pg-error');
    }
}

function showPlanningMessage(grid, message, className) {
    InnDesk.utils.clearElement(grid);
    const element = document.createElement('div');
    element.className = className;
    element.style.gridColumn = '1 / -1';
    element.textContent = message;
    grid.appendChild(element);
}

function renderPlanningGrid() {
    const grid = document.getElementById('pgGrid');
    if (!grid) return;

    const days = getWindowDays();
    InnDesk.utils.clearElement(grid);
    grid.style.setProperty('--pg-nb-days', String(days.length));
    grid.dataset.days = String(days.length);

    const corner = document.createElement('div');
    corner.className = 'pg-corner pg-header-cell';
    corner.textContent = 'Chambres';
    corner.setAttribute('role', 'columnheader');
    grid.appendChild(corner);

    days.forEach((day, index) => {
        const header = document.createElement('div');
        header.className = 'pg-header-cell';
        if (isTodayDate(day)) header.classList.add('pg-today-header');
        header.style.gridColumn = String(index + 2);
        header.setAttribute('role', 'columnheader');

        const dayName = document.createElement('span');
        dayName.className = 'pg-header-day';
        dayName.textContent = day.toLocaleDateString('fr-FR', { weekday: 'short' });
        const dayNumber = document.createElement('span');
        dayNumber.className = 'pg-header-num';
        dayNumber.textContent = String(day.getDate());
        header.append(dayName, dayNumber);
        grid.appendChild(header);
    });

    if (rooms.length === 0) {
        showPlanningMessage(grid, 'Aucune chambre à afficher', 'pg-empty');
        return;
    }

    rooms.forEach((room, roomIndex) => {
        const row = roomIndex + 2;
        const label = document.createElement('div');
        label.className = 'pg-room-label';
        label.style.gridRow = String(row);
        label.setAttribute('role', 'rowheader');

        const roomNumber = document.createElement('span');
        roomNumber.className = 'pg-room-number';
        roomNumber.textContent = `Chambre ${room.number}`;
        label.appendChild(roomNumber);
        grid.appendChild(label);

        days.forEach((day, dayIndex) => {
            const cell = document.createElement('div');
            cell.className = 'pg-cell';
            if (isWeekendDate(day)) cell.classList.add('pg-weekend');
            if (isTodayDate(day)) cell.classList.add('pg-today-col');
            cell.style.gridColumn = String(dayIndex + 2);
            cell.style.gridRow = String(row);
            cell.setAttribute('role', 'gridcell');
            grid.appendChild(cell);
        });

        reservations
            .filter(reservation => reservation.room_id === room.id || reservation.room?.id === room.id)
            .forEach(reservation => appendReservationBar(grid, reservation, days, row));
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
    }
}

function appendReservationBar(grid, reservation, days, row) {
    const firstVisibleDay = days.findIndex(day => reservationOverlapsDay(reservation, day));
    if (firstVisibleDay === -1) return;

    let lastVisibleDay = firstVisibleDay;
    for (let index = firstVisibleDay + 1; index < days.length; index += 1) {
        if (!reservationOverlapsDay(reservation, days[index])) break;
        lastVisibleDay = index;
    }

    const checkIn = toLocalMidnight(reservation.check_in_date);
    const checkOut = toLocalMidnight(reservation.check_out_date);
    const windowEnd = new Date(days[days.length - 1]);
    windowEnd.setDate(windowEnd.getDate() + 1);

    const bar = document.createElement('button');
    const supportedStatus = ['confirmed', 'checked_in', 'checked_out'].includes(reservation.status)
        ? reservation.status
        : 'confirmed';
    bar.type = 'button';
    bar.className = `pg-bar pg-bar--${supportedStatus}`;
    if (checkIn < days[0]) bar.classList.add('pg-bar--clipped-left');
    if (checkOut > windowEnd) bar.classList.add('pg-bar--clipped-right');
    bar.style.gridColumn = `${firstVisibleDay + 2} / ${lastVisibleDay + 3}`;
    bar.style.gridRow = String(row);

    const inner = document.createElement('span');
    inner.className = 'pg-bar-inner';
    const label = document.createElement('span');
    label.className = 'pg-bar-label';
    label.textContent = `${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client'}`.trim();
    inner.appendChild(label);
    bar.appendChild(inner);
    bar.setAttribute('aria-label', `${label.textContent}, du ${InnDesk.utils.formatDate(reservation.check_in_date)} au ${InnDesk.utils.formatDate(reservation.check_out_date)}`);
    bar.addEventListener('click', () => openPlanningDetail(reservation));
    grid.appendChild(bar);
}

function openPlanningDetail(reservation) {
    const overlay = document.getElementById('pgDetailOverlay');
    const modal = document.getElementById('pgDetailModal');
    const title = document.getElementById('pgDetailTitle');
    const body = document.getElementById('pgDetailBody');
    const actions = document.getElementById('pgDetailActions');
    if (!overlay || !modal || !title || !body || !actions) return;

    title.textContent = `Réservation #${reservation.id}`;
    InnDesk.utils.clearElement(body);
    InnDesk.utils.clearElement(actions);

    const badgeRow = document.createElement('div');
    badgeRow.className = 'pg-detail-section pg-detail-badge-row';
    badgeRow.appendChild(InnDesk.utils.createStatusBadge(reservation.status));
    body.appendChild(badgeRow);

    const fields = [
        ['Client', `${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}`.trim()],
        ['Chambre', reservation.room?.number ? `N° ${reservation.room.number}` : 'Non assignée'],
        ['Arrivée', InnDesk.utils.formatDate(reservation.check_in_date)],
        ['Départ', InnDesk.utils.formatDate(reservation.check_out_date)],
        ['Montant', InnDesk.utils.formatCurrency(reservation.total_amount)]
    ];
    const details = document.createElement('div');
    details.className = 'pg-detail-grid';
    fields.forEach(([label, value]) => {
        const item = document.createElement('div');
        const labelElement = document.createElement('div');
        labelElement.className = 'pg-detail-label';
        labelElement.textContent = label;
        const valueElement = document.createElement('div');
        valueElement.textContent = value;
        item.append(labelElement, valueElement);
        details.appendChild(item);
    });
    body.appendChild(details);

    const reservationsLink = document.createElement('a');
    reservationsLink.className = 'btn btn-primary btn-sm';
    reservationsLink.href = './reservations.html';
    reservationsLink.textContent = 'Voir les réservations';
    actions.appendChild(reservationsLink);

    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    modal.classList.add('show');
}
