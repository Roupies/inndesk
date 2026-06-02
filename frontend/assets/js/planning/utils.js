// @file: assets/js/planning/utils.js
// @depends: state.js

// Set current week to Monday
function setToMonday(date) {
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    return date;
}

// Format week label
function formatWeekLabel(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const startStr = InnDesk.utils.formatShortDate(startDate.toISOString());
    const endStr = InnDesk.utils.formatShortDate(endDate.toISOString());

    return `${startStr} – ${endStr}`;
}

// Check if date is today
function isToday(date) {
    const today = new Date();
    const checkDate = new Date(date);
    return checkDate.toDateString() === today.toDateString();
}

// Check if date is weekend
function isWeekend(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
}

// Generate week days
function getWeekDays() {
    const days = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(currentWeekStart);
        date.setDate(date.getDate() + i);
        days.push(date);
    }
    return days;
}

// Get day name with date
function getDayLabel(date) {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const dayName = dayNames[date.getDay()];
    const dayNumber = date.getDate();
    return `${dayName} ${dayNumber}`;
}

// Check if reservation overlaps with day
function reservationOverlapsDay(reservation, day) {
    const checkIn = new Date(reservation.check_in_date);
    const checkOut = new Date(reservation.check_out_date);
    const dayStart = new Date(day);
    const dayEnd = new Date(day);
    dayEnd.setDate(dayEnd.getDate() + 1);

    return checkIn < dayEnd && checkOut > dayStart;
}

// Update week label and URL hash
function updateWeekLabel() {
    const weekLabel = formatWeekLabel(currentWeekStart);
    document.getElementById('weekLabel').textContent = weekLabel;
    
    // Update URL hash
    const hashDate = currentWeekStart.toISOString().split('T')[0];
    window.location.hash = hashDate;
}