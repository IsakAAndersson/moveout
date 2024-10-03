import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { QRCodeCanvas } from 'qrcode.react';

function LabelDetail() {
    const { customerId, labelId } = useParams();
    const [labelData, setLabelData] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        axios.get(`http://localhost:3000/labels/${labelId}`)
            .then(response => {
                setLabelData(response.data);
            })
            .catch(error => {
                console.error('Error fetching label data:', error);
                setErrorMessage('Error fetching label data');
            });
    }, [labelId]);

    const handlePrint = () => {
        window.print();
    };

    if (!labelData) {
        return <div>Loading...</div>;
    }

    return (
        <div className="label-detail">
            <h3>Label Details for Customer {customerId}, Label {labelId}</h3>
            <p>Type: {labelData.type}</p>

            {/* Visa olika bilder beroende på type */}
            {labelData.type === 'fragile' && <img src="/images/fragile.png" alt="Fragile" />}
            {labelData.type === 'heavy' && <img src="/images/heavy.png" alt="Heavy" />}
            {labelData.type === 'standard' && <img src="/images/standard.png" alt="Standard" />}

            {/* Visa QR-kod som leder till description-sidan */}
            <QRCodeCanvas value={`http://localhost:3001/description/${labelId}`} />

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            {/* Utskriftsknapp */}
            <button onClick={handlePrint}>Print</button>
        </div>
    );
}

export default LabelDetail;

