// @file: assets/js/rooms/handlers.js
// @depends: state.js, render.js, modals.js

// Filter functions
function setStatusFilter(status) {
    activeStatusFilter = status;
    updateFilterButtons('statusFilters', status);
    renderRooms();
}

function setTypeFilter(typeId) {
    activeTypeFilter = typeId;
    updateFilterButtons('typeFilters', typeId);
    renderRooms();
}

function updateFilterButtons(containerId, activeValue) {
    const container = document.getElementById(containerId);
    const buttons = container.querySelectorAll('.filter-pill');
    
    buttons.forEach(button => {
        if (button.dataset.filter === activeValue) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}