import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.authenticated) {
        setCurrentUser(response.data.user);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success) {
        setCurrentUser(response.data.user);
        return { success: true, message: response.data.message };
      }
      return { success: false, message: response.data.message };
    } catch (error) {
      const data = error.response?.data || {};
      const msg = data.message || 'Login failed. Please try again.';
      return { 
        success: false, 
        message: msg, 
        needsVerification: data.needs_verification, 
        pendingUserId: data.pending_user_id 
      };
    }
  };

  const logout = async () => {
    try {
      const response = await api.post('/auth/logout');
      if (response.data.success) {
        setCurrentUser(null);
        return { success: true };
      }
      return { success: false };
    } catch (error) {
      setCurrentUser(null);
      return { success: true }; // Force local logout fallback
    }
  };

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, loading, checkAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
