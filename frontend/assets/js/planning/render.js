// @file: assets/js/planning/render.js
// @depends: state.js, utils.js

function buildRows(rooms) {
    const groups = {};
    rooms.forEach(room => {
        const typeName = room.room_type?.name || 'Sans catégorie';
        if (!groups[typeName]) groups[typeName] = [];
        groups[typeName].push(room);
    });

    const rows = [];
    Object.keys(groups).sort().forEach(typeName => {
        rows.push({ type: 'group', label: typeName });
        groups[typeName]
            .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
            .forEach(room => rows.push({ type: 'room', id: room.id, number: room.number, typeName }));
    });

    rows.unshift({ type: 'unassigned', label: 'À assigner' });

    state.rows = rows;
}

function buildHeader() {
    const windowEnd = addDays(state.windowStart, state.nbDays);
    const today = new Date();
    const todayYMD = toYMD(today);

    let html = `<div class="pg-corner" aria-hidden="true"></div>`;

    for (let i = 0; i < state.nbDays; i++) {
        const d = addDays(state.windowStart, i);
        const ymd = toYMD(d);
        const isToday = ymd === todayYMD;
        const dayName = formatDayShort(d);
        const dayNum = d.getDate();
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;

        html += `<div class="pg-header-cell${isWeekend ? ' pg-weekend' : ''}${isToday ? ' pg-today-header' : ''}" aria-label="${dayName} ${dayNum}">
            <span class="pg-header-day">${dayName}</span>
            <span class="pg-header-num">${isToday ? 'Auj.' : dayNum}</span>
        </div>`;
    }

    return html;
}

function buildGridRows() {
    const windowEnd = addDays(state.windowStart, state.nbDays);
    const todayYMD = toYMD(new Date());
    let html = '';

    state.rows.forEach((row, rowIndex) => {
        const gridRow = rowIndex + 2;

        if (row.type === 'group') {
            html += `<div class="pg-group-label" style="grid-row:${gridRow};grid-column:1;" role="rowheader">${escapeHtml(row.label)}</div>`;
            for (let i = 0; i < state.nbDays; i++) {
                const d = addDays(state.windowStart, i);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                html += `<div class="pg-group-cell${isWeekend ? ' pg-weekend' : ''}" style="grid-row:${gridRow};grid-column:${i + 2};" aria-hidden="true"></div>`;
            }
        } else if (row.type === 'unassigned') {
            html += `<div class="pg-room-label pg-unassigned-label" style="grid-row:${gridRow};grid-column:1;" role="rowheader">
                <span class="pg-room-number">⚠ ${escapeHtml(row.label)}</span>
            </div>`;
            for (let i = 0; i < state.nbDays; i++) {
                const d = addDays(state.windowStart, i);
                const ymd = toYMD(d);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = ymd === todayYMD;
                html += `<div class="pg-cell pg-unassigned-cell${isWeekend ? ' pg-weekend' : ''}${isToday ? ' pg-today-col' : ''}" style="grid-row:${gridRow};grid-column:${i + 2};" role="gridcell" aria-label="${escapeHtml(row.label)}, ${ymd}"></div>`;
            }
        } else {
            html += `<div class="pg-room-label" style="grid-row:${gridRow};grid-column:1;" role="rowheader">
                <span class="pg-room-number">${escapeHtml(row.number)}</span>
            </div>`;
            for (let i = 0; i < state.nbDays; i++) {
                const d = addDays(state.windowStart, i);
                const ymd = toYMD(d);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = ymd === todayYMD;
                html += `<div class="pg-cell${isWeekend ? ' pg-weekend' : ''}${isToday ? ' pg-today-col' : ''}" style="grid-row:${gridRow};grid-column:${i + 2};" role="gridcell" data-room-id="${row.id}" data-date="${ymd}" tabindex="0" aria-label="Chambre ${escapeHtml(row.number)}, ${ymd}"></div>`;
            }
        }
    });

    return html;
}

function buildBars() {
    const windowEnd = addDays(state.windowStart, state.nbDays);
    const windowStartYMD = toYMD(state.windowStart);
    const windowEndYMD = toYMD(windowEnd);

    const relevantStatuses = new Set(['confirmed', 'checked_in', 'checked_out']);
    const todayYMD = toYMD(new Date());

    const reservations = state.reservations.filter(r => {
        if (!relevantStatuses.has(r.status)) return false;
        if (r.status === 'checked_out' && r.check_out_date !== todayYMD) return false;
        return r.check_in_date < windowEndYMD && r.check_out_date > windowStartYMD;
    });

    let html = '';

    reservations.forEach(r => {
        const checkIn = fromYMD(r.check_in_date);
        const checkOut = fromYMD(r.check_out_date);

        const clampedStart = checkIn < state.windowStart ? state.windowStart : checkIn;
        const clampedEnd = checkOut > windowEnd ? windowEnd : checkOut;

        const startIdx = diffDays(state.windowStart, clampedStart);
        const endIdx = diffDays(state.windowStart, clampedEnd);

        const clippedLeft = checkIn < state.windowStart;
        const clippedRight = checkOut > windowEnd;

        const colStart = startIdx + 2;
        const colEnd = clippedRight ? endIdx + 2 : endIdx + 3;

        let rowIndex;
        if (!r.room_id) {
            rowIndex = state.rows.findIndex(row => row.type === 'unassigned');
        } else {
            rowIndex = state.rows.findIndex(row => row.type === 'room' && row.id === r.room_id);
        }

        if (rowIndex === -1) return;

        const gridRow = rowIndex + 2;

        const lastName = r.client?.last_name || 'Client';
        const firstName = r.client?.first_name || '';
        const nights = nightsCount(r.check_in_date, r.check_out_date);

        const isArrival = !clippedLeft;
        const isDeparture = !clippedRight;

        let classes = `pg-bar pg-bar--${r.status}`;
        if (clippedLeft) classes += ' pg-bar--clipped-left';
        if (clippedRight) classes += ' pg-bar--clipped-right';
        if (isArrival) classes += ' pg-bar--arrival';
        if (isDeparture) classes += ' pg-bar--departure';

        const titleText = `${firstName} ${lastName} — Ch. ${r.room?.number || '?'} — ${formatDateFr(r.check_in_date)} → ${formatDateFr(r.check_out_date)} — ${statusLabel(r.status)}`.trim();

        const spanCols = colEnd - colStart;
        const half = (50 / spanCols).toFixed(3) + '%';
        const innerStyle = (isArrival ? `margin-left:${half};` : '') + (isDeparture ? `margin-right:${half};` : '');

        const label = spanCols <= 1 ? escapeHtml(lastName) : `${escapeHtml(lastName)} (${nights}n)`;

        html += `<div class="${classes}"
            style="grid-row:${gridRow};grid-column:${colStart}/${colEnd};"
            data-reservation-id="${r.id}"
            title="${escapeHtml(titleText)}"
            role="button"
            tabindex="0"
            aria-label="${escapeHtml(titleText)}">
            <div class="pg-bar-inner" style="${innerStyle}">
                <span class="pg-bar-label">${label}</span>
                ${clippedLeft ? '<span class="pg-bar-chevron pg-bar-chevron--left" aria-hidden="true">‹</span>' : ''}
                ${clippedRight ? '<span class="pg-bar-chevron pg-bar-chevron--right" aria-hidden="true">›</span>' : ''}
            </div>
        </div>`;
    });

    return html;
}

function buildTodayLine() {
    const todayYMD = toYMD(new Date());
    const windowEndYMD = toYMD(addDays(state.windowStart, state.nbDays));

    if (todayYMD < toYMD(state.windowStart) || todayYMD >= windowEndYMD) return '';

    const idx = diffDays(state.windowStart, fromYMD(todayYMD));
    const col = idx + 2;

    const totalRows = state.rows.length + 2;

    return `<div class="pg-today-line" style="grid-column:${col};grid-row:2/${totalRows};" aria-hidden="true"></div>`;
}

function renderWindowLabel() {
    const end = addDays(state.windowStart, state.nbDays - 1);
    const startFr = state.windowStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    const endFr = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('pgWindowLabel').textContent = `${startFr} – ${endFr}`;
}

function render() {
    const grid = document.getElementById('pgGrid');
    const nbDays = state.nbDays;

    grid.style.gridTemplateColumns = `var(--pg-room-col) repeat(${nbDays}, minmax(64px, 1fr))`;

    if (state.loading) {
        grid.innerHTML = `<div class="pg-loading" style="grid-column:1/-1;grid-row:2;">Chargement…</div>`;
        renderWindowLabel();
        return;
    }

    if (state.rows.length === 0) {
        grid.innerHTML = `<div class="pg-empty" style="grid-column:1/-1;grid-row:2;" role="status">Aucune chambre configurée.</div>`;
        renderWindowLabel();
        return;
    }

    const header = buildHeader();
    const rows = buildGridRows();
    const bars = buildBars();
    const todayLine = buildTodayLine();

    grid.innerHTML = header + rows + bars + todayLine;
    renderWindowLabel();

    const btn7 = document.getElementById('pgBtn7');
    const btn14 = document.getElementById('pgBtn14');
    const btn28 = document.getElementById('pgBtn28');
    if (btn7) btn7.classList.toggle('active', nbDays === 7);
    if (btn14) btn14.classList.toggle('active', nbDays === 14);
    if (btn28) btn28.classList.toggle('active', nbDays === 28);
    if (btn7) btn7.setAttribute('aria-pressed', String(nbDays === 7));
    if (btn14) btn14.setAttribute('aria-pressed', String(nbDays === 14));
    if (btn28) btn28.setAttribute('aria-pressed', String(nbDays === 28));
}
