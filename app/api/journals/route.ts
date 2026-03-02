import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_token");
}
export async function POST(req: NextRequest) {
  const admin = isAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { name, url } = await req.json();
  if (!name || !url) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  
  try {
    const sql = getDb();
    
    // Create table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS journals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    // Insert the journal
    const result = await sql`
      INSERT INTO journals (name, url)
      VALUES (${name}, ${url})
      RETURNING id, name, url
    `;
    
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Error adding journal:", error);
    return NextResponse.json(
      { error: "Failed to add journal", details: String(error) },
      { status: 500 }
    );
  }
}