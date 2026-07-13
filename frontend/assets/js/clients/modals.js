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
    const drawer = document.getElementById('clientDrawer');
    const backdrop = document.getElementById('clientDrawerBackdrop');
    const body = document.getElementById('drawerBody');
    const title = document.getElementById('drawerTitle');
    const editBtn = document.getElementById('drawerEditBtn');

    title.textContent = 'Chargement...';
    body.innerHTML = '<div class="drawer-spinner">Chargement...</div>';
    editBtn.onclick = null;

    drawer.classList.add('open');
    backdrop.classList.add('open');
    backdrop.removeAttribute('aria-hidden');

    try {
        const [client, reservations] = await Promise.all([
            InnDesk.api.clients.getById(clientId),
            InnDesk.api.clients.getReservations(clientId)
        ]);

        selectedClient = client;
        title.textContent = getFullName(client);
        editBtn.onclick = () => { closeDetailModal(); openEditModal(client.id); };

        renderClientDrawer(client, reservations);
        lucide.createIcons();
    } catch (error) {
        body.innerHTML = `<p style="color: var(--color-maintenance); padding: var(--space-4);">Erreur lors du chargement.</p>`;
        showToast(error.detail || 'Erreur lors du chargement des détails', 'error');
    }
}

function closeDetailModal() {
    document.getElementById('clientDrawer').classList.remove('open');
    document.getElementById('clientDrawerBackdrop').classList.remove('open');
    document.getElementById('clientDrawerBackdrop').setAttribute('aria-hidden', 'true');
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
        else if (modal.id === 'deleteClientModal') closeDeleteClientModal();
    }
});

// Drawer close buttons and backdrop
document.getElementById('drawerCloseBtn').addEventListener('click', closeDetailModal);
document.getElementById('drawerCloseFooterBtn').addEventListener('click', closeDetailModal);
document.getElementById('clientDrawerBackdrop').addEventListener('click', closeDetailModal);

// Close buttons
document.getElementById('createModalCloseBtn').addEventListener('click', closeCreateClientModal);
document.getElementById('editModalCloseBtn').addEventListener('click', closeEditClientModal);
document.getElementById('deleteModalCloseBtn').addEventListener('click', closeDeleteClientModal);