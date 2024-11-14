import dotenv from "dotenv";
import express from "express";
import axios from "axios";
import db from "./db.js";
import jwt from "jsonwebtoken";

dotenv.config();
const router = express.Router();

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL;
const REDIRECT_URI = "http://localhost:3000/api/auth/google/callback";

// Initiates the Google Login flow
router.get("/auth/google", (req, res) => {
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=code&scope=profile email`;
    console.log("/auth/google");
    res.redirect(url);
});

// Callback URL for handling the Google Login response
router.get("/auth/google/callback", async (req, res) => {
    const { code } = req.query;

    console.log("Callback hit");

    try {
        // Exchange authorization code for access token
        const { data } = await axios.post("https://oauth2.googleapis.com/token", {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code,
            redirect_uri: REDIRECT_URI,
            grant_type: "authorization_code",
        });

        const { access_token } = data;

        // Use access_token to fetch user profile
        const { data: profile } = await axios.get("https://www.googleapis.com/oauth2/v1/userinfo", {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        const existingUser = await db.query("SELECT * FROM customer WHERE mail = ?", [profile.email]);

        let userId;
        let userRole;
        if (existingUser.length > 0) {
            userId = existingUser[0].customer_id;
            userRole = existingUser[0].role || "user";
        } else {
            const result = await db.query("INSERT INTO customer (mail, status) VALUES (?, 'verified')", [profile.email]);
            userId = result.insertId;
        }

        const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });

        console.log("existinguser: ", existingUser);
        console.log("token: ", token);
        console.log("userId: ", userId);
        console.log("role: ", userRole);

        res.redirect(`${FRONTEND_URL}/google-login-callback?token=${token}&userId=${userId}&role=${userRole}`);
    } catch (error) {
        console.error("Error:", error.response?.data?.error || error.message);
        res.redirect("/login");
    }
});

export default router;
