import apiService from './api';

// Cache for frequently accessed data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Booking API endpoints with caching and optimization for large datasets
export const bookingAPI = {
    // Create new booking
    createBooking: async (bookingData) => {
        try {
            const response = await apiService.createBooking(bookingData);
            // Clear cache after creating new booking
            cache.clear();
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get all bookings with pagination and filters - optimized for large datasets
    getBookings: async (params = {}) => {
        try {
            // Create cache key from parameters
            const cacheKey = JSON.stringify(params);
            const cached = cache.get(cacheKey);

            // Return cached data if valid and not searching (to ensure fresh search results)
            if (cached && Date.now() - cached.timestamp < CACHE_TTL && !params.search) {
                return cached.data;
            }

            const response = await apiService.getBookings(params);

            // Cache the response for pagination without search
            if (!params.search && response.success) {
                cache.set(cacheKey, {
                    data: response,
                    timestamp: Date.now()
                });
            }

            return response;
        } catch (error) {
            throw error;
        }
    },

    // Advanced search for large datasets
    advancedSearch: async (searchParams) => {
        try {
            const queryParams = new URLSearchParams();

            Object.keys(searchParams).forEach(key => {
                if (searchParams[key] !== undefined && searchParams[key] !== '') {
                    queryParams.append(key, searchParams[key]);
                }
            });

            const response = await fetch(`${apiService.baseURL}/bookings/advanced-search?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            return data;
        } catch (error) {
            throw error;
        }
    },

    // Get booking statistics optimized for large datasets
    getBookingStats: async () => {
        try {
            const cacheKey = 'booking-stats';
            const cached = cache.get(cacheKey);

            // Cache stats for 2 minutes
            if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
                return cached.data;
            }

            const response = await fetch(`${apiService.baseURL}/bookings/stats`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Get single booking
    getBooking: async (id) => {
        try {
            const response = await apiService.getBooking(id);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Update booking
    updateBooking: async (id, bookingData) => {
        try {
            const response = await apiService.updateBooking(id, bookingData);
            // Clear cache after updating
            cache.clear();
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Delete booking
    deleteBooking: async (id) => {
        try {
            const response = await apiService.deleteBooking(id);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get booking analytics
    getBookingAnalytics: async (params = {}) => {
        try {
            const response = await apiService.getBookingAnalytics(params);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Search bookings
    searchBookings: async (searchTerm) => {
        try {
            const response = await apiService.searchBookings(searchTerm);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Get bookings by date range
    getBookingsByDateRange: async (startDate, endDate) => {
        try {
            const response = await apiService.getBookingsByDateRange(startDate, endDate);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Check in/out booking
    updateBookingStatus: async (id, status) => {
        try {
            const response = await apiService.updateBookingStatus(id, status);
            return response;
        } catch (error) {
            throw error;
        }
    }
};

export default bookingAPI;
