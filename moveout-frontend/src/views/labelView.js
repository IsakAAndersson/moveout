import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const LabelView = () => {
    const [labels, setLabels] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const apiUrl = process.env.REACT_APP_API_URL || "/api";
    const userRole = localStorage.getItem("userRole");
    const userId = localStorage.getItem("customerId");

    console.log("LabelView User ID: ", userId);
    console.log("LabelView User Role: ", userRole);

    const fetchLabels = useCallback(async () => {
        try {
            let response;
            if (userRole === "admin") {
                response = await axios.get(`${apiUrl}/public/labels/${userId}`);
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

    /*const handleDelete = async (labelId) => {
        try {
            await axios.post(`${apiUrl}/delete/label/${labelId}`);
            setLabels(labels.filter((label) => label.label_id !== labelId));
        } catch (error) {
            console.error("Error deleting label:", error);
            setErrorMessage("Failed to delete label. Please try again later.");
        }
    };*/

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
                            <div>
                                <Link to={`/editLabel/${label.label_id}`}>
                                    <button className="ml-4 bg-blue-500 text-white py-1 px-2 rounded">Edit Label</button>
                                </Link>
                                <Link to={`/deleteLabel/${label.label_id}/${label.label_name}`}>
                                    <button className="ml-2 bg-red-500 text-white py-1 px-2 rounded">Delete Label</button>
                                </Link>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LabelView;
