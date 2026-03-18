import { getDb } from "@/lib/db";

export interface DayAvailability {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface CalendarSettings {
  timezone: string;
  items_per_day: number;
  availability: Record<string, DayAvailability>;
}

const DEFAULT_AVAILABILITY: Record<string, DayAvailability> = {
  monday: { enabled: true, start: "09:00", end: "17:00" },
  tuesday: { enabled: true, start: "09:00", end: "17:00" },
  wednesday: { enabled: true, start: "09:00", end: "17:00" },
  thursday: { enabled: true, start: "09:00", end: "17:00" },
  friday: { enabled: true, start: "09:00", end: "17:00" },
  saturday: { enabled: false, start: "10:00", end: "14:00" },
  sunday: { enabled: false, start: "10:00", end: "14:00" },
};

const DEFAULT_SETTINGS: CalendarSettings = {
  timezone: "America/New_York",
  items_per_day: 6,
  availability: DEFAULT_AVAILABILITY,
};

export async function getCalendarSettings(userId: number): Promise<CalendarSettings> {
  const db = getDb();
  const row = await db.get(
    `SELECT timezone, items_per_day, availability FROM calendar_settings WHERE user_id = ?`,
    userId
  ) as { timezone: string; items_per_day: number; availability: string } | undefined;

  if (!row) return DEFAULT_SETTINGS;

  try {
    return {
      timezone: row.timezone || DEFAULT_SETTINGS.timezone,
      items_per_day: row.items_per_day ?? DEFAULT_SETTINGS.items_per_day,
      availability: JSON.parse(row.availability),
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
