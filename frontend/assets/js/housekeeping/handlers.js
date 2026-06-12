// Housekeeping event handlers

async function loadHousekeepingData() {
    try {
        setLoading(true);
        setError(null);
        renderHousekeepingContent();
        
        const rooms = await InnDesk.api.housekeeping.getRooms();
        setRooms(rooms);
        
        setLoading(false);
        renderHousekeepingContent();
    } catch (error) {
        setLoading(false);
        setError(error.detail || 'Erreur lors du chargement des données');
        renderHousekeepingContent();
    }
}

async function handleStatusChange(roomId, newStatus) {
    // Find the room card
    const roomCard = document.querySelector(`[data-room-id="${roomId}"]`);
    if (!roomCard) return;
    
    // Get the current status
    const room = housekeepingState.rooms.find(r => r.id === roomId);
    if (!room) return;
    
    const oldStatus = room.status;
    
    // Optimistic update - update UI immediately
    updateRoomStatus(roomId, newStatus);
    updateRoomCardStatus(roomCard, newStatus);
    
    try {
        // Call API
        await InnDesk.api.housekeeping.updateRoomStatus(roomId, newStatus);
        
        // Show success message
        const roomNumber = room.number;
        const statusLabel = getStatusLabel(newStatus);
        showToast(`Chambre ${roomNumber} : statut mis à jour vers "${statusLabel}"`, 'success');
        
    } catch (error) {
        // Revert optimistic update on error
        updateRoomStatus(roomId, oldStatus);
        updateRoomCardStatus(roomCard, oldStatus);
        
        // Show error message
        const errorMessage = error.detail || 'Erreur lors de la mise à jour du statut';
        showToast(errorMessage, 'error');
    }
}

function updateRoomCardStatus(roomCard, newStatus) {
    // Update card class
    roomCard.className = `room-card status-${newStatus}`;
    
    // Update status badge
    const badge = roomCard.querySelector('.badge');
    if (badge) {
        badge.className = `badge badge--${newStatus}`;
        badge.textContent = getStatusLabel(newStatus);
    }
    
    // Update button states
    const buttons = roomCard.querySelectorAll('.status-btn');
    buttons.forEach(button => {
        const buttonStatus = Array.from(button.classList).find(cls => 
            ['available', 'dirty', 'cleaning', 'maintenance'].includes(cls)
        );
        
        if (buttonStatus === newStatus) {
            button.classList.add('active');
            button.onclick = null;
        } else {
            button.classList.remove('active');
            // Check if this button should be disabled (maintenance for non-admins)
            const isMaintenanceRestricted = buttonStatus === 'maintenance' && 
                housekeepingState.currentUser && 
                housekeepingState.currentUser.role !== 'admin';
            
            if (!isMaintenanceRestricted) {
                const roomId = parseInt(roomCard.dataset.roomId);
                button.onclick = () => handleStatusChange(roomId, buttonStatus);
            }
        }
    });
}