
import { db, initializeDatabase } from "../lib/menya.js";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  try {
    await initializeDatabase();

    const result = await db.execute({
      sql: `
        SELECT
          id,
          title,
          category,
          description,
          youtube_url,
          created_at
        FROM courses
        ORDER BY created_at DESC
      `,
      args: []
    });

    const courses = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      description: row.description,
      youtube_url: row.youtube_url,
      created_at: row.created_at
    }));

    return res.status(200).json({
      success: true,
      courses
    });

  } catch (error) {
    console.error("COURSES API ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve courses",
      error: process.env.NODE_ENV === "development"
        ? error.message
        : undefined
    });
  }
}
