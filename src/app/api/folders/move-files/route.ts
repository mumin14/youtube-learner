import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileIds, folderId } = (await req.json()) as {
    fileIds: number[];
    folderId: number | null;
  };

  if (!fileIds?.length) {
    return NextResponse.json({ error: "No files specified" }, { status: 400 });
  }

  const db = getDb();

  // If moving to a folder, verify ownership
  if (folderId !== null) {
    const folder = await db.get(
      `SELECT id FROM folders WHERE id = ? AND user_id = ?`,
      folderId, user.id
    );
    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
  }

  const placeholders = fileIds.map(() => "?").join(",");
  await db.run(
    `UPDATE files SET folder_id = ? WHERE id IN (${placeholders}) AND user_id = ?`,
    folderId, ...fileIds, user.id
  );

  return NextResponse.json({ ok: true });
}
