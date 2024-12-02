import React, { useState } from "react";
import axios from "axios";

export default function UserProfile() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [message, setMessage] = useState("");

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage("Passwords do not match");
            return;
        }
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/update-password`, {
                userId: localStorage.getItem("userId"),
                newPassword,
            });
            setMessage(response.data.message);
        } catch (error) {
            setMessage(error.response?.data?.message || "An error occurred");
        }
    };

    const handleDeactivateAccount = async () => {
        if (window.confirm("Are you sure you want to deactivate your account?")) {
            try {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/deactivate-account`, {
                    userId: localStorage.getItem("customerId"),
                });
                setMessage(response.data.message);
                localStorage.clear();
                window.location.href = "/";
            } catch (error) {
                setMessage(error.response?.data?.message || "An error occurred");
            }
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm("Are you sure you want to delete your account? This action is irreversible.")) {
            try {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/request-delete-account`, {
                    userId: localStorage.getItem("customerId"),
                });
    
                setMessage(response.data.message || "A confirmation email has been sent to your email address.");
                localStorage.clear();
                alert("A confirmation email has been sent to your email address.");
                window.location.href = "/";
            } catch (error) {
                setMessage(error.response?.data?.message || "An error occurred while requesting account deletion.");
            }
        }
    };
    

    return (
        <div>
            <h2>User Profile</h2>
            <form onSubmit={handlePasswordChange}>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New Password" required />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm New Password" required />
                <button type="submit">Change Password</button>
            </form>
            <button onClick={handleDeactivateAccount}>Deactivate Account</button>
            <button onClick={handleDeleteAccount}>Delete Account</button>
            {message && <p>{message}</p>}
        </div>
    );
}
