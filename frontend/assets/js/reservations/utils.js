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
        toast.style.color = '#166534';
    } else if (type === 'error') {
        toast.style.borderColor = 'var(--color-maintenance)';
        toast.style.background = '#fef2f2';
        toast.style.color = '#991b1b';
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

function setFeedback(element, className, message) {
    if (!element) return;

    const feedback = document.createElement('div');
    feedback.className = className;
    feedback.textContent = message;
    element.replaceChildren(feedback);
}

// Set minimum dates
function setMinimumDates() {
    const checkInInput = document.getElementById('checkInDate');
    const checkOutInput = document.getElementById('checkOutDate');
    if (!checkInInput || !checkOutInput) return;

    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-');

    checkInInput.min = today;
    if (checkInInput.dataset.minimumDatesInitialized === 'true') return;
    checkInInput.dataset.minimumDatesInitialized = 'true';

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
        const paxValidation = document.getElementById('paxValidation');
        setFeedback(
            paxValidation,
            'pax-validation-error',
            `⚠️ Capacité max : ${roomType.max_occupancy} personne(s)`
        );
        paxValidation.style.display = 'block';
        document.getElementById('createSubmitBtn').disabled = true;
        return;
    }

    // Show price estimate
    const nights = calculateNights(checkIn, checkOut);
    if (nights > 0) {
        const total = nights * roomType.price_per_night;
        const priceEstimate = document.getElementById('priceEstimate');
        setFeedback(
            priceEstimate,
            'price-estimate',
            `${nights} nuit${nights > 1 ? 's' : ''} × ${InnDesk.utils.formatCurrency(roomType.price_per_night)} = ${InnDesk.utils.formatCurrency(total)} estimé`
        );
        priceEstimate.style.display = 'block';
    }

    // Check availability
    checkAvailability(roomTypeId, checkIn, checkOut);
}

async function checkAvailability(roomTypeId, checkIn, checkOut) {
    const statusDiv = document.getElementById('availabilityStatus');
    setFeedback(statusDiv, 'availability-status checking', '⏳ Vérification...');
    statusDiv.style.display = 'block';

    try {
        const availableRooms = await InnDesk.api.reservations.getAvailableRooms(roomTypeId, checkIn, checkOut);
        
        if (availableRooms.length > 0) {
            setFeedback(
                statusDiv,
                'availability-status available',
                `✅ ${availableRooms.length} chambre(s) disponible(s)`
            );
        } else {
            setFeedback(statusDiv, 'availability-status unavailable', '❌ Aucune chambre disponible');
            document.getElementById('createSubmitBtn').disabled = true;
        }
    } catch (error) {
        setFeedback(statusDiv, 'availability-status unavailable', '❌ Erreur lors de la vérification');
        document.getElementById('createSubmitBtn').disabled = true;
    }
}

function showClientDropdown(clients) {
    const dropdown = document.getElementById('clientDropdown');
    dropdown.replaceChildren();

    if (clients.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'client-option';
        empty.style.color = 'var(--text-muted)';
        empty.style.fontStyle = 'italic';
        empty.textContent = 'Aucun client trouvé';
        dropdown.appendChild(empty);
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
