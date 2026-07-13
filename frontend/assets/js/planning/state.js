// @file: assets/js/planning/state.js

function mondayOf(date) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d;
}

function addDays(date, n) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
    d.setDate(d.getDate() + n);
    return d;
}

function diffDays(dateA, dateB) {
    const a = new Date(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
    const b = new Date(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
    return Math.round((b - a) / 86400000);
}

function toYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function fromYMD(str) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
}

function formatDayShort(date) {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
}

const state = {
    windowStart: mondayOf(new Date()),
    nbDays: 14,
    rows: [],
    reservations: [],
    loading: false,
    fetchId: 0
};
