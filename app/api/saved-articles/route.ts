import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const userId = req.cookies.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { articleId } = await req.json();

    const sql = getDb();

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving article:", error);
    return NextResponse.json(
      { error: "Failed to save article" },
      { status: 500 }
    );
  }
}