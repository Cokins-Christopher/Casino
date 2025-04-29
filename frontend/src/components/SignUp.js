import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Signup.css';

function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
  
    try {
      // First register the user
      const signupResponse = await axios.post('http://127.0.0.1:8000/api/users/', {
        username,
        email,
        password
      });
  
      if (signupResponse.status === 201) {
        setMessage('Signup successful! Logging you in...');
        
        // Then log them in automatically
        try {
          const loginResponse = await axios.post('http://127.0.0.1:8000/api/login/', {
            email,
            password
          });
          
          const userData = {
            id: loginResponse.data.id,
            username: loginResponse.data.username,
            email: loginResponse.data.email,
            balance: loginResponse.data.balance
          };
          
          const token = loginResponse.data.token;
          
          if (!userData || !token) {
            throw new Error('Invalid response from server');
          }
          
          // Store user data and token
          login(userData, token);
          
          // Navigate to home
          setTimeout(() => {
            navigate('/');
          }, 500);
        } catch (loginError) {
          console.error('Login error after signup:', loginError);
          setMessage('Signup successful! Please log in now.');
          setTimeout(() => {
            navigate('/login');
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error Response:', error.response?.data); // Log backend errors
      setMessage(error.response?.data?.detail || 'Signup failed. Please try again.');
    }
  };

  return (
    <div className="signup-container">
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
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
        <button type="submit" className="submit-btn">Sign Up</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default SignupPage;
