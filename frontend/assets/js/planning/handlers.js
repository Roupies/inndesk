// @file: assets/js/planning/handlers.js
// @depends: state.js, render.js

async function fetchData() {
    const fetchId = ++state.fetchId;

    state.loading = true;
    render();

    const margin = 1;
    const fetchStart = toYMD(addDays(state.windowStart, -margin));
    const fetchEnd = toYMD(addDays(state.windowStart, state.nbDays + margin));

    try {
        const [rooms, reservations] = await Promise.all([
            InnDesk.api.rooms.getAll({ limit: 200 }),
            InnDesk.api.reservations.getByRange(fetchStart, fetchEnd)
        ]);

        if (fetchId !== state.fetchId) return;

        buildRows(Array.isArray(rooms) ? rooms : (rooms.items || []));
        state.reservations = Array.isArray(reservations) ? reservations : (reservations.items || []);
        state.loading = false;
        render();
    } catch (err) {
        if (fetchId !== state.fetchId) return;
        state.loading = false;
        const grid = document.getElementById('pgGrid');
        grid.innerHTML = `<div class="pg-error" style="grid-column:1/-1;grid-row:2;" role="alert">
            Impossible de charger le planning.
            <button class="btn btn-ghost btn-sm" onclick="fetchData()" style="margin-left:var(--space-3);">Réessayer</button>
        </div>`;
        renderWindowLabel();
    }
}

function navigateDays(delta) {
    state.windowStart = addDays(state.windowStart, delta);
    fetchData();
}

function goToday() {
    state.windowStart = mondayOf(new Date());
    fetchData();
}

function setNbDays(n) {
    state.nbDays = n;
    fetchData();
}

function openDetailModal(reservationId) {
    const modal = document.getElementById('pgDetailModal');
    const body = document.getElementById('pgDetailBody');
    const actions = document.getElementById('pgDetailActions');

    body.innerHTML = '<div class="pg-modal-loading">Chargement…</div>';
    actions.innerHTML = '';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    InnDesk.api.reservations.getById(reservationId).then(r => {
        if (!modal.classList.contains('show')) return;

        const nights = nightsCount(r.check_in_date, r.check_out_date);
        const roomLabel = r.room?.number ? `Chambre ${escapeHtml(r.room.number)}` : 'Non assignée';
        const typeLabel = r.room_type?.name ? escapeHtml(r.room_type.name) : '—';
        const clientName = `${r.client?.first_name || ''} ${r.client?.last_name || 'Client'}`.trim();

        body.innerHTML = `
            <div class="pg-detail-section">
                <div class="pg-detail-badge-row">${buildStatusBadgeHtml(r.status)}</div>
            </div>
            <div class="pg-detail-section">
                <div class="pg-detail-section-title">Client</div>
                <div class="pg-detail-grid">
                    <span class="pg-detail-label">Nom</span><span>${escapeHtml(clientName)}</span>
                    <span class="pg-detail-label">Email</span><span>${escapeHtml(r.client?.email || '—')}</span>
                    <span class="pg-detail-label">Tél.</span><span>${escapeHtml(r.client?.phone || '—')}</span>
                </div>
            </div>
            <div class="pg-detail-section">
                <div class="pg-detail-section-title">Séjour</div>
                <div class="pg-detail-grid">
                    <span class="pg-detail-label">Chambre</span><span>${roomLabel} — ${typeLabel}</span>
                    <span class="pg-detail-label">Arrivée</span><span>${formatDateFr(r.check_in_date)}</span>
                    <span class="pg-detail-label">Départ</span><span>${formatDateFr(r.check_out_date)}</span>
                    <span class="pg-detail-label">Nuits</span><span>${nights}</span>
                    <span class="pg-detail-label">Adultes</span><span>${r.adults}</span>
                    ${r.children > 0 ? `<span class="pg-detail-label">Enfants</span><span>${r.children}</span>` : ''}
                </div>
            </div>
            ${r.total_amount ? `<div class="pg-detail-section">
                <div class="pg-detail-section-title">Facturation</div>
                <div class="pg-detail-grid">
                    <span class="pg-detail-label">Total</span><span>${InnDesk.utils.formatCurrency(r.total_amount)}</span>
                </div>
            </div>` : ''}
            ${r.notes ? `<div class="pg-detail-section">
                <div class="pg-detail-section-title">Notes</div>
                <p style="font-size:var(--text-sm);margin:0;">${escapeHtml(r.notes)}</p>
            </div>` : ''}
        `;

        const todayYMD = toYMD(new Date());

        if (r.status === 'confirmed') {
            if (r.check_in_date === todayYMD) {
                const ciBtn = document.createElement('button');
                ciBtn.className = 'btn btn-primary';
                ciBtn.textContent = 'Check-in';
                ciBtn.onclick = () => doCheckin(r.id);
                actions.appendChild(ciBtn);
            }
            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-ghost';
            cancelBtn.textContent = 'Annuler';
            cancelBtn.onclick = () => doCancel(r.id);
            actions.appendChild(cancelBtn);
        }

        if (r.status === 'checked_in') {
            const coBtn = document.createElement('button');
            coBtn.className = 'btn btn-primary';
            coBtn.textContent = 'Check-out';
            coBtn.onclick = () => doCheckout(r.id);
            actions.appendChild(coBtn);
        }

        if (!r.room_id && r.status === 'confirmed') {
            const assignBtn = document.createElement('button');
            assignBtn.className = 'btn btn-secondary';
            assignBtn.textContent = 'Assigner une chambre';
            assignBtn.onclick = () => {
                closeDetailModal();
                window.location.href = `/app/reservations.html`;
            };
            actions.appendChild(assignBtn);
        }
    }).catch(() => {
        body.innerHTML = `<div class="pg-error" role="alert">Erreur lors du chargement de la réservation.</div>`;
    });
}

function buildStatusBadgeHtml(status) {
    const labels = {
        confirmed: 'Confirmée', checked_in: 'En séjour',
        checked_out: 'Départ', cancelled: 'Annulée', no_show: 'No-show'
    };
    const colorMap = {
        confirmed: 'badge-amber', checked_in: 'badge-green',
        checked_out: 'badge-gray', cancelled: 'badge-red', no_show: 'badge-red'
    };
    return `<span class="badge ${colorMap[status] || 'badge-gray'}">${labels[status] || status}</span>`;
}

function closeDetailModal() {
    const modal = document.getElementById('pgDetailModal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

async function doCheckin(id) {
    try {
        await apiFetch(`/reservations/${id}/`, { method: 'PATCH', body: JSON.stringify({ status: 'checked_in' }) });
        closeDetailModal();
        showToast('Check-in effectué', 'success');
        fetchData();
    } catch (err) {
        showToast(err.detail || 'Erreur lors du check-in', 'error');
    }
}

async function doCheckout(id) {
    try {
        await apiFetch(`/reservations/${id}/`, { method: 'PATCH', body: JSON.stringify({ status: 'checked_out' }) });
        closeDetailModal();
        showToast('Check-out effectué', 'success');
        fetchData();
    } catch (err) {
        showToast(err.detail || 'Erreur lors du check-out', 'error');
    }
}

async function doCancel(id) {
    try {
        await apiFetch(`/reservations/${id}/`, { method: 'PATCH', body: JSON.stringify({ status: 'cancelled' }) });
        closeDetailModal();
        showToast('Réservation annulée', 'success');
        fetchData();
    } catch (err) {
        showToast(err.detail || 'Erreur lors de l\'annulation', 'error');
    }
}

function openCreateModal(roomId, dateYMD) {
    window.location.href = `/app/reservations.html`;
}

function showToast(message, type) {
    if (InnDesk && InnDesk.utils && InnDesk.utils.showToast) {
        InnDesk.utils.showToast(message, type);
        return;
    }
    const t = document.createElement('div');
    t.className = `toast toast--${type}`;
    t.setAttribute('role', 'alert');
    t.textContent = message;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
}

document.getElementById('pgPrev').addEventListener('click', () => navigateDays(-7));
document.getElementById('pgNext').addEventListener('click', () => navigateDays(7));
document.getElementById('pgToday').addEventListener('click', goToday);
document.getElementById('pgBtn7').addEventListener('click', () => setNbDays(7));
document.getElementById('pgBtn14').addEventListener('click', () => setNbDays(14));
document.getElementById('pgBtn28').addEventListener('click', () => setNbDays(28));
document.getElementById('pgDetailClose').addEventListener('click', closeDetailModal);
document.getElementById('pgDetailOverlay').addEventListener('click', closeDetailModal);

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDetailModal();
});

document.getElementById('pgGrid').addEventListener('click', e => {
    const bar = e.target.closest('[data-reservation-id]');
    if (bar) {
        openDetailModal(parseInt(bar.dataset.reservationId, 10));
        return;
    }
    const cell = e.target.closest('[data-room-id][data-date]');
    if (cell) {
        openCreateModal(parseInt(cell.dataset.roomId, 10), cell.dataset.date);
    }
});

document.getElementById('pgGrid').addEventListener('keydown', e => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const bar = e.target.closest('[data-reservation-id]');
    if (bar) {
        e.preventDefault();
        openDetailModal(parseInt(bar.dataset.reservationId, 10));
        return;
    }
    const cell = e.target.closest('[data-room-id][data-date]');
    if (cell) {
        e.preventDefault();
        openCreateModal(parseInt(cell.dataset.roomId, 10), cell.dataset.date);
    }
});
