// @file: assets/js/rooms/render.js
// @depends: state.js

// Update stats
function updateStats() {
    const totalRooms = rooms.length;
    const availableRooms = rooms.filter(r => r.status === 'available').length;
    const maintenanceRooms = rooms.filter(r => r.status === 'maintenance').length;

    setRoomStat('totalRoomsChip', 'Total chambres: ', totalRooms);
    setRoomStat('availableRoomsChip', 'Disponibles: ', availableRooms, 'var(--color-available)');
    setRoomStat('maintenanceRoomsChip', 'En maintenance: ', maintenanceRooms, 'var(--color-maintenance)');
}

function setRoomStat(id, label, value, dotColor) {
    const chip = document.getElementById(id);
    if (!chip) return;
    const children = [];
    if (dotColor) {
        const dot = InnDesk.utils.createElement('div', { className: 'rooms-stat-dot' });
        dot.style.background = dotColor;
        children.push(dot);
    }
    children.push(document.createTextNode(label));
    children.push(InnDesk.utils.createElement('strong', { text: value }));
    chip.replaceChildren(...children);
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

    grid.replaceChildren();
    if (filteredRooms.length === 0) {
        const message = InnDesk.utils.createElement('div', {
            className: 'error-message',
            text: 'Aucune chambre trouvée avec ces filtres'
        });
        message.style.cssText = 'grid-column: 1/-1; text-align: center; padding: var(--space-8); color: var(--text-muted); font-style: italic;';
        grid.appendChild(message);
        return;
    }

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

    const header = InnDesk.utils.createElement('div', { className: 'room-card-header' });
    const badgeContainer = document.createElement('div');
    badgeContainer.appendChild(statusBadge);
    header.append(
        InnDesk.utils.createElement('div', { className: 'room-number', text: `Chambre ${room.number}` }),
        badgeContainer
    );

    const details = InnDesk.utils.createElement('div', { className: 'room-details' });
    const type = InnDesk.utils.createElement('div', { className: 'room-detail-item' });
    type.appendChild(InnDesk.utils.createElement('strong', { text: room.room_type?.name || 'Type inconnu' }));
    const occupancy = room.room_type?.max_occupancy || 0;
    details.append(
        type,
        InnDesk.utils.createElement('div', { className: 'room-detail-item', text: `Étage ${room.floor}` }),
        InnDesk.utils.createElement('div', {
            className: 'room-detail-item',
            text: `${InnDesk.utils.formatCurrency(room.room_type?.price_per_night || 0)}/nuit`
        }),
        InnDesk.utils.createElement('div', {
            className: 'room-detail-item',
            text: `${occupancy} personne${occupancy > 1 ? 's' : ''}`
        })
    );
    card.append(header, details);

    return card;
}
