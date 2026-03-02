import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_token");
}

export async function GET(req: NextRequest) {
  const admin = isAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const sql = getDb();
  const journals = await sql`SELECT id, name, url FROM journals ORDER BY id DESC`;
  return NextResponse.json(journals);
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
  const result = await sql`
    INSERT INTO journals (name, url)
    VALUES (${name}, ${url})
    RETURNING id, name, url
  `;
  return NextResponse.json(result[0]);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = isAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { name, url } = await req.json();
  const sql = getDb();
  const result = await sql`
    UPDATE journals
    SET name = ${name}, url = ${url}
    WHERE id = ${id}
    RETURNING id, name, url
  `;
  return NextResponse.json(result[0]);
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