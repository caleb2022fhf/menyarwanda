
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const {
    initializeDatabase,
    createSession,
    setSessionCookie
} = require("../lib/menya");

function safeCompare(a, b) {
    const first = Buffer.from(String(a));
    const second = Buffer.from(String(b));

    return first.length === second.length &&
        crypto.timingSafeEqual(first, second);
}

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });
    }

    try {
        const required = [
            "ADMIN_EMAIL",
            "ADMIN_PASSWORD",
            "SESSION_SECRET"
        ];

        const missing = required.filter(name => !process.env[name]);

        if (missing.length) {
            throw new Error(
                "Missing environment variables: " + missing.join(", ")
            );
        }

        const db = await initializeDatabase();

        const { identity, password } = req.body || {};

        if (
            typeof identity !== "string" ||
            typeof password !== "string" ||
            !identity.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Enter your username/email and password."
            });
        }

        const cleanIdentity = identity.trim();
        const adminEmail = process.env.ADMIN_EMAIL.trim().toLowerCase();

        // ADMIN AUTHENTICATION

        if (
            cleanIdentity.toLowerCase() === adminEmail &&
            safeCompare(password, process.env.ADMIN_PASSWORD)
        ) {
            const admin = {
                id: "admin",
                username: "MENYARWANDA Administrator",
                email: adminEmail,
                role: "admin"
            };

            const token = createSession(admin);
            setSessionCookie(res, token);

            return res.status(200).json({
                success: true,
                role: "admin",
                redirect: "/control-room.html"
            });
        }

        // STUDENT AUTHENTICATION

        const result = await db.execute({
            sql: `
                SELECT id, username, email, password_hash, category, role
                FROM users
                WHERE LOWER(username) = LOWER(?)
                   OR LOWER(email) = LOWER(?)
                LIMIT 1
            `,
            args: [cleanIdentity, cleanIdentity]
        });

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Account not found."
            });
        }

        const student = result.rows[0];

        if (student.role !== "student") {
            return res.status(403).json({
                success: false,
                message: "This account cannot access student login."
            });
        }

        const valid = await bcrypt.compare(
            password,
            student.password_hash
        );

        if (!valid) {
            return res.status(401).json({
                success: false,
                message: "Incorrect password."
            });
        }

        const token = createSession(student);
        setSessionCookie(res, token);

        return res.status(200).json({
            success: true,
            role: "student",
            redirect: "/home.html"
        });

    } catch (error) {
        console.error("MENYARWANDA LOGIN ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Login service failed.",
            error: error.message
        });
    }
};
