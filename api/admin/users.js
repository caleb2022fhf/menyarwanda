
const {
    initializeDatabase,
    getSession
} = require("../../lib/menya");

module.exports = async function handler(req, res) {
    if (req.method !== "GET") {
        return res.status(405).json({
            success: false,
            message: "Method not allowed."
        });
    }

    try {
        // VERIFY ADMIN SESSION

        const session = getSession(req);

        if (!session || session.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Administrator access required."
            });
        }

        const db = await initializeDatabase();

        // GET ALL REGISTERED STUDENTS

        const result = await db.execute(`
            SELECT
                id,
                username,
                email,
                category,
                profile_image,
                role,
                created_at
            FROM users
            ORDER BY id DESC
        `);

        const students = result.rows.map(user => ({
            id: Number(user.id),
            username: user.username,
            email: user.email,
            category: user.category,
            profileImage: user.profile_image,
            role: user.role,
            createdAt: user.created_at
        }));

        return res.status(200).json({
            success: true,
            total: students.length,
            students
        });

    } catch (error) {
        console.error("MENYARWANDA ADMIN USERS ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve students.",
            error: error.message
        });
    }
};
