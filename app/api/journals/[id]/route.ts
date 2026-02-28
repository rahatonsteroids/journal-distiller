import { getDb } from "@/lib/prisma";
import { NextResponse, NextRequest } from "next/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  const body = await request.json();
  const updated = await sql`
    UPDATE journals
    SET name = ${body.name},
        url = ${body.url}
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json(updated[0]);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const sql = getDb();
  await sql`
    DELETE FROM journals
    WHERE id = ${id}
  `;
  return NextResponse.json({ success: true });
}