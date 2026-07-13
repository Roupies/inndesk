// @file: assets/js/reservations/modals.js
// @depends: state.js, utils.js, render.js

// Modal functions
function openCreateReservationModal() {
    const modal = document.getElementById('createReservationModal');
    
    document.getElementById('createReservationForm').reset();
    document.getElementById('selectedClientId').value = '';
    document.querySelectorAll('.field-error').forEach(el => el.remove());
    
    document.getElementById('newClientSection').style.display = 'block';
    document.getElementById('existingClientSection').style.display = 'none';
    document.querySelector('input[name="clientType"][value="new"]').checked = true;
    
    // Re-enable required on new client fields after reset
    ['newClientFirstName', 'newClientLastName'].forEach(id => {
        document.getElementById(id).required = true;
    });

    ['availabilityStatus', 'paxValidation', 'priceEstimate'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });
    
    document.getElementById('createSubmitBtn').disabled = false;
    
    modal.classList.add('show');
    setMinimumDates();
}

function closeCreateReservationModal() {
    document.getElementById('createReservationModal').classList.remove('show');
}

async function openAssignRoomModal(reservation) {
    selectedReservation = reservation;
    const modal = document.getElementById('assignRoomModal');
    const content = document.getElementById('assignRoomContent');
    
    content.innerHTML = '<div class="skeleton skeleton-text"></div>';
    modal.classList.add('show');

    try {
        const availableRooms = await InnDesk.api.reservations.getAvailableRooms(
            reservation.room_type_id, 
            reservation.check_in_date, 
            reservation.check_out_date
        );

        if (availableRooms.length === 0) {
            content.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: var(--space-4);">Aucune chambre disponible — vérifiez les dates</p>';
            document.getElementById('assignRoomBtn').disabled = true;
        } else {
            const roomsList = availableRooms.map(room => `
                <div class="room-radio-item">
                    <input type="radio" name="selectedRoom" value="${room.id}" id="room_${room.id}">
                    <label for="room_${room.id}">Chambre ${room.number} — Étage ${room.floor}</label>
                </div>
            `).join('');

            content.innerHTML = `
                <div class="room-radio-list">
                    ${roomsList}
                </div>
            `;
            document.getElementById('assignRoomBtn').disabled = false;
        }
    } catch (error) {
        content.innerHTML = '<p style="color: var(--color-maintenance); text-align: center; padding: var(--space-4);">Erreur lors du chargement des chambres disponibles</p>';
        document.getElementById('assignRoomBtn').disabled = true;
    }
}

function closeAssignRoomModal() {
    document.getElementById('assignRoomModal').classList.remove('show');
    selectedReservation = null;
}

async function confirmAssignRoom() {
    const selectedRoom = document.querySelector('input[name="selectedRoom"]:checked');
    if (!selectedRoom) {
        showToast('Veuillez sélectionner une chambre', 'error');
        return;
    }

    try {
        await InnDesk.api.reservations.assignRoom(selectedReservation.id, parseInt(selectedRoom.value));
        closeAssignRoomModal();
        showToast('Chambre assignée avec succès', 'success');
        await loadData(); // Reload to update the table
    } catch (error) {
        showToast(error.detail || 'Erreur lors de l\'assignation', 'error');
    }
}

function openStatusChangeModal(reservation) {
    selectedReservation = reservation;
    const modal = document.getElementById('statusChangeModal');
    const currentBadge = document.getElementById('currentStatusBadge');
    const newStatusSelect = document.getElementById('newStatus');

    currentBadge.innerHTML = '';
    currentBadge.appendChild(InnDesk.utils.createStatusBadge(reservation.status));

    const transitions = {
        'confirmed': ['checked_in', 'cancelled', 'no_show'],
        'checked_in': ['checked_out']
    };

    const allowedStatuses = transitions[reservation.status] || [];
    newStatusSelect.innerHTML = '';

    if (allowedStatuses.length === 0) {
        newStatusSelect.innerHTML = '<option value="">Aucun changement autorisé</option>';
        newStatusSelect.disabled = true;
    } else {
        newStatusSelect.disabled = false;
        newStatusSelect.innerHTML = '<option value="">Sélectionner un nouveau statut...</option>';
        
        allowedStatuses.forEach(status => {
            // Check if trying to check-in without room assignment
            if (status === 'checked_in' && !reservation.room_id) {
                const option = document.createElement('option');
                option.value = '';
                option.textContent = 'Check-in (assignez d\'abord une chambre)';
                option.disabled = true;
                option.title = 'Assignez d\'abord une chambre';
                newStatusSelect.appendChild(option);
            } else {
                const option = document.createElement('option');
                option.value = status;
                option.textContent = InnDesk.utils.statusLabel(status);
                newStatusSelect.appendChild(option);
            }
        });
    }

    modal.classList.add('show');
}

function closeStatusChangeModal() {
    document.getElementById('statusChangeModal').classList.remove('show');
    selectedReservation = null;
}

function openDetailModal(reservation) {
    const modal = document.getElementById('detailReservationModal');
    const title = document.getElementById('detailModalTitle');
    const grid = document.getElementById('detailGrid');

    title.textContent = `Réservation #${reservation.id}`;

    const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);

    grid.innerHTML = `
        <div class="detail-item">
            <div class="detail-label">Client</div>
            <div class="detail-value">${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Email</div>
            <div class="detail-value">${reservation.client?.email || '—'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Téléphone</div>
            <div class="detail-value">${reservation.client?.phone || '—'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Catégorie</div>
            <div class="detail-value">${reservation.room_type?.name || 'Type inconnu'} (${reservation.room_type?.price_per_night ? InnDesk.utils.formatCurrency(reservation.room_type.price_per_night) + '/nuit' : ''})</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Chambre</div>
            <div class="detail-value">${reservation.room?.number ? 'N°' + reservation.room.number : 'Non assignée'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Étage</div>
            <div class="detail-value">${reservation.room?.floor || '—'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Arrivée</div>
            <div class="detail-value">${InnDesk.utils.formatDate(reservation.check_in_date)}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Départ</div>
            <div class="detail-value">${InnDesk.utils.formatDate(reservation.check_out_date)}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Nuits</div>
            <div class="detail-value">${nights}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Adultes</div>
            <div class="detail-value">${reservation.adults}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Enfants</div>
            <div class="detail-value">${reservation.children}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Statut</div>
            <div class="detail-value"></div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Montant</div>
            <div class="detail-value">${reservation.total_amount ? InnDesk.utils.formatCurrency(reservation.total_amount) : '—'}</div>
        </div>
        <div class="detail-item">
            <div class="detail-label">Créée le</div>
            <div class="detail-value">${InnDesk.utils.formatDateTime(reservation.created_at)}</div>
        </div>
    `;

    // Add status badge to detail
    const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
    grid.querySelector('.detail-item:nth-child(12) .detail-value').appendChild(statusBadge);

    // Add notes if present
    if (reservation.notes) {
        const notesItem = document.createElement('div');
        notesItem.className = 'detail-item full-width';
        notesItem.innerHTML = `
            <div class="detail-label">Notes</div>
            <div class="detail-value">${reservation.notes}</div>
        `;
        grid.appendChild(notesItem);
    }

    modal.classList.add('show');
}

function closeDetailModal() {
    document.getElementById('detailReservationModal').classList.remove('show');
}

// Delete confirmation
function showDeleteConfirmation(reservationId, row) {
    const confirmRow = document.createElement('tr');
    confirmRow.className = 'confirm-delete-row';
    confirmRow.innerHTML = `
        <td colspan="10" style="text-align: center; padding: var(--space-4); background: var(--color-maintenance); color: white;">
            Supprimer cette réservation ?
            <button class="btn btn-ghost btn-sm" style="margin-left: var(--space-3); color: white; border-color: white;" onclick="confirmDelete(${reservationId})">
                Confirmer
            </button>
            <button class="btn btn-ghost btn-sm" style="margin-left: var(--space-2); color: white; border-color: white;" onclick="cancelDelete(this)">
                Annuler
            </button>
        </td>
    `;

    row.parentNode.insertBefore(confirmRow, row.nextSibling);
    row.style.display = 'none';
}

async function confirmDelete(reservationId) {
    try {
        await InnDesk.api.reservations.delete(reservationId);
        showToast('Réservation supprimée avec succès', 'success');
        await loadData();
    } catch (error) {
        showToast(error.detail || 'Erreur lors de la suppression', 'error');
    }
}

function cancelDelete(button) {
    const confirmRow = button.closest('tr');
    const originalRow = confirmRow.previousElementSibling;
    originalRow.style.display = '';
    confirmRow.remove();
}