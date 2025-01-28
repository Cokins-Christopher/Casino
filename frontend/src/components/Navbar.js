import React, { useContext, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout(); // Clear user and cookie
    navigate('/'); // Redirect to home
  };

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/" className="logo-link">Casino</Link>
      </div>
      <div className="nav-links">
        <Link to="/games" className="nav-link">Games</Link>
        <Link to="/promotions" className="nav-link">Promotions</Link>
        <Link to="/leaderboard" className="nav-link">Leaderboards</Link>
        {user && <Link to="/free-credits" className="nav-link">Free Credits</Link>}
      </div>
      <div className="auth-buttons">
        {!user ? (
          <>
            <button className="login-btn" onClick={() => navigate('/login')}>
              Log In
            </button>
            <button className="signup-btn" onClick={() => navigate('/signup')}>
              Sign Up
            </button>
          </>
        ) : (
          <div className="user-dropdown">
            <span
              className="username"
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              Welcome, {user.username}
            </span>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <button onClick={() => navigate('/stats')}>View Stats</button>
                <button onClick={() => navigate('/account')}>Account Info</button>
                <button onClick={handleLogout}>Log Out</button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
