import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import PropTypes from "prop-types";

function LabelDescription() {
    const { labelId } = useParams();
    const [labelData, setLabelData] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const [pin, setPin] = useState("");
    const [isPinVerified, setIsPinVerified] = useState(false);
    const apiUrl = process.env.REACT_APP_API_URL || "/api";

    useEffect(() => {
        const customerId = localStorage.getItem("customerId");

        console.log("Customer ID from localStorage: ", customerId);
        axios
            .get(`${apiUrl}/description/${labelId}`, {
                params: { customerId },
            })
            .then((response) => {
                const data = response.data;
                setLabelData({
                    labelId: Number(data.labelId),
                    labelName: String(data.labelName),
                    type: String(data.type),
                    textDescription: String(data.textDescription || ""),
                    imageUrls: Array.isArray(data.imageUrls) ? data.imageUrls.map(String) : [],
                    audioUrl: data.audioUrl ? String(data.audioUrl) : null,
                    pinVerified: Boolean(data.pinVerified),
                    pin: String(data.pin),
                });
                if (data.pinVerified) {
                    setIsPinVerified(true);
                }
            })
            .catch((error) => {
                console.error("Error fetching label data:", error);
                setErrorMessage("Error fetching label data");
            });
    }, [apiUrl, labelId]);

    const handlePinVerification = () => {
        if (labelData && pin === labelData.pin) {
            setIsPinVerified(true);
            setErrorMessage("");
        } else {
            setErrorMessage("Incorrect PIN");
        }
    };

    if (!labelData) {
        return <div>Loading...</div>;
    }

    console.log("LabelData ", labelData);

    return (
        <div className="label-description">
            <h1>{labelData.labelName}</h1>
            <p>Type: {labelData.type}</p>
            <p>Description: {labelData.textDescription}</p>

            {isPinVerified ? (
                <div>
                    <h2>Images</h2>
                    {labelData.imageUrls && labelData.imageUrls.map((imageUrl, index) => <img key={index} src={imageUrl} alt={`Label ${index + 1}`} style={{ maxWidth: "200px", margin: "10px" }} />)}
                    {labelData.audioUrl && (
                        <div>
                            <h2>Audio</h2>
                            <audio controls>
                                <source src={labelData.audioUrl} type="audio/mpeg" />
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    )}
                </div>
            ) : (
                <div>
                    <h2>Enter PIN to access the label</h2>
                    <input type="text" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="Enter 6-digit PIN" />
                    <button onClick={handlePinVerification}>Verify PIN</button>
                    {errorMessage && <p className="error-message">{errorMessage}</p>}
                </div>
            )}
        </div>
    );
}

LabelDescription.propTypes = {
    labelId: PropTypes.number,
    labelName: PropTypes.string,
    type: PropTypes.string,
    textDescription: PropTypes.string,
    imageUrls: PropTypes.arrayOf(PropTypes.string),
    audioUrl: PropTypes.string,
    pinVerified: PropTypes.bool,
    pin: PropTypes.string,
};

export default LabelDescription;
