// @file: assets/js/clients/handlers.js
// @depends: state.js, utils.js, render.js, modals.js

// Search input handler with debounce
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchValue = e.target.value;
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        currentFilters.search = searchValue;
        renderClientsTable();
    }, 300);
});

// Nationality filter handler
document.getElementById('nationalityFilter').addEventListener('change', (e) => {
    currentFilters.nationality = e.target.value;
    renderClientsTable();
});

// Row click → open drawer
document.getElementById('clientsTable').addEventListener('click', (e) => {
    const row = e.target.closest('tr.client-row-clickable');
    if (!row) return;
    openDetailModal(parseInt(row.dataset.clientId));
});

// Export CSV button
document.getElementById('exportCsvClientsBtn').addEventListener('click', () => {
    const columns = [
        { header: 'ID',               value: c => c.id },
        { header: 'Prénom',           value: c => c.first_name || '' },
        { header: 'Nom',              value: c => c.last_name || '' },
        { header: 'Email',            value: c => c.email || '' },
        { header: 'Téléphone',        value: c => c.phone || '' },
        { header: 'Nationalité',      value: c => c.nationality || '' },
        { header: 'Consentement RGPD',value: c => c.gdpr_consent ? 'Oui' : 'Non' },
    ];
    const csv = buildCsv(filterClients(), columns);
    downloadCsv(csv, `clients_${todayIso()}.csv`);
});

// New client button
document.getElementById('newClientBtn').addEventListener('click', openCreateClientModal);

// Create client form handler
document.getElementById('createClientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const firstName = document.getElementById('createFirstName').value.trim();
    const lastName = document.getElementById('createLastName').value.trim();
    
    if (!firstName || !lastName) {
        showToast('Le prénom et le nom sont requis', 'error');
        return;
    }
    
    const clientData = {
        first_name: firstName,
        last_name: lastName,
        email: document.getElementById('createEmail').value.trim() || null,
        phone: document.getElementById('createPhone').value.trim() || null,
        nationality: document.getElementById('createNationality').value.trim() || null
    };
    
    try {
        await InnDesk.api.clients.create(clientData);
        closeCreateClientModal();
        showToast('Client créé avec succès', 'success');
        await loadData();
    } catch (error) {
        showToast(error.detail || 'Erreur lors de la création', 'error');
    }
});

// Edit client form handler  
document.getElementById('editClientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const clientId = document.getElementById('editClientId').value;
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    
    if (!firstName || !lastName) {
        showToast('Le prénom et le nom sont requis', 'error');
        return;
    }
    
    const clientData = {
        first_name: firstName,
        last_name: lastName,
        email: document.getElementById('editEmail').value.trim() || null,
        phone: document.getElementById('editPhone').value.trim() || null,
        nationality: document.getElementById('editNationality').value.trim() || null
    };
    
    try {
        await InnDesk.api.clients.update(clientId, clientData);
        closeEditClientModal();
        showToast('Client modifié avec succès', 'success');
        await loadData();
    } catch (error) {
        showToast(error.detail || 'Erreur lors de la modification', 'error');
    }
});

// Delete confirmation handler
document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    if (!selectedClientForDeletion) return;
    
    try {
        await InnDesk.api.clients.delete(selectedClientForDeletion.id);
        closeDeleteClientModal();
        showToast('Client supprimé avec succès', 'success');
        await loadData();
    } catch (error) {
        showToast(error.detail || 'Erreur lors de la suppression', 'error');
    }
});

// ESC key handler for modals and drawer
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.getElementById('clientDrawer').classList.contains('open')) {
            closeDetailModal();
        } else if (document.getElementById('createClientModal').style.display === 'flex') {
            closeCreateClientModal();
        } else if (document.getElementById('editClientModal').style.display === 'flex') {
            closeEditClientModal();
        } else if (document.getElementById('deleteClientModal').style.display === 'flex') {
            closeDeleteClientModal();
        }
    }
});