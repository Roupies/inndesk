// @file: assets/js/planning/render.js
// @depends: state.js, utils.js

// Load planning data from API
async function loadPlanningData() {
    try {
        const [roomsData, reservationsData] = await Promise.all([
            InnDesk.api.rooms.getAll(),
            InnDesk.api.reservations.getAll({ limit: 200 })
        ]);

        rooms = roomsData.sort((a, b) => {
            if (a.floor !== b.floor) return a.floor - b.floor;
            return a.number.localeCompare(b.number, undefined, { numeric: true });
        });

        reservations = reservationsData.filter(res =>
            res.status !== 'cancelled' && res.status !== 'no_show'
        );

        renderPlanningGrid();

    } catch (error) {
        const container = document.getElementById('planningContainer');
        container.innerHTML = `
            <div role="alert" style="text-align: center; padding: var(--space-8); color: var(--text-muted);">
                Impossible de charger le planning
            </div>
        `;
    }
}

// Render the full 14-day grid
function renderPlanningGrid() {
    const container = document.getElementById('planningContainer');
    const days = getWindowDays();

    const grid = document.createElement('div');
    grid.className = 'planning-grid';
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', 'Planning des réservations');

    // Header row
    const headerRow = document.createElement('div');
    headerRow.setAttribute('role', 'row');
    headerRow.style.display = 'contents';

    // First cell: corner
    const corner = document.createElement('div');
    corner.className = 'planning-header-cell';
    corner.setAttribute('role', 'columnheader');
    corner.textContent = 'Chambres';
    grid.appendChild(corner);

    days.forEach(day => {
        const cell = document.createElement('div');
        cell.className = 'planning-header-cell';
        cell.setAttribute('role', 'columnheader');
        if (isTodayDate(day)) cell.classList.add('today-col');
        const parts = getDayLabel(day).split('\n');
        cell.innerHTML = `<span>${parts[0]}</span><br><span style="font-weight:700;">${parts[1]}</span>`;
        grid.appendChild(cell);
    });

    // Room rows
    rooms.forEach(room => {
        const rowGroup = document.createElement('div');
        rowGroup.setAttribute('role', 'row');
        rowGroup.style.display = 'contents';

        // Room label cell
        const roomLabel = document.createElement('div');
        roomLabel.className = 'planning-room-label';
        roomLabel.setAttribute('role', 'rowheader');
        roomLabel.innerHTML = `
            <span class="planning-room-label-name">${room.number}</span>
            <span class="planning-room-label-type">${room.room_type?.name || ''}</span>
        `;
        grid.appendChild(roomLabel);

        // Day cells
        days.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'planning-cell';
            cell.setAttribute('role', 'gridcell');
            if (isTodayDate(day)) cell.classList.add('today-col');
            if (isWeekendDate(day)) cell.classList.add('weekend-col');
            if (room.status === 'maintenance') cell.classList.add('maintenance-room');

            const res = reservations.find(r =>
                r.room && r.room.id === room.id && reservationOverlapsDay(r, day)
            );

            if (res) {
                const bar = createReservationBar(res, room);
                cell.appendChild(bar);
            }

            grid.appendChild(cell);
        });
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

// Create a reservation bar element
function createReservationBar(res, room) {
    const bar = document.createElement('button');
    const statusClass = res.status.replace('_', '-');
    bar.className = `reservation-bar status-${res.status}`;
    bar.type = 'button';

    const lastName = res.client?.last_name || 'Client';
    const firstName = res.client?.first_name || '';
    bar.textContent = lastName;

    const checkInFmt = res.check_in_date ? res.check_in_date : '';
    const checkOutFmt = res.check_out_date ? res.check_out_date : '';
    bar.setAttribute('aria-label',
        `${firstName} ${lastName}, chambre ${room.number}, ${checkInFmt} – ${checkOutFmt}`
    );
    bar.title = `${firstName} ${lastName} · Chambre ${room.number}\n${checkInFmt} → ${checkOutFmt}\n${InnDesk.utils.statusLabel(res.status)}`;

    bar.addEventListener('click', () => {
        alert(
            `Réservation #${res.id}\n` +
            `Client : ${firstName} ${lastName}\n` +
            `Chambre : ${room.number}\n` +
            `Arrivée : ${checkInFmt}\n` +
            `Départ : ${checkOutFmt}\n` +
            `Statut : ${InnDesk.utils.statusLabel(res.status)}`
        );
    });

    return bar;
}
