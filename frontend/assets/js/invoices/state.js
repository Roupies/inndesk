// @file: assets/js/invoices/state.js
// Global state for invoices page

let invoices = [];
let availableReservations = [];
let stats = {};
let currentUser = null;

let currentFilters = {
    search: '',
    payment_status: ''
};

// Currently selected items for modals
let selectedInvoiceForDetail = null;
let selectedInvoiceForEmail = null;
let selectedInvoiceForPayment = null;

// Search timeout for debouncing
let searchTimeout = null;