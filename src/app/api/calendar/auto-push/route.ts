import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { callClaude } from "@/lib/claude";
import { SCHEDULE_PROMPT } from "@/lib/prompts";
import { getLearnerContext } from "@/lib/learner-profile";
import { getCalendarSettings } from "@/lib/calendar-settings";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Fetch incomplete, unscheduled action items
  const unscheduled = await db.all(
    `SELECT ai.id, ai.difficulty, ai.title, ai.topic
     FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     WHERE ai.completed = 0 AND (ai.scheduled_date IS NULL OR ai.scheduled_date = '')`,
    user.id
  ) as {
    id: number;
    difficulty: string;
    title: string;
    topic: string | null;
  }[];

  if (unscheduled.length === 0) {
    return NextResponse.json({ scheduled: 0 });
  }

  // Get existing scheduled load per day (next 30 days)
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const existingLoad = await db.all(
    `SELECT ai.scheduled_date as date, COUNT(*) as count
     FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     WHERE ai.scheduled_date >= ? AND ai.completed = 0
     GROUP BY ai.scheduled_date`,
    user.id, todayStr
  ) as { date: string; count: number }[];

  // Load learner profile and calendar settings
  const learnerProfile = await getLearnerContext(user.id);
  const calendarSettings = await getCalendarSettings(user.id);

  // Batch items if >50 to avoid token limits
  const BATCH_SIZE = 50;
  const batches: (typeof unscheduled)[] = [];
  for (let i = 0; i < unscheduled.length; i += BATCH_SIZE) {
    batches.push(unscheduled.slice(i, i + BATCH_SIZE));
  }

  let totalScheduled = 0;

  for (const batch of batches) {
    const items = batch.map((item) => ({
      id: item.id,
      difficulty: item.difficulty,
      title: item.title,
      topic: item.topic,
    }));

    const prompt = SCHEDULE_PROMPT(items, existingLoad, todayStr, learnerProfile, calendarSettings);

    try {
      const response = await callClaude(prompt, { maxTokens: 4096 });

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as {
        assignments: { id: number; scheduled_date: string; scheduled_time?: string }[];
      };

      if (!parsed.assignments?.length) continue;

      // Validate and apply assignments
      const validIds = new Set(batch.map((i) => i.id));
      await db.transaction(async () => {
        for (const assignment of parsed.assignments) {
          const validTime = assignment.scheduled_time && /^\d{2}:\d{2}$/.test(assignment.scheduled_time)
            ? assignment.scheduled_time
            : null;
          if (
            validIds.has(assignment.id) &&
            /^\d{4}-\d{2}-\d{2}$/.test(assignment.scheduled_date)
          ) {
            await db.run(
              `UPDATE action_items SET scheduled_date = ?, scheduled_time = ?
               WHERE id = ? AND file_id IN (SELECT id FROM files WHERE user_id = ?)`,
              assignment.scheduled_date, validTime, assignment.id, user.id
            );
            totalScheduled++;

            // Update existing load tracking for next batch
            const existing = existingLoad.find(
              (l) => l.date === assignment.scheduled_date
            );
            if (existing) {
              existing.count++;
            } else {
              existingLoad.push({
                date: assignment.scheduled_date,
                count: 1,
              });
            }
          }
        }
      });
    } catch (err) {
      console.error("Auto-push batch error:", err);
    }
  }

  return NextResponse.json({ scheduled: totalScheduled });
}
