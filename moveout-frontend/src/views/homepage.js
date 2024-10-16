import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import "../App.css";

function Home() {
    const [notification, setNotification] = useState("");
    const location = useLocation();

    useEffect(() => {
        if (location.state && location.state.message) {
            setNotification(location.state.message);
            // Clear the message from the location state
            window.history.replaceState({}, document.title);
            // Hide the notification after 5 seconds
            const timer = setTimeout(() => {
                setNotification("");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [location]);

    return (
        <div className="home-container">
            {notification && (
                <div className="notification" style={{
                    position: 'fixed',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    padding: '15px',
                    borderRadius: '5px',
                    zIndex: 1000
                }}>
                    {notification}
                </div>
            )}
            <Link to="/create-label">
                <button className="home-button">Create Label</button>
            </Link>
            <img className="home-image" src="https://www.wheatonworldwide.com/wp-content/uploads/2023/04/box1.png" alt="Box" />
        </div>
    );
}

export default Home;