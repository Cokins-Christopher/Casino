import { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (userData) => {
    setUser(userData);
    sessionStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  const updateBalance = (newBalance) => {
    if (user) {
      const updatedUser = { ...user, balance: newBalance };
      setUser(updatedUser); // ✅ Update user balance in state
      sessionStorage.setItem('user', JSON.stringify(updatedUser)); // ✅ Store updated user in sessionStorage
    }
  };


  return (
    <AuthContext.Provider value={{ user, login, logout, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
};
