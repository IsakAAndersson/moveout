import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

function LabelDescription() {
    const { labelId } = useParams();
    const [labelData, setLabelData] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const apiUrl = process.env.REACT_APP_API_URL || "/api";

    useEffect(() => {
        axios
            .get(`${apiUrl}/labels/${labelId}`)
            .then((response) => {
                setLabelData(response.data);
            })
            .catch((error) => {
                console.error("Error fetching label data:", error);
                setErrorMessage("Error fetching label data");
            });
    }, [apiUrl, labelId]);

    if (!labelData) {
        return <div>Loading...</div>;
    }

    console.log("labelDescription: ", labelData.textDescription);
    console.log("imageUrl: ", labelData.imageUrls);
    console.log("audioUrl: ", labelData.audioUrl);
    console.log("labelData.label", labelData.label);

    return (
        <div className="label-description">
            <h1>{labelData.labelName}</h1>
            <p>Type: {labelData.type}</p>
            <p>Description: {labelData.textDescription}</p>
            <div>
                <h2>Images</h2>
                {labelData.imageUrls && labelData.imageUrls.map((imageUrl, index) => <img key={index} src={imageUrl} alt={`Label ${index + 1}`} style={{ maxWidth: "200px", margin: "10px" }} />)}
            </div>
            {labelData.audioUrl && (
                <div>
                    <h2>Audio</h2>
                    <audio controls>
                        <source src={labelData.audioUrl.audio_url} type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                </div>
            )}
            {errorMessage && <p className="error-message">{errorMessage}</p>}
        </div>
    );
}

export default LabelDescription;
