import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Notification() {
    const location = useLocation();
    const navigate = useNavigate();
    const [notification, setNotification] = useState("");

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const message = params.get("message");
        if (message) {
            setNotification(message);
            navigate(location.pathname, { replace: true });
            const timer = setTimeout(() => {
                setNotification("");
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [location, navigate]);

    return notification ? <div className="notification">{notification}</div> : null;
}

export default Notification;
