// @file: assets/js/rapport.js
// Monthly occupancy report — client-side only, no new backend endpoints.
// Uses: GET /reservations/?start=&end= and GET /rooms/

redirectIfNotAuth();

// ── State ─────────────────────────────────────────────────────────────────────

let currentYear  = new Date().getFullYear();
let currentMonth = new Date().getMonth(); // 0-indexed
let totalRooms   = 0;

// ── Init ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const user = await ensureCurrentUser();
    document.getElementById('userName').textContent = user?.full_name || 'Utilisateur';
    document.getElementById('userRole').textContent = user?.role || '';

    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });

    document.getElementById('prevMonthBtn').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        loadReport();
    });

    document.getElementById('nextMonthBtn').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        loadReport();
    });

    document.getElementById('exportPdfBtn').addEventListener('click', () => window.print());

    document.getElementById('themeToggle').addEventListener('click', () => {
        toggleTheme();
        const theme = document.documentElement.getAttribute('data-theme');
        document.getElementById('themeIconLight').style.display = theme === 'light' ? 'none' : 'block';
        document.getElementById('themeIconDark').style.display  = theme === 'light' ? 'block' : 'none';
    });

    document.getElementById('logoutButton').addEventListener('click', () => {
        clearToken();
        window.location.href = '/app/index.html';
    });

    try {
        const rooms = await apiFetch('/rooms/');
        totalRooms = rooms.length;
    } catch (_) {
        totalRooms = 12;
    }

    await loadReport();

    if (typeof lucide !== 'undefined') lucide.createIcons();
});

// ── Date helpers ──────────────────────────────────────────────────────────────

function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function pad(n) {
    return String(n).padStart(2, '0');
}

function monthRangeParams(year, month) {
    const days = daysInMonth(year, month);
    return {
        start: `${year}-${pad(month + 1)}-01`,
        end:   `${year}-${pad(month + 1)}-${pad(days)}`
    };
}

function monthLabel(year, month) {
    return new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function loadReport() {
    document.getElementById('monthLabel').textContent = capitalize(monthLabel(currentYear, currentMonth));
    setCardsLoading();

    const { start, end } = monthRangeParams(currentYear, currentMonth);

    let reservations = [];
    try {
        reservations = await apiFetch(`/reservations/?start=${start}&end=${end}&limit=500`);
    } catch (_) {
        reservations = [];
    }

    const active = reservations.filter(r => !['cancelled', 'no_show'].includes(r.status));

    computeAndRenderStats(active);
    drawChart(active);
}

// ── Stats ─────────────────────────────────────────────────────────────────────

function computeAndRenderStats(reservations) {
    const days = daysInMonth(currentYear, currentMonth);
    const totalSlots = totalRooms * days;

    let totalReservedNights = 0;
    let totalRevenue = 0;

    reservations.forEach(r => {
        const checkIn  = new Date(r.check_in_date);
        const checkOut = new Date(r.check_out_date);

        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd   = new Date(currentYear, currentMonth + 1, 0);

        const clampedIn  = checkIn  > monthStart ? checkIn  : monthStart;
        const clampedOut = checkOut < monthEnd   ? checkOut : monthEnd;

        const nights = Math.max(0, Math.round((clampedOut - clampedIn) / 86400000));
        totalReservedNights += nights;

        if (r.total_amount != null) {
            totalRevenue += parseFloat(r.total_amount);
        }
    });

    const occupancyPct = totalSlots > 0
        ? Math.round((totalReservedNights / totalSlots) * 100)
        : 0;

    const staysCount = reservations.length;

    const avgNights = staysCount > 0
        ? (totalReservedNights / staysCount).toFixed(1)
        : '0';

    document.getElementById('occupancyValue').textContent = `${occupancyPct} %`;
    document.getElementById('revenueValue').textContent   = formatCurrency(totalRevenue);
    document.getElementById('staysValue').textContent     = staysCount;
    document.getElementById('avgNightsValue').textContent = `${avgNights} nuit${avgNights !== '1.0' ? 's' : ''}`;
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function drawChart(reservations) {
    const canvas = document.getElementById('occupancyChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const days   = daysInMonth(currentYear, currentMonth);
    const counts = new Array(days).fill(0);

    reservations.forEach(r => {
        const checkIn  = new Date(r.check_in_date);
        const checkOut = new Date(r.check_out_date);

        for (let d = 1; d <= days; d++) {
            const day = new Date(currentYear, currentMonth, d);
            if (day >= checkIn && day < checkOut) {
                counts[d - 1]++;
            }
        }
    });

    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.offsetWidth  || canvas.parentElement.offsetWidth || 600;
    const cssH = 220;

    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
    ctx.scale(dpr, dpr);

    const paddingLeft   = 40;
    const paddingRight  = 12;
    const paddingTop    = 16;
    const paddingBottom = 32;

    const chartW = cssW - paddingLeft - paddingRight;
    const chartH = cssH - paddingTop  - paddingBottom;

    ctx.clearRect(0, 0, cssW, cssH);

    const maxVal = Math.max(...counts, totalRooms, 1);

    const style = getComputedStyle(document.documentElement);
    const colorBar    = style.getPropertyValue('--accent').trim()         || '#01696f';
    const colorGrid   = style.getPropertyValue('--border').trim()         || '#3a3a45';
    const colorText   = style.getPropertyValue('--text-secondary').trim() || '#a8a6a0';

    const yTicks = 4;
    ctx.font      = `11px Inter, system-ui, sans-serif`;
    ctx.fillStyle = colorText;
    ctx.textAlign = 'right';

    for (let i = 0; i <= yTicks; i++) {
        const val = Math.round((maxVal / yTicks) * i);
        const y   = paddingTop + chartH - (i / yTicks) * chartH;

        ctx.beginPath();
        ctx.strokeStyle = colorGrid;
        ctx.lineWidth   = 0.5;
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(paddingLeft + chartW, y);
        ctx.stroke();

        ctx.fillText(String(val), paddingLeft - 6, y + 4);
    }

    const barGap    = 2;
    const barWidth  = Math.max(2, (chartW / days) - barGap);
    const barSlot   = chartW / days;

    counts.forEach((count, i) => {
        const barH = chartH * (count / maxVal);
        const x    = paddingLeft + i * barSlot + barGap / 2;
        const y    = paddingTop  + chartH - barH;

        ctx.fillStyle = colorBar;
        ctx.beginPath();
        ctx.roundRect
            ? ctx.roundRect(x, y, barWidth, barH, [2, 2, 0, 0])
            : ctx.rect(x, y, barWidth, barH);
        ctx.fill();

        if (days <= 31 && barSlot >= 14) {
            ctx.fillStyle = colorText;
            ctx.textAlign = 'center';
            ctx.font      = '10px Inter, system-ui, sans-serif';
            ctx.fillText(String(i + 1), x + barWidth / 2, paddingTop + chartH + 16);
        }
    });

    if (days > 31 || barSlot < 14) {
        ctx.fillStyle = colorText;
        ctx.textAlign = 'center';
        ctx.font      = '10px Inter, system-ui, sans-serif';
        const labelDays = [1, 5, 10, 15, 20, 25, days];
        labelDays.forEach(d => {
            if (d > days) return;
            const x = paddingLeft + (d - 1) * barSlot + barSlot / 2;
            ctx.fillText(String(d), x, paddingTop + chartH + 16);
        });
    }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function setCardsLoading() {
    ['occupancyValue', 'revenueValue', 'staysValue', 'avgNightsValue'].forEach(id => {
        document.getElementById(id).textContent = '…';
    });
}
