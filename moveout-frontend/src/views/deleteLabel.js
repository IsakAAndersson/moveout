import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const DeleteLabel = () => {
    const { labelId, labelName } = useParams();
    const navigate = useNavigate();

    const handleDelete = async () => {
        try {
            await axios.post(`/api/label/${labelId}/action`, { action: "softDelete" });
            navigate("/labels");
        } catch (error) {
            console.error("Error deleting label:", error);
        }
    };

    const handleCancel = () => {
        navigate("/labels");
    };

    return (
        <div>
            <h2>Confirm Deletion</h2>
            <p>
                Are you sure you want to delete label - Label ID: {labelId}, Label Name: {labelName}?
            </p>
            <button onClick={handleDelete}>Yes</button>
            <button onClick={handleCancel}>No</button>
        </div>
    );
};

export default DeleteLabel;
