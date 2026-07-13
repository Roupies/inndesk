// Housekeeping state management
const housekeepingState = {
    rooms: [],
    loading: false,
    error: null,
    currentUser: null
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