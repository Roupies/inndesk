const invoicesAPI = {
    async getAll(params = {}) {
        const searchParams = new URLSearchParams(params);
        return await apiFetch(`/invoices/?${searchParams}`);
    },
    
    async getById(id) {
        return await apiFetch(`/invoices/${id}`);
    },
    
    async create(data) {
        return await apiFetch('/invoices/', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async update(id, data) {
        return await apiFetch(`/invoices/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },
    
    async getStats() {
        return await apiFetch('/invoices/stats');
    },
    
    async downloadPDF(id) {
        const token = getToken();
        const response = await fetch(`/api/v1/invoices/${id}/pdf`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Erreur lors du téléchargement');
        }
        
        // Extract filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        const filename = contentDisposition 
            ? contentDisposition.split('filename=')[1].replace(/"/g, '')
            : `facture_${id}.pdf`;
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },
    
    async sendEmail(id, email) {
        return await apiFetch(`/invoices/${id}/send-email`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },
    
    async getAvailableReservations() {
        return await apiFetch('/invoices/available-reservations');
    }
};