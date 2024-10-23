import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { verifyToken, logIncomingToConsole } from "./middleware/index.js";
import moveOut from "./src/moveout.js";
import db from "./src/db.js";
import config from "./config/mo/config.json" assert { type: "json" };

dotenv.config();

const app = express();
const secret = process.env.JWT_SECRET;
const emailPassword = process.env.EMAIL_PASS;
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

app.use(
    cors({
        origin: "http://localhost:3001",
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(logIncomingToConsole);
app.use(express.json());

app.listen(config.server.port, () => {
    console.log(`Server running on port ${config.server.port}`);
});

app.get("/api/protected", verifyToken, (req, res) => {
    res.status(200).send({ message: "This is a protected route", customerId: req.customerId });
});

app.post("/api/register", async (req, res) => {
    const { mail, password } = req.body;
    if (!mail || !password) {
        return res.status(400).send({ message: "Mail address and password are required." });
    }

    try {
        const userCheck = await db.query("SELECT * FROM customer WHERE mail = ?", [mail]);
        if (userCheck.length > 0) {
            return res.status(400).send({ message: "Mail address already in use." });
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).send({
                message: "Password must contain at least one lowercase letter, one uppercase letter, and one number, and be at least 8 characters long.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO customer (mail, password, status) VALUES (?, ?, "unverified")';
        await db.query(sql, [mail, hashedPassword]);

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 14);

        await db.query("INSERT INTO verification_tokens (token, mail, expiration_date) VALUES (?, ?, ?)", [verificationToken, mail, expirationDate]);

        const verificationLink = `${process.env.FRONTEND_URL}/verify?token=${verificationToken}&email=${encodeURIComponent(mail)}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "isar23moveout@gmail.com",
                pass: emailPassword,
            },
        });

        const mailOptions = {
            from: "isar23moveout@gmail.com",
            to: mail,
            subject: "Email Verification",
            text: `Click on the following link to verify your email: ${verificationLink}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending verification email:", error);
            } else {
                console.log("Verification email sent:", info.response);
            }
        });

        return res.status(201).send({
            success: true,
            message: "User registered successfully! A verification link has been sent to your submitted e-mail address",
        });
    } catch (error) {
        console.error("Error during registration:", error);
        return res.status(500).send({ success: false, message: "Database error." });
    }
});

app.get("/api/verify", async (req, res) => {
    const { token, email } = req.query;

    try {
        const result = await db.query("SELECT * FROM verification_tokens WHERE token = ? AND mail = ? AND expiration_date > NOW()", [token, email]);

        if (result.length === 0) {
            return res.status(400).json({ success: false, message: "Invalid or expired token." });
        }

        await db.query('UPDATE customer SET status = "verified" WHERE mail = ?', [email]);
        await db.query("DELETE FROM verification_tokens WHERE mail = ?", [email]);

        return res.status(200).json({ success: true, message: "Email verified successfully!" });
    } catch (error) {
        console.error("Verification error:", error);
        return res.status(500).json({ success: false, message: "Database error." });
    }
});

app.post(
    "/api/labels",
    upload.fields([
        { name: "images", maxCount: 5 },
        { name: "audio", maxCount: 1 },
    ]),
    async (req, res) => {
        console.log("Received data:", JSON.stringify(req.body, null, 2));
        console.log("Received files:", req.files);

        const { customerId, labelName, type, textDescription, isPrivate } = req.body;

        try {
            const imageUrls = [];
            if (req.files.images) {
                for (let i = 0; i < req.files.images.length; i++) {
                    const file = req.files.images[i];
                    const key = `labels/${customerId}/${Date.now()}_${i}.${file.originalname.split(".").pop()}`;
                    await s3Client.send(
                        new PutObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: key,
                            Body: file.buffer,
                            ContentType: file.mimetype,
                        })
                    );
                    imageUrls.push(`https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`);
                }
            }

            let audioUrl = null;
            if (req.files.audio) {
                const audioFile = req.files.audio[0];
                const audioKey = `labels/${customerId}/${Date.now()}_audio.${audioFile.originalname.split(".").pop()}`;
                await s3Client.send(
                    new PutObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: audioKey,
                        Body: audioFile.buffer,
                        ContentType: audioFile.mimetype,
                    })
                );
                audioUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${audioKey}`;
            }

            const response = await moveOut.createLabel(customerId, labelName, type, textDescription, isPrivate, imageUrls, audioUrl);
            res.status(201).json(response);
        } catch (error) {
            console.error("Error creating label:", error);
            res.status(500).json({ error: "Failed to create label" });
        }
    }
);

app.get("/api/labels/:labelId", async (req, res) => {
    const labelId = Number(req.params.labelId);

    console.log("labelId: ", labelId);

    try {
        const [label] = await db.query("SELECT * FROM label WHERE label_id = ?", [labelId]);

        console.log("Raw Label Rows:", JSON.stringify(label, null, 2));

        if (!label || label.length === 0) {
            console.log("No label found for id:", labelId);
            return res.status(404).json({ error: "Label not found" });
        }

        const [imageRows] = await db.query("SELECT image_url FROM label_images WHERE label_id = ?", [labelId]);
        console.log("Raw Image Rows:", JSON.stringify(imageRows, null, 2));

        let imageUrls = [];
        if (Array.isArray(imageRows)) {
            imageUrls = imageRows.map((row) => row.image_url);
        } else if (imageRows && imageRows.image_url) {
            imageUrls = [imageRows.image_url];
        }

        console.log("Processed imageUrls:", JSON.stringify(imageUrls, null, 2));

        const [audioRows] = await db.query("SELECT audio_url FROM label_audio WHERE label_id = ?", [labelId]);
        console.log("Raw Audio Rows:", JSON.stringify(audioRows, null, 2));

        let audioUrl = null;
        if (Array.isArray(audioRows) && audioRows.length > 0) {
            audioUrl = audioRows[0].audio_url;
        } else if (audioRows && audioRows.audio_url) {
            audioUrl = audioRows.audio_url;
        }

        console.log("Processed audioUrl:", audioUrl);

        if (!label) {
            console.log("Label data is undefined after processing");
            return res.status(500).json({ error: "Failed to process label data" });
        }

        const labelData = {
            label_id: label.label_id,
            label_name: label.label_name,
            type: label.type,
            customer_id: label.customer_id,
            qr_path: label.qr_path,
            status: label.status,
            textDescription: label.textDescription,
            isPrivate: label.isPrivate,
            pin: label.pin,
            imageUrls: imageUrls,
            audioUrl: audioUrl,
        };

        console.log("Sending label data:", JSON.stringify(labelData, null, 2));

        res.json(labelData);
    } catch (error) {
        console.error("Error fetching label:", error);
        res.status(500).json({ error: "Failed to fetch label", details: error.message });
    }
});

//Get label
app.get("/api/label/:labelId", async (req, res) => {
    const { labelId } = req.params;

    try {
        const sql = `SELECT * FROM label WHERE label_id = ?`;
        const result = await db.query(sql, [labelId]);

        if (result.length === 0) {
            return res.status(404).send({ message: "Label not found" });
        }

        return res.status(200).send(result[0]);
    } catch (error) {
        console.error("Error fetching label:", error);
        return res.status(500).send({ message: "Database error" });
    }
});

//description for label
app.get("/api/description/:labelId", async (req, res) => {
    const { labelId } = req.params;
    const customerId = req.query.customerId;
    try {
        const owner = await moveOut.getCustomerByLabelId(labelId);
        let pinVerified = false;

        console.log("LabelId: ", labelId);
        console.log("Owner: ", owner);
        console.log("CustomerId: ", customerId);

        if (Number(owner) === Number(customerId)) {
            pinVerified = true;
        }

        const sql = `
            SELECT l.*, 
                GROUP_CONCAT(DISTINCT li.image_url) AS image_urls, 
                la.audio_url
            FROM label l
            LEFT JOIN label_images li ON l.label_id = li.label_id
            LEFT JOIN label_audio la ON l.label_id = la.label_id
            WHERE l.label_id = ?
            GROUP BY l.label_id
        `;
        const [result] = await db.query(sql, [labelId]);

        if (!result) {
            return res.status(404).send({ message: "Label not found" });
        }

        const labelData = {
            labelId: result.label_id,
            labelName: result.label_name,
            type: result.type,
            textDescription: result.textDescription,
            imageUrls: result.image_urls ? result.image_urls.split(",") : [],
            audioUrl: result.audio_url,
            pinVerified,
            pin: result.pin,
        };

        res.status(200).send(labelData);
    } catch (error) {
        console.error("Error fetching label:", error);
        return res.status(500).send({ message: "Database error" });
    }
});

//Get all of a customers' labels
app.get("/api/customers/:customerId/labels", async (req, res) => {
    const { customerId } = req.params;

    console.log("customer ID: ", customerId);
    try {
        const labels = await moveOut.getLabelsByCustomerId(customerId);
        return res.status(200).send(labels);
    } catch (error) {
        console.error("Error fetching labels:", error);
        return res.status(500).send({ message: "Database error" });
    }
});

// Update label
app.put(
    "/api/labels/:labelId",
    upload.fields([
        { name: "images", maxCount: 5 },
        { name: "audio", maxCount: 1 },
    ]),
    async (req, res) => {
        const labelId = req.params.labelId;
        const { labelName, type, textDescription, isPrivate } = req.body;

        console.log("Req body: ", req.body);
        console.log("app.put('/api/labels/:labelId...: ", labelName);

        try {
            const label = await moveOut.getLabelByLabelId(labelId);

            console.log("Server.js app.put('/api/labels/:labelId... :", label);

            if (!label) {
                return res.status(404).json({ message: "Label not found" });
            }

            console.log(label);
            label.label_name = labelName;
            label.type = type;
            label.textDescription = textDescription;
            label.isPrivate = isPrivate;

            if (req.files["images"]) {
                const uploadedImages = req.files["images"].map((file) => file.path);
                label.imageUrls = uploadedImages;
            }

            if (req.files["audio"]) {
                const audioFile = req.files["audio"][0].path;
                label.audioUrl = audioFile;
            }

            const sql = "UPDATE `label` SET label_name = ?, type = ?, textDescription = ?, isPrivate = ? WHERE label_id = ?";
            await db.query(sql, [labelName, type, textDescription, isPrivate, labelId]);

            res.json({ message: "Label updated successfully", label });
        } catch (error) {
            console.error("Error updating label:", error);
            res.status(500).json({ message: "There was an error updating the label" });
        }
    }
);

// Delete label
app.post("/api/delete/label/:labelId", async (req, res) => {
    const { labelId } = req.params;

    try {
        const [images] = await db.query("SELECT image_url FROM label_images WHERE label_id = ?", [labelId]);
        const [audio] = await db.query("SELECT audio_url FROM label_audio WHERE label_id = ?", [labelId]);

        if (images && images.length > 0) {
            for (const image of images) {
                const imageUrl = image.image_url;
                const key = imageUrl.split(`${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];

                await s3Client.send(
                    new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: key,
                    })
                );
            }
        } else {
            console.log("No images found for labelId:", labelId);
        }

        if (audio && audio.length > 0) {
            const audioUrl = audio[0].audio_url;
            const audioKey = audioUrl.split(`${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];

            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: audioKey,
                })
            );
        } else {
            console.log("No audio found for labelId:", labelId);
        }

        await db.query("UPDATE label SET status = 'deleted' WHERE label_id = ?", [labelId]);

        return res.status(200).send({ message: "Label and associated media deleted successfully!" });
    } catch (err) {
        console.error("Error deleting label and media:", err);
        return res.status(500).send({ message: "Database or S3 error occurred" });
    }
});

// Login
app.post("/api/login", async (req, res) => {
    const { mail, password } = req.body;
    console.log("mail and password: ", req.body);

    if (!mail || !password) {
        return res.status(400).send({ success: false, message: "Email and password are required." });
    }

    try {
        const user = await db.query("SELECT * FROM customer WHERE mail = ?", [mail]);

        if (user.length === 0) {
            return res.status(400).send({ success: false, message: "Invalid email or password." });
        }

        if (user[0].status !== "verified") {
            return res.status(400).send({ success: false, message: "Email not verified." });
        }

        const validPassword = await bcrypt.compare(password, user[0].password);
        if (!validPassword) {
            return res.status(400).send({ success: false, message: "Invalid email or password." });
        }

        const token = jwt.sign({ userId: user[0].customer_id }, secret, { expiresIn: "1h" });

        return res.status(200).send({
            success: true,
            message: "Logged in successfully!",
            token,
            customerId: user[0].customer_id,
            role: user[0].role,
        });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).send({ success: false, message: "Database error." });
    }
});

//Hämta kunder
app.get("/api/customers", async (req, res) => {
    console.log("Got request on /customers (GET).");
    try {
        const customers = await moveOut.getAllCustomers();
        res.status(200).json(customers);
    } catch (error) {
        console.error("Error fetching customers", error);
        res.status(500).json({ message: "Error fetching customers", error });
    }
});

//Hämta kund med id
app.get("/api/customers/:id", async (req, res) => {
    const customerId = req.params.id;
    try {
        const customer = await moveOut.getCustomerById(customerId);
        if (!customer) {
            return res.status(404).json({ message: "Customer not found" });
        }
        res.status(200).json(customer);
    } catch (error) {
        res.status(500).json({ message: "Error fetching customer", error });
    }
});

//Hämta specifik kunds etiketter
app.get("/api/customers/:id/labels", async (req, res) => {
    const customerId = req.params.id;
    try {
        const labels = await moveOut.getLabelsByCustomerId(customerId); // Implementera denna funktion
        res.status(200).json(labels);
    } catch (error) {
        res.status(500).json({ message: "Error fetching labels", error });
    }
});

/*
app.post("/api/customers", async (req, res) => {
    const { mail, status } = req.body;
    try {
        const newCustomer = await moveOut.createCustomer(mail, status);
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ message: "Error creating customer", error });
    }
});*/

//

app.post("/api/labels/:labelId/description", upload.single("file"), async (req, res) => {
    const { labelId } = req.params;
    const { description } = req.body;
    const file = req.file;

    try {
        const result = await moveOut.updateLabelDescription(labelId, description, file ? `/uploads/${file.filename}` : null);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error updating description: ", error);
        res.status(500).json({ message: "Fel vid uppdatering av beskrivning", error });
    }
});

app.get("/api/labels/:labelId", async (req, res) => {
    const { labelId } = req.params;

    try {
        const [label] = await db.query("SELECT * FROM label WHERE label_id = ?", [labelId]);

        if (label.length === 0) {
            return res.status(404).json({ error: "Label not found" });
        }

        const [imageRows] = await db.query("SELECT image_url FROM label_images WHERE label_id = ?", [labelId]);

        const [audioRows] = await db.query("SELECT audio_url FROM label_audio WHERE label_id = ?", [labelId]);

        const labelData = {
            ...label,
            imageUrls: imageRows.map((row) => row.image_url),
            audioUrl: audioRows.length > 0 ? audioRows[0].audio_url : null,
        };

        res.json(labelData);
    } catch (error) {
        console.error("Error fetching label:", error);
        res.status(500).json({ error: "Failed to fetch label" });
    }
});

app.post("/api/promote-to-admin/:customerId", async (req, res) => {
    const { customerId } = req.params;

    if (!customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
    }

    try {
        await db.query("UPDATE customer SET `role` = 'admin' WHERE `customer_id` = ?", [customerId]);

        const customer = await moveOut.getCustomerById(customerId);

        if (customer && customer.role === "admin") {
            return res.status(200).json({ message: `Customer ${customerId} successfully promoted to admin` });
        } else {
            return res.status(500).json({ error: "Failed to promote customer to admin" });
        }
    } catch (error) {
        console.error("Error promoting to admin:", error);
        res.status(500).json({ error: "An error occurred while promoting to admin" });
    }
});

app.post("/api/deactivate-customer/:customerId", async (req, res) => {
    const { customerId } = req.params;

    if (!customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
    }

    try {
        await db.query("UPDATE customer SET `status` = 'deactivated' WHERE `customer_id` = ?", [customerId]);

        const customer = await moveOut.getCustomerById(customerId);

        if (customer && customer.status === "deactivated") {
            return res.status(200).json({ message: `Customer ${customerId} successfully deactivated` });
        } else {
            return res.status(500).json({ error: "Failed to deactivate customer" });
        }
    } catch (error) {
        console.error("Error deactivating customer:", error);
        res.status(500).json({ error: "An error occurred while deactivating the customer" });
    }
});

app.get("/api/public/labels", async (req, res) => {
    try {
        const labels = await moveOut.getAllPublicLabels();
        res.status(200).json(labels);
    } catch (error) {
        console.error("Error fetching public labels:", error);
        res.status(500).json({ message: "Failed to fetch public labels" });
    }
});

export default app;
