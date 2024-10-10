//isar 23
//routes

"use strict";

const express = require("express");
const router = express.Router();
const bodyParser = require("body-parser");
const urlencodedParser = bodyParser.urlencoded({ extended: false });
const moveOut = require("../src/moveout.js");


// Route: Hämta alla kunder



// Route: Hämta specifik kund baserat på ID


// Route: Hämta etiketter för en specifik kund


// Route: Skapa ny kund



// Konfigurera filuppladdning


// POST-rutt för att uppdatera beskrivning och/eller ladda upp fil


module.exports = router;
