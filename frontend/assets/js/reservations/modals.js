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

let _drawerEscapeHandler = null;
let _drawerOpener = null;

function openReservationDrawer(reservation) {
    _drawerOpener = document.activeElement;

    const drawer = document.getElementById('reservationDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const nights = calculateNights(reservation.check_in_date, reservation.check_out_date);

    document.getElementById('drawerResId').textContent = reservation.id;

    const body = document.getElementById('drawerBody');
    body.innerHTML = '';

    // Section: Statut
    const statusSection = document.createElement('div');
    const statusBadge = InnDesk.utils.createStatusBadge(reservation.status);
    statusBadge.style.cssText = 'font-size: var(--text-base); padding: var(--space-2) var(--space-4);';
    statusSection.style.textAlign = 'center';
    statusSection.appendChild(statusBadge);
    body.appendChild(statusSection);

    // Section: Client
    const clientSection = document.createElement('div');
    clientSection.innerHTML = `
        <div class="drawer-section-title">Client</div>
        <div class="drawer-field-grid">
            <div class="drawer-field">
                <span class="drawer-field-label">Nom complet</span>
                <span class="drawer-field-value">${escapeHtml((reservation.client?.first_name || '') + ' ' + (reservation.client?.last_name || 'Client inconnu'))}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Email</span>
                <span class="drawer-field-value">${escapeHtml(reservation.client?.email) || '—'}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Téléphone</span>
                <span class="drawer-field-value">${escapeHtml(reservation.client?.phone) || '—'}</span>
            </div>
        </div>
    `;
    body.appendChild(clientSection);

    // Section: Séjour
    const staySection = document.createElement('div');
    staySection.innerHTML = `
        <div class="drawer-section-title">Séjour</div>
        <div class="drawer-field-grid">
            <div class="drawer-field">
                <span class="drawer-field-label">Chambre</span>
                <span class="drawer-field-value">${reservation.room?.number ? 'N°' + escapeHtml(reservation.room.number) : 'Non assignée'}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Catégorie</span>
                <span class="drawer-field-value">${reservation.room_type?.name || 'Type inconnu'}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Arrivée</span>
                <span class="drawer-field-value">${InnDesk.utils.formatDate(reservation.check_in_date)}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Départ</span>
                <span class="drawer-field-value">${InnDesk.utils.formatDate(reservation.check_out_date)}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Nuits</span>
                <span class="drawer-field-value">${nights}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Adultes</span>
                <span class="drawer-field-value">${reservation.adults}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Enfants</span>
                <span class="drawer-field-value">${reservation.children}</span>
            </div>
        </div>
    `;
    body.appendChild(staySection);

    // Section: Facturation
    const billingSection = document.createElement('div');
    billingSection.innerHTML = `
        <div class="drawer-section-title">Facturation</div>
        <div class="drawer-field-grid">
            <div class="drawer-field">
                <span class="drawer-field-label">Montant total</span>
                <span class="drawer-field-value">${reservation.total_amount ? InnDesk.utils.formatCurrency(reservation.total_amount) : '—'}</span>
            </div>
            <div class="drawer-field">
                <span class="drawer-field-label">Prix / nuit</span>
                <span class="drawer-field-value">${reservation.room_type?.price_per_night ? InnDesk.utils.formatCurrency(reservation.room_type.price_per_night) : '—'}</span>
            </div>
        </div>
    `;
    body.appendChild(billingSection);

    // Section: Notes
    if (reservation.notes) {
        const notesSection = document.createElement('div');
        notesSection.innerHTML = `
            <div class="drawer-section-title">Notes</div>
            <p style="font-size: var(--text-sm); color: var(--text); margin: 0;">${escapeHtml(reservation.notes)}</p>
        `;
        body.appendChild(notesSection);
    }

    // Actions
    const actionsEl = document.getElementById('drawerActions');
    actionsEl.innerHTML = '';

    const statusBtn = document.createElement('button');
    statusBtn.className = 'btn btn-primary';
    statusBtn.textContent = 'Changer de statut';
    statusBtn.onclick = () => {
        closeReservationDrawer();
        openStatusChangeModal(reservation);
    };
    actionsEl.appendChild(statusBtn);

    if (reservation.status === 'confirmed' && !reservation.room_id) {
        const assignBtn = document.createElement('button');
        assignBtn.className = 'btn btn-secondary';
        assignBtn.textContent = 'Assigner une chambre';
        assignBtn.onclick = () => {
            closeReservationDrawer();
            openAssignRoomModal(reservation);
        };
        actionsEl.appendChild(assignBtn);
    }

    // Focus trap handler
    const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    function trapFocus(e) {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(drawer.querySelectorAll(focusableSelectors)).filter(el => !el.disabled);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
            if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
    }

    function onKeydown(e) {
        if (e.key === 'Escape') closeReservationDrawer();
        trapFocus(e);
    }

    if (_drawerEscapeHandler) document.removeEventListener('keydown', _drawerEscapeHandler);
    _drawerEscapeHandler = onKeydown;
    document.addEventListener('keydown', _drawerEscapeHandler);

    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden';

    lucide.createIcons();

    document.getElementById('drawerCloseBtn').focus();
}

function closeReservationDrawer() {
    const drawer = document.getElementById('reservationDrawer');
    const overlay = document.getElementById('drawerOverlay');

    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';

    if (_drawerEscapeHandler) {
        document.removeEventListener('keydown', _drawerEscapeHandler);
        _drawerEscapeHandler = null;
    }

    if (_drawerOpener && typeof _drawerOpener.focus === 'function') {
        _drawerOpener.focus();
        _drawerOpener = null;
    }
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