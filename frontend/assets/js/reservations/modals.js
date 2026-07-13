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
            setAssignRoomMessage(content, 'Aucune chambre disponible — vérifiez les dates', 'var(--text-muted)');
            document.getElementById('assignRoomBtn').disabled = true;
        } else {
            const roomsList = InnDesk.utils.createElement('div', { className: 'room-radio-list' });
            availableRooms.forEach((room, index) => {
                const item = InnDesk.utils.createElement('div', { className: 'room-radio-item' });
                const input = document.createElement('input');
                const inputId = `assign_room_${index}`;
                input.type = 'radio';
                input.name = 'selectedRoom';
                input.value = String(room.id);
                input.id = inputId;
                const label = document.createElement('label');
                label.htmlFor = inputId;
                label.textContent = `Chambre ${room.number} — Étage ${room.floor}`;
                item.append(input, label);
                roomsList.appendChild(item);
            });
            content.replaceChildren(roomsList);
            document.getElementById('assignRoomBtn').disabled = false;
        }
    } catch (error) {
        setAssignRoomMessage(content, 'Erreur lors du chargement des chambres disponibles', 'var(--color-maintenance)');
        document.getElementById('assignRoomBtn').disabled = true;
    }
}

function setAssignRoomMessage(content, message, color) {
    const paragraph = InnDesk.utils.createElement('p', { text: message });
    paragraph.style.cssText = `color: ${color}; text-align: center; padding: var(--space-4);`;
    content.replaceChildren(paragraph);
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

    currentBadge.replaceChildren();
    currentBadge.appendChild(InnDesk.utils.createStatusBadge(reservation.status));

    const transitions = {
        'confirmed': ['checked_in', 'cancelled', 'no_show'],
        'checked_in': ['checked_out']
    };

    const allowedStatuses = transitions[reservation.status] || [];
    newStatusSelect.replaceChildren();

    if (allowedStatuses.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Aucun changement autorisé';
        newStatusSelect.appendChild(option);
        newStatusSelect.disabled = true;
    } else {
        newStatusSelect.disabled = false;
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Sélectionner un nouveau statut...';
        newStatusSelect.appendChild(placeholder);
        
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
    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('reservationDrawer');
    const reservationId = document.getElementById('drawerResId');
    const body = document.getElementById('drawerBody');
    const actions = document.getElementById('drawerActions');
    if (!overlay || !drawer || !reservationId || !body || !actions) return;

    reservationId.textContent = String(reservation.id);
    InnDesk.utils.clearElement(body);
    InnDesk.utils.clearElement(actions);

    const section = document.createElement('section');
    const title = document.createElement('h3');
    title.className = 'drawer-section-title';
    title.textContent = 'Détails du séjour';
    const grid = document.createElement('div');
    grid.className = 'drawer-field-grid';
    const fields = [
        ['Client', `${reservation.client?.first_name || ''} ${reservation.client?.last_name || 'Client inconnu'}`.trim()],
        ['Email', reservation.client?.email || '—'],
        ['Téléphone', reservation.client?.phone || '—'],
        ['Catégorie', reservation.room_type?.name || 'Type inconnu'],
        ['Chambre', reservation.room?.number ? `N° ${reservation.room.number}` : 'Non assignée'],
        ['Arrivée', InnDesk.utils.formatDate(reservation.check_in_date)],
        ['Départ', InnDesk.utils.formatDate(reservation.check_out_date)],
        ['Nuits', calculateNights(reservation.check_in_date, reservation.check_out_date)],
        ['Adultes', reservation.adults ?? '—'],
        ['Enfants', reservation.children ?? '—'],
        ['Montant', reservation.total_amount ? InnDesk.utils.formatCurrency(reservation.total_amount) : '—']
    ];
    fields.forEach(([label, value]) => {
        const field = document.createElement('div');
        field.className = 'drawer-field';
        const labelElement = document.createElement('span');
        labelElement.className = 'drawer-field-label';
        labelElement.textContent = label;
        const valueElement = document.createElement('span');
        valueElement.className = 'drawer-field-value';
        valueElement.textContent = String(value);
        field.append(labelElement, valueElement);
        grid.appendChild(field);
    });
    section.append(title, grid);
    body.appendChild(section);

    const statusSection = document.createElement('section');
    const statusTitle = document.createElement('h3');
    statusTitle.className = 'drawer-section-title';
    statusTitle.textContent = 'Statut';
    statusSection.append(statusTitle, InnDesk.utils.createStatusBadge(reservation.status));
    body.appendChild(statusSection);

    if (reservation.notes) {
        const notesSection = document.createElement('section');
        const notesTitle = document.createElement('h3');
        notesTitle.className = 'drawer-section-title';
        notesTitle.textContent = 'Notes';
        const notes = document.createElement('p');
        notes.textContent = reservation.notes;
        notesSection.append(notesTitle, notes);
        body.appendChild(notesSection);
    }

    overlay.classList.add('open');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
}

function closeDetailModal() {
    const overlay = document.getElementById('drawerOverlay');
    const drawer = document.getElementById('reservationDrawer');
    if (overlay) overlay.classList.remove('open');
    if (drawer) {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
    }
}

// Delete confirmation
function showDeleteConfirmation(reservationId, row) {
    const confirmRow = document.createElement('tr');
    confirmRow.className = 'confirm-delete-row';
    const cell = document.createElement('td');
    cell.colSpan = 10;
    cell.style.cssText = 'text-align: center; padding: var(--space-4); background: var(--color-maintenance); color: white;';
    const confirmButton = InnDesk.utils.createElement('button', {
        className: 'btn btn-ghost btn-sm',
        text: 'Confirmer',
        attributes: { type: 'button' }
    });
    confirmButton.style.cssText = 'margin-left: var(--space-3); color: white; border-color: white;';
    confirmButton.addEventListener('click', () => confirmDelete(reservationId));
    const cancelButton = InnDesk.utils.createElement('button', {
        className: 'btn btn-ghost btn-sm',
        text: 'Annuler',
        attributes: { type: 'button' }
    });
    cancelButton.style.cssText = 'margin-left: var(--space-2); color: white; border-color: white;';
    cancelButton.addEventListener('click', () => cancelDelete(cancelButton));
    cell.append(document.createTextNode('Supprimer cette réservation ?'), confirmButton, cancelButton);
    confirmRow.appendChild(cell);

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
