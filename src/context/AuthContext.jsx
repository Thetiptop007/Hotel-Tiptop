import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check if token is expired
    const isTokenExpired = (token) => {
        if (!token) return true;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const currentTime = Date.now() / 1000;
            return payload.exp < currentTime;
        } catch (error) {
            return true;
        }
    };

    // Login function
    const login = async (credentials) => {
        try {
            const response = await apiService.login(credentials);

            if (response.success && response.token) {
                const userData = response.user;
                const authToken = response.token;

                // Store in state
                setUser(userData);
                setToken(authToken);
                setIsAuthenticated(true);

                // Store in localStorage with timestamp
                localStorage.setItem('token', authToken);
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('loginTime', Date.now().toString());

                return response;
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            throw error;
        }
    };

    // Logout function
    const logout = async () => {
        try {
            await apiService.logout();
        } catch (error) {
            // Continue with logout even if API call fails
            console.error('Logout API error:', error);
        } finally {
            // Clear state
            setUser(null);
            setToken(null);
            setIsAuthenticated(false);

            // Clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('loginTime');
        }
    };

    // Check authentication on app load
    const checkAuth = async () => {
        try {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            const loginTime = localStorage.getItem('loginTime');

            if (!storedToken || !storedUser || !loginTime) {
                setLoading(false);
                return;
            }

            // Check if token is expired
            if (isTokenExpired(storedToken)) {
                await logout();
                setLoading(false);
                return;
            }

            // Check if login is older than 3 days (3 * 24 * 60 * 60 * 1000 ms)
            const maxLoginDuration = 3 * 24 * 60 * 60 * 1000;
            const timeSinceLogin = Date.now() - parseInt(loginTime);

            if (timeSinceLogin > maxLoginDuration) {
                await logout();
                setLoading(false);
                return;
            }

            // Verify token with backend
            try {
                const response = await apiService.getCurrentUser();

                if (response.success) {
                    const userData = JSON.parse(storedUser);
                    setUser(userData);
                    setToken(storedToken);
                    setIsAuthenticated(true);
                } else {
                    await logout();
                }
            } catch (error) {
                // If token verification fails, logout
                await logout();
            }
        } catch (error) {
            console.error('Auth check error:', error);
            await logout();
        } finally {
            setLoading(false);
        }
    };

    // Refresh user data
    const refreshUser = async () => {
        try {
            const response = await apiService.getCurrentUser();
            if (response.success) {
                setUser(response.data.user);
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
        } catch (error) {
            console.error('User refresh error:', error);
        }
    };

    // Initialize auth on mount
    useEffect(() => {
        checkAuth();
    }, []);

    // Set up token refresh interval
    useEffect(() => {
        if (isAuthenticated && token) {
            // Check auth every 5 minutes
            const interval = setInterval(() => {
                checkAuth();
            }, 5 * 60 * 1000);

            return () => clearInterval(interval);
        }
    }, [isAuthenticated, token]);

    const value = {
        user,
        token,
        isAuthenticated,
        loading,
        login,
        logout,
        refreshUser,
        checkAuth
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
