
import { db, initializeDatabase } from "../../lib/menya.js";

function response(res, status, data) {
  return res.status(status).json(data);
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    await initializeDatabase();

    if (req.method === "GET") {
      const result = await db.execute({
        sql: "SELECT * FROM courses ORDER BY created_at DESC",
        args: []
      });

      return response(res, 200, {
        success: true,
        courses: result.rows
      });
    }

    if (req.method === "POST") {
      const { title, category, description, youtube_url } = req.body || {};

      if (!title || !category) {
        return response(res, 400, {
          success: false,
          message: "Title and category are required."
        });
      }

      const result = await db.execute({
        sql: `
          INSERT INTO courses
          (title, category, description, youtube_url, created_at)
          VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        `,
        args: [
          title.trim(),
          category.trim(),
          description || "",
          youtube_url || ""
        ]
      });

      return response(res, 201, {
        success: true,
        message: "Course added successfully.",
        id: Number(result.lastInsertRowid)
      });
    }

    if (req.method === "PUT") {
      const { id, title, category, description, youtube_url } = req.body || {};

      if (!id || !title || !category) {
        return response(res, 400, {
          success: false,
          message: "Course ID, title and category are required."
        });
      }

      const result = await db.execute({
        sql: `
          UPDATE courses
          SET title = ?, category = ?, description = ?, youtube_url = ?
          WHERE id = ?
        `,
        args: [
          title.trim(),
          category.trim(),
          description || "",
          youtube_url || "",
          id
        ]
      });

      return response(res, 200, {
        success: true,
        message: "Course updated successfully.",
        rowsAffected: result.rowsAffected
      });
    }

    if (req.method === "DELETE") {
      const id = req.query.id || req.body?.id;

      if (!id) {
        return response(res, 400, {
          success: false,
          message: "Course ID is required."
        });
      }

      const result = await db.execute({
        sql: "DELETE FROM courses WHERE id = ?",
        args: [id]
      });

      return response(res, 200, {
        success: true,
        message: "Course deleted successfully.",
        rowsAffected: result.rowsAffected
      });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");

    return response(res, 405, {
      success: false,
      message: "Method not allowed."
    });

  } catch (error) {
    console.error("ADMIN COURSES ERROR:", error);

    return response(res, 500, {
      success: false,
      message: "Server error while managing courses."
    });
  }
}
