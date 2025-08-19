import apiService from './api';

// Analytics API endpoints
export const analyticsAPI = {
    // Get dashboard statistics
    getDashboardStats: async () => {
        try {
            const response = await apiService.getDashboardStats();
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get revenue analytics
    getRevenueAnalytics: async (params = {}) => {
        try {
            const response = await apiService.getRevenueAnalytics(params);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get customer analytics
    getCustomerAnalytics: async (params = {}) => {
        try {
            const response = await apiService.getCustomerAnalytics(params);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get occupancy analytics
    getOccupancyAnalytics: async (params = {}) => {
        try {
            const response = await apiService.getOccupancyAnalytics(params);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Export data
    exportData: async (params = {}) => {
        try {
            const response = await apiService.exportData(params);
            return response;
        } catch (error) {
            throw error;
        }
    }
}; export default analyticsAPI;