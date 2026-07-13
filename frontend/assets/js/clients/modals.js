// @file: assets/js/clients/modals.js
// @depends: state.js, utils.js, render.js

function openCreateClientModal() {
    const modal = document.getElementById('createClientModal');
    const firstName = document.getElementById('createFirstName');
    if (modal) modal.style.display = 'flex';
    if (firstName) firstName.focus();
}

function closeCreateClientModal() {
    document.getElementById('createClientModal').style.display = 'none';
    document.getElementById('createClientForm').reset();
}

async function openDetailModal(clientId) {
    try {
        const client = await InnDesk.api.clients.getById(clientId);
        const reservations = await InnDesk.api.clients.getReservations(clientId);
        
        selectedClient = client;
        renderClientDetail(client, reservations);

        const drawer = document.getElementById('clientDrawer');
        const backdrop = document.getElementById('clientDrawerBackdrop');
        const title = document.getElementById('drawerTitle');
        if (title) title.textContent = getFullName(client);
        const editButton = document.getElementById('drawerEditBtn');
        const anonymizeButton = document.getElementById('drawerAnonymizeBtn');
        if (editButton) editButton.hidden = Boolean(client.anonymized_at);
        if (anonymizeButton) {
            anonymizeButton.hidden = currentUser?.role !== 'admin' || Boolean(client.anonymized_at);
        }
        if (drawer) drawer.classList.add('open');
        if (backdrop) {
            backdrop.classList.add('open');
            backdrop.setAttribute('aria-hidden', 'false');
        }
        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        showToast(error.detail || 'Erreur lors du chargement des détails', 'error');
    }
}

function closeDetailModal() {
    const drawer = document.getElementById('clientDrawer');
    const backdrop = document.getElementById('clientDrawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) {
        backdrop.classList.remove('open');
        backdrop.setAttribute('aria-hidden', 'true');
    }
    selectedClient = null;
}

async function openEditModal(clientId) {
    try {
        const client = await InnDesk.api.clients.getById(clientId);
        selectedClient = client;
        
        // Populate form fields
        document.getElementById('editClientId').value = client.id;
        document.getElementById('editFirstName').value = client.first_name;
        document.getElementById('editLastName').value = client.last_name;
        document.getElementById('editEmail').value = client.email || '';
        document.getElementById('editPhone').value = client.phone || '';
        document.getElementById('editNationality').value = client.nationality || '';
        document.getElementById('editIdDocument').value = client.id_document || '';
        document.getElementById('editConsentMarketing').checked = client.consent_marketing === true;
        
        document.getElementById('editClientModal').style.display = 'flex';
        document.getElementById('editFirstName').focus();
    } catch (error) {
        showToast(error.detail || 'Erreur lors du chargement du client', 'error');
    }
}

function closeEditClientModal() {
    document.getElementById('editClientModal').style.display = 'none';
    document.getElementById('editClientForm').reset();
    selectedClient = null;
}

function openDeleteModal(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    selectedClientForDeletion = client;
    document.getElementById('deleteClientName').textContent = getFullName(client);
    document.getElementById('deleteClientModal').style.display = 'flex';
}

function closeDeleteClientModal() {
    document.getElementById('deleteClientModal').style.display = 'none';
    selectedClientForDeletion = null;
}

async function exportClientData(clientId) {
    try {
        const data = await InnDesk.api.clients.exportData(clientId);
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `client-${clientId}-export.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    } catch (error) {
        showToast(error.detail || "Erreur lors de l'export", 'error');
    }
}

function openAnonymizeClientModal(client) {
    if (!client || currentUser?.role !== 'admin' || client.anonymized_at) return;
    selectedClientForAnonymization = client;
    document.getElementById('anonymizeClientName').textContent = getFullName(client);
    document.getElementById('anonymizeClientModal').style.display = 'flex';
}

function closeAnonymizeClientModal() {
    document.getElementById('anonymizeClientModal').style.display = 'none';
    selectedClientForAnonymization = null;
}

// Modal backdrop click handlers
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        const modal = e.target;
        if (modal.id === 'createClientModal') closeCreateClientModal();
        else if (modal.id === 'editClientModal') closeEditClientModal();
        else if (modal.id === 'deleteClientModal') closeDeleteClientModal();
        else if (modal.id === 'anonymizeClientModal') closeAnonymizeClientModal();
    }
});

// Close buttons
document.getElementById('createModalCloseBtn')?.addEventListener('click', closeCreateClientModal);
document.getElementById('editModalCloseBtn')?.addEventListener('click', closeEditClientModal);
document.getElementById('deleteModalCloseBtn')?.addEventListener('click', closeDeleteClientModal);
document.getElementById('drawerCloseBtn')?.addEventListener('click', closeDetailModal);
document.getElementById('drawerCloseFooterBtn')?.addEventListener('click', closeDetailModal);
document.getElementById('clientDrawerBackdrop')?.addEventListener('click', closeDetailModal);
document.getElementById('drawerEditBtn')?.addEventListener('click', () => {
    if (!selectedClient) return;
    const clientId = selectedClient.id;
    closeDetailModal();
    openEditModal(clientId);
});
document.getElementById('drawerExportBtn')?.addEventListener('click', () => {
    if (selectedClient) exportClientData(selectedClient.id);
});
document.getElementById('drawerAnonymizeBtn')?.addEventListener('click', () => {
    if (!selectedClient) return;
    const client = selectedClient;
    closeDetailModal();
    openAnonymizeClientModal(client);
});
document.getElementById('anonymizeModalCloseBtn')?.addEventListener('click', closeAnonymizeClientModal);
document.getElementById('cancelAnonymizeBtn')?.addEventListener('click', closeAnonymizeClientModal);
