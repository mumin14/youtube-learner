import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { folderCreateSchema, validateBody } from "@/lib/validations";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const folders = await db.all(
    `SELECT f.*,
      (SELECT COUNT(*) FROM files fi WHERE fi.folder_id = f.id) as file_count
     FROM folders f
     WHERE f.user_id = ?
     ORDER BY f.name ASC`,
    user.id
  );

  return NextResponse.json({ folders });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(folderCreateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { name, color } = parsed.data;

  const db = getDb();
  const result = await db.run(
    `INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)`,
    user.id, name.trim(), color || "#6366f1"
  );

  const folder = await db.get(
    `SELECT *, 0 as file_count FROM folders WHERE id = ?`,
    result.lastInsertRowid
  );

  return NextResponse.json({ folder });
}
