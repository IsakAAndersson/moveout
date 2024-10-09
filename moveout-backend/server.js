const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("./src/db");
const config = require("./config/mo/config.json");
const moveOutRoutes = require("./route/moveout");
const { verifyToken, logIncomingToConsole } = require("./middleware");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const moveOut = require("./src/moveout");

const app = express();
const secret = "min_jwt";

app.use(cors());
app.use(logIncomingToConsole);
app.use(express.json());
app.use("/", moveOutRoutes);

app.get("/protected", verifyToken, (req, res) => {
    res.status(200).send({ message: "This is a protected route", customerId: req.customerId });
});

//Registrering
app.post("/register", async (req, res) => {
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

        if (password.length < 8) {
            return res.status(400).send({ message: "Password too short. Must be at least 8 characters." });
        }

        if (!passwordRegex.test(password)) {
            return res.status(400).send({
                message: "Password must contain at least one lowercase letter, one uppercase letter, and one number.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = 'INSERT INTO customer (mail, password, status) VALUES (?, ?, "unverified")';
        await db.query(sql, [mail, hashedPassword]);

        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationLink = `http://localhost:3000/verify?token=${verificationToken}&email=${encodeURIComponent(mail)}`;

        await db.query("INSERT INTO verification_tokens (token, email) VALUES (?, ?)", [verificationToken, mail]);

        const transporter = nodemailer.createTransport({
            service: "gmail", // Du kan välja den e-posttjänst du vill
            auth: {
                user: "your-email@gmail.com",
                pass: "your-email-password",
            },
        });

        const mailOptions = {
            from: "your-email@gmail.com",
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

        return res.status(201).send({ message: "User registered successfully! A verification link has been sent to your submitted e-mail address" });
    } catch (error) {
        console.error("Error during registration:", error);
        return res.status(500).send({ message: "Database error." });
    }
});

//verifiering
app.get("/verify", async (req, res) => {
    const { token, email } = req.query;

    try {
        const result = await db.query("SELECT * FROM verification_tokens WHERE token = ? AND email = ?", [token, email]);

        if (result.length === 0) {
            return res.status(400).send({ message: "Invalid or expired token." });
        }

        // Uppdatera användarens status till 'verified'
        await db.query('UPDATE customer SET status = "verified" WHERE mail = ?', [email]);

        // Ta bort token efter verifiering
        await db.query("DELETE FROM verification_tokens WHERE email = ?", [email]);

        return res.status(200).send({ message: "Email verified successfully!" });
    } catch (error) {
        console.error("Verification error:", error);
        return res.status(500).send({ message: "Database error." });
    }
});

// Route för att skapa en ny label
app.post("/labels", async (req, res) => {
    console.log("Received request body: ", req.body);
    const { customerId, type, isPrivate, textDescription } = req.body;

    if (!customerId || !type || typeof isPrivate === "undefined" || !textDescription) {
        return res.status(400).send({ message: "Missing required fields" });
    }

    try {
        const sql = `INSERT INTO label (type, customer_id, private, description, qr_path) VALUES (?, ?, ?, ?, 'active')`;
        const result = await db.query(sql, [customerId, type, isPrivate, textDescription, ""]);

        const labelId = Number(result.insertId);
        const qrPath = `/description/${labelId}`;

        const updatedSql = `UPDATE label SET qr_path = ? WHERE label_id = ?`;
        await db.query(updatedSql, [qrPath, labelId]);

        return res.status(201).send({ message: "Label created successfully!", labelId });
    } catch (error) {
        console.error("Error creating label:", error);
        return res.status(500).send({ message: "Database error" });
    }
});

//description for label
app.get("/description/:labelId", async (req, res) => {
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
app.get("/labels/:labelId", async (req, res) => {
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

app.listen(config.server.port, () => {
    console.log(`Server running on port ${config.server.port}`);
});

//Get all of a customers' labels
app.get("/customers/:customerId/labels", async (req, res) => {
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
app.put("/labels/:labelId", async (req, res) => {
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
app.delete("/labels/:labelId", async (req, res) => {
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
app.post("/login", async (req, res) => {
    const { mail, password } = req.body;
    console.log("mail and password: ", req.body);

    if (!mail || !password) {
        return res.status(400).send({ message: "Email and password are required." });
    }

    try {
        const user = await db.query("SELECT * FROM customer WHERE mail = ?", [mail]);

        if (user.length === 0) {
            return res.status(400).send({ message: "Invalid email or password." });
        }

        if (user[0].status !== "verified") {
            return res.status(400).send({ message: "Email not verified." });
        }

        const validPassword = await bcrypt.compare(password, user[0].password);
        if (!validPassword) {
            return res.status(400).send({ message: "Invalid email or password." });
        }

        const token = jwt.sign({ userId: user[0].customer_id }, secret, { expiresIn: "1h" });

        return res.status(200).send({ message: "Logged in successfully!", token });
    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).send({ message: "Database error." });
    }
});
