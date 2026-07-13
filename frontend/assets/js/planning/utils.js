// @file: assets/js/planning/utils.js

const STATUS_LABEL = {
    confirmed:   'Confirmée',
    checked_in:  'En séjour',
    checked_out: 'Départ',
    cancelled:   'Annulée',
    no_show:     'No-show'
};

function statusLabel(status) {
    return STATUS_LABEL[status] || status;
}

function formatDateFr(isoDate) {
    if (!isoDate) return '';
    const [y, m, d] = isoDate.split('-');
    return `${d}/${m}/${y}`;
}

function nightsCount(checkIn, checkOut) {
    return diffDays(fromYMD(checkIn), fromYMD(checkOut));
}
