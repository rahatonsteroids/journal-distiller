import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_id")?.value;

    console.log("Save article - User ID:", userId);

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { articleId } = await req.json();
    console.log("Saving article:", articleId);

    const sql = getDb();

    // First, create the table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS saved_articles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        article_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, article_id)
      )
    `;

    // Check if already saved
    const existing = await sql`
      SELECT * FROM saved_articles 
      WHERE user_id = ${parseInt(userId)} AND article_id = ${articleId}
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Article already saved" },
        { status: 400 }
      );
    }

    // Save article
    await sql`
      INSERT INTO saved_articles (user_id, article_id)
      VALUES (${parseInt(userId)}, ${articleId})
    `;

    console.log("Article saved successfully");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving article:", error);
    return NextResponse.json(
      { error: "Failed to save article", details: String(error) },
      { status: 500 }
    );
  }
}
