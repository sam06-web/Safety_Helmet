import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = !!token;

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp * 1000 < Date.now()) {
          logout();
        }
      } catch {
        // Token parsing failed, keep token
      }
    }
  }, [token]);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.login(username, password);
      const accessToken = data.access_token || data.token;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);

      const userData = data.user || { username, role: data.role || 'operator' };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return true;
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (username, email, password) => {
    setLoading(true);
    setError(null);
    try {
      const data = await authApi.signup(username, email, password);
      const accessToken = data.access_token || data.token;
      localStorage.setItem('token', accessToken);
      setToken(accessToken);

      const userData = data.user || { username, email, role: 'supervisor' };
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      return true;
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        loading,
        error,
        login,
        signup,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
