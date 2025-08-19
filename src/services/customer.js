import apiService from './api';

// Customer API endpoints
export const customerAPI = {
    // Create new customer and booking
    createCustomer: async (customerData) => {
        try {
            const response = await apiService.createCustomer(customerData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get all customers with pagination and filters
    getCustomers: async (params = {}) => {
        try {
            const response = await apiService.getCustomers(params);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get single customer
    getCustomer: async (id) => {
        try {
            const response = await apiService.getCustomer(id);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Update customer
    updateCustomer: async (id, customerData) => {
        try {
            const response = await apiService.updateCustomer(id, customerData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Delete customer
    deleteCustomer: async (id) => {
        try {
            const response = await apiService.deleteCustomer(id);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Search customer by mobile or aadhaar
    searchCustomer: async (searchParams) => {
        try {
            const response = await apiService.searchCustomer(searchParams);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get customer history
    getCustomerHistory: async (id) => {
        try {
            const response = await apiService.getCustomerHistory(id);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Upload Aadhaar image
    uploadAadhaarImage: async (id, imageFile) => {
        try {
            const response = await apiService.uploadAadhaarImage(id, imageFile);
            return response;
        } catch (error) {
            throw error;
        }
    }
}; export default customerAPI;
