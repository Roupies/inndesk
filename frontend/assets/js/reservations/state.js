// @file: assets/js/reservations/state.js

// Global state
let reservations = [];
let roomTypes = [];
let currentUser = null;
let selectedReservation = null;
let selectedRoomId = null;

// Client search timeout
let clientSearchTimeout = null;