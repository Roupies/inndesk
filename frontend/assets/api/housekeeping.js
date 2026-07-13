const housekeepingAPI = {
    async getRooms() {
        return await apiFetch('/housekeeping/');
    },

    async updateRoomStatus(roomId, status) {
        return await apiFetch(`/housekeeping/${roomId}`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    }
};