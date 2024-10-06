import React, { useEffect, useState } from 'react';
import axios from 'axios';

const LabelView = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState(null);
    const [labels, setLabels] = useState([]);

    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const response = await axios.get('http://localhost:3000/customers');
                console.log("Fetched customers: ", response.data);
                setCustomers(response.data); 
            } catch (error) {
                console.error("Error fetching customers:", error);
            }
        };

        fetchCustomers();
    }, []);

    const handleCustomerChange = async (event) => {
        const customerId = event.target.value;
        setSelectedCustomerId(customerId);

        if (customerId) {
            try {
                const response = await axios.get(`/customers/${customerId}/labels`);
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
                        <li key={label.label_id}>{label.type}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default LabelView;
