import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const LabelView = () => {
    const [labels, setLabels] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const apiUrl = process.env.REACT_APP_API_URL || "/api";
    const userRole = localStorage.getItem("userRole");
    const userId = localStorage.getItem("customerId");

    // Logga användarens information
    console.log("LabelView User ID: ", userId);
    console.log("LabelView User Role: ", userRole);

    const fetchLabels = useCallback(async () => {
        try {
            let response;
            if (userRole === "admin") {
                response = await axios.get(`${apiUrl}/public/labels`);
            } else {
                response = await axios.get(`${apiUrl}/customers/${userId}/labels`);
            }
            console.log("Response labelView.js: ", response);
            setLabels(response.data);
        } catch (error) {
            console.error("Error fetching labels:", error);
            setErrorMessage("Failed to fetch labels. Please try again later.");
        }
    }, [apiUrl, userRole, userId]);

    useEffect(() => {
        fetchLabels();
    }, [fetchLabels]);

    return (
        <div>
            <h1>Label Overview</h1>
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
            {labels.length === 0 ? (
                <p>No labels found.</p>
            ) : (
                <ul>
                    {labels.map((label) => (
                        <li key={label.label_id}>
                            <Link to={`/label/${label.customer_id}/${label.label_id}`}>
                                {label.type} - {label.label_name}
                            </Link>
                            {userRole === "admin" && ` - Customer: ${label.mail}`}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LabelView;
