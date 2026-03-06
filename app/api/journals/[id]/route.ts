import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/prisma";

function isAdmin(req: NextRequest) {
  return req.cookies.get("admin_token") || req.cookies.get("token");
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const { name, url } = await request.json();
  const sql = getDb();
  const result = await sql`
    UPDATE journals
    SET name = ${name}, url = ${url}
    WHERE id = ${id}
    RETURNING id, name, url
  `;
  return NextResponse.json(result[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = isAdmin(request);
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const sql = getDb();
  await sql`
    DELETE FROM journals WHERE id = ${id}
  `;
  return NextResponse.json({ success: true });
}
