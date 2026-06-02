// @file: assets/js/planning/render.js
// @depends: state.js, utils.js

// Load planning data
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
            <div class="error-message" style="text-align: center; padding: var(--space-8); color: var(--text-muted);">
                Impossible de charger le planning
            </div>
        `;
    }
}

// Render planning grid
function renderPlanningGrid() {
    const container = document.getElementById('planningContainer');
    const weekDays = getWeekDays();

    const grid = document.createElement('div');
    grid.className = 'planning-grid';

    // Header row
    grid.appendChild(createHeaderCell('Chambres'));
    weekDays.forEach(day => {
        const cell = createHeaderCell(getDayLabel(day));
        if (isToday(day)) {
            cell.classList.add('planning-today');
        }
        if (isWeekend(day)) {
            cell.classList.add('planning-weekend');
        }
        grid.appendChild(cell);
    });

    // Room rows
    rooms.forEach(room => {
        // Room header
        const roomHeader = document.createElement('div');
        roomHeader.className = 'planning-room-header';
        roomHeader.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 2px;">
                ${room.number}
            </div>
            <div style="font-size: var(--text-xs); color: var(--text-secondary);">
                ${room.room_type?.name || 'Type inconnu'}
            </div>
        `;
        grid.appendChild(roomHeader);

        // Day cells for this room
        weekDays.forEach(day => {
            const cell = document.createElement('div');
            cell.className = `planning-cell room-status-${room.status}`;
            
            if (isToday(day)) {
                cell.classList.add('planning-today');
            }
            if (isWeekend(day)) {
                cell.classList.add('planning-weekend');
            }

            // Find reservation for this room and day
            const roomReservation = reservations.find(res => 
                res.room.id === room.id && reservationOverlapsDay(res, day)
            );

            if (roomReservation) {
                const reservationBar = document.createElement('div');
                reservationBar.className = `reservation-bar status-${roomReservation.status}`;
                reservationBar.textContent = roomReservation.client?.last_name || 'Client';
                reservationBar.title = `${roomReservation.client?.first_name || ''} ${roomReservation.client?.last_name || 'Client'} - ${InnDesk.utils.formatShortDate(roomReservation.check_in_date)} → ${InnDesk.utils.formatShortDate(roomReservation.check_out_date)}`;
                
                reservationBar.addEventListener('click', () => {
                    alert(`Réservation #${roomReservation.id}\nClient: ${roomReservation.client?.first_name || ''} ${roomReservation.client?.last_name || 'Client'}\nChambre: ${room.number}\nArrivée: ${InnDesk.utils.formatShortDate(roomReservation.check_in_date)}\nDépart: ${InnDesk.utils.formatShortDate(roomReservation.check_out_date)}\nStatut: ${InnDesk.utils.statusLabel(roomReservation.status)}`);
                });
                
                cell.appendChild(reservationBar);
            }

            grid.appendChild(cell);
        });
    });

    container.innerHTML = '';
    container.appendChild(grid);
}

// Create header cell
function createHeaderCell(text) {
    const cell = document.createElement('div');
    cell.className = 'planning-header-cell';
    cell.textContent = text;
    return cell;
}