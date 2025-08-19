import apiService from './api';

// Auth API endpoints
export const authAPI = {
    // Login user
    login: async (credentials) => {
        try {
            const response = await apiService.login(credentials);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Register user
    register: async (userData) => {
        try {
            const response = await apiService.register(userData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Logout user
    logout: async () => {
        try {
            await apiService.logout();
        } catch (error) {
            // Ignore logout errors, but still clear local storage
        }
    },

    // Get current logged in user
    getMe: async () => {
        try {
            const response = await apiService.getCurrentUser();
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Update user profile
    updateProfile: async (profileData) => {
        try {
            const response = await apiService.updateProfile(profileData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Change password
    changePassword: async (passwordData) => {
        try {
            const response = await apiService.changePassword(passwordData);
            return response;
        } catch (error) {
            throw error;
        }
    },

    // Register admin (TEMPORARY - For development only)
    registerAdmin: async (userData) => {
        try {
            const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Admin registration failed');
            }

            return data;
        } catch (error) {
            throw error;
        }
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        const token = apiService.getAuthToken();
        const user = localStorage.getItem('user');
        return !!(token && user);
    },

    // Get stored user data
    getStoredUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // Get stored token
    getStoredToken: () => {
        return apiService.getAuthToken();
    }
};

export default authAPI;
