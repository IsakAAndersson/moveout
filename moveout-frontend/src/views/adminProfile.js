import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function AdminProfile() {
    const [customers, setCustomers] = useState([]);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/customers`);
            setCustomers(response.data);
        } catch (error) {
            setMessage('Error fetching customers');
        }
    };

    const promoteToAdmin = async (customerId) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/promote-to-admin`, { customerId });
            setMessage(response.data.message);
            fetchCustomers();
        } catch (error) {
            setMessage(error.response?.data?.message || 'An error occurred');
        }
    };

    const deactivateCustomer = async (customerId) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/deactivate-customer`, { customerId });
            setMessage(response.data.message);
            fetchCustomers();
        } catch (error) {
            setMessage(error.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <div>
            <h2>Admin Profile</h2>
            <ul>
                {customers.map(customer => (
                    <li key={customer.customer_id}>
                        {customer.mail} - {customer.role}
                        {customer.role !== 'admin' && (
                            <button onClick={() => promoteToAdmin(customer.customer_id)}>Promote to Admin</button>
                        )}
                        <button onClick={() => deactivateCustomer(customer.customer_id)}>Deactivate</button>
                    </li>
                ))}
            </ul>
            {message && <p>{message}</p>}
        </div>
    );
}