// Housekeeping state management
const housekeepingState = {
    rooms: [],
    loading: false,
    error: null,
    currentUser: null,
    users: [],
    assignments: {},
    assignmentFilter: 'all'
};

function setRooms(rooms) {
    housekeepingState.rooms = rooms;
}

function setLoading(loading) {
    housekeepingState.loading = loading;
}

function setError(error) {
    housekeepingState.error = error;
}

function updateRoomStatus(roomId, newStatus) {
    const room = housekeepingState.rooms.find(r => r.id === roomId);
    if (room) {
        room.status = newStatus;
    }
}

function getRoomsByFloor() {
    const roomsByFloor = {};
    housekeepingState.rooms.forEach(room => {
        if (!roomsByFloor[room.floor]) {
            roomsByFloor[room.floor] = [];
        }
        roomsByFloor[room.floor].push(room);
    });
    
    // Sort rooms within each floor by room number
    Object.keys(roomsByFloor).forEach(floor => {
        roomsByFloor[floor].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    });
    
    return roomsByFloor;
}

function setCurrentUser(user) {
    housekeepingState.currentUser = user;
}

function setUsers(users) {
    housekeepingState.users = users;
}

function assignRoom(roomId, userId) {
    housekeepingState.assignments[roomId] = userId;
}

function unassignRoom(roomId) {
    delete housekeepingState.assignments[roomId];
}

function getAssignedUser(roomId) {
    const userId = housekeepingState.assignments[roomId];
    if (!userId) return null;
    return housekeepingState.users.find(u => u.id === userId) || null;
}

function setAssignmentFilter(filter) {
    housekeepingState.assignmentFilter = filter;
}

function getFilteredRoomsByFloor() {
    const filter = housekeepingState.assignmentFilter;
    const roomsByFloor = {};

    housekeepingState.rooms.forEach(room => {
        const isAssigned = !!housekeepingState.assignments[room.id];
        if (filter === 'assigned' && !isAssigned) return;
        if (filter === 'unassigned' && isAssigned) return;

        if (!roomsByFloor[room.floor]) roomsByFloor[room.floor] = [];
        roomsByFloor[room.floor].push(room);
    });

    Object.keys(roomsByFloor).forEach(floor => {
        roomsByFloor[floor].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }));
    });

    return roomsByFloor;
}