// @file: assets/js/planning/utils.js
// @depends: state.js

// Normalize date to midnight local time (avoid timezone issues)
function toLocalMidnight(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Format range label: "25/06 – 08/07/2026"
function formatRangeLabel(startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + daysInWindow - 1);

    const fmt = (d) => {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${dd}/${mm}`;
    };
    const year = endDate.getFullYear();
    return `${fmt(startDate)} – ${fmt(endDate)}/${year}`;
}

// Check if date is today
function isTodayDate(date) {
    const today = toLocalMidnight(new Date());
    return toLocalMidnight(date).getTime() === today.getTime();
}

// Check if date is a weekend
function isWeekendDate(date) {
    const day = new Date(date).getDay();
    return day === 0 || day === 6;
}

// Generate the selected date window starting from currentWindowStart
function getWindowDays() {
    const days = [];
    for (let i = 0; i < daysInWindow; i++) {
        const d = new Date(currentWindowStart);
        d.setDate(d.getDate() + i);
        d.setHours(0, 0, 0, 0);
        days.push(d);
    }
    return days;
}

// Short day label: "Lun\n25"
function getDayLabel(date) {
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return dayNames[date.getDay()] + '\n' + date.getDate();
}

// Check if a reservation occupies a given day cell
function reservationOverlapsDay(reservation, day) {
    const checkIn = toLocalMidnight(new Date(reservation.check_in_date));
    const checkOut = toLocalMidnight(new Date(reservation.check_out_date));
    const dayStart = toLocalMidnight(day);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return checkIn < dayEnd && checkOut > dayStart;
}

// Update the range label in the DOM and URL hash
function updateRangeLabel() {
    const label = formatRangeLabel(currentWindowStart);
    const labelElement = document.getElementById('pgWindowLabel');
    if (labelElement) labelElement.textContent = label;
    const hashDate = currentWindowStart.toISOString().split('T')[0];
    const nextUrl = `${window.location.pathname}${window.location.search}#${hashDate}`;
    window.history.replaceState(null, '', nextUrl);
}
