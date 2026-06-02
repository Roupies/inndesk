// @file: assets/js/dashboard/render.js

// Load KPI data
async function loadKPIs() {
    try {
        const [rooms, reservations] = await Promise.all([
            InnDesk.api.rooms.getAll(),
            InnDesk.api.reservations.getAll({ limit: 100 })
        ]);

        // Calculate KPIs
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

        // Update KPI cards
        document.getElementById('availableRoomsCard').innerHTML = `
            <div class="kpi-value">${availableRooms}</div>
            <div class="kpi-label">Chambres disponibles</div>
        `;

        document.getElementById('arrivalsCard').innerHTML = `
            <div class="kpi-value">${arrivalsToday}</div>
            <div class="kpi-label">Arrivées aujourd'hui</div>
        `;

        document.getElementById('departuresCard').innerHTML = `
            <div class="kpi-value">${departuresToday}</div>
            <div class="kpi-label">Départs aujourd'hui</div>
        `;

        document.getElementById('occupancyCard').innerHTML = `
            <div class="kpi-value">${occupancyRate}%</div>
            <div class="kpi-label">Taux d'occupation</div>
        `;

    } catch (error) {
        ['availableRoomsCard', 'arrivalsCard', 'departuresCard', 'occupancyCard'].forEach(id => {
            InnDesk.utils.showError(document.getElementById(id));
        });
    }
}

// Load active reservations
async function loadActiveReservations() {
    try {
        const reservations = await InnDesk.api.reservations.getAll({ 
            limit: 8,
            status: 'confirmed,checked_in'
        });

        const tbody = document.querySelector('#reservationsTable tbody');
        tbody.innerHTML = '';

        if (reservations.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center" style="color: var(--text-muted); font-style: italic;">
                        Aucune réservation active
                    </td>
                </tr>
            `;
        } else {
            reservations
                .sort((a, b) => new Date(a.check_in_date) - new Date(b.check_in_date))
                .forEach(reservation => {
                    const row = document.createElement('tr');
                    
                    // Create status badge
                    const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
                    
                    row.innerHTML = `
                        <td>${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}</td>
                        <td>Chambre ${reservation.room?.number || '?'}</td>
                        <td>${InnDesk.utils.formatShortDate(reservation.check_in_date)}</td>
                        <td>${InnDesk.utils.formatShortDate(reservation.check_out_date)}</td>
                        <td></td>
                        <td>${InnDesk.utils.formatCurrency(reservation.total_amount)}</td>
                    `;
                    
                    // Add status badge
                    row.cells[4].appendChild(statusBadge);
                    
                    tbody.appendChild(row);
                });
        }

    } catch (error) {
        const tbody = document.querySelector('#reservationsTable tbody');
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="error-message">
                    Erreur lors du chargement des réservations
                </td>
            </tr>
        `;
    }
}

// Load room status
async function loadRoomStatus() {
    try {
        const rooms = await InnDesk.api.rooms.getAll();
        
        const roomsGrid = document.getElementById('roomsGrid');
        roomsGrid.innerHTML = '';

        if (rooms.length === 0) {
            InnDesk.utils.showError(roomsGrid, 'Aucune chambre trouvée');
        } else {
            // Sort rooms by floor then number
            rooms.sort((a, b) => {
                if (a.floor !== b.floor) return a.floor - b.floor;
                return a.number.localeCompare(b.number, undefined, { numeric: true });
            });

            rooms.forEach(room => {
                const roomCard = document.createElement('div');
                roomCard.className = `room-card status-${room.status}`;
                
                roomCard.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 4px;">
                        Chambre ${room.number}
                    </div>
                    <div style="font-size: var(--text-xs); color: var(--text-secondary); margin-bottom: 8px;">
                        Étage ${room.floor} • ${room.room_type?.name || 'Type inconnu'}
                    </div>
                    <div></div>
                `;
                
                // Add status badge
                const statusBadge = InnDesk.utils.createStatusBadge(room.status);
                roomCard.lastElementChild.appendChild(statusBadge);
                
                roomsGrid.appendChild(roomCard);
            });
        }

    } catch (error) {
        InnDesk.utils.showError(document.getElementById('roomsGrid'));
    }
}

// Load recent activity
async function loadRecentActivity() {
    try {
        const reservations = await InnDesk.api.reservations.getAll({ 
            limit: 5 
        });

        const recentActivity = document.getElementById('recentActivity');
        recentActivity.innerHTML = '';

        if (reservations.length === 0) {
            InnDesk.utils.showError(recentActivity, 'Aucune activité récente');
        } else {
            // Sort by creation date (most recent first)
            reservations
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5)
                .forEach((reservation, index) => {
                    const activityItem = document.createElement('div');
                    activityItem.className = 'flex items-center';
                    activityItem.style.cssText = `
                        padding: 12px 0; 
                        ${index < 4 ? 'border-bottom: 1px solid var(--border);' : ''}
                    `;
                    
                    const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
                    
                    activityItem.innerHTML = `
                        <div style="flex: 1;">
                            <div style="font-weight: 500; margin-bottom: 2px;">
                                ${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'} - Chambre ${reservation.room?.number || '?'}
                            </div>
                            <div style="font-size: var(--text-xs); color: var(--text-secondary);">
                                ${InnDesk.utils.formatDateTime(reservation.created_at)}
                            </div>
                        </div>
                        <div style="margin-left: 12px;"></div>
                    `;
                    
                    // Add status badge
                    activityItem.lastElementChild.appendChild(statusBadge);
                    
                    recentActivity.appendChild(activityItem);
                });
        }

    } catch (error) {
        InnDesk.utils.showError(document.getElementById('recentActivity'));
    }
}