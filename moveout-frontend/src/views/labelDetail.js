import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { QRCodeCanvas } from "qrcode.react";

function LabelDetail() {
    const { customerId, labelId } = useParams();
    const [labelData, setLabelData] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");
    const apiUrl = process.env.REACT_APP_API_URL || "/api";

    useEffect(() => {
        axios
            .get(`${apiUrl}/label/${labelId}`)
            .then((response) => {
                setLabelData(response.data);
            })
            .catch((error) => {
                console.error("Error fetching label data:", error);
                setErrorMessage("Error fetching label data");
            });
    }, [apiUrl, labelId]);

    const handlePrint = () => {
        window.print();
    };

    if (!labelData) {
        return <div>Loading...</div>;
    }

    return (
        <div className="label-detail">
            <h3>
                Label Details for Customer {customerId}, Label {labelId}
            </h3>
            <p>Type: {labelData.type}</p>

            {/* Display different images based on the label type */}
            {labelData.type === "fragile" && <img src="/images/fragile.png" alt="Fragile" />}
            {labelData.type === "heavy" && <img src="/images/heavy.png" alt="Heavy" />}
            {labelData.type === "standard" && <img src="/images/standard.png" alt="Standard" />}

            {/* Display a QR code that links to the description page */}
            <QRCodeCanvas value={`${process.env.REACT_APP_FRONTEND_URL}/description/${labelId}`} />

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            {/* Print button */}
            <button onClick={handlePrint}>Print</button>
        </div>
    );
}

export default LabelDetail;
