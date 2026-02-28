import { getDb } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sql = getDb();
  const body = await request.json();

  const updated = await sql`
    UPDATE journals
    SET name = ${body.name},
        url = ${body.url}
    WHERE id = ${params.id}
    RETURNING *
  `;

  return NextResponse.json(updated[0]);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const sql = getDb();

  await sql`
    DELETE FROM journals
    WHERE id = ${params.id}
  `;

  return NextResponse.json({ success: true });
}