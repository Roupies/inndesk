const authAPI = {
    async login(credentials) {
        const response = await apiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (response.access_token) {
            setToken(response.access_token);
            // User data will be loaded after login
        }
        
        return response;
    },
    
    async getCurrentUser() {
        return await apiFetch('/users/me');
    },
    
    logout() {
        clearToken();
        window.location.href = '/app/index.html';
    }
};