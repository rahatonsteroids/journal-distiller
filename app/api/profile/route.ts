import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const sql = getDb();

    // Get user
    const users = await sql`
      SELECT id, email FROM users WHERE id = ${parseInt(userId)}
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get saved articles
    const savedArticles = await sql`
      SELECT sa.id, sa.user_id, sa.article_id, a.title, a."journalName", sa.created_at as "savedAt"
      FROM saved_articles sa
      JOIN "Article" a ON sa.article_id = a.id
      WHERE sa.user_id = ${parseInt(userId)}
      ORDER BY sa.created_at DESC
    `;

    return NextResponse.json({
      email: users[0].email,
      savedArticles: savedArticles,
    });
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}