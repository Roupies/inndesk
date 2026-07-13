window.InnDesk = {
    api: {
        auth: authAPI,
        dashboard: {
            async getStats() {
                return await apiFetch('/dashboard/');
            }
        },
        rooms: typeof roomsAPI !== 'undefined' ? roomsAPI : null,
        reservations: typeof reservationsAPI !== 'undefined' ? reservationsAPI : null,
        clients: typeof clientsAPI !== 'undefined' ? clientsAPI : null,
        invoices: typeof invoicesAPI !== 'undefined' ? invoicesAPI : null,
        settings: typeof settingsAPI !== 'undefined' ? settingsAPI : null,
        housekeeping: typeof housekeepingAPI !== 'undefined' ? housekeepingAPI : null
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