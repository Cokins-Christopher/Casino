import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/HomePage.css';

function HomePage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/users/')
      .then(response => {
        setUsers(response.data);
        setLoading(false);
      })
      .catch(() => {
        setError('Error fetching user data.');
        setLoading(false);
      });
  }, []);

  return (
    <div className="home-container">
      <h1>Registered Users</h1>
      {loading ? (
        <p>Loading users...</p>
      ) : error ? (
        <p>{error}</p>
      ) : (
        <ul className="user-list">
  {users.map((user, index) => (
    <li key={user.id || index} className="user-item">{user.username}</li>
  ))}
</ul>
      )}
    </div>
  );
}

export default HomePage;
