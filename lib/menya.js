const { createClient } = require("@libsql/client");
const jwt = require("jsonwebtoken");

let database;

function getDatabase() {
    if (!process.env.TURSO_DATABASE_URL) {
        throw new Error("TURSO_DATABASE_URL is missing.");
    }

    if (!process.env.TURSO_AUTH_TOKEN) {
        throw new Error("TURSO_AUTH_TOKEN is missing.");
    }

    if (!database) {
        database = createClient({
            url: process.env.TURSO_DATABASE_URL,
            authToken: process.env.TURSO_AUTH_TOKEN
        });
    }

    return database;
}

async function initializeDatabase() {
    const db = getDatabase();

    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            category TEXT NOT NULL,
            profile_image TEXT,
            role TEXT NOT NULL DEFAULT 'student',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_users_created
        ON users(created_at)
    `);

    // Table y'amasomo n'amashusho (youtube_url)
    await db.execute(`
        CREATE TABLE IF NOT EXISTS courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            youtube_url TEXT,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    return db; // Iyi ni yo yari ibuze kugira ngo db yoherezwe muri API neza!
}

function createSession(user) {
    if (!process.env.SESSION_SECRET) {
        throw new Error("SESSION_SECRET is missing.");
    }

    return jwt.sign(
        {
            id: String(user.id),
            username: user.username,
            email: user.email,
            role: user.role
        },
        process.env.SESSION_SECRET,
        {
            expiresIn: "7d",
            issuer: "menyarwanda"
        }
    );
}

function setSessionCookie(res, token) {
    res.setHeader(
        "Set-Cookie",
        `menyarwanda_session=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
    );
}

function getSession(req) {
    const cookieHeader = req.headers.cookie || "";

    const cookies = Object.fromEntries(
        cookieHeader.split(";").map(part => {
            const index = part.indexOf("=");

            if (index === -1) return ["", ""];

            return [
                part.slice(0, index).trim(),
                part.slice(index + 1).trim()
            ];
        }).filter(([key]) => key)
    );

    const token = cookies.menyarwanda_session;

    if (!token || !process.env.SESSION_SECRET) {
        return null;
    }

    try {
        return jwt.verify(
            token,
            process.env.SESSION_SECRET,
            { issuer: "menyarwanda" }
        );
    } catch {
        return null;
    }
}

module.exports = {
    getDatabase,
    initializeDatabase,
    createSession,
    setSessionCookie,
    getSession
};
