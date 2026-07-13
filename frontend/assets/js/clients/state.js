// @file: assets/js/clients/state.js
// Clients page state management

let clients = [];
let stats = {};
let selectedClient = null;
let selectedClientForDeletion = null;
let searchTimeout = null;

// Current filters
let currentFilters = {
    search: '',
    nationality: '',
    limit: 50,
    offset: 0
};