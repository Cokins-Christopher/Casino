import React, { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/Navbar.css';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!user);
  }, [user]);

  const handleLogout = () => {
    logout();
    setIsAuthenticated(false);
    setDropdownOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  return (
    <nav className="navbar">
      <div className="logo">
        <Link to="/" className="logo-link">Casino</Link>
      </div>
      <div className="nav-links">
        <Link to="/games" className="nav-link">Games</Link>
        <Link to="/promotions" className="nav-link">Promotions</Link>
        <Link to="/leaderboard" className="nav-link">Leaderboards</Link>
        {isAuthenticated && <Link to="/free-credits" className="nav-link">Free Credits</Link>}
      </div>
      <div className="auth-buttons">
        {isAuthenticated ? (
          <div className="user-dropdown" ref={dropdownRef}>
            <div className="user-info">
            <span className="balance">
  Balance: ${user?.balance ? user.balance.toFixed(2) : "0.00"}
  <span className="plus-button" onClick={() => navigate('/purchase-coins')}>+</span>
</span>
              <span className="username" onClick={() => setDropdownOpen(!dropdownOpen)}>
                Welcome, {user?.username}
              </span>
            </div>
            {dropdownOpen && (
              <div className="dropdown-menu">
                <button onClick={() => navigate('/view-stats')}>View Stats</button>
                <button onClick={() => navigate('/account-info')}>Account Info</button>
                <button onClick={handleLogout}>Log Out</button>
              </div>
            )}
          </div>
        ) : (
          <>
            <button className="login-btn" onClick={() => navigate('/login')}>Log In</button>
            <button className="signup-btn" onClick={() => navigate('/signup')}>Sign Up</button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
