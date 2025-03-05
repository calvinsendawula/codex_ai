import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check auth status on mount
    const checkAuth = async () => {
      try {
        const response = await api.get('/check-auth');
        setIsAuthenticated(response.data.authenticated);
        setUser(response.data.user);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/login', { email, password });
    setIsAuthenticated(true);
    setUser(response.data.user);
    return response;
  };

  const logout = async () => {
    try {
      await api.post('/logout');
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still set as logged out even if request fails
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      login, 
      logout,
      user 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext); 