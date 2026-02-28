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

  const sql = getDb();

  await sql`
    INSERT INTO journals (name, url)
    VALUES (${name}, ${url})
  `;

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const admin = isAdmin(req);

  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  const sql = getDb();

  await sql`
    DELETE FROM journals WHERE id = ${id}
  `;

  return NextResponse.json({ success: true });
}