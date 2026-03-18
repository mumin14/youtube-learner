import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function PATCH(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, scheduled_date, scheduled_time } = (await req.json()) as {
    id: number;
    scheduled_date: string | null;
    scheduled_time?: string | null;
  };

  if (typeof id !== "number") {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (
    scheduled_date !== null &&
    !/^\d{4}-\d{2}-\d{2}$/.test(scheduled_date)
  ) {
    return NextResponse.json(
      { error: "Invalid date format, use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  // Validate scheduled_time if provided
  const resolvedTime = scheduled_date === null
    ? null
    : (scheduled_time && /^\d{2}:\d{2}$/.test(scheduled_time) ? scheduled_time : null);

  const db = getDb();
  const result = await db.run(
    `UPDATE action_items SET scheduled_date = ?, scheduled_time = ?
     WHERE id = ? AND file_id IN (SELECT id FROM files WHERE user_id = ?)`,
    scheduled_date, resolvedTime, id, user.id
  );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ id, scheduled_date, scheduled_time: resolvedTime });
}
