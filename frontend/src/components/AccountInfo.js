import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/AccountInfo.css';

const AccountInfo = () => {
    const { user, login, isAuthenticated, isInitializing, getAuthToken } = useContext(AuthContext);
    const navigate = useNavigate();
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(null); // Tracks what is being edited: "username" or "email"
    const [formData, setFormData] = useState({ old_value: '', new_value: '' });

    const API_BASE_URL = "http://127.0.0.1:8000/api";
    
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
            setError('Please log in to view account');
            navigate('/login');
            return;
        }
        
        console.log("Setting up auth interceptors for AccountInfo");
        
        // Add a request interceptor to ensure the token is always set
        const requestInterceptor = axios.interceptors.request.use(
            config => {
                // Always check for the token before each request
                const currentToken = getAuthToken();
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
                        setError('Please log in to view account');
                        // Avoid immediate redirect to prevent loops
                        setTimeout(() => {
                            navigate('/login');
                        }, 1000);
                    }
                }
                return Promise.reject(error);
            }
        );
        
        // Fetch account data
        fetchAccountInfo();
        
        // Cleanup interceptors when component unmounts
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, [navigate, isInitializing]);
    
    // Helper function to verify auth before actions
    const verifyAuthBeforeAction = () => {
        // Check if user is authenticated
        if (!isAuthenticated()) {
            console.error("User is not authenticated");
            setError('Please log in to update account details');
            navigate('/login');
            return false;
        }
        
        // Double-check token availability
        const token = getAuthToken();
        if (!token) {
            console.error("No authentication token found");
            setError('Please log in to update account details');
            navigate('/login');
            return false;
        }
        
        return true;
    };
    
    // Function to fetch account data
    const fetchAccountInfo = async () => {
        if (!verifyAuthBeforeAction()) {
            return;
        }
        
        try {
            console.log("Fetching account info...");
            const response = await axios.get(`${API_BASE_URL}/account-info/me/`);
            console.log("Account data received:", response.data);
            setAccount(response.data);
            setError(null);
        } catch (error) {
            console.error("❌ Account info fetch error:", error);
            setError("Failed to load account details. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (!verifyAuthBeforeAction()) {
            return;
        }

        if (!formData.old_value || !formData.new_value) {
            setError("Please enter both the old and new values.");
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/account-info/me/`, {
                edit_type: editMode, // "username" or "email"
                old_value: formData.old_value,
                new_value: formData.new_value,
            });

            alert(response.data.message);
            if (editMode === "username") {
                login({ ...user, username: formData.new_value });
            } else if (editMode === "email") {
                login({ ...user, email: formData.new_value });
            }
            setEditMode(null);
            
            // Refresh the account data
            setLoading(true);
            fetchAccountInfo();
        } catch (error) {
            setError(error.response?.data?.error || "Failed to update account.");
        }
    };

    // If user is not available, show a message
    if (!user) {
        return (
            <div className="account-container">
                <h2>🔒 Account Information</h2>
                <p className="error-message">⚠ Please log in to view your account details.</p>
            </div>
        );
    }

    return (
        <div className="account-container">
            <h2>🔒 Account Information</h2>

            {loading && <p>🔄 Loading...</p>}
            {error && <p className="error-message">⚠ {error}</p>}

            {account && (
                <div className="account-details">
                    {!editMode ? (
                        <>
                            <p><strong>👤 Username:</strong> {account.username}</p>
                            <p><strong>📧 Email:</strong> {account.email}</p>
                            <button className="edit-btn" onClick={() => setEditMode("username")}>✏ Change Username</button>
                            <button className="edit-btn" onClick={() => setEditMode("email")}>✏ Change Email</button>
                        </>
                    ) : (
                        <div className="edit-form">
                            <p>Editing: {editMode === "username" ? "Username" : "Email"}</p>
                            <input 
                                type="text" 
                                placeholder={`Current ${editMode}`} 
                                onChange={(e) => setFormData({ ...formData, old_value: e.target.value })}
                                required
                            />
                            <input 
                                type="text" 
                                placeholder={`New ${editMode}`} 
                                onChange={(e) => setFormData({ ...formData, new_value: e.target.value })}
                                required
                            />
                            <button className="update-btn" onClick={handleUpdate}>Save Changes</button>
                            <button className="cancel-btn" onClick={() => setEditMode(null)}>Cancel</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccountInfo;
