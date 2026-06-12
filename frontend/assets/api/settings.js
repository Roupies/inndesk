const settingsAPI = {
    // Hotel settings
    async getHotelSettings() {
        return await apiFetch('/settings/hotel');
    },

    async updateHotelSettings(data) {
        return await apiFetch('/settings/hotel', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // User management
    async getUsers() {
        return await apiFetch('/users/');
    },

    async createUser(data) {
        return await apiFetch('/users/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateUser(id, data) {
        return await apiFetch(`/users/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async resetUserPassword(id, data) {
        return await apiFetch(`/users/${id}/reset-password`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // Profile and security
    async getMe() {
        return await apiFetch('/users/me');
    },

    async updateMe(data) {
        return await apiFetch('/users/me', {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async changePassword(data) {
        return await apiFetch('/users/me/change-password', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};