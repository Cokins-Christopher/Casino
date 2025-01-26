import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import '../styles/Signup.css';


function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();  // Hook for navigation

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/users/', {
        username,
        email,
        password
      });

      if (response.status === 201) {
        setMessage('Signup successful!');
        setTimeout(() => {
          navigate('/');  // Redirect to home page
        }, 500);
      }
    } catch (error) {
      setMessage('Signup failed. Please try again.');
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
