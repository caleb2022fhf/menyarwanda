
const bcrypt = require("bcryptjs");
const { initializeDatabase } = require("../lib/menya");

module.exports = async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });
    }

    try {
        const db = await initializeDatabase();

        const {
            username,
            email,
            password,
            category,
            profileImage
        } = req.body || {};

        const cleanUsername = String(username || "").trim();
        const cleanEmail = String(email || "").trim().toLowerCase();

        if (
            cleanUsername.length < 3 ||
            cleanUsername.length > 40
        ) {
            return res.status(400).json({
                success: false,
                message: "Username must contain 3 to 40 characters."
            });
        }

        if (!/^[a-zA-Z0-9_.-]+$/.test(cleanUsername)) {
            return res.status(400).json({
                success: false,
                message: "Username contains invalid characters."
            });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
            return res.status(400).json({
                success: false,
                message: "Enter a valid email address."
            });
        }

        if (typeof password !== "string" || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        if (password.length > 72) {
            return res.status(400).json({
                success: false,
                message: "Password is too long."
            });
        }

        const allowedCategories = [
            "Agriculture",
            "Driving Laws"
        ];

        if (!allowedCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: "Select a valid learning category."
            });
        }

        let image = null;

        if (profileImage) {
            if (typeof profileImage !== "string") {
                return res.status(400).json({
                    success: false,
                    message: "Invalid profile picture."
                });
            }

            const validImage =
                /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

            const match = profileImage.match(validImage);

            if (!match) {
                return res.status(400).json({
                    success: false,
                    message: "Use a valid JPG, PNG or WEBP image."
                });
            }

            const imageBytes = Buffer.from(match[2], "base64");

            if (
                imageBytes.length > 250 * 1024 ||
                imageBytes.toString("base64") !== match[2]
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Profile picture must be under 250 KB."
                });
            }

            image = profileImage;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await db.execute({
            sql: `
                INSERT INTO users
                (username, email, password_hash, category, profile_image, role)
                VALUES (?, ?, ?, ?, ?, 'student')
            `,
            args: [
                cleanUsername,
                cleanEmail,
                passwordHash,
                category,
                image
            ]
        });

        return res.status(201).json({
            success: true,
            message: "Student registered successfully.",
            user: {
                id: Number(result.lastInsertRowid),
                username: cleanUsername,
                email: cleanEmail,
                category
            }
        });

    } catch (error) {
        console.error("MENYARWANDA REGISTRATION ERROR:", error);

        if (
            error.message &&
            error.message.includes("UNIQUE constraint failed")
        ) {
            return res.status(409).json({
                success: false,
                message: "Username or email is already registered."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Registration failed.",
            error: error.message
        });
    }
};
