const reservationsAPI = {
    async getAll(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await apiFetch(`/reservations/?${searchParams}`);
    },
    
    async getById(id) {
        return await apiFetch(`/reservations/${id}/`);
    },
    
    async create(data) {
        return await apiFetch('/reservations/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async update(id, data) {
        return await apiFetch(`/reservations/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },
    
    async updateStatus(id, status) {
        return await apiFetch(`/reservations/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status })
        });
    },

    async confirm(id) {
        return await apiFetch(`/reservations/${id}/confirm`, { method: 'POST' });
    },

    async assignRoom(id, roomId) {
        return await apiFetch(`/reservations/${id}/assign-room`, {
            method: 'POST',
            body: JSON.stringify({ room_id: roomId })
        });
    },

    async getAvailableRooms(roomTypeId, checkIn, checkOut) {
        return await apiFetch(`/rooms/available/?room_type_id=${roomTypeId}&check_in=${checkIn}&check_out=${checkOut}`);
    },

    async cancel(id) {
        return await apiFetch(`/reservations/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled' })
        });
    },

    async delete(id) {
        return await apiFetch(`/reservations/${id}/`, {
            method: 'DELETE'
        });
    }
};