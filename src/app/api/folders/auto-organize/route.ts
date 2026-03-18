import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { callClaude } from "@/lib/claude";

interface FileInfo {
  id: number;
  original_name: string;
  source_type: string;
  topic?: string;
}

interface OrgPlan {
  folders: Array<{
    name: string;
    color: string;
    fileIds: number[];
  }>;
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();

  // Get all user files with their topics from action items
  const files = await db.all(
    `SELECT f.id, f.original_name, f.source_type,
      (SELECT STRING_AGG(DISTINCT ai.topic, ',') FROM action_items ai WHERE ai.file_id = f.id AND ai.topic IS NOT NULL) as topics
     FROM files f
     WHERE f.user_id = ?
     ORDER BY f.original_name`,
    user.id
  ) as (FileInfo & { topics: string | null })[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files to organize" }, { status: 400 });
  }

  const fileList = files
    .map(
      (f) =>
        `ID:${f.id} | "${f.original_name}" | type:${f.source_type}${f.topics ? ` | topics: ${f.topics}` : ""}`
    )
    .join("\n");

  const prompt = `You are organizing a learner's study library. Given these learning resources, group them into logical folders by subject, topic, or area of study.

Resources:
${fileList}

Respond with ONLY a JSON object (no markdown, no explanation) in this format:
{
  "folders": [
    {
      "name": "Folder Name",
      "color": "#hex",
      "fileIds": [1, 2, 3]
    }
  ]
}

Rules:
- Create 2-8 folders based on natural topic groupings
- Use short, clear folder names (2-4 words max)
- Every file must be assigned to exactly one folder
- Use distinct hex colors for each folder from this palette: #6366f1, #ec4899, #f59e0b, #10b981, #3b82f6, #8b5cf6, #ef4444, #14b8a6
- Group by subject/discipline, not by content type`;

  try {
    const response = await callClaude(prompt, { maxTokens: 2048 });

    // Parse the JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to generate organization plan" },
        { status: 500 }
      );
    }

    const plan: OrgPlan = JSON.parse(jsonMatch[0]);

    if (!plan.folders?.length) {
      return NextResponse.json(
        { error: "No folders suggested" },
        { status: 500 }
      );
    }

    // Execute the plan in a transaction
    const validFileIds = new Set(files.map((f) => f.id));

    await db.transaction(async () => {
      // Delete existing folders for this user
      await db.run(
        `UPDATE files SET folder_id = NULL WHERE user_id = ?`,
        user.id
      );
      await db.run(`DELETE FROM folders WHERE user_id = ?`, user.id);

      // Create new folders and assign files
      for (const folder of plan.folders) {
        const result = await db.run(
          `INSERT INTO folders (user_id, name, color) VALUES (?, ?, ?)`,
          user.id,
          folder.name,
          folder.color || "#6366f1"
        );
        const folderId = result.lastInsertRowid as number;

        for (const fileId of folder.fileIds) {
          if (validFileIds.has(fileId)) {
            await db.run(
              `UPDATE files SET folder_id = ? WHERE id = ? AND user_id = ?`,
              folderId, fileId, user.id
            );
          }
        }
      }
    });

    // Return the new folder state
    const folders = await db.all(
      `SELECT f.*,
        (SELECT COUNT(*) FROM files fi WHERE fi.folder_id = f.id) as file_count
       FROM folders f
       WHERE f.user_id = ?
       ORDER BY f.name ASC`,
      user.id
    );

    return NextResponse.json({ folders, organized: files.length });
  } catch (err) {
    console.error("Auto-organize error:", err);
    return NextResponse.json(
      { error: "Failed to auto-organize" },
      { status: 500 }
    );
  }
}
