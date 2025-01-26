import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="logo">Casino</div>
      <div className="nav-links">
        <a href="#">Games</a>
        <a href="#">Promotions</a>
        <a href="#">Leaderboards</a>
        <a href="#">Free Credits</a>
      </div>
      <div className="auth-buttons">
        <button className="login-btn" onClick={() => navigate('/login')}>
          Log In
        </button>
        <button className="signup-btn" onClick={() => navigate('/signup')}>
          Sign Up
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
