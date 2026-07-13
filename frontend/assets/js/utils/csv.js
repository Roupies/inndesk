// @file: assets/js/utils/csv.js
// Pure utility — no DOM access, no side effects.

/**
 * Escape a single cell value for RFC 4180 CSV.
 * Wraps in quotes if the value contains a comma, quote, or newline.
 */
function csvEscapeCell(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Build a CSV string from an array of objects.
 *
 * @param {object[]} rows        — Array of data objects
 * @param {Array<{header: string, value: function}>} columns
 *        — Array of { header, value } descriptors where value(row) returns the cell content
 * @returns {string}             — UTF-8 BOM + CSV text (semicolon-separated for Excel FR)
 */
function buildCsv(rows, columns) {
    const sep = ';';
    const headerLine = columns.map(c => csvEscapeCell(c.header)).join(sep);
    const dataLines = rows.map(row =>
        columns.map(c => csvEscapeCell(c.value(row))).join(sep)
    );
    return '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
}

/**
 * Trigger a browser download of a CSV string.
 *
 * @param {string} csvString  — The full CSV content including BOM
 * @param {string} filename   — e.g. "reservations_2026-06-26.csv"
 */
function downloadCsv(csvString, filename) {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Return today's date as YYYY-MM-DD (local time).
 */
function todayIso() {
    const d = new Date();
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}
