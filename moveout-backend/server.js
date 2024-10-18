require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./src/db");
const config = require("./config/mo/config.json");
const { verifyToken, logIncomingToConsole } = require("./middleware");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const moveOut = require("./src/moveout");
const multer = require("multer");
const path = require("path");

const app = express();
const secret = process.env.JWT_SECRET;
const emailPassword = process.env.EMAIL_PASS;
const storage = multer.memoryStorage();


const fileFilter = (req, file, cb) => {
    if (
        file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('audio/') ||
        file.mimetype === 'application/pdf'
    ) {
        cb(null, true);
    } else {
        cb(new Error('Only image, audio, and PDF files are allowed!'), false);
    }
};



const upload = multer({ storage: storage, fileFilter: fileFilter });

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
    console.log(`Server running on the beloved port ${config.server.port}`);
});

app.get("/api/protected", verifyToken, (req, res) => {
    res.status(200).send({ message: "This is a protected route", customerId: req.customerId });
});

//Registrering
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

//verifiering
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

// Route för att skapa en ny label
app.post(
    "/api/labels",
    upload.fields([
        { name: "images", maxCount: 5 },
        { name: "audio", maxCount: 1 },
    ]),
    async (req, res) => {
        console.log("Received data:", JSON.stringify(req.body, null, 2));
        console.log("Received files:", req.files);

        const customerId = req.body.customerId;
        const labelName = req.body.labelName;
        const type = req.body.type;
        const textDescription = req.body.textDescription;
        const isPrivate = req.body.isPrivate;

        console.log("1: ", customerId);
        console.log("2:", labelName);
        console.log("3: ", type);
        console.log("4: ", textDescription);
        console.log("5: ", isPrivate);

        try {
            const response = await moveOut.createLabel(customerId, labelName, type, textDescription, isPrivate);
            res.status(201).json(response);
        } catch (error) {
            console.error("Error creating label:", error);
            res.status(500).json({ error: "Failed to create label" });
        }
    }
);

//description for label
app.get("/api/description/:labelId", async (req, res) => {
    const { labelId } = req.params;

    try {
        const sql = `SELECT * FROM label WHERE label_id = ?`;
        const result = await db.query(sql, [labelId]);

        if (result.length === 0) {
            return res.status(404).send({ message: "Label not found" });
        }

        res.status(200).send({
            message: `Description for label ${labelId}`,
            labelId: result[0].label_id,
            descriptionPath: result[0].qr_path,
        });
    } catch (error) {
        console.error("Error fetching label:", error);
        return res.status(500).send({ message: "Database error" });
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

//Get all of a customers' labels
app.get("/api/customers/:customerId/labels", async (req, res) => {
    const { customerId } = req.params;

    try {
        const labels = await moveOut.getLabelsByCustomerId(customerId);
        return res.status(200).send(labels);
    } catch (error) {
        console.error("Error fetching labels:", error);
        return res.status(500).send({ message: "Database error" });
    }
});

// Update label
app.put("/api/labels/:labelId", async (req, res) => {
    const { labelId } = req.params;
    const { description, type } = req.body;

    try {
        const sql = "UPDATE label SET description = ?, type = ? WHERE label_id = ?";
        await db.query(sql, [description, type, labelId]);
        return res.status(200).send({ message: "Label updated successfully!" });
    } catch (err) {
        console.error("Error updating label:", err);
        return res.status(500).send({ message: "Database error" });
    }
});

// Delete label
app.delete("/api/labels/:labelId", async (req, res) => {
    const { labelId } = req.params;

    try {
        const sql = "UPDATE label SET status = 'deleted' WHERE label_id = ?";
        await db.query(sql, [labelId]);
        return res.status(200).send({ message: "Label deleted successfully!" });
    } catch (err) {
        console.error("Error deleting label:", err);
        return res.status(500).send({ message: "Database error" });
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
