import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function CreateLabel() {
    const [customerId, setCustomerId] = useState("");
    const [labelType, setLabelType] = useState("standard");
    const [textDescription, setDescription] = useState("");
    const [isPrivate, setIsPrivate] = useState("public");
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState("");
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3000';

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Customer ID:", customerId);
        console.log("Label Type:", labelType);
        console.log("textDescription: ", textDescription);
        console.log("isPrivate: ", isPrivate);

        const privateValue = isPrivate === "private" ? 1 : 0;

        try {
            const response = await axios.post(`${apiUrl}/labels`, {
                customerId: customerId,
                type: labelType,
                isPrivate: privateValue,
                textDescription: textDescription,
            });

            console.log(response.data);
            alert("Label created successfully!");
            setErrorMessage("");

            const labelId = response.data.labelId;
            console.log("Label ID", labelId);
            navigate(`/label/${customerId}/${labelId}`);
        } catch (error) {
            console.error("There was an error creating the label!");
            setErrorMessage("There was an error creating the label!");
            console.error(error.response || error);
        }
    };

    return (
        <div className="create-label-container">
            <h2>Create a New Label</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Customer ID:
                    <input type="text" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required />
                </label>
                <label>
                    Label Type:
                    <select value={labelType} onChange={(e) => setLabelType(e.target.value)}>
                        <option value="fragile">Fragile</option>
                        <option value="heavy">Heavy</option>
                        <option value="standard">Standard</option>
                    </select>
                </label>
                <label>
                    Description:
                    <textarea value={textDescription} onChange={(e) => setDescription(e.target.value)} />
                </label>
                <label>
                    Privacy:
                    <select value={isPrivate} onChange={(e) => setIsPrivate(e.target.value)}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                    </select>
                </label>
                <button type="submit">Create Label</button>
            </form>
            {errorMessage && <p className="error-message">{errorMessage}</p>} {/* Visar felmeddelande */}
        </div>
    );
}

export default CreateLabel;
