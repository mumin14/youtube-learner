import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getCalendarSettings, type DayAvailability } from "@/lib/calendar-settings";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await getCalendarSettings(user.id);
  return NextResponse.json(settings);
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TIME_RE = /^\d{2}:\d{2}$/;

function validateAvailability(
  availability: Record<string, DayAvailability>
): string | null {
  for (const day of DAYS) {
    const d = availability[day];
    if (!d) return `Missing day: ${day}`;
    if (typeof d.enabled !== "boolean") return `${day}.enabled must be boolean`;
    if (!TIME_RE.test(d.start)) return `${day}.start must be HH:MM`;
    if (!TIME_RE.test(d.end)) return `${day}.end must be HH:MM`;
    if (d.start >= d.end) return `${day}.start must be before end`;
  }
  return null;
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as {
    timezone?: string;
    items_per_day?: number;
    availability?: Record<string, DayAvailability>;
  };

  if (body.timezone !== undefined && (typeof body.timezone !== "string" || !body.timezone.trim())) {
    return NextResponse.json({ error: "Invalid timezone" }, { status: 400 });
  }

  if (body.items_per_day !== undefined) {
    if (typeof body.items_per_day !== "number" || body.items_per_day < 1 || body.items_per_day > 15) {
      return NextResponse.json({ error: "items_per_day must be between 1 and 15" }, { status: 400 });
    }
  }

  if (body.availability !== undefined) {
    const err = validateAvailability(body.availability);
    if (err) {
      return NextResponse.json({ error: err }, { status: 400 });
    }
  }

  // Merge with existing settings
  const current = await getCalendarSettings(user.id);
  const merged = {
    timezone: body.timezone ?? current.timezone,
    items_per_day: body.items_per_day ?? current.items_per_day,
    availability: body.availability ?? current.availability,
  };

  const db = getDb();
  await db.run(
    `INSERT INTO calendar_settings (user_id, timezone, items_per_day, availability, updated_at)
     VALUES (?, ?, ?, ?, NOW())
     ON CONFLICT(user_id) DO UPDATE SET
       timezone = excluded.timezone,
       items_per_day = excluded.items_per_day,
       availability = excluded.availability,
       updated_at = NOW()`,
    user.id, merged.timezone, merged.items_per_day, JSON.stringify(merged.availability)
  );

  return NextResponse.json(merged);
}
