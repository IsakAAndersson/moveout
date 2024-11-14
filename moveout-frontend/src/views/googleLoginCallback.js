import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function GoogleLoginCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const userId = params.get("userId");
        const role = params.get("role");

        console.log("Token: ", token);
        console.log("userId: ", userId);
        console.log("role: ", role);

        if (token && userId && role) {
            localStorage.setItem("token", token);
            localStorage.setItem("customerId", userId);
            localStorage.setItem("userRole", role);

            window.dispatchEvent(new Event("loginStateChange"));

            navigate("/");
        } else {
            navigate("/login");
        }
    }, [navigate]);

    return <div>Loading...</div>;
}

export default GoogleLoginCallback;
