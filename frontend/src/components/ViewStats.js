import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../styles/ViewStats.css';

const ViewStats = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const API_BASE_URL = "http://127.0.0.1:8000/api";

    useEffect(() => {
        if (!user) return;

        axios.get(`${API_BASE_URL}/view-stats/${user.id}/`)
            .then(response => {
                setStats(response.data);
            })
            .catch(error => {
                setError("Failed to load stats.");
                console.error("❌ Stats fetch error:", error);
            })
            .finally(() => setLoading(false));
    }, [user]);

    return (
        <div className="stats-container">
            <h2>📊 {user?.username}'s Stats</h2>

            {loading && <p className="loading-message">🔄 Loading stats...</p>}
            {error && <p className="error-message">⚠ {error}</p>}

            {stats && (
                <div className="stats-list">
                    <p>🏆 <strong>Total Winnings:</strong> {stats.total_winnings} coins</p>
                    <p>💳 <strong>Total Purchased:</strong> {stats.total_purchased} coins</p>
                    <p>📉 <strong>Total Losses:</strong> {stats.total_losses} coins</p>
                    <p>💰 <strong>Net Winnings:</strong> {stats.net_winnings} coins</p>
                    <p>🎰 <strong>Total Spins:</strong> {stats.total_spins}</p>
                    <p>📊 <strong>Avg Win Per Spin:</strong> {stats.average_win_per_spin} coins</p>
                    <p>🕰 <strong>Last Spin:</strong> {stats.last_spin}</p>
                </div>
            )}
        </div>
    );
};

export default ViewStats;
