// @file: assets/js/rooms/render.js
// @depends: state.js

// Update stats
function updateStats() {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;

    document.getElementById('totalRoomsChip').innerHTML = `
        Total chambres: <strong>${totalRooms}</strong>
    `;

    document.getElementById('availableRoomsChip').innerHTML = `
        <div class="rooms-stat-dot" style="background: var(--color-available);"></div>
        Disponibles: <strong>${availableRooms}</strong>
    `;

    document.getElementById('maintenanceRoomsChip').innerHTML = `
        <div class="rooms-stat-dot" style="background: var(--color-maintenance);"></div>
        En maintenance: <strong>${maintenanceRooms}</strong>
    `;
}

// Populate type filters
function populateTypeFilters() {
    const typeFiltersContainer = document.getElementById('typeFilters');
    const existingAll = typeFiltersContainer.querySelector('[data-filter="all"]');
    
    roomTypes.forEach(type => {
        const button = document.createElement('button');
        button.className = 'filter-pill';
        button.setAttribute('data-filter', type.id.toString());
        button.textContent = type.name;
        button.addEventListener('click', () => setTypeFilter(type.id.toString()));
        typeFiltersContainer.appendChild(button);
    });
}

// Render rooms
function renderRooms() {
    const grid = document.getElementById('roomsGrid');
    const filteredRooms = getFilteredRooms();

    if (filteredRooms.length === 0) {
        grid.innerHTML = `
            <div class="error-message" style="grid-column: 1/-1; text-align: center; padding: var(--space-8); color: var(--text-muted); font-style: italic;">
                Aucune chambre trouvée avec ces filtres
            </div>
        `;
        return;
    }

    grid.innerHTML = '';
    filteredRooms.forEach(room => {
        const card = createRoomCard(room);
        grid.appendChild(card);
    });
}

// Get filtered rooms
function getFilteredRooms() {
    return rooms.filter(room => {
        const statusMatch = activeStatusFilter === 'all' || room.status === activeStatusFilter;
        const typeMatch = activeTypeFilter === 'all' || room.room_type?.id.toString() === activeTypeFilter;
        return statusMatch && typeMatch;
    });
}

// Create room card
function createRoomCard(room) {
    const card = document.createElement('div');
    card.className = `room-card status-${room.status}`;
    card.addEventListener('click', () => openRoomModal(room));

    const statusBadge = InnDesk.utils.createStatusBadge(room.status);

    card.innerHTML = `
        <div class="room-card-header">
            <div class="room-number">Chambre ${escapeHtml(room.number)}</div>
            <div></div>
        </div>
        <div class="room-details">
            <div class="room-detail-item">
                <strong>${escapeHtml(room.room_type?.name || 'Type inconnu')}</strong>
            </div>
            <div class="room-detail-item">
                Étage ${room.floor}
            </div>
            <div class="room-detail-item">
                ${InnDesk.utils.formatCurrency(room.room_type?.price_per_night || 0)}/nuit
            </div>
            <div class="room-detail-item">
                ${room.room_type?.max_occupancy || 0} personne${(room.room_type?.max_occupancy || 0) > 1 ? 's' : ''}
            </div>
        </div>
    `;

    // Add status badge to header
    card.querySelector('.room-card-header > div:last-child').appendChild(statusBadge);

    return card;
}