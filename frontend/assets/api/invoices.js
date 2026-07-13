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
    
    async _fetchPDFBlob(id) {
        const token = getToken();
        const response = await fetch(`/api/v1/invoices/${id}/pdf`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw { status: response.status, detail: 'Erreur lors du téléchargement du PDF' };
        }

        const contentDisposition = response.headers.get('Content-Disposition') || '';
        let filename = `facture_${id}.pdf`;
        const rfc5987Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
        const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (rfc5987Match) {
            filename = decodeURIComponent(rfc5987Match[1]);
        } else if (plainMatch) {
            filename = plainMatch[1];
        }

        const blob = await response.blob();
        return { blob, filename };
    },

    async downloadPDF(id) {
        const { blob, filename } = await this._fetchPDFBlob(id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    async previewPDF(id) {
        const { blob } = await this._fetchPDFBlob(id);
        return window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
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