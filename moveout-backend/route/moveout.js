//isar 23
//routes

"use strict";

const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const moveOut = require("../src/moveout.js");
const multer = require('multer');
const path = require('path');

// Route: Hämta alla kunder
router.get("/customers", async (req, res) => {
    console.log("Got request on /customers (GET).");
    try {
        const customers = await moveOut.getAllCustomers();
        res.status(200).json(customers);
    } catch (error) {
        console.error("Error fetching customers", error);
        res.status(500).json({ message: "Error fetching customers", error });
    }
});


// Route: Hämta specifik kund baserat på ID
router.get("/customers/:id", async (req, res) => {
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

// Route: Hämta etiketter för en specifik kund
router.get("/customers/:id/labels", async (req, res) => {
    const customerId = req.params.id;
    try {
        const labels = await moveOut.getLabelsByCustomerId(customerId); // Implementera denna funktion
        res.status(200).json(labels);
    } catch (error) {
        res.status(500).json({ message: "Error fetching labels", error });
    }
});

// Route: Skapa ny kund
router.post("/customers", urlencodedParser, async (req, res) => {
    const { mail, status } = req.body;
    try {
        const newCustomer = await moveOut.createCustomer(mail, status);
        res.status(201).json(newCustomer);
    } catch (error) {
        res.status(500).json({ message: "Error creating customer", error });
    }
});

// Route: Skapa ny etikett för kund
router.post("/labels", urlencodedParser, async (req, res) => {
    const { customerId, type } = req.body;
    try {
        const newLabel = await moveOut.createLabel(customerId, type);
        res.status(201).json(newLabel);
    } catch (error) {
        res.status(500).json({ message: "Error creating label", error });
    }
});

// Konfigurera filuppladdning
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');  // Spara filer i 'uploads' mappen
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        const filename = Date.now() + ext;  // Namnge filen med tidsstämpel
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'audio/mpeg', 'audio/wav'];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Ogiltig filtyp'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// POST-rutt för att uppdatera beskrivning och/eller ladda upp fil
router.post("/labels/:labelId/description", upload.single('file'), async (req, res) => {
    const { labelId } = req.params;
    const { description } = req.body;
    const file = req.file;

    try {
        // Skicka vidare beskrivning och filväg till affärslogiken (moveOut.js)
        const result = await moveOut.updateLabelDescription(labelId, description, file ? `/uploads/${file.filename}` : null);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error updating description: ", error);
        res.status(500).json({ message: 'Fel vid uppdatering av beskrivning', error });
    }
});


module.exports = router;
