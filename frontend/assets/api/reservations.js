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
    }
};