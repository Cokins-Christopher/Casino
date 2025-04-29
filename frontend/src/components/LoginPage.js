import React, { useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const API_BASE_URL = "http://127.0.0.1:8000/api";

  const handleLogin = async (event) => {
    event.preventDefault();
    setErrorMessage('');

    try {
      const response = await axios.post(`${API_BASE_URL}/login/`, {
        email,
        password,
      });

      const userData = {
        id: response.data.id,
        username: response.data.username,
        email: response.data.email,
        balance: response.data.balance
      };
      
      const token = response.data.token;

      if (!userData || !token) {
        throw new Error('Invalid response from server');
      }

      // Store user data and token
      login(userData, token);

      // Redirect to home page
      navigate('/');

    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(error.response?.data?.error || "Invalid email or password. Please try again.");
    }
  };

  return (
    <div className="login-container">
      <h2>Login to Your Account</h2>
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      <form onSubmit={handleLogin}>
        <div className="input-group">
          <label>Email:</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div className="input-group">
          <label>Password:</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button type="submit" className="login-btn">Login</button>
      </form>
    </div>
  );
};

export default LoginPage;
