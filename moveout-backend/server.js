import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import multer from "multer";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { verifyToken, logIncomingToConsole } from "./middleware/index.js";
import moveOut from "./src/moveout.js";
import db from "./src/db.js";
import config from "./config/mo/config.json" assert { type: "json" };
import authRoutes from "./src/authRoutes.js";

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
app.use("/api", authRoutes);

app.listen(config.server.port, () => {
    console.log(`Server running on port ${config.server.port}`);
});

app.get("/api/protected", verifyToken, (req, res) => {
    res.status(200).send({ message: "This is a protected route", customerId: req.customerId });
});

app.post("/api/update-password", async (req, res) => {
    const { customerId, newPassword } = req.body;

    console.log("CustomerId, newPassword: ", customerId, ", ", newPassword);

    if (!customerId || !newPassword) {
        return res.status(400).send({ message: "Customer ID and new password are required." });
    }

    try {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).send({
                message: "Password must contain at least one lowercase letter, one uppercase letter, one number, one special character, and be at least 8 characters long.",
            });
        }

        const checkUserSql = "SELECT mail FROM customer WHERE customer_id = ?";
        const [user] = await db.query(checkUserSql, [customerId]);

        console.log("User: ", user);

        if (user.length === 0) {
            return res.status(404).send({ message: "No user found with the provided Customer ID." });
        }

        const mail = user.mail;

        console.log("Mail: ", mail);

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updatePasswordSql = "UPDATE customer SET password = ? WHERE customer_id = ?";
        await db.query(updatePasswordSql, [hashedPassword, customerId]);

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
            subject: "Password Change Notification",
            text: "Your password has been successfully updated. If you did not initiate this change, please contact our support team immediately.",
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending email:", error);
            } else {
                console.log("Email sent:", info.response);
            }
        });

        return res.status(200).send({
            success: true,
            message: "Password changed successfully! A notification email has been sent to your registered address.",
        });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
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
                console.log("Mail sent to: ", mail);
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
        const { customerId, labelName, type, textDescription, isPrivate } = req.body;

        try {
            const label = await moveOut.getLabelByLabelId(labelId);

            if (!label) {
                return res.status(404).json({ message: "Label not found" });
            }

            label.customer_id = customerId;
            label.label_name = labelName;
            label.type = type;
            label.textDescription = textDescription;
            label.isPrivate = isPrivate;

            if (req.files && req.files["images"]) {
                let uploadedImages = req.files["images"];

                if (!Array.isArray(uploadedImages)) {
                    uploadedImages = [uploadedImages];
                }

                const uploadedImageUrls = [];
                for (let i = 0; i < uploadedImages.length; i++) {
                    const file = uploadedImages[i];
                    const key = `labels/${label.customer_id}/${Date.now()}_${i}.${file.originalname.split(".").pop()}`;

                    await s3Client.send(
                        new PutObjectCommand({
                            Bucket: process.env.S3_BUCKET_NAME,
                            Key: key,
                            Body: file.buffer,
                            ContentType: file.mimetype,
                        })
                    );

                    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
                    uploadedImageUrls.push(imageUrl);

                    // Insert new image URL into the database
                    await db.query("INSERT INTO label_images (label_id, image_url) VALUES (?, ?)", [labelId, imageUrl]);
                }

                label.imageUrls = uploadedImageUrls;
                console.log("Images uploaded:", uploadedImageUrls);
            }

            if (req.files && req.files["audio"]) {
                const audioFile = req.files["audio"][0];
                const audioKey = `labels/${label.customer_id}/${Date.now()}_audio.${audioFile.originalname.split(".").pop()}`;

                await s3Client.send(
                    new PutObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: audioKey,
                        Body: audioFile.buffer,
                        ContentType: audioFile.mimetype,
                    })
                );

                const audioUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${audioKey}`;

                await db.query("DELETE FROM label_audio WHERE label_id = ?", [labelId]);
                await db.query("INSERT INTO label_audio (label_id, audio_url) VALUES (?, ?)", [labelId, audioUrl]);
            }

            const sql = "UPDATE `label` SET label_name = ?, type = ?, textDescription = ?, isPrivate = ? WHERE label_id = ?";
            await db.query(sql, [labelName, type, textDescription, isPrivate, labelId]);

            if (isPrivate === "private" && label.pin === null) {
                pin = Math.floor(100000 + Math.random() * 900000).toString();

                const sqlPrivate = "UPDATE `label` SET pin = ? WHERE label_id = ?";
                await db.query(sqlPrivate, [pin, labelId]);
            }

            res.json({ message: "Label updated successfully", label });
        } catch (error) {
            console.error("Error updating label:", error);
            res.status(500).json({ message: "There was an error updating the label" });
        }
    }
);

// Delete label
app.post("/api/label/:labelId/action", async (req, res) => {
    const { labelId } = req.params;
    const { action } = req.body;

    try {
        if (action === "softDelete") {
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
        } else if (action === "restore") {
            await db.query("UPDATE label SET status = 'active' WHERE label_id = ?", [labelId]);

            return res.status(200).send({ message: "Label restored successfully" });
        }

        return res.status(400).send({ message: "Invalid action" });
    } catch (err) {
        console.error("Error deleting/restoring label:", err);
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

//description label
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

//Label get
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

//Promote admin
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

//Deactivate customer
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

//activate customer
app.post("/api/activate-customer/:customerId", async (req, res) => {
    const { customerId } = req.params;

    if (!customerId) {
        return res.status(400).json({ error: "Customer ID is required" });
    }

    try {
        await db.query("UPDATE customer SET `status` = 'verified' WHERE `customer_id` = ?", [customerId]);

        const customer = await moveOut.getCustomerById(customerId);

        if (customer && customer.status === "verified") {
            return res.status(200).json({ message: `Customer ${customerId} successfully activated` });
        } else {
            return res.status(500).json({ error: "Failed to activate customer" });
        }
    } catch (error) {
        console.error("Error activating customer:", error);
        res.status(500).json({ error: "An error occurred while activating the customer" });
    }
});

//Public labels get
app.get("/api/public/labels/:customerId", async (req, res) => {
    try {
        const customerId = req.params.customerId;
        const labels = await moveOut.getAllPublicLabels(customerId);
        res.status(200).json(labels);
    } catch (error) {
        console.error("Error fetching public labels:", error);
        res.status(500).json({ message: "Failed to fetch public labels" });
    }
});

//delete images
app.post("/api/delete-images/:labelId", async (req, res) => {
    const labelId = req.params.labelId;
    console.log("delete-images - Label ID: ", labelId);

    const sql = "DELETE FROM `label_images` WHERE label_id = ?";
    try {
        await db.query(sql, [labelId]);
        res.status(200).json({ message: "Images deleted successfully." });
    } catch (error) {
        console.error("Error deleting images: ", error);
        res.status(500).json({ message: "Failed to delete images" });
    }
});

//Marketing mail
app.post("/api/marketing-mail", async (req, res) => {
    const { subject, content } = req.body;

    const users = await db.query("SELECT mail FROM customer WHERE status = 'verified' AND role = 'user'");

    if (users.length > 0) {
        try {
            console.log("users: ", users);

            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: "isar23moveout@gmail.com",
                    pass: emailPassword,
                },
            });

            for (const user of users) {
                const mailOptions = {
                    from: "isar23moveout@gmail.com",
                    to: user.mail,
                    subject,
                    text: content,
                };

                await transporter.sendMail(mailOptions);
            }

            return res.status(201).send({
                success: true,
                message: "Marketing mail sent successfully!",
            });
        } catch (error) {
            console.error("Error sending marketing emails:", error);
            res.status(500).json({ error: "Failed to send marketing emails" });
        }
    } else {
        return res.status(204).send();
    }
});

//share label
app.post("/api/share-label", async (req, res) => {
    const { mail, labelId } = req.body;

    if (!mail || !labelId) {
        return res.status(400).send({ message: "Mail address and label ID are required." });
    }

    try {
        const [label] = await db.query("SELECT * FROM label WHERE label_id = ?", [labelId]);

        const [user] = await db.query("SELECT mail FROM customer WHERE customer_id = ?", [label.customer_id]);

        if (!label) {
            return res.status(404).send({ message: "Label not found." });
        }

        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        console.log("Share label user: ", user);
        const labelLink = `${process.env.FRONTEND_URL}/label/${label.customer_id}/${label.label_id}`;
        let emailContent = `Hello,\n\nHere is the link to the shared label made by ${user.mail}:\n ${labelLink}\n`;

        if (label.isPrivate === "private" && label.pin) {
            emailContent += `PIN Code: ${label.pin}\n`;
        }

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
            subject: "Shared Label Information",
            text: emailContent,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending label email:", error);
                return res.status(500).send({ message: "Failed to send email." });
            } else {
                console.log("Label email sent:", info.response);
                return res.status(200).send({ message: "Label shared successfully." });
            }
        });
    } catch (error) {
        console.error("Error during label sharing:", error);
        return res.status(500).send({ message: "Server error." });
    }
});

//Delete account
/*
app.post("/api/delete-account", async (req, res) => {
    const { token, email } = req.body;

    try {
        const [verification] = await db.query("SELECT * FROM verification_tokens WHERE token = ? AND mail = ? AND expiration_date > NOW()", [token, email]);

        if (!verification) {
            return res.status(400).send({ message: "Invalid or expired token." });
        }

        const [user] = await db.query("SELECT customer_id FROM customer WHERE mail = ?", [email]);

        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        const labels = await db.query("SELECT label_id FROM label WHERE customer_id = ?", [user.customer_id]);

        for (const { label_id } of labels) {
            const images = await db.query("SELECT image_url FROM label_images WHERE label_id = ?", [label_id]);
            const audios = await db.query("SELECT audio_url FROM label_audio WHERE label_id = ?", [label_id]);

            for (const { image_url } of images) {
                const fileKey = image_url.split("/").pop();
                await deleteS3File(process.env.S3_BUCKET_NAME, fileKey);
            }

            for (const { audio_url } of audios) {
                const fileKey = audio_url.split("/").pop();
                await deleteS3File(process.env.S3_BUCKET_NAME, fileKey);
            }
        }

        await db.query("DELETE FROM label WHERE customer_id = ?", [user.customer_id]);
        await db.query("DELETE FROM customer WHERE mail = ?", [email]);
        await db.query("DELETE FROM verification_tokens WHERE mail = ?", [email]);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "isar23moveout@gmail.com",
                pass: emailPassword,
            },
        });

        const mailOptions = {
            from: "isar23moveout@gmail.com",
            to: email,
            subject: "Account Deleted",
            text: "Your account and all associated data have been successfully deleted.",
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending account deleted email:", error);
            } else {
                console.log("Account deleted email sent:", info.response);
            }
        });

        res.status(200).send({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Error during account deletion:", error);
        res.status(500).send({ message: "Server error." });
    }
});
*/

app.post("/api/delete-account", async (req, res) => {
    const { token, email } = req.body;

    try {
        const [verification] = await db.query("SELECT * FROM verification_tokens WHERE token = ? AND mail = ? AND expiration_date > NOW()", [token, email]);
        if (!verification) {
            return res.status(400).send({ message: "Invalid or expired token." });
        }

        const [user] = await db.query("SELECT customer_id FROM customer WHERE mail = ?", [email]);
        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        const customerId = user.customer_id;

        const bucketName = process.env.S3_BUCKET_NAME;
        const folderPrefix = `${customerId}`;

        await moveOut.deleteS3Folder(bucketName, folderPrefix);

        await db.query("DELETE FROM label WHERE customer_id = ?", [customerId]);
        await db.query("DELETE FROM customer WHERE mail = ?", [email]);
        await db.query("DELETE FROM verification_tokens WHERE mail = ?", [email]);

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "isar23moveout@gmail.com",
                pass: process.env.EMAIL_PASS,
            },
        });

        const mailOptions = {
            from: "isar23moveout@gmail.com",
            to: email,
            subject: "Account Deleted",
            text: "Your account and all associated data have been successfully deleted.",
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending account deleted email:", error);
            } else {
                console.log("Account deleted email sent:", info.response);
            }
        });

        res.status(200).send({ message: "Account deleted successfully." });
    } catch (error) {
        console.error("Error during account deletion:", error);
        res.status(500).send({ message: "Server error." });
    }
});

app.post("/api/request-delete-account", async (req, res) => {
    const { userId } = req.body;

    console.log("Req.body: ", req.body);

    try {
        const [user] = await db.query("SELECT mail FROM customer WHERE customer_id = ?", [userId]);

        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 14);

        await db.query("INSERT INTO verification_tokens (token, mail, expiration_date) VALUES (?, ?, ?)", [verificationToken, user.mail, expirationDate]);

        const deleteLink = `${process.env.FRONTEND_URL}/confirm-delete?token=${verificationToken}&email=${encodeURIComponent(user.mail)}`;

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: "isar23moveout@gmail.com",
                pass: emailPassword,
            },
        });

        const mailOptions = {
            from: "isar23moveout@gmail.com",
            to: user.mail,
            subject: "Confirm Account Deletion",
            text: `Are you sure you want to delete your account? All your labels and media will be permanently deleted. Click this link to confirm: ${deleteLink}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error("Error sending delete email:", error);
                return res.status(500).send({ message: "Failed to send email." });
            } else {
                console.log("Delete confirmation email sent:", info.response);
                return res.status(200).send({ message: "Delete confirmation email sent." });
            }
        });
    } catch (error) {
        console.error("Error during delete account request:", error);
        res.status(500).send({ message: "Server error." });
    }
});

export default app;
