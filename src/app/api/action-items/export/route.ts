import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const items = db
    .prepare(
      `SELECT ai.difficulty, ai.title, ai.description, ai.topic, ai.completed,
              f.original_name as filename, f.source_type
       FROM action_items ai
       JOIN files f ON f.id = ai.file_id AND f.user_id = ?
       ORDER BY f.id,
         CASE ai.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 END,
         ai.topic, ai.id`
    )
    .all(user.id) as {
    difficulty: string;
    title: string;
    description: string;
    topic: string | null;
    completed: number;
    filename: string;
    source_type: string;
  }[];

  // Group by source
  const grouped: Record<string, typeof items> = {};
  for (const item of items) {
    if (!grouped[item.filename]) grouped[item.filename] = [];
    grouped[item.filename].push(item);
  }

  // Build markdown
  let md = "# YouTube Learner - Action Items\n\n";
  md += `*Exported on ${new Date().toLocaleDateString()}*\n\n`;

  for (const [source, sourceItems] of Object.entries(grouped)) {
    md += `## ${source}\n\n`;

    for (const diff of ["easy", "medium", "hard"]) {
      const diffItems = sourceItems.filter((i) => i.difficulty === diff);
      if (diffItems.length === 0) continue;

      const label =
        diff === "easy"
          ? "Foundations"
          : diff === "medium"
            ? "Solidification"
            : "Mastery";
      md += `### ${label}\n\n`;

      for (const item of diffItems) {
        const checkbox = item.completed ? "[x]" : "[ ]";
        md += `- ${checkbox} **${item.title}**\n`;
        md += `  ${item.description}\n`;
        if (item.topic) md += `  *Topic: ${item.topic}*\n`;
        md += "\n";
      }
    }
  }

  const format = req.nextUrl.searchParams.get("format");

  if (format === "download") {
    return new Response(md, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="youtube-learner-action-items.md"',
      },
    });
  }

  return NextResponse.json({ markdown: md });
}
