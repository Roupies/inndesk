// @file: assets/js/clients/render.js
// @depends: state.js, utils.js

function renderStats() {
    const totalCard = document.getElementById('totalClientsCard');
    const emailCard = document.getElementById('clientsWithEmailCard');
    const phoneCard = document.getElementById('clientsWithPhoneCard');
    const monthCard = document.getElementById('clientsThisMonthCard');

    setClientKpi(totalCard, stats.total_clients || 0, 'Total clients');
    setClientKpi(emailCard, stats.clients_with_email || 0, 'Avec email');
    setClientKpi(phoneCard, stats.clients_with_phone || 0, 'Avec téléphone');
    setClientKpi(monthCard, stats.clients_this_month || 0, 'Ce mois-ci');
}

function setClientKpi(card, value, label) {
    if (!card) return;
    const valueElement = InnDesk.utils.createElement('div', { className: 'kpi-value', text: value });
    const labelElement = InnDesk.utils.createElement('div', { className: 'kpi-label', text: label });
    card.replaceChildren(valueElement, labelElement);
}

function createClientAction(label, className, handler) {
    const button = InnDesk.utils.createElement('button', {
        className,
        text: label,
        attributes: { type: 'button' }
    });
    button.addEventListener('click', handler);
    return button;
}

function renderClientsTable() {
    const tableBody = document.querySelector('#clientsTable tbody');
    const filteredClients = filterClients();

    tableBody.replaceChildren();

    if (filteredClients.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 9;
        const emptyState = InnDesk.utils.createElement('div', { className: 'empty-state' });
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'users');
        const title = InnDesk.utils.createElement('h3', { text: 'Aucun client trouvé' });
        const text = InnDesk.utils.createElement('p', { text: 'Créez votre premier client ou modifiez vos filtres de recherche.' });
        const button = createClientAction('Créer le premier client', 'btn btn-primary', openCreateClientModal);
        emptyState.append(icon, title, text, button);
        cell.appendChild(emptyState);
        row.appendChild(cell);
        tableBody.appendChild(row);
        if (window.lucide && window.lucide.createIcons) window.lucide.createIcons();
        return;
    }

    filteredClients.forEach(client => {
        const row = document.createElement('tr');
        row.dataset.id = String(client.id);
        [
            client.id,
            getFullName(client),
            client.email || '-',
            client.phone || '-',
            client.nationality || '-',
            '-',
            '0',
            formatDate(client.created_at)
        ].forEach((value, index) => {
            const cell = document.createElement('td');
            cell.textContent = String(value);
            if (index === 1) cell.style.fontWeight = '500';
            row.appendChild(cell);
        });

        const actionsCell = document.createElement('td');
        const actions = InnDesk.utils.createElement('div', { className: 'action-buttons' });
        actions.append(
            createClientAction('Voir', 'btn btn-ghost btn-sm', () => openDetailModal(client.id)),
            createClientAction('Modifier', 'btn btn-secondary btn-sm', () => openEditModal(client.id)),
            createClientAction('Supprimer', 'btn btn-ghost btn-sm text-danger', () => openDeleteModal(client.id))
        );
        actionsCell.appendChild(actions);
        row.appendChild(actionsCell);
        tableBody.appendChild(row);
    });
}

function renderNationalityFilter() {
    const select = document.getElementById('nationalityFilter');
    const nationalities = getUniqueNationalities();

    const currentValue = select.value;
    select.replaceChildren();
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = 'Toutes';
    select.appendChild(allOption);

    nationalities.forEach(nationality => {
        const option = document.createElement('option');
        option.value = nationality;
        option.textContent = nationality;
        select.appendChild(option);
    });

    select.value = currentValue;
}

function renderClientDetail(client, reservations) {
    const body = document.getElementById('drawerBody');
    if (!body) return;
    InnDesk.utils.clearElement(body);

    const fieldsGrid = document.createElement('div');
    fieldsGrid.className = 'drawer-field-grid';
    [
        ['Identité', getFullName(client)],
        ['Email', client.email || 'Non renseigné'],
        ['Téléphone', client.phone || 'Non renseigné'],
        ['Nationalité', client.nationality || 'Non renseignée'],
        ['Document d’identité', client.id_document || 'Non renseigné'],
        ['Communications commerciales', client.consent_marketing ? 'Consentement actif' : 'Aucun consentement'],
        ['Consentement enregistré le', client.consent_marketing_at ? formatDateTime(client.consent_marketing_at) : 'Non applicable'],
        ['Anonymisé le', client.anonymized_at ? formatDateTime(client.anonymized_at) : 'Non'],
        ['Créé le', formatDateTime(client.created_at)]
    ].forEach(([label, value]) => {
        const field = document.createElement('div');
        field.className = 'drawer-field';
        const fieldLabel = document.createElement('div');
        fieldLabel.className = 'drawer-field-label';
        fieldLabel.textContent = label;
        const fieldValue = document.createElement('div');
        fieldValue.className = 'drawer-field-value';
        fieldValue.textContent = value;
        field.append(fieldLabel, fieldValue);
        fieldsGrid.appendChild(field);
    });
    body.appendChild(fieldsGrid);

    const historyTitle = document.createElement('h3');
    historyTitle.className = 'drawer-section-title';
    historyTitle.textContent = `Historique des réservations (${reservations.length})`;
    body.appendChild(historyTitle);

    if (reservations.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'text-muted';
        empty.textContent = 'Aucune réservation pour ce client';
        body.appendChild(empty);
        return;
    }

    reservations.forEach(reservation => {
        const item = document.createElement('div');
        item.className = 'drawer-reservation-item';
        const info = document.createElement('div');
        const identifier = document.createElement('strong');
        identifier.textContent = `Réservation #${reservation.id}`;
        const dates = document.createElement('div');
        dates.className = 'text-sm text-muted';
        dates.textContent = `${formatDate(reservation.check_in_date)} – ${formatDate(reservation.check_out_date)}`;
        info.append(identifier, dates, InnDesk.utils.createStatusBadge(reservation.status));
        const room = document.createElement('div');
        room.className = 'text-sm';
        room.textContent = `Chambre ${reservation.room?.number || 'N/A'}`;
        item.append(info, room);
        body.appendChild(item);
    });
}

function renderReservationsHistory(reservations) {
    const list = document.createElement('div');
    list.className = 'reservations-list';
    if (!reservations || reservations.length === 0) {
        list.className = 'empty-state';
        list.style.padding = 'var(--space-4)';
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'calendar-x');
        list.append(icon, InnDesk.utils.createElement('p', { text: 'Aucune réservation pour ce client' }));
        return list;
    }

    reservations.forEach(reservation => {
        const item = InnDesk.utils.createElement('div', { className: 'reservation-item' });
        const info = InnDesk.utils.createElement('div', { className: 'reservation-info' });
        const heading = document.createElement('div');
        heading.append(
            InnDesk.utils.createElement('strong', { text: `Réservation #${reservation.id}` }),
            getStatusBadge(reservation.status)
        );
        info.append(
            heading,
            InnDesk.utils.createElement('div', {
                className: 'reservation-dates',
                text: `${formatDate(reservation.check_in_date)} - ${formatDate(reservation.check_out_date)}`
            })
        );
        const summary = document.createElement('div');
        summary.style.textAlign = 'right';
        const amount = InnDesk.utils.createElement('div', {
            text: reservation.total_amount ? `${reservation.total_amount}€` : '-'
        });
        amount.style.fontWeight = '500';
        const room = InnDesk.utils.createElement('div', { text: `Chambre ${reservation.room?.number || 'N/A'}` });
        room.style.fontSize = 'var(--text-sm)';
        room.style.color = 'var(--text-muted)';
        summary.append(amount, room);
        item.append(info, summary);
        list.appendChild(item);
    });
    return list;
}

function getStatusBadge(status) {
    const badges = {
        'confirmed': 'badge-blue',
        'checked_in': 'badge-green', 
        'checked_out': 'badge-gray',
        'cancelled': 'badge-red',
        'no_show': 'badge-orange'
    };

    const labels = {
        'confirmed': 'Confirmée',
        'checked_in': 'En séjour',
        'checked_out': 'Terminée',
        'cancelled': 'Annulée',
        'no_show': 'No show'
    };

    const badge = InnDesk.utils.createElement('span', {
        className: `badge ${badges[status] || 'badge-gray'}`,
        text: labels[status] || status
    });
    badge.style.marginLeft = 'var(--space-2)';
    return badge;
}
