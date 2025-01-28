import React, { useEffect, useState } from 'react';
import '../styles/Leaderboard.css';

const Leaderboard = () => {
    const [period, setPeriod] = useState('day'); // Default to 'day'
    const [leaders, setLeaders] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const url = `http://127.0.0.1:8000/api/leaderboard/${period}/`;

        fetch(url)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                // Filter out negative earnings
                const filteredData = data.filter((leader) => parseFloat(leader.total_earnings) > 0);
                setLeaders(filteredData);
            })
            .catch((err) => setError(err.message));
    }, [period]);

    return (
        <div className="leaderboard-container">
            <h2 className="leaderboard-heading">Top 10 Earners</h2>

            {/* Period Buttons */}
            <div className="leaderboard-buttons">
                <button
                    onClick={() => setPeriod('day')}
                    className={period === 'day' ? 'active' : ''}
                >
                    Daily
                </button>
                <button
                    onClick={() => setPeriod('week')}
                    className={period === 'week' ? 'active' : ''}
                >
                    Weekly
                </button>
                <button
                    onClick={() => setPeriod('month')}
                    className={period === 'month' ? 'active' : ''}
                >
                    Monthly
                </button>
            </div>

            {/* Error Message */}
            {error && <p className="leaderboard-error">Error: {error}</p>}

            {/* Leaderboard List */}
            <ul className="leaderboard-list">
                {leaders.length > 0 ? (
                    leaders.map((leader, index) => (
                        <li key={index}>
                            <span className="leaderboard-rank">{index + 1}.</span>
                            <span className="leaderboard-name">{leader.user__username}</span>
                            <span className="leaderboard-earnings">
                                ${parseFloat(leader.total_earnings).toFixed(2)}
                            </span>
                        </li>
                    ))
                ) : (
                    <p className="no-data-message">No data available for the selected period.</p>
                )}
            </ul>
        </div>
    );
};

export default Leaderboard;
