import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Login.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
  
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/login/', {
        email,
        password
      }, {
        headers: { "Content-Type": "application/json" }
      });
  
      if (response.status === 200) {
        setMessage('Login successful!');
        setTimeout(() => navigate('/'), 1500);
      }
    } catch (error) {
        console.error('Error:', error.response.data);
        setMessage(error.response?.data?.password?.[0] || 'Signup failed. Please try again.');
    }
  };
  
  

  return (
    <div className="login-container">
      <h2>Log In</h2>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="login-btn">Log In</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default LoginPage;
