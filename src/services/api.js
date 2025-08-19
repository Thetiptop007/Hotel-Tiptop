const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiService {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Get auth token from localStorage
    getAuthToken() {
        return localStorage.getItem('token');
    }

    // Set auth token in localStorage
    setAuthToken(token) {
        localStorage.setItem('token', token);
    }

    // Remove auth token from localStorage
    removeAuthToken() {
        localStorage.removeItem('token');
    }

    // Get auth headers
    getAuthHeaders() {
        const token = this.getAuthToken();
        return token ? { Authorization: `Bearer ${token}` } : {};
    }

    // Generic API call method
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;

        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...this.getAuthHeaders(),
                ...options.headers,
            },
            ...options,
        };

        // Don't stringify FormData
        if (options.body && !(options.body instanceof FormData)) {
            config.body = JSON.stringify(options.body);
        }

        console.log("ApiService - Making request:", {
            url,
            method: config.method,
            headers: config.headers,
            hasToken: !!this.getAuthToken()
        });

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            console.log("ApiService - Response received:", {
                ok: response.ok,
                status: response.status,
                success: data.success,
                dataKeys: Object.keys(data),
                message: data.message
            });

            if (!response.ok) {
                throw new Error(data.message || 'Something went wrong');
            }

            return data;
        } catch (error) {
            console.error("ApiService - Request failed:", error);
            // Handle network errors
            if (error.name === 'TypeError') {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }

    // Auth API calls
    async login(credentials) {
        const response = await this.apiCall('/auth/login', {
            method: 'POST',
            body: credentials,
        });

        if (response.success && response.token) {
            this.setAuthToken(response.token);
            // Store user data
            localStorage.setItem('user', JSON.stringify(response.user));
        }

        return response;
    }

    async register(userData) {
        return await this.apiCall('/auth/register', {
            method: 'POST',
            body: userData,
        });
    }

    async logout() {
        try {
            await this.apiCall('/auth/logout', { method: 'POST' });
        } finally {
            this.removeAuthToken();
        }
    }

    async getCurrentUser() {
        return await this.apiCall('/auth/me');
    }

    async updateProfile(userData) {
        return await this.apiCall('/auth/profile', {
            method: 'PUT',
            body: userData,
        });
    }

    async changePassword(passwordData) {
        return await this.apiCall('/auth/change-password', {
            method: 'PUT',
            body: passwordData,
        });
    }

    // Customer API calls
    async getCustomers(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/customers?${queryString}` : '/customers';

        console.log("ApiService - getCustomers called:", {
            endpoint,
            params,
            hasToken: !!this.getAuthToken(),
            authHeaders: this.getAuthHeaders()
        });

        return await this.apiCall(endpoint);
    }

    async createCustomer(customerData) {
        return await this.apiCall('/customers', {
            method: 'POST',
            body: customerData,
        });
    }

    async getCustomer(id) {
        return await this.apiCall(`/customers/${id}`);
    }

    async updateCustomer(id, customerData) {
        return await this.apiCall(`/customers/${id}`, {
            method: 'PUT',
            body: customerData,
        });
    }

    async deleteCustomer(id) {
        return await this.apiCall(`/customers/${id}`, {
            method: 'DELETE',
        });
    }

    async searchCustomer(params) {
        const queryString = new URLSearchParams(params).toString();
        return await this.apiCall(`/customers/search?${queryString}`);
    }

    async getCustomerHistory(id) {
        return await this.apiCall(`/customers/${id}/history`);
    }

    async uploadAadhaarImage(id, imageFile) {
        const formData = new FormData();
        formData.append('aadhaarImage', imageFile);

        return await this.apiCall(`/customers/${id}/aadhaar-image`, {
            method: 'POST',
            headers: {
                // Remove Content-Type header to let browser set it with boundary
                ...this.getAuthHeaders(),
            },
            body: formData,
        });
    }

    // Booking API calls
    async getBookings(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/bookings?${queryString}` : '/bookings';

        console.log("ApiService - getBookings called:", {
            endpoint,
            params,
            hasToken: !!this.getAuthToken(),
            authHeaders: this.getAuthHeaders()
        });

        return await this.apiCall(endpoint);
    }

    async createBooking(bookingData) {
        return await this.apiCall('/bookings', {
            method: 'POST',
            body: bookingData,
        });
    }

    async getBooking(id) {
        return await this.apiCall(`/bookings/${id}`);
    }

    async updateBooking(id, bookingData) {
        return await this.apiCall(`/bookings/${id}`, {
            method: 'PUT',
            body: bookingData,
        });
    }

    async deleteBooking(id) {
        return await this.apiCall(`/bookings/${id}`, {
            method: 'DELETE',
        });
    }

    async searchBookings(searchTerm) {
        return await this.apiCall(`/bookings/search?q=${encodeURIComponent(searchTerm)}`);
    }

    async getBookingsByDateRange(startDate, endDate) {
        return await this.apiCall(`/bookings/date-range?start=${startDate}&end=${endDate}`);
    }

    async updateBookingStatus(id, status) {
        return await this.apiCall(`/bookings/${id}/status`, {
            method: 'PUT',
            body: { status },
        });
    }

    async getBookingAnalytics(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/analytics/bookings?${queryString}` : '/analytics/bookings';
        return await this.apiCall(endpoint);
    }

    // Analytics API calls
    async getDashboardStats() {
        return await this.apiCall('/analytics/dashboard');
    }

    async getRevenueAnalytics(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/analytics/revenue?${queryString}` : '/analytics/revenue';
        return await this.apiCall(endpoint);
    }

    async getCustomerAnalytics() {
        return await this.apiCall('/analytics/customers');
    }

    async getOccupancyAnalytics() {
        return await this.apiCall('/analytics/occupancy');
    }

    async exportData(params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = queryString ? `/analytics/export?${queryString}` : '/analytics/export';
        return await this.apiCall(endpoint);
    }

    // Health check
    async healthCheck() {
        return await this.apiCall('/health');
    }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;
