import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Logout() {
    const navigate = useNavigate();

    useEffect(() => {
        const performLogout = () => {
            localStorage.removeItem("token");
            localStorage.removeItem("customerId");
            localStorage.removeItem("userRole");

            window.dispatchEvent(new Event("loginStateChange"));

            navigate("/");
        };

        performLogout();
    }, [navigate]);

    return <div>Logging out...</div>;
}

export default Logout;
