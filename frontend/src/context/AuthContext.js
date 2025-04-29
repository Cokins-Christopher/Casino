import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');
    
    if (storedUser && token) {
      const userData = JSON.parse(storedUser);
      // Ensure balance is stored as a number
      if (userData.balance !== undefined) {
        userData.balance = parseFloat(userData.balance);
      }
      setUser(userData);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  const login = (userData, token) => {
    // Ensure balance is stored as a number
    if (userData.balance !== undefined) {
      userData.balance = parseFloat(userData.balance);
    }
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
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

  return (
    <AuthContext.Provider value={{ user, login, logout, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
};
