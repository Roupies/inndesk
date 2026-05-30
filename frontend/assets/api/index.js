window.InnDesk = {
    api: {
        auth: authAPI,
        dashboard: {
            async getStats() {
                return await apiFetch('/dashboard/');
            }
        },
        rooms: roomsAPI,
        reservations: reservationsAPI,
        clients: clientsAPI
    },
    utils: {
        formatDate,
        formatShortDate,
        formatDateTime,
        formatCurrency,
        statusLabel,
        createStatusBadge,
        isToday,
        toggleTheme,
        showSkeleton,
        showError,
        createElement,
        clearElement,
        getFormData,
        showFieldError,
        clearFieldErrors,
        validateEmail,
        validateRequired
    },
    auth: {
        getToken,
        setToken,
        clearToken,
        getCurrentUser,
        setCurrentUser,
        ensureCurrentUser,
        redirectIfNotAuth,
        redirectIfAuth
    }
};