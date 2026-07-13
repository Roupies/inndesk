// @file: assets/js/rooms/modals.js
// @depends: state.js

// Modal functions
function openRoomModal(room) {
    const modal = document.getElementById('roomModal');
    const modalTitle = document.getElementById('modalTitle');
    const roomInfoGrid = document.getElementById('roomInfoGrid');
    const recentReservationsList = document.getElementById('recentReservationsList');

    modalTitle.textContent = `Chambre ${room.number}`;

    roomInfoGrid.replaceChildren();
    const occupancy = room.room_type?.max_occupancy || 0;
    [
        ['Numéro', room.number],
        ['Étage', room.floor],
        ['Type', room.room_type?.name || 'Type inconnu'],
        ['Statut', InnDesk.utils.createStatusBadge(room.status)],
        ['Prix/nuit', InnDesk.utils.formatCurrency(room.room_type?.price_per_night || 0)],
        ['Capacité max', `${occupancy} personne${occupancy > 1 ? 's' : ''}`]
    ].forEach(([label, value]) => roomInfoGrid.appendChild(createRoomInfoItem(label, value)));

    // Add description if available
    if (room.room_type?.description) {
        const descriptionItem = document.createElement('div');
        descriptionItem.className = 'room-info-item';
        descriptionItem.style.gridColumn = '1 / -1';
        descriptionItem.append(
            InnDesk.utils.createElement('div', { className: 'room-info-label', text: 'Description' }),
            InnDesk.utils.createElement('div', { className: 'room-info-value', text: room.room_type.description })
        );
        roomInfoGrid.appendChild(descriptionItem);
    }

    // Show recent reservations for this room
    const roomReservations = reservations
        .filter(res => res.room?.id === room.id)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3);

    if (roomReservations.length === 0) {
        const empty = InnDesk.utils.createElement('div', { text: 'Aucune réservation récente' });
        empty.style.cssText = 'text-align: center; color: var(--text-muted); font-style: italic; padding: var(--space-4);';
        recentReservationsList.replaceChildren(empty);
    } else {
        recentReservationsList.replaceChildren();
        roomReservations.forEach(reservation => {
            const item = document.createElement('div');
            item.className = 'reservation-item';
            
            const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
            
            const summary = document.createElement('div');
            summary.style.cssText = 'display: flex; justify-content: space-between; align-items: center;';
            const badgeContainer = document.createElement('div');
            badgeContainer.appendChild(statusBadge);
            summary.append(
                InnDesk.utils.createElement('span', { text: InnDesk.utils.formatCurrency(reservation.total_amount || 0) }),
                badgeContainer
            );
            item.append(
                InnDesk.utils.createElement('div', {
                    className: 'reservation-client',
                    text: `${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}`
                }),
                InnDesk.utils.createElement('div', {
                    className: 'reservation-dates',
                    text: `${InnDesk.utils.formatShortDate(reservation.check_in_date)} → ${InnDesk.utils.formatShortDate(reservation.check_out_date)}`
                }),
                summary
            );
            
            recentReservationsList.appendChild(item);
        });
    }

    modal.classList.add('show');
}

function createRoomInfoItem(label, value) {
    const item = InnDesk.utils.createElement('div', { className: 'room-info-item' });
    const valueElement = InnDesk.utils.createElement('div', { className: 'room-info-value' });
    if (value instanceof Node) valueElement.appendChild(value);
    else valueElement.textContent = String(value ?? '');
    item.append(
        InnDesk.utils.createElement('div', { className: 'room-info-label', text: label }),
        valueElement
    );
    return item;
}

function closeRoomModal() {
    const modal = document.getElementById('roomModal');
    modal.classList.remove('show');
}
