import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/Leaderboard.css';

const Leaderboard = () => {
    const [period, setPeriod] = useState('day'); // Default to 'day'
    const [leaders, setLeaders] = useState([]);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = "http://127.0.0.1:8000/api"; // Ensure this matches Django backend

    useEffect(() => {
        setLoading(true);
        setError(null);

        axios.get(`${API_BASE_URL}/leaderboard/${period}/`)
            .then((response) => {
                const filteredData = response.data.filter((leader) => parseFloat(leader.total_winnings) > 0);
                setLeaders(filteredData);
            })
            .catch((err) => {
                setError("Failed to load leaderboard data.");
                console.error("❌ Leaderboard fetch error:", err);
            })
            .finally(() => setLoading(false));
    }, [period]);

    return (
        <div className="leaderboard-container">
            <h2 className="leaderboard-heading">🏆 Top 10 Casino Winners</h2>

            {/* Period Buttons */}
            <div className="leaderboard-buttons">
                <button onClick={() => setPeriod('day')} className={period === 'day' ? 'active' : ''}>Daily</button>
                <button onClick={() => setPeriod('week')} className={period === 'week' ? 'active' : ''}>Weekly</button>
                <button onClick={() => setPeriod('month')} className={period === 'month' ? 'active' : ''}>Monthly</button>
            </div>

            {/* Error Message */}
            {error && <p className="leaderboard-error">⚠ {error}</p>}

            {/* Loading State */}
            {loading && <p className="loading-message">🔄 Loading leaderboard...</p>}

            {/* Leaderboard List */}
            <ul className="leaderboard-list">
                {leaders.length > 0 ? (
                    leaders.map((leader, index) => (
                        <li key={index}>
                            <span className="leaderboard-rank">#{index + 1}</span>
                            <span className="leaderboard-name">{leader.user__username}</span>
                            <span className="leaderboard-earnings">💰 {parseFloat(leader.total_winnings).toFixed(2)} coins</span>
                        </li>
                    ))
                ) : (
                    !loading && <p className="no-data-message">No winners recorded for this period.</p>
                )}
            </ul>
        </div>
    );
};

export default Leaderboard;
