import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function AdminProfile() {
    const [customers, setCustomers] = useState([]);
    const [customerLabels, setCustomerLabels] = useState({});
    const [message, setMessage] = useState("");
    const [subject, setSubject] = useState("");
    const [content, setContent] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        fetchCustomersAndLabels();
    }, []);

    const fetchCustomersAndLabels = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/customers`);
            const customersData = response.data;

            const labelsPromises = customersData.map(async (customer) => {
                const labelsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/customers/${customer.customer_id}/labels`);
                return { customerId: customer.customer_id, labels: labelsResponse.data };
            });

            const labelsData = await Promise.all(labelsPromises);
            const labelsMap = labelsData.reduce((acc, item) => {
                acc[item.customerId] = item.labels;
                return acc;
            }, {});

            setCustomers(customersData);
            setCustomerLabels(labelsMap);
        } catch (error) {
            setMessage("Error fetching customers or labels");
            console.error("Error:", error);
        }
    };

    const softDeleteLabel = async (labelId) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/delete/label/${labelId}`);
            setMessage(response.data.message);
            fetchCustomersAndLabels();
        } catch (error) {
            setMessage("Error deleting label");
            console.error("Error during soft delete:", error);
        }
    };

    const promoteToAdmin = async (customerId) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/promote-to-admin/${customerId}`);
            setMessage(response.data.message);
            fetchCustomersAndLabels();
        } catch (error) {
            setMessage(error.response?.data?.error || "An error occurred");
        }
    };

    const deactivateCustomer = async (customerId) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/deactivate-customer/${customerId}`);
            setMessage(response.data.message);
            fetchCustomersAndLabels();
        } catch (error) {
            setMessage(error.response?.data?.error || "An error occurred");
        }
    };

    const activateCustomer = async (customerId) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/activate-customer/${customerId}`);
            setMessage(response.data.message);
            fetchCustomersAndLabels();
        } catch (error) {
            setMessage(error.response?.data?.error || "An error occurred");
        }
    };

    const marketingMail = async () => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/marketing-mail`, {
                subject,
                content,
            });

            if (response.data.success) {
                navigate("/", { state: { message: response.data.message } });
            } else {
                setMessage(response.data.message);
            }
        } catch (error) {
            console.error("Error sending marketing mail:", error);
            setMessage(error.response?.data?.message || "Failed to send marketing mail.");
        }
    };

    return (
        <div>
            <h2>Admin Profile</h2>
            <div>
                <h3>Send Marketing Email</h3>
                <input type="text" placeholder="Email Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <textarea placeholder="Email Content" value={content} onChange={(e) => setContent(e.target.value)} />
                <button onClick={marketingMail}>Send Marketing Email</button>
            </div>
            <ul>
                {customers.map((customer) => (
                    <li key={customer.customer_id}>
                        <div>
                            {customer.mail} - {customer.role}
                            {customer.role !== "admin" && <button onClick={() => promoteToAdmin(customer.customer_id)}>Promote to Admin</button>}
                            {customer.status === "verified" ? <button onClick={() => deactivateCustomer(customer.customer_id)}>Deactivate</button> : <button onClick={() => activateCustomer(customer.customer_id)}>Activate</button>}
                        </div>
                        <div>
                            <strong>Labels:</strong>
                            {customerLabels[customer.customer_id]?.length > 0 ? (
                                <ul>
                                    {customerLabels[customer.customer_id].map((label) => (
                                        <li key={label.label_id}>
                                            {label.label_name}: {label.textDescription}
                                            <button onClick={() => softDeleteLabel(label.label_id)}>Delete</button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>This customer has no labels</p>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
            {message && <p>{message}</p>}
        </div>
    );
}
