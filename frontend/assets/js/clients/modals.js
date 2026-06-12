// @file: assets/js/clients/modals.js
// @depends: state.js, utils.js, render.js

function openCreateClientModal() {
    document.getElementById('createClientModal').style.display = 'flex';
    document.getElementById('createFirstName').focus();
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
        document.getElementById('detailModalTitle').textContent = `${getFullName(client)}`;
        
        renderClientDetail(client, reservations);
        
        document.getElementById('detailClientModal').style.display = 'flex';
        lucide.createIcons();
    } catch (error) {
        showToast(error.detail || 'Erreur lors du chargement des détails', 'error');
    }
}

function closeDetailModal() {
    document.getElementById('detailClientModal').style.display = 'none';
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

// Modal backdrop click handlers
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        const modal = e.target;
        if (modal.id === 'createClientModal') closeCreateClientModal();
        else if (modal.id === 'editClientModal') closeEditClientModal();
        else if (modal.id === 'detailClientModal') closeDetailModal();
        else if (modal.id === 'deleteClientModal') closeDeleteClientModal();
    }
});

// Close buttons
document.getElementById('createModalCloseBtn').addEventListener('click', closeCreateClientModal);
document.getElementById('editModalCloseBtn').addEventListener('click', closeEditClientModal);
document.getElementById('detailModalCloseBtn').addEventListener('click', closeDetailModal);
document.getElementById('deleteModalCloseBtn').addEventListener('click', closeDeleteClientModal);