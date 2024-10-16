import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // Import the Link component
import axios from "axios";

const LabelView = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const [labels, setLabels] = useState([]);
    const apiUrl = process.env.REACT_APP_API_URL || "/api";

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await axios.get(`${apiUrl}/customers`);
                console.log("Fetched customers: ", response.data);
                setCustomers(response.data);
            } catch (error) {
                console.error("Error fetching customers:", error);
            }
        };

        fetchCustomers();
    }, [apiUrl]);

    const handleCustomerChange = async (event) => {
        const customerId = event.target.value;
        setSelectedCustomerId(customerId);

        if (customerId) {
            try {
                console.log("API URL: ", apiUrl);
                console.log(`Fetching labels from: ${apiUrl}/customers/${customerId}/labels`);
                const response = await axios.get(`${apiUrl}/customers/${customerId}/labels`);
                console.log("Fetched labels: ", response.data);
                setLabels(response.data);
            } catch (error) {
                console.error("Error fetching labels:", error);
            }
        } else {
            setLabels([]);
        }
    };

    console.log("LabelView rendered");

    return (
        <div>
            <h1>Label Overview</h1>
            <label>Select Customer ID:</label>
            <select onChange={handleCustomerChange} value={selectedCustomerId || ""}>
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                    <option key={customer.customer_id} value={customer.customer_id}>
                        {customer.customer_id}
                    </option>
                ))}
            </select>

            {labels.length === 0 ? (
                <p>No labels found for this customer.</p>
            ) : (
                <ul>
                    {labels.map((label) => (
                        <li key={label.label_id}>
                            <Link to={`/label/${selectedCustomerId}/${label.label_id}`}>
                                {label.type} - {label.label_name}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LabelView;
