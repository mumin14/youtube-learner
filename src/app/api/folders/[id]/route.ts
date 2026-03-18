import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const folderId = Number(id);
  const body = (await req.json()) as {
    name?: string;
    color?: string;
    fileIds?: number[];
    spec_text?: string | null;
    spec_filename?: string | null;
    study_level?: string | null;
    study_level_details?: string | null;
  };

  const db = getDb();

  // Verify ownership
  const folder = await db.get(
    `SELECT id FROM folders WHERE id = ? AND user_id = ?`,
    folderId, user.id
  );

  if (!folder) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  // Update folder metadata
  const hasSpecFields = "spec_text" in body || "spec_filename" in body || "study_level" in body || "study_level_details" in body;
  if (body.name || body.color || hasSpecFields) {
    const sets: string[] = [];
    const vals: (string | number | null)[] = [];
    if (body.name) {
      sets.push("name = ?");
      vals.push(body.name.trim());
    }
    if (body.color) {
      sets.push("color = ?");
      vals.push(body.color);
    }
    if ("spec_text" in body) {
      sets.push("spec_text = ?");
      vals.push(body.spec_text ?? null);
    }
    if ("spec_filename" in body) {
      sets.push("spec_filename = ?");
      vals.push(body.spec_filename ?? null);
    }
    if ("study_level" in body) {
      sets.push("study_level = ?");
      vals.push(body.study_level ?? null);
    }
    if ("study_level_details" in body) {
      sets.push("study_level_details = ?");
      vals.push(body.study_level_details ?? null);
    }
    sets.push("updated_at = NOW()");
    vals.push(folderId);

    await db.run(`UPDATE folders SET ${sets.join(", ")} WHERE id = ?`,
      ...vals
    );
  }

  // Move files into this folder
  if (body.fileIds?.length) {
    const placeholders = body.fileIds.map(() => "?").join(",");
    await db.run(
      `UPDATE files SET folder_id = ? WHERE id IN (${placeholders}) AND user_id = ?`,
      folderId, ...body.fileIds, user.id
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const folderId = Number(id);
  const db = getDb();

  // Unassign files from this folder before deleting
  await db.run(
    `UPDATE files SET folder_id = NULL WHERE folder_id = ? AND user_id = ?`,
    folderId, user.id
  );

  await db.run(`DELETE FROM folders WHERE id = ? AND user_id = ?`,
    folderId,
    user.id
  );

  return NextResponse.json({ ok: true });
}
