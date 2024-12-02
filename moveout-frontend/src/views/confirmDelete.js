import React, { useEffect } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

const ConfirmDelete = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const email = searchParams.get("email");

    useEffect(() => {
        const confirmDelete = async () => {
            try {
                const response = await axios.post(`${process.env.REACT_APP_API_URL}/delete-account`, {
                    token,
                    email,
                });
                alert(response.data.message);
                window.location.href = "/";
            } catch (error) {
                alert(error.response?.data?.message || "Failed to delete account.");
            }
        };

        confirmDelete();
    }, [token, email]);

    return <div>Processing account deletion...</div>;
};

export default ConfirmDelete;
