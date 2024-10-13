//isar23

"use strict";

const db = require("./db");
const bcrypt = require("bcrypt");

/*
  Hämta alla kunder från databasen.
*/
async function getAllCustomers() {
    const sql = "SELECT * FROM customer";
    return db.query(sql);
}

/*
  Hämta en kund baserat på ID.
*/
async function getCustomerById(customerId) {
    const sql = "SELECT * FROM customer WHERE customer_id = ?";
    const result = await db.query(sql, [customerId]);
    return result[0];
}

/*
  Skapa en ny kund.
*/
async function createCustomer(mail, password) {
    const hashedPassword = await bcrypt.hash(password, 10); // Hasha lösenordet med en saltomgång på 10

    const sql = "INSERT INTO `customer` (mail, password, status) VALUES (?, ?, 'unverified')";
    const result = await db.query(sql, [mail, hashedPassword]);
    return { customerId: result.insertId, mail };
}

async function getCustomerIdAndMail() {
    const sql = "SELECT CONCAT(customer_id, ' ', mail) AS customers FROM customer;";
    return await db.query(sql);
}

/*
  Skapa en ny etikett för en kund.
*/
async function createLabel(customerId, type, textDescription, isPrivate) {
    console.log("Creating label with", { customerId, type, textDescription, isPrivate });
    const sql = "INSERT INTO `label` (customer_id, type, textDescription, isPrivate, status) VALUES (?, ?, ?, ?, 'active')";
    try {
        console.log("Parameters being passed to SQL: ", {
            customerId: customerId,
            type: type,
            textDescription: textDescription,
            isPrivate: isPrivate,
            dataTypes: {
                customerId: typeof customerId,
                type: typeof type,
                textDescription: typeof textDescription,
                isPrivate: typeof isPrivate,
            },
        });

        const result = await db.query(sql, [customerId, type, textDescription, isPrivate]);

        if (!result || !result.insertId) {
            throw new Error("Label creation failed, no insertId returned.");
        }

        console.log("Result: ", result);
        const labelId = Number(result.insertId);
        const qrPath = `/description/${labelId}`;

        console.log("Updating label with qr_path: ", qrPath, " and label_id: ", labelId);

        const updateSql = "UPDATE label SET qr_path = ? WHERE label_id = ?";
        await db.query(updateSql, [qrPath, labelId]);

        return { labelId, customerId, type, textDescription, isPrivate, qrPath };
    } catch (error) {
        console.error("Failed to create label: ", error);
        throw error;
    }
}

/*async function getPublicLabels() {
    const sql = "SELECT * FROM label WHERE isPrivate = public";
    const rows = await db.query(sql);
    if (rows.length === 0) {
        throw new Error("No public labels");
    }
    return rows
}*/

async function loginCustomer(mail, password) {
    const sql = "SELECT * FROM customer WHERE mail = ?";
    const rows = await db.query(sql, [mail]);

    if (rows.length === 0) {
        throw new Error("Customer not found");
    }

    const customer = rows[0];
    const isMatch = await bcrypt.compare(password, customer.password); // Jämför hashat lösenord

    if (!isMatch) {
        throw new Error("Incorrect password");
    }

    return { customerId: customer.customer_id, mail: customer.mail, status: customer.status };
}

async function deleteLabel(labelId) {
    const sql = "UPDATE LABEL SET `status` = 'deleted' WHERE `label_id` = ?";
    await db.query(sql, [labelId]);
}

async function getLabelsByCustomerId(customerId) {
    const sql = "SELECT * FROM label WHERE customer_id = ? AND status = 'active'";
    const labels = await db.query(sql, [customerId]);
    return labels;
}

async function getLabelByLabelId(labelId) {
    const sql = "SELECT * FROM label WHERE label_id = ?";
    const result = await db.query(sql, [labelId]);
    return result;
}

async function updateLabelDescription(labelId, description, filePath) {
    try {
        const sql = "UPDATE label SET description = ?, file_path = ? WHERE label_id = ?";
        await db.query(sql, [description, filePath, labelId]);

        return { message: "Description and path updated", labelId, description, filePath };
    } catch (error) {
        console.error("Error updating label description:", error);
        throw error;
    }
}

module.exports = {
    getAllCustomers: getAllCustomers,
    getCustomerById: getCustomerById,
    createCustomer: createCustomer,
    createLabel: createLabel,
    loginCustomer: loginCustomer,
    deleteLabel: deleteLabel,
    getLabelsByCustomerId: getLabelsByCustomerId,
    updateLabelDescription: updateLabelDescription,
    getCustomerIdAndMail: getCustomerIdAndMail,
    getLabelByLabelId: getLabelByLabelId,
};
