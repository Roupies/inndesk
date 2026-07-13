// @file: assets/js/reservations/utils.js
// @depends: state.js

// Utility function
function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: var(--space-4);
        right: var(--space-4);
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        padding: var(--space-3) var(--space-4);
        box-shadow: var(--shadow-md);
        z-index: 2000;
        max-width: 400px;
    `;
    
    if (type === 'success') {
        toast.style.borderColor = 'var(--color-available)';
        toast.style.background = '#dcfce7';
    } else if (type === 'error') {
        toast.style.borderColor = 'var(--color-maintenance)';
        toast.style.background = '#fef2f2';
    }
    
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

function calculateNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.max(0, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
}

// Set minimum dates (only updates min values, listener registered once at init)
function setMinimumDates() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('checkInDate').min = today;
}

function _initCheckInListener() {
    const checkInInput = document.getElementById('checkInDate');
    const checkOutInput = document.getElementById('checkOutDate');

    checkInInput.addEventListener('change', () => {
        if (checkInInput.value) {
            const nextDay = new Date(checkInInput.value);
            nextDay.setDate(nextDay.getDate() + 1);
            checkOutInput.min = nextDay.toISOString().split('T')[0];

            if (checkOutInput.value && checkOutInput.value <= checkInInput.value) {
                checkOutInput.value = nextDay.toISOString().split('T')[0];
            }
        }
        updateFormState();
    });
}

// Form validation and dynamic updates
function updateFormState() {
    const roomTypeId = document.getElementById('roomTypeSelect').value;
    const checkIn = document.getElementById('checkInDate').value;
    const checkOut = document.getElementById('checkOutDate').value;
    const adults = parseInt(document.getElementById('adults').value) || 0;
    const children = parseInt(document.getElementById('children').value) || 0;

    // Clear previous states
    document.getElementById('availabilityStatus').style.display = 'none';
    document.getElementById('paxValidation').style.display = 'none';
    document.getElementById('priceEstimate').style.display = 'none';
    document.getElementById('createSubmitBtn').disabled = false;

    if (!roomTypeId || !checkIn || !checkOut) return;

    const roomType = roomTypes.find(rt => rt.id.toString() === roomTypeId);
    if (!roomType) return;

    // Validate PAX capacity
    const totalGuests = adults + children;
    if (totalGuests > roomType.max_occupancy) {
        document.getElementById('paxValidation').innerHTML = `
            <div class="pax-validation-error">
                ⚠️ Capacité max : ${roomType.max_occupancy} personne(s)
            </div>
        `;
        document.getElementById('paxValidation').style.display = 'block';
        document.getElementById('createSubmitBtn').disabled = true;
        return;
    }

    // Show price estimate
    const nights = calculateNights(checkIn, checkOut);
    if (nights > 0) {
        const total = nights * roomType.price_per_night;
        document.getElementById('priceEstimate').innerHTML = `
            <div class="price-estimate">
                ${nights} nuit${nights > 1 ? 's' : ''} × ${InnDesk.utils.formatCurrency(roomType.price_per_night)} = ${InnDesk.utils.formatCurrency(total)} estimé
            </div>
        `;
        document.getElementById('priceEstimate').style.display = 'block';
    }

    // Check availability
    checkAvailability(roomTypeId, checkIn, checkOut);
}

async function checkAvailability(roomTypeId, checkIn, checkOut) {
    const statusDiv = document.getElementById('availabilityStatus');
    statusDiv.innerHTML = '<div class="availability-status checking">⏳ Vérification...</div>';
    statusDiv.style.display = 'block';

    try {
        const availableRooms = await InnDesk.api.reservations.getAvailableRooms(roomTypeId, checkIn, checkOut);
        
        if (availableRooms.length > 0) {
            statusDiv.innerHTML = `<div class="availability-status available">✅ ${availableRooms.length} chambre(s) disponible(s)</div>`;
        } else {
            statusDiv.innerHTML = '<div class="availability-status unavailable">❌ Aucune chambre disponible</div>';
            document.getElementById('createSubmitBtn').disabled = true;
        }
    } catch (error) {
        statusDiv.innerHTML = '<div class="availability-status unavailable">❌ Erreur lors de la vérification</div>';
        document.getElementById('createSubmitBtn').disabled = true;
    }
}

function showClientDropdown(clients) {
    const dropdown = document.getElementById('clientDropdown');
    dropdown.innerHTML = '';

    if (clients.length === 0) {
        dropdown.innerHTML = '<div class="client-option" style="color: var(--text-muted); font-style: italic;">Aucun client trouvé</div>';
    } else {
        clients.forEach(client => {
            const option = document.createElement('div');
            option.className = 'client-option';
            option.textContent = `${client.first_name} ${client.last_name} — ${client.email}`;
            option.onclick = () => selectClient(client);
            dropdown.appendChild(option);
        });
    }

    dropdown.style.display = 'block';
}

function selectClient(client) {
    document.getElementById('clientSearch').value = `${client.first_name} ${client.last_name}`;
    document.getElementById('selectedClientId').value = client.id;
    document.getElementById('clientDropdown').style.display = 'none';
}