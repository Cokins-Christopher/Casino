import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize authentication state from session storage
  useEffect(() => {
    initializeAuth();
  }, []);

  // Centralized function to initialize authentication state
  const initializeAuth = () => {
    setIsInitializing(true);
    
    // Fixing auth flow: Improved token retrieval and validation
    const storedUser = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        const userData = JSON.parse(storedUser);
        // Ensure balance is stored as a number
        if (userData.balance !== undefined) {
          userData.balance = parseFloat(userData.balance);
        }
        setUser(userData);
        
        // Fixing auth flow: Apply token to all future axios requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log("Auth context initialized with token");
      } catch (error) {
        console.error("Error parsing stored user data:", error);
        // Clear invalid data
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      }
    } else if (!storedUser && token) {
      // Fixing auth flow: Handle case with token but no user data
      console.warn("Token exists but no user data found - clearing token");
      sessionStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } else if (storedUser && !token) {
      // Fixing auth flow: Handle case with user data but no token
      console.warn("User data exists but no token found - clearing user data");
      sessionStorage.removeItem('user');
      delete axios.defaults.headers.common['Authorization'];
    } else {
      // No user or token found
      delete axios.defaults.headers.common['Authorization'];
    }
    
    setIsInitializing(false);
  };

  const login = (userData, token) => {
    // Fixing auth flow: Improved token setting
    if (!userData || !token) {
      console.error("Invalid login data", { userData, token });
      return;
    }
    
    // Ensure balance is stored as a number
    if (userData.balance !== undefined) {
      userData.balance = parseFloat(userData.balance);
    }
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('token', token);
    
    // Fixing auth flow: Set auth header for all future axios requests
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log("User logged in successfully", userData.username);
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    
    // Fixing auth flow: Clear auth header on logout
    delete axios.defaults.headers.common['Authorization'];
    console.log("User logged out");
  };

  const updateBalance = (newBalance) => {
    if (user) {
      // Ensure balance is stored as a number
      const numericBalance = parseFloat(newBalance);
      const updatedUser = { ...user, balance: numericBalance };
      setUser(updatedUser);
      sessionStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  // Fixing auth flow: Add a helper function to check if user is authenticated
  const isAuthenticated = () => {
    return !!user && !!sessionStorage.getItem('token');
  };

  // Get current auth token
  const getAuthToken = () => {
    return sessionStorage.getItem('token');
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateBalance, 
      isAuthenticated, 
      isInitializing,
      getAuthToken,
      initializeAuth 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
