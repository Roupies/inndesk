const roomsAPI = {
    async getAll(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await apiFetch(`/rooms/?${searchParams}`);
    },
    
    async getById(id) {
        return await apiFetch(`/rooms/${id}/`);
    },
    
    async getTypes() {
        return await apiFetch('/room-types/');
    }
};