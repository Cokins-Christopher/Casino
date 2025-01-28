import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // Import AuthContext
import '../styles/Login.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext); // Get the login function from AuthContext

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage(''); // Reset message for fresh attempt

    try {
      const response = await axios.post(
        'http://127.0.0.1:8000/api/login/',
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );

      if (response.status === 200) {
        const { username } = response.data; // Assume backend returns username in response
        setMessage('Login successful!');
        
        // Update AuthContext and store username in a cookie
        login({ username });

        // Navigate to home after a short delay
        setTimeout(() => navigate('/'), 750);
      }
    } catch (error) {
      if (error.response) {
        // Backend responded with an error
        const errorMessage = error.response.data.error || 'Invalid credentials. Please try again.';
        setMessage(errorMessage);
      } else if (error.request) {
        // No response from backend
        setMessage('Unable to reach the server. Please check your connection.');
      } else {
        // Other errors
        setMessage('An unexpected error occurred. Please try again.');
      }
      console.error('Error:', error);
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
      {message && <p className="login-message">{message}</p>}
    </div>
  );
}

export default LoginPage;
