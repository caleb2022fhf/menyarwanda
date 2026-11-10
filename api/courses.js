import { initializeDatabase } from "../../lib/menya.js";

function response(res, status, data) {
  return res.status(status).json(data);
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");

  try {
    // Guhamagara initializeDatabase no kuyifata nka db connection nyayo
    const db = await initializeDatabase();

    // 1. GET: Gusoma amasomo yose
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

    // 2. POST: Gushyiraho isomo rishya n'amashusho yaryo
    if (req.method === "POST") {
      const { title, category, description, youtube_url } = req.body || {};

      if (!title || !category || !youtube_url) {
        return response(res, 400, {
          success: false,
          error: "Title, category and YouTube URL are required."
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
          youtube_url.trim()
        ]
      });

      return response(res, 201, {
        success: true,
        message: "Course added successfully.",
        id: Number(result.lastInsertRowid)
      });
    }

    // 3. PUT: Kuvugurura isomo risanzweho
    if (req.method === "PUT") {
      const { id, title, category, description, youtube_url } = req.body || {};

      if (!id || !title || !category || !youtube_url) {
        return response(res, 400, {
          success: false,
          error: "Course ID, title, category and YouTube URL are required."
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
          youtube_url.trim(),
          id
        ]
      });

      return response(res, 200, {
        success: true,
        message: "Course updated successfully.",
        rowsAffected: result.rowsAffected
      });
    }

    // 4. DELETE: Gusiba isomo
    if (req.method === "DELETE") {
      let id = req.query?.id || req.body?.id;

      if (!id && req.body) {
        try {
          const bodyData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          id = bodyData.id;
        } catch (e) {}
      }

      if (!id) {
        return response(res, 400, {
          success: false,
          error: "Course ID is required."
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
      error: "Method not allowed."
    });

  } catch (error) {
    console.error("ADMIN COURSES ERROR:", error);
    return response(res, 500, {
      success: false,
      error: error.message || "Server error while managing courses."
    });
  }
}
