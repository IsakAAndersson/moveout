import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const LabelView = () => {
    const [labels, setLabels] = useState([]);
    const apiUrl = process.env.REACT_APP_API_URL || "/api";
    const userRole = localStorage.getItem("userRole");
    const userId = localStorage.getItem("customerId");

    console.log("LabelView User ID: ", userId);
    console.log("LabelView User Role: ", userRole);

    const fetchLabels = useCallback(async () => {
        try {
            let response;
            if (userRole === "admin") {
                response = await axios.get(`${apiUrl}/labels/public`);
            } else {
                response = await axios.get(`${apiUrl}/customers/${userId}/labels`);
            }
            console.log("Response labelView.js: ", response);
            setLabels(response.data);
        } catch (error) {
            console.error("Error fetching labels:", error);
        }
    }, [apiUrl, userRole, userId]);

    useEffect(() => {
        fetchLabels();
    }, [fetchLabels]);

    return (
        <div>
            <h1>Label Overview</h1>
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
