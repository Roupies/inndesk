// @file: assets/js/reservations/checkin.js
// @depends: state.js, utils.js

let checkinReservations = [];
let checkinSearchTerm = '';

function initCheckinTab() {
    document.getElementById('tabReservations').addEventListener('click', () => switchTab('reservations'));
    document.getElementById('tabCheckin').addEventListener('click', () => {
        switchTab('checkin');
        loadCheckinList();
    });

    document.getElementById('checkinSearch').addEventListener('input', (e) => {
        checkinSearchTerm = e.target.value.toLowerCase();
        renderCheckinList();
    });
}

function switchTab(tab) {
    const isCheckin = tab === 'checkin';

    document.getElementById('tabReservations').classList.toggle('active', !isCheckin);
    document.getElementById('tabCheckin').classList.toggle('active', isCheckin);
    document.getElementById('tabReservations').setAttribute('aria-selected', String(!isCheckin));
    document.getElementById('tabCheckin').setAttribute('aria-selected', String(isCheckin));

    document.getElementById('panelReservations').classList.toggle('active', !isCheckin);
    document.getElementById('panelCheckin').classList.toggle('active', isCheckin);
}

async function loadCheckinList() {
    const tbody = document.getElementById('checkinTbody');
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: var(--space-8); color: var(--text-muted);">Chargement...</td></tr>`;

    try {
        const today = new Date().toISOString().split('T')[0];
        const data = await InnDesk.api.reservations.getAll({
            reservation_status: 'confirmed',
            limit: 500
        });
        checkinReservations = data.filter(r => r.check_in_date <= today);
        renderCheckinList();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: var(--space-8); color: var(--color-maintenance);">Erreur lors du chargement</td></tr>`;
    }
}

function renderCheckinList() {
    const tbody = document.getElementById('checkinTbody');
    const filtered = checkinReservations.filter(r => {
        if (!checkinSearchTerm) return true;
        const clientName = `${r.client?.first_name || ''} ${r.client?.last_name || ''}`.toLowerCase();
        const roomNumber = (r.room?.number || '').toLowerCase();
        return clientName.includes(checkinSearchTerm) || roomNumber.includes(checkinSearchTerm);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: var(--space-8); color: var(--text-muted); font-style: italic;">Aucune arrivée en attente</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    filtered.forEach(r => {
        const row = buildCheckinRow(r);
        tbody.appendChild(row);
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function buildCheckinRow(r) {
    const row = document.createElement('tr');
    row.dataset.id = r.id;

    const clientName = `${r.client?.first_name || ''} ${r.client?.last_name || 'Client inconnu'}`;
    const roomTypeName = r.room_type?.name || '—';
    const roomDisplay = r.room ? `N°${r.room.number}` : '<span style="color: var(--text-muted); font-style: italic;">Non assignée</span>';

    row.innerHTML = `
        <td>${clientName}</td>
        <td>${roomTypeName}</td>
        <td>${roomDisplay}</td>
        <td>${InnDesk.utils.formatDate(r.check_in_date)}</td>
        <td>${InnDesk.utils.formatDate(r.check_out_date)}</td>
        <td class="checkin-action-cell"></td>
    `;

    const actionCell = row.querySelector('.checkin-action-cell');
    actionCell.appendChild(buildCheckinAction(r, row));

    return row;
}

function buildCheckinAction(r, row) {
    if (r.room_id) {
        return buildDirectCheckinBtn(r, row);
    }
    return buildRoomSelectorAction(r, row);
}

function buildDirectCheckinBtn(r, row) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = 'Check-in';
    btn.addEventListener('click', () => performCheckin(r, r.room_id, r.room?.number, row));
    return btn;
}

function buildRoomSelectorAction(r, row) {
    const wrapper = document.createElement('div');
    wrapper.className = 'inline-room-selector';

    const selectId = `room-select-${r.id}`;
    const label = document.createElement('label');
    label.setAttribute('for', selectId);
    label.textContent = 'Chambre :';
    label.style.fontSize = 'var(--text-sm)';
    label.style.whiteSpace = 'nowrap';

    const select = document.createElement('select');
    select.id = selectId;
    select.innerHTML = '<option value="">Chargement...</option>';
    select.disabled = true;

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = 'Check-in';
    btn.disabled = true;

    InnDesk.api.reservations.getAvailableRooms(
        r.room_type_id,
        r.check_in_date,
        r.check_out_date
    ).then(rooms => {
        if (rooms.length === 0) {
            select.innerHTML = '<option value="">Aucune chambre dispo</option>';
            return;
        }
        select.innerHTML = '<option value="">Choisir...</option>' +
            rooms.map(rm => `<option value="${rm.id}" data-number="${rm.number}">N°${rm.number} — Étage ${rm.floor}</option>`).join('');
        select.disabled = false;

        select.addEventListener('change', () => {
            btn.disabled = !select.value;
        });

        btn.addEventListener('click', async () => {
            if (!select.value) return;
            const selectedOpt = select.options[select.selectedIndex];
            const roomNumber = selectedOpt.dataset.number;
            btn.disabled = true;
            btn.textContent = '...';

            try {
                await InnDesk.api.reservations.assignRoom(r.id, parseInt(select.value));
                await performCheckin(r, parseInt(select.value), roomNumber, row);
            } catch (err) {
                showToast(err.detail || 'Erreur lors de l\'assignation', 'error');
                btn.disabled = false;
                btn.textContent = 'Check-in';
            }
        });
    }).catch(() => {
        select.innerHTML = '<option value="">Erreur de chargement</option>';
    });

    wrapper.appendChild(label);
    wrapper.appendChild(select);
    wrapper.appendChild(btn);
    return wrapper;
}

async function performCheckin(r, roomId, roomNumber, row) {
    try {
        await InnDesk.api.reservations.updateStatus(r.id, 'checked_in');

        row.classList.add('checkin-row-removing');
        showToast(`Check-in effectué — Chambre ${roomNumber || roomId}`, 'success');

        checkinReservations = checkinReservations.filter(res => res.id !== r.id);

        setTimeout(() => {
            row.remove();
            const tbody = document.getElementById('checkinTbody');
            if (!tbody.querySelector('tr[data-id]')) {
                renderCheckinList();
            }
        }, 650);

    } catch (err) {
        showToast(err.detail || 'Erreur lors du check-in', 'error');
    }
}
