// Housekeeping rendering functions

function getStatusLabel(status) {
    const labels = {
        'available': 'Disponible',
        'occupied': 'Occupé',
        'dirty': 'À nettoyer',
        'cleaning': 'En cours',
        'maintenance': 'Maintenance'
    };
    return labels[status] || status;
}

function createHousekeepingIcon(name, size) {
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', name);
    icon.style.width = `${size}px`;
    icon.style.height = `${size}px`;
    return icon;
}

function createStatusButton(status, currentStatus, roomId) {
    const isActive = status === currentStatus;
    const isMaintenanceRestricted = status === 'maintenance' && 
        housekeepingState.currentUser && 
        housekeepingState.currentUser.role !== 'admin';
    
    const button = document.createElement('button');
    button.className = `status-btn ${status}${isActive ? ' active' : ''}`;
    button.append(
        createHousekeepingIcon(getStatusIcon(status), 14),
        document.createTextNode(getStatusLabel(status))
    );
    
    if (isMaintenanceRestricted) {
        button.disabled = true;
        button.title = 'Seuls les administrateurs peuvent définir le statut maintenance';
    } else if (!isActive) {
        button.onclick = () => handleStatusChange(roomId, status);
    }
    
    return button;
}

function getStatusIcon(status) {
    const icons = {
        'available': 'check',
        'dirty': 'circle-x',
        'cleaning': 'loader',
        'maintenance': 'wrench'
    };
    return icons[status] || 'circle';
}

function createRoomCard(room) {
    const card = document.createElement('div');
    card.className = `room-card status-${room.status}`;
    card.dataset.roomId = room.id;
    
    // Available statuses for manual update (excluding 'occupied')
    const availableStatuses = ['available', 'dirty', 'cleaning', 'maintenance'];
    
    const header = InnDesk.utils.createElement('div', { className: 'room-header' });
    header.append(
        InnDesk.utils.createElement('div', { className: 'room-number', text: room.number }),
        InnDesk.utils.createElement('div', {
            className: `badge badge--${room.status}`,
            text: getStatusLabel(room.status)
        })
    );

    const info = InnDesk.utils.createElement('div', { className: 'room-info' });
    info.appendChild(InnDesk.utils.createElement('div', {
        className: 'room-type',
        text: room.room_type_name || ''
    }));
    if (room.notes) {
        const notes = InnDesk.utils.createElement('div', { text: room.notes });
        notes.style.cssText = 'font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-1);';
        info.appendChild(notes);
    }

    const controls = InnDesk.utils.createElement('div', { className: 'status-controls' });
    availableStatuses.forEach(status => {
        controls.appendChild(createStatusButton(status, room.status, room.id));
    });
    card.append(header, info, controls);
    
    return card;
}

function renderFloorSection(floorNumber, rooms) {
    const section = document.createElement('div');
    section.className = 'floor-section';
    const title = InnDesk.utils.createElement('h2', { className: 'floor-title' });
    title.append(
        createHousekeepingIcon('building', 20),
        document.createTextNode(`Étage ${floorNumber}`)
    );
    const grid = InnDesk.utils.createElement('div', { className: 'rooms-grid' });
    rooms.forEach(room => grid.appendChild(createRoomCard(room)));
    section.append(title, grid);
    
    return section;
}

function renderHousekeepingContent() {
    const contentContainer = document.getElementById('housekeepingContent');
    const loadingSkeleton = document.getElementById('loadingSkeleton');
    
    if (housekeepingState.loading) {
        loadingSkeleton.style.display = 'block';
        contentContainer.style.display = 'none';
        return;
    }
    
    loadingSkeleton.style.display = 'none';
    contentContainer.style.display = 'block';
    contentContainer.replaceChildren();
    
    if (housekeepingState.error) {
        const error = InnDesk.utils.createElement('div', { className: 'error-message' });
        error.style.cssText = 'text-align: center; padding: var(--space-8); color: var(--color-maintenance);';
        const icon = createHousekeepingIcon('alert-circle', 48);
        icon.style.marginBottom = 'var(--space-4)';
        const retry = InnDesk.utils.createElement('button', {
            className: 'btn btn-primary',
            text: 'Réessayer',
            attributes: { type: 'button' }
        });
        retry.style.marginTop = 'var(--space-4)';
        retry.addEventListener('click', loadHousekeepingData);
        error.append(
            icon,
            InnDesk.utils.createElement('h3', { text: 'Erreur de chargement' }),
            InnDesk.utils.createElement('p', { text: housekeepingState.error }),
            retry
        );
        contentContainer.appendChild(error);
        if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
        return;
    }
    
    const roomsByFloor = getRoomsByFloor();
    const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);
    
    if (floors.length === 0) {
        const empty = InnDesk.utils.createElement('div', { className: 'empty-state' });
        empty.style.cssText = 'text-align: center; padding: var(--space-8);';
        const icon = createHousekeepingIcon('bed', 48);
        icon.style.cssText += 'margin-bottom: var(--space-4); color: var(--text-muted);';
        empty.append(
            icon,
            InnDesk.utils.createElement('h3', { text: 'Aucune chambre trouvée' }),
            InnDesk.utils.createElement('p', { text: "Il n'y a pas de chambres à afficher." })
        );
        contentContainer.appendChild(empty);
        if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
        return;
    }
    
    floors.forEach(floor => {
        const section = renderFloorSection(floor, roomsByFloor[floor]);
        contentContainer.appendChild(section);
    });
    
    // Initialize Lucide icons
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const content = document.createElement('div');
    content.style.cssText = 'display: flex; align-items: center; gap: var(--space-2);';
    content.append(
        createHousekeepingIcon(type === 'success' ? 'check' : 'alert-circle', 16),
        InnDesk.utils.createElement('span', { text: message })
    );
    toast.appendChild(content);
    
    container.appendChild(toast);
    if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}
