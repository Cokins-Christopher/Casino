import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { STATS_UPDATED_EVENT } from '../components/BlackjackGame';
import '../styles/ViewStats.css';

const ViewStats = () => {
    const { user, isAuthenticated, isInitializing, getAuthToken } = useContext(AuthContext);
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
    const [justUpdated, setJustUpdated] = useState(false);

    const API_BASE_URL = "http://127.0.0.1:8000/api";
    
    // Listen for stats update events
    useEffect(() => {
        const handleStatsUpdate = () => {
            console.log("Stats update event received, refreshing stats data");
            setLastUpdateTime(Date.now());
            // Show "just updated" indicator
            setJustUpdated(true);
            setTimeout(() => setJustUpdated(false), 3000); // Show for 3 seconds
        };
        
        // Add event listener
        window.addEventListener(STATS_UPDATED_EVENT, handleStatsUpdate);
        
        // Clean up
        return () => {
            window.removeEventListener(STATS_UPDATED_EVENT, handleStatsUpdate);
        };
    }, []);
    
    // Set up axios interceptor to include authentication
    useEffect(() => {
        // Wait for auth context to initialize before proceeding
        if (isInitializing) {
            console.log("Auth context is still initializing, waiting...");
            return;
        }
        
        // Check if token exists before any API calls
        const token = getAuthToken();
        if (!token) {
            console.error("No authentication token found");
            setError('Please log in to view stats');
            navigate('/login');
            return;
        }
        
        console.log("Setting up auth interceptors for ViewStats");
        
        // Add a request interceptor to ensure the token is always set
        const requestInterceptor = axios.interceptors.request.use(
            config => {
                // Always check for the token before each request
                const currentToken = sessionStorage.getItem('token');
                if (currentToken) {
                    config.headers.Authorization = `Bearer ${currentToken}`;
                    console.log("Request with auth token:", config.url);
                } else {
                    console.error("No token available for request to:", config.url);
                }
                return config;
            },
            error => {
                console.error("Request interceptor error:", error);
                return Promise.reject(error);
            }
        );
        
        // Add a response interceptor to handle authentication errors
        const responseInterceptor = axios.interceptors.response.use(
            response => {
                return response;
            },
            error => {
                console.error("Response error:", error);
                
                // Handle 401 Unauthorized errors
                if (error.response && error.response.status === 401) {
                    console.error("Authentication error details:", {
                        status: error.response.status,
                        url: error.config.url,
                        data: error.response.data
                    });
                    
                    // Clear session storage and redirect to login if needed
                    if (window.location.pathname !== '/login') {
                        setError('Please log in to view stats');
                        // Avoid immediate redirect to prevent loops
                        setTimeout(() => {
                            navigate('/login');
                        }, 1000);
                    }
                }
                return Promise.reject(error);
            }
        );
        
        // Fetch stats data
        fetchStats();
        
        // Cleanup interceptors when component unmounts
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [navigate, isInitializing]);
    
    // Trigger fetchStats whenever lastUpdateTime changes
    useEffect(() => {
        if (!isInitializing && isAuthenticated()) {
            console.log(`Fetching fresh stats data at ${new Date(lastUpdateTime).toLocaleTimeString()}`);
            fetchStats();
        }
    }, [lastUpdateTime, isInitializing, isAuthenticated]);
    
    // Helper function to verify auth before actions
    const verifyAuthBeforeAction = () => {
        // Check if user is authenticated
        if (!isAuthenticated()) {
            console.error("User is not authenticated");
            setError('Please log in to view stats');
            navigate('/login');
            return false;
        }
        
        // Double-check token availability
        const token = getAuthToken();
        if (!token) {
            console.error("No authentication token found");
            setError('Please log in to view stats');
            navigate('/login');
            return false;
        }
        
        return true;
    };
    
    // Function to fetch stats data
    const fetchStats = async () => {
        if (!verifyAuthBeforeAction()) {
            return;
        }
        
        try {
            setLoading(true);
            console.log("Fetching stats data...");
            const response = await axios.get(`${API_BASE_URL}/view-stats/me/`);
            console.log("Stats data received:", response.data);
            setStats(response.data);
            setError(null);
        } catch (error) {
            console.error("❌ Stats fetch error:", error);
            setError("Failed to load stats. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="stats-container">
            <h2>📊 {user?.username ? `${user.username}'s Stats` : 'User Stats'}</h2>

            {loading && <p className="loading-message">🔄 Loading stats...</p>}
            {error && <p className="error-message">⚠ {error}</p>}
            {justUpdated && <p className="update-notification">✅ Stats refreshed!</p>}

            {stats && (
                <div className="stats-list">
                    <p>🏆 <strong>Total Winnings:</strong> {stats.total_winnings} coins</p>
                    <p>💳 <strong>Total Purchased:</strong> {stats.total_purchased} coins</p>
                    <p>📉 <strong>Total Losses:</strong> {stats.total_losses} coins</p>
                    <p>💰 <strong>Net Winnings:</strong> {stats.net_winnings} coins</p>
                    <p>🎰 <strong>Total Spins:</strong> {stats.total_spins}</p>
                    <p>📊 <strong>Avg Win Per Spin:</strong> {stats.average_win_per_spin} coins</p>
                    <p>🕰 <strong>Last Spin:</strong> {stats.last_spin}</p>
                    
                    <div className="stats-footer">
                        <p className="last-updated">
                            Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ViewStats;
