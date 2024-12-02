import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

const LabelView = () => {
    const [labels, setLabels] = useState([]);
    const [errorMessage, setErrorMessage] = useState("");
    const [showEmailInput, setShowEmailInput] = useState(null);
    const [recipientEmail, setRecipientEmail] = useState("");
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

    const handleShare = async (label) => {
        if (!recipientEmail) {
            setErrorMessage("Email address is required to share the label.");
            return;
        }

        try {
            const sharePayload = {
                mail: recipientEmail,
                labelId: label.label_id,
                isPrivate: label.isPrivate,
                pin: label.pin,
            };

            await axios.post(`${apiUrl}/share-label`, sharePayload);

            alert("Label shared successfully!");
            setShowEmailInput(null);
            setRecipientEmail("");
        } catch (error) {
            console.error("Error sharing label:", error);
            setErrorMessage("Failed to share label. Please try again later.");
        }
    };

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
                                <button onClick={() => setShowEmailInput(label.label_id)} className="ml-2 bg-green-500 text-white py-1 px-2 rounded">
                                    Share Label
                                </button>
                            </div>
                            {showEmailInput === label.label_id && (
                                <div className="mt-2">
                                    <input type="email" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="Enter recipient's email" className="border border-gray-400 px-2 py-1 rounded" />
                                    <button onClick={() => handleShare(label)} className="ml-2 bg-green-500 text-white py-1 px-2 rounded">
                                        Confirm Share
                                    </button>
                                    <button onClick={() => setShowEmailInput(null)} className="ml-2 bg-gray-500 text-white py-1 px-2 rounded">
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LabelView;
