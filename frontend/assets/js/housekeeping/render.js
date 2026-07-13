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

function createStatusButton(status, currentStatus, roomId) {
    const isActive = status === currentStatus;
    const isMaintenanceRestricted = status === 'maintenance' && 
        housekeepingState.currentUser && 
        housekeepingState.currentUser.role !== 'admin';
    
    const button = document.createElement('button');
    button.className = `status-btn ${status}${isActive ? ' active' : ''}`;
    button.innerHTML = `
        <i data-lucide="${getStatusIcon(status)}" style="width: 14px; height: 14px;"></i>
        ${getStatusLabel(status)}
    `;
    
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
    
    card.innerHTML = `
        <div class="room-header">
            <div class="room-number">${room.number}</div>
            <div class="badge badge--${room.status}">${getStatusLabel(room.status)}</div>
        </div>
        <div class="room-info">
            <div class="room-type">${room.room_type_name}</div>
            ${room.notes ? `<div style="font-size: var(--text-sm); color: var(--text-muted); margin-top: var(--space-1);">${room.notes}</div>` : ''}
        </div>
        <div class="status-controls">
            ${availableStatuses.map(status => 
                createStatusButton(status, room.status, room.id).outerHTML
            ).join('')}
        </div>
    `;
    
    // Re-attach event listeners for buttons
    const buttons = card.querySelectorAll('.status-btn:not(.active):not([disabled])');
    buttons.forEach(button => {
        const status = Array.from(button.classList).find(cls => 
            availableStatuses.includes(cls) && cls !== 'status-btn'
        );
        if (status) {
            button.onclick = () => handleStatusChange(room.id, status);
        }
    });
    
    return card;
}

function renderFloorSection(floorNumber, rooms) {
    const section = document.createElement('div');
    section.className = 'floor-section';
    section.innerHTML = `
        <h2 class="floor-title">
            <i data-lucide="building" style="width: 20px; height: 20px;"></i>
            Étage ${floorNumber}
        </h2>
        <div class="rooms-grid">
            ${rooms.map(room => createRoomCard(room).outerHTML).join('')}
        </div>
    `;
    
    // Re-attach event listeners
    const roomCards = section.querySelectorAll('.room-card');
    roomCards.forEach((card, index) => {
        const room = rooms[index];
        const buttons = card.querySelectorAll('.status-btn:not(.active):not([disabled])');
        buttons.forEach(button => {
            const status = Array.from(button.classList).find(cls => 
                ['available', 'dirty', 'cleaning', 'maintenance'].includes(cls)
            );
            if (status) {
                button.onclick = () => handleStatusChange(room.id, status);
            }
        });
    });
    
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
    contentContainer.innerHTML = '';
    
    if (housekeepingState.error) {
        contentContainer.innerHTML = `
            <div class="error-message" style="text-align: center; padding: var(--space-8); color: var(--color-maintenance);">
                <i data-lucide="alert-circle" style="width: 48px; height: 48px; margin-bottom: var(--space-4);"></i>
                <h3>Erreur de chargement</h3>
                <p>${housekeepingState.error}</p>
                <button class="btn btn-primary" onclick="loadHousekeepingData()" style="margin-top: var(--space-4);">
                    Réessayer
                </button>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    const roomsByFloor = getRoomsByFloor();
    const floors = Object.keys(roomsByFloor).map(Number).sort((a, b) => a - b);
    
    if (floors.length === 0) {
        contentContainer.innerHTML = `
            <div class="empty-state" style="text-align: center; padding: var(--space-8);">
                <i data-lucide="bed" style="width: 48px; height: 48px; margin-bottom: var(--space-4); color: var(--text-muted);"></i>
                <h3>Aucune chambre trouvée</h3>
                <p>Il n'y a pas de chambres à afficher.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    floors.forEach(floor => {
        const section = renderFloorSection(floor, roomsByFloor[floor]);
        contentContainer.appendChild(section);
    });
    
    // Initialize Lucide icons
    lucide.createIcons();
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: var(--space-2);">
            <i data-lucide="${type === 'success' ? 'check' : 'alert-circle'}" style="width: 16px; height: 16px;"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    lucide.createIcons();
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => container.removeChild(toast), 300);
    }, 3000);
}