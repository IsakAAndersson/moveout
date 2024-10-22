import db from "./db.js";
import bcrypt from "bcrypt";
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

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
async function createLabel(customerId, labelName, type, textDescription, isPrivate, imageUrls = [], audioUrl = null) {
    console.log("Creating label with", { customerId, labelName, type, textDescription, isPrivate, imageUrls, audioUrl });

    const sql = "INSERT INTO `label` (customer_id, label_name, type, textDescription, isPrivate, status) VALUES (?, ?, ?, ?, ?, 'active')";

    try {
        console.log("Parameters being passed to SQL: ", {
            customerId,
            labelName,
            type,
            textDescription,
            isPrivate,
        });

        const result = await db.query(sql, [customerId, labelName, type, textDescription, isPrivate]);

        if (!result || !result.insertId) {
            throw new Error("Label creation failed, no insertId returned.");
        }

        const labelId = Number(result.insertId);

        const qrCodeUrl = `${process.env.REACT_APP_FRONTEND_URL || "http://localhost:3001"}/description/${labelId}`;
        console.log("Updating label with qr_path: ", qrCodeUrl, " and label_id: ", labelId);

        const updateSql = "UPDATE label SET qr_path = ? WHERE label_id = ?";
        await db.query(updateSql, [qrCodeUrl, labelId]);

        if (imageUrls.length > 0) {
            const imageInsertPromises = imageUrls.map((url) => {
                const imageSql = "INSERT INTO label_images (label_id, image_url) VALUES (?, ?)";
                return db.query(imageSql, [labelId, url]);
            });
            await Promise.all(imageInsertPromises);
            console.log("Images inserted for label:", imageUrls);
        }

        if (audioUrl) {
            const audioSql = "INSERT INTO label_audio (label_id, audio_url) VALUES (?, ?)";
            await db.query(audioSql, [labelId, audioUrl]);
            console.log("Audio inserted for label:", audioUrl);
        }

        return {
            labelId,
            customerId,
            labelName,
            type,
            textDescription,
            isPrivate,
            qrCodeUrl,
            imageUrls,
            audioUrl,
        };
    } catch (error) {
        console.error("Failed to create label: ", error);
        throw error;
    }
}

/*
    Skapa en ny etikett för en kund.
*/
async function loginCustomer(mail, password) {
    const sql = "SELECT * FROM customer WHERE mail = ?";
    const rows = await db.query(sql, [mail]);

    if (rows.length === 0) {
        throw new Error("Incorrect mail or password");
    }

    const customer = rows[0];
    const isMatch = await bcrypt.compare(password, customer.password);

    if (!isMatch) {
        throw new Error("Incorrect mail or password");
    }

    return {
        customerId: customer.customer_id,
        mail: customer.mail,
        status: customer.status,
        role: customer.role,
    };
}

/*
    Soft delete på label
*/
async function deleteLabel(labelId) {
    const sql = "UPDATE LABEL SET `status` = 'deleted' WHERE `label_id` = ?";
    await db.query(sql, [labelId]);
}

/*
    Hämta labels tillhörande kund
*/
async function getLabelsByCustomerId(customerId) {
    const integerCustomerId = Number(customerId);
    const sql = "SELECT * FROM label WHERE customer_id = ? AND status = 'active'";
    const labels = await db.query(sql, [integerCustomerId]);
    return labels;
}

/*
    Hämta specifik label
*/
async function getLabelByLabelId(labelId) {
    const sql = "SELECT * FROM label WHERE label_id = ?";
    const result = await db.query(sql, [labelId]);
    return result;
}

/*
    Uppdatera description
*/
async function updateLabelDescription(labelId, description, imageUrls = [], audioUrl = null, removeImages = false, removeAudio = false) {
    try {
        const sql = "UPDATE label SET textDescription = ? WHERE label_id = ?";
        await db.query(sql, [description, labelId]);

        if (removeImages) {
            const deleteImageSql = "DELETE FROM label_images WHERE label_id = ?";
            await db.query(deleteImageSql, [labelId]);
            console.log("Alla bilder har tagits bort för label:", labelId);
        }

        if (imageUrls.length > 0) {
            const imageInsertPromises = imageUrls.map((url) => {
                const insertImageSql = "INSERT INTO label_images (label_id, image_url) VALUES (?, ?)";
                return db.query(insertImageSql, [labelId, url]);
            });
            await Promise.all(imageInsertPromises);
            console.log("Nya bilder har lagts till:", imageUrls);
        }

        if (removeAudio) {
            const deleteAudioSql = "DELETE FROM label_audio WHERE label_id = ?";
            await db.query(deleteAudioSql, [labelId]);
            console.log("Ljudfil har tagits bort för label:", labelId);
        }

        if (audioUrl) {
            const insertAudioSql = "INSERT INTO label_audio (label_id, audio_url) VALUES (?, ?)";
            await db.query(insertAudioSql, [labelId, audioUrl]);
            console.log("Ny ljudfil har lagts till:", audioUrl);
        }

        return {
            message: "Label beskrivning och filer har uppdaterats",
            labelId,
            description,
            imageUrls,
            audioUrl,
        };
    } catch (error) {
        console.error("Fel vid uppdatering av label:", error);
        throw error;
    }
}

async function updatePassword(customerId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = "UPDATE customer SET password = ? WHERE customer_id = ?";
    await db.query(sql, [hashedPassword, customerId]);
}

async function deactivateAccount(customerId) {
    const sql = "UPDATE customer SET status = 'deactivated' WHERE customer_id = ?";
    await db.query(sql, [customerId]);
}

async function promoteToAdmin(customerId) {
    const sql = "UPDATE customer SET role = 'admin' WHERE customer_id = ?";
    await db.query(sql, [customerId]);
}

async function getAllPublicLabels() {
    const sql = "SELECT l.*, c.mail FROM label l JOIN customer c ON l.customer_id = c.customer_id WHERE l.isPrivate = 'public' AND l.status = 'active'";
    return db.query(sql);
}

export default {
    getAllCustomers,
    getCustomerById,
    createCustomer,
    createLabel,
    loginCustomer,
    deleteLabel,
    getLabelsByCustomerId,
    updateLabelDescription,
    getCustomerIdAndMail,
    getLabelByLabelId,
    updatePassword,
    deactivateAccount,
    promoteToAdmin,
    getAllPublicLabels,
};
