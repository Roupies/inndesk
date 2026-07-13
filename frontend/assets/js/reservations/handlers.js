// @file: assets/js/reservations/handlers.js
// @depends: state.js, utils.js, modals.js

// Client type toggle
document.querySelectorAll('input[name="clientType"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        const isNew = e.target.value === 'new';
        document.getElementById('newClientSection').style.display = isNew ? 'block' : 'none';
        document.getElementById('existingClientSection').style.display = isNew ? 'none' : 'block';

        // Toggle required on hidden fields to prevent browser validation error
        ['newClientFirstName', 'newClientLastName'].forEach(id => {
            document.getElementById(id).required = isNew;
        });
    });
});

// Client search with debounce
document.getElementById('clientSearch').addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    if (clientSearchTimeout) clearTimeout(clientSearchTimeout);

    if (query.length < 2) {
        document.getElementById('clientDropdown').style.display = 'none';
        return;
    }

    clientSearchTimeout = setTimeout(async () => {
        try {
            const clients = await InnDesk.api.clients.search(query);
            showClientDropdown(clients);
        } catch (error) {
            document.getElementById('clientDropdown').style.display = 'none';
        }
    }, 300);
});

// Form submit handlers
document.getElementById('createReservationForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const clientType = formData.get('clientType');
    let clientId;

    try {
        if (clientType === 'new') {
            if (!document.getElementById('newClientFirstName').value.trim()) {
                showToast('Le prénom est requis', 'error');
                return;
            }
            if (!document.getElementById('newClientLastName').value.trim()) {
                showToast('Le nom est requis', 'error');
                return;
            }
            
            const clientData = {
                first_name: document.getElementById('newClientFirstName').value,
                last_name: document.getElementById('newClientLastName').value,
                email: document.getElementById('newClientEmail').value.trim() || null,
                phone: document.getElementById('newClientPhone').value.trim() || null
            };
            
            const newClient = await InnDesk.api.clients.create(clientData);
            clientId = newClient.id;
        } else {
            clientId = document.getElementById('selectedClientId').value;
            if (!clientId) {
                showToast('Veuillez sélectionner un client', 'error');
                return;
            }
        }

        const reservationData = {
            client_id: parseInt(clientId),
            room_type_id: parseInt(document.getElementById('roomTypeSelect').value),
            check_in_date: document.getElementById('checkInDate').value,
            check_out_date: document.getElementById('checkOutDate').value,
            adults: parseInt(document.getElementById('adults').value),
            children: parseInt(document.getElementById('children').value),
            notes: document.getElementById('notes').value
        };

        await InnDesk.api.reservations.create(reservationData);
        
        closeCreateReservationModal();
        showToast('Réservation créée avec succès', 'success');
        await loadData();

    } catch (error) {
        showToast(error.detail || 'Erreur lors de la création', 'error');
    }
});

document.getElementById('statusChangeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const newStatus = document.getElementById('newStatus').value;
    if (!newStatus) {
        showToast('Veuillez sélectionner un nouveau statut', 'error');
        return;
    }

    try {
        await InnDesk.api.reservations.updateStatus(selectedReservation.id, newStatus);
        closeStatusChangeModal();
        showToast('Statut mis à jour avec succès', 'success');
        await loadData();
    } catch (error) {
        showToast(error.detail || 'Erreur lors de la mise à jour', 'error');
    }
});
