const express = require("express");
const cors = require("cors");
const db = require("./src/db");
const app = express();
const config = require("./config/mo/config.json");
const moveOutRoutes = require("./route/moveout");
const { verifyToken, logIncomingToConsole } = require("./middleware");

app.use(cors());
app.use(logIncomingToConsole);
app.use(express.json());
app.use("/", moveOutRoutes);

app.get("/protected", verifyToken, (req, res) => {
    res.status(200).send({ message: "This is a protected route", customerId: req.customerId });
});

// Route för att skapa en ny label
app.post("/labels", async (req, res) => {
    console.log("Received request body: ", req.body);
    const { customerId, type, isPrivate, textDescription } = req.body;

    if (!customerId || !type || isPrivate || textDescription) {
        return res.status(400).send({ message: "Missing required fields" });
    }

    try {
        const sql = `INSERT INTO label (type, customer_id, private, description, qr_path) VALUES (?, ?, ?, ?, ?, 'active')`;
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
