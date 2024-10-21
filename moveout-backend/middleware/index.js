/**
 * General middleware.
 */

import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, "..", "config", "mo", "config.json");
const configFile = await fs.readFile(configPath, "utf-8");
const config = JSON.parse(configFile);

/**
 * Verify the JWT token in the request header.
 *
 * @param {Request}  req  The incoming request.
 * @param {Response} res  The outgoing response.
 * @param {Function} next Next to call in chain of middleware.
 *
 * @returns {void}
 */
export function verifyToken(req, res, next) {
    const token = req.headers["authorization"]?.split(" ")[1];

    if (!token) {
        return res.status(403).send({ message: "No token provided." });
    }

    jwt.verify(token, config.jwtSecret, (err, decoded) => {
        if (err) {
            return res.status(500).send({ message: "Failed to authenticate token." });
        }

        req.customerId = decoded.customerId;
        next();
    });
}

/**
 * Log incoming requests to console to see who accesses the server
 * on what route.
 *
 * @param {Request}  req  The incoming request.
 * @param {Response} res  The outgoing response.
 * @param {Function} next Next to call in chain of middleware.
 *
 * @returns {void}
 */
export function logIncomingToConsole(req, res, next) {
    console.info(`Got request on ${req.path} (${req.method}).`);
    next();
}
