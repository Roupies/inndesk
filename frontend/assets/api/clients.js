const clientsAPI = {
    async getAll(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await apiFetch(`/clients/?${searchParams}`);
    },
    
    async getById(id) {
        return await apiFetch(`/clients/${id}/`);
    },
    
    async create(data) {
        return await apiFetch('/clients/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async update(id, data) {
        return await apiFetch(`/clients/${id}/`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },
    
    async search(query) {
        return await apiFetch(`/clients/?search=${encodeURIComponent(query)}`);
    }
};