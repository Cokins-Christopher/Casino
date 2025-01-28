import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();

  return (
    <nav className="navbar">
      <div className="logo">
        {/* Use Link for internal navigation */}
        <Link to="/" className="logo-link">Casino</Link>
      </div>
      <div className="nav-links">
        {/* Replace <a> with Link for valid navigation */}
        <Link to="/games" className="nav-link">Games</Link>
        <Link to="/promotions" className="nav-link">Promotions</Link>
        <Link to="/leaderboards" className="nav-link">Leaderboards</Link>
        <Link to="/free-credits" className="nav-link">Free Credits</Link>
      </div>
      <div className="auth-buttons">
        {/* Use navigate for programmatic navigation */}
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
