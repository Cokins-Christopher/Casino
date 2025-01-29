import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../styles/AccountInfo.css';

const AccountInfo = () => {
    const { user, login } = useContext(AuthContext);
    const [account, setAccount] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editMode, setEditMode] = useState(null); // Tracks what is being edited: "username" or "email"
    const [formData, setFormData] = useState({ old_value: '', new_value: '' });

    const API_BASE_URL = "http://127.0.0.1:8000/api";

    useEffect(() => {
        if (!user) return;

        axios.get(`${API_BASE_URL}/account-info/${user.id}/`)
            .then(response => setAccount(response.data))
            .catch(() => setError("Failed to load account details."))
            .finally(() => setLoading(false));
    }, [user]);

    const handleUpdate = async () => {
        if (!formData.old_value || !formData.new_value) {
            setError("Please enter both the old and new values.");
            return;
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/account-info/${user.id}/`, {
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
        } catch (error) {
            setError(error.response?.data?.error || "Failed to update account.");
        }
    };

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
