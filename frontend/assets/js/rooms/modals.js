// @file: assets/js/rooms/modals.js
// @depends: state.js

// Modal functions
function openRoomModal(room) {
    const modal = document.getElementById('roomModal');
    const modalTitle = document.getElementById('modalTitle');
    const roomInfoGrid = document.getElementById('roomInfoGrid');
    const recentReservationsList = document.getElementById('recentReservationsList');

    modalTitle.textContent = `Chambre ${room.number}`;

    // Populate room info
    roomInfoGrid.innerHTML = `
        <div class="room-info-item">
            <div class="room-info-label">Numéro</div>
            <div class="room-info-value">${room.number}</div>
        </div>
        <div class="room-info-item">
            <div class="room-info-label">Étage</div>
            <div class="room-info-value">${room.floor}</div>
        </div>
        <div class="room-info-item">
            <div class="room-info-label">Type</div>
            <div class="room-info-value">${room.room_type?.name || 'Type inconnu'}</div>
        </div>
        <div class="room-info-item">
            <div class="room-info-label">Statut</div>
            <div class="room-info-value"></div>
        </div>
        <div class="room-info-item">
            <div class="room-info-label">Prix/nuit</div>
            <div class="room-info-value">${InnDesk.utils.formatCurrency(room.room_type?.price_per_night || 0)}</div>
        </div>
        <div class="room-info-item">
            <div class="room-info-label">Capacité max</div>
            <div class="room-info-value">${room.room_type?.max_occupancy || 0} personne${(room.room_type?.max_occupancy || 0) > 1 ? 's' : ''}</div>
        </div>
    `;

    // Add status badge
    const statusBadge = InnDesk.utils.createStatusBadge(room.status);
    roomInfoGrid.querySelector('.room-info-item:nth-child(4) .room-info-value').appendChild(statusBadge);

    // Add description if available
    if (room.room_type?.description) {
        const descriptionItem = document.createElement('div');
        descriptionItem.className = 'room-info-item';
        descriptionItem.style.gridColumn = '1 / -1';
        descriptionItem.innerHTML = `
            <div class="room-info-label">Description</div>
            <div class="room-info-value">${room.room_type.description}</div>
        `;
        roomInfoGrid.appendChild(descriptionItem);
    }

    // Show recent reservations for this room
    const roomReservations = reservations
        .filter(res => res.room?.id === room.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);

    if (roomReservations.length === 0) {
        recentReservationsList.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); font-style: italic; padding: var(--space-4);">
                Aucune réservation récente
            </div>
        `;
    } else {
        recentReservationsList.innerHTML = '';
        roomReservations.forEach(reservation => {
            const item = document.createElement('div');
            item.className = 'reservation-item';
            
            const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
            
            item.innerHTML = `
                <div class="reservation-client">
                    ${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}
                </div>
                <div class="reservation-dates">
                    ${InnDesk.utils.formatShortDate(reservation.check_in_date)} → ${InnDesk.utils.formatShortDate(reservation.check_out_date)}
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>${InnDesk.utils.formatCurrency(reservation.total_amount || 0)}</span>
                    <div></div>
                </div>
            `;
            
            // Add status badge
            item.querySelector('div:last-child > div').appendChild(statusBadge);
            
            recentReservationsList.appendChild(item);
        });
    }

    modal.classList.add('show');
}

function closeRoomModal() {
    const modal = document.getElementById('roomModal');
    modal.classList.remove('show');
}