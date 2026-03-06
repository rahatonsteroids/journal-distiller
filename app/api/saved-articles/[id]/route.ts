import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = req.cookies.get("user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const sql = getDb();

    await sql`
      DELETE FROM saved_articles 
      WHERE id = ${parseInt(id)} AND user_id = ${parseInt(userId)}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting saved article:", error);
    return NextResponse.json(
      { error: "Failed to delete" },
      { status: 500 }
    );
  }
}