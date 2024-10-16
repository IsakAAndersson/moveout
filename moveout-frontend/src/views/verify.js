import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function Verify() {
    const [verificationStatus, setVerificationStatus] = useState("Verifying...");
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            const params = new URLSearchParams(location.search);
            const token = params.get("token");
            const email = params.get("email");

            if (!token || !email) {
                setVerificationStatus("Invalid verification link");
                return;
            }

            try {
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/verify`, {
                    params: { token, email },
                });
                if (response.data.success) {
                    setVerificationStatus(response.data.message);
                    // Store the verification status in sessionStorage
                    sessionStorage.setItem("verificationStatus", "success");
                    setTimeout(() => navigate("/", { state: { message: response.data.message } }), 3000);
                } else {
                    setVerificationStatus(response.data.message);
                }
            } catch (error) {
                setVerificationStatus(error.response?.data?.message || "Verification failed");
            }
        };

        // Check if verification has already been successful
        if (sessionStorage.getItem("verificationStatus") === "success") {
            navigate("/", { state: { message: "Email already verified successfully!" } });
        } else {
            verifyEmail();
        }
    }, [location, navigate]);

    return (
        <div>
            <h2>Email Verification</h2>
            <p>{verificationStatus}</p>
        </div>
    );
}

export default Verify;
