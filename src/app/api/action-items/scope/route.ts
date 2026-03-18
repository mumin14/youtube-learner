import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { callClaude } from "@/lib/claude";
import { requireAuth } from "@/lib/auth";
import { getLearnerContext } from "@/lib/learner-profile";

const BATCH_SIZE = 3;
const DELAY_BETWEEN_MS = 2000;

function SCOPED_EXTRACTION_PROMPT(chunkedContent: string, scope: string, learnerProfile?: string): string {
  const profileSection = learnerProfile?.trim()
    ? `\n\n<learner_profile>\nBefore generating action items, you MUST read and internalize the following learner profile. Every action item must be shaped by this profile — match the learner's preferred style, depth, pacing, and format. Write descriptions the way this person learns best:\n\n${learnerProfile}\n</learner_profile>\n`
    : "";
  return `You are an expert learning coach analyzing YouTube video transcripts.${profileSection} The learner has told you what they want to focus on:

<learner_focus>
${scope}
</learner_focus>

Generate action items that are specifically tailored to their stated focus. Prioritize content from the transcript that relates to what they're trying to learn, struggling with, or need to focus on.

For each learning item, categorize its difficulty:

<difficulty_definitions>
- **easy**: Foundational knowledge — the bare minimum concepts a learner needs to understand first. These are definitions, basic concepts, prerequisite knowledge, and fundamental building blocks.
- **medium**: Knowledge solidification — building on foundations by connecting concepts together, understanding relationships, applying knowledge to standard scenarios.
- **hard**: Deep mastery — advanced understanding requiring nuanced application, edge cases, performance implications, architectural decisions, trade-offs.
</difficulty_definitions>

<instructions>
1. Focus on content that is RELEVANT to the learner's stated focus
2. If the learner says they're struggling with something, create more easy/medium items for that area
3. If the learner wants to go deeper, emphasize medium/hard items
4. The title should be concise (under 80 characters) and describe what to learn
5. The description should explain WHY this matters for their specific goal and HOW to learn it (2-3 sentences)
6. Include the source_context: a brief quote from the transcript
7. Assign a topic tag (e.g., "React Hooks", "CSS Layout", "JavaScript Async")
8. Each chunk may have start_seconds/end_seconds. Estimate a timestamp_seconds within range, or null if unavailable
9. Return ONLY valid JSON
</instructions>

<transcript_chunks>
${chunkedContent}
</transcript_chunks>

Respond with this exact JSON structure:
{
  "items": [
    {
      "chunk_id": <number - the id attribute from the chunk tag>,
      "difficulty": "easy" | "medium" | "hard",
      "title": "<concise learning action>",
      "description": "<why it matters for their goal and how to learn it>",
      "source_context": "<relevant quote from transcript>",
      "topic": "<topic category>",
      "timestamp_seconds": <number or null>
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { scope, fileId } = (await req.json()) as {
    scope: string;
    fileId?: number;
  };

  if (!scope?.trim()) {
    return NextResponse.json({ error: "Scope is required" }, { status: 400 });
  }

  const db = getDb();

  // Load combined learner profile (manual + LLM-imported)
  const learnerProfile = await getLearnerContext(user.id);

  // Get all chunks for this user (optionally filtered by file)
  let chunkQuery = `
    SELECT c.id, c.content, c.file_id, c.chunk_index, c.start_seconds, c.end_seconds
    FROM chunks c
    JOIN files f ON f.id = c.file_id AND f.user_id = ?
    WHERE f.status = 'completed'
  `;
  const params: (string | number)[] = [user.id];

  if (fileId) {
    chunkQuery += ` AND c.file_id = ?`;
    params.push(fileId);
  }

  chunkQuery += ` ORDER BY c.file_id, c.chunk_index`;

  const chunks = await db.all(chunkQuery, ...params) as Array<{
    id: number;
    content: string;
    file_id: number;
    chunk_index: number;
    start_seconds: number | null;
    end_seconds: number | null;
  }>;

  if (chunks.length === 0) {
    return NextResponse.json({ error: "No content found to generate action items from" }, { status: 400 });
  }

  // Delete existing non-completed action items for the scope (user can re-scope)
  if (fileId) {
    await db.run(
      `DELETE FROM action_items WHERE completed = 0 AND file_id = ? AND file_id IN (SELECT id FROM files WHERE user_id = ?)`,
      fileId, user.id
    );
  } else {
    await db.run(
      `DELETE FROM action_items WHERE completed = 0 AND file_id IN (SELECT id FROM files WHERE user_id = ?)`,
      user.id
    );
  }

  // Process in batches
  const batches: (typeof chunks)[] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    batches.push(chunks.slice(i, i + BATCH_SIZE));
  }

  let totalItems = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const combinedContent = batch
      .map((c) => {
        const timeAttrs = c.start_seconds != null
          ? ` start_seconds="${Math.round(c.start_seconds)}" end_seconds="${Math.round(c.end_seconds ?? c.start_seconds)}"`
          : "";
        return `<chunk id="${c.id}"${timeAttrs}>\n${c.content}\n</chunk>`;
      })
      .join("\n\n");

    try {
      const response = await callClaude(SCOPED_EXTRACTION_PROMPT(combinedContent, scope, learnerProfile));

      let jsonStr = response;
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr) as {
        items: Array<{
          chunk_id: number;
          difficulty: string;
          title: string;
          description: string;
          source_context: string;
          topic: string;
          timestamp_seconds: number | null;
        }>;
      };

      await db.transaction(async () => {
        for (const item of parsed.items) {
          const matchedChunk = batch.find((c) => c.id === item.chunk_id);
          await db.run(
            `INSERT INTO action_items (chunk_id, file_id, difficulty, title, description, source_context, topic, timestamp_seconds)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            matchedChunk ? item.chunk_id : batch[0].id,
            matchedChunk?.file_id ?? batch[0].file_id,
            item.difficulty,
            item.title,
            item.description,
            item.source_context || "",
            item.topic || "General",
            typeof item.timestamp_seconds === "number" ? item.timestamp_seconds : null
          );
          totalItems++;
        }
      });
    } catch (err) {
      console.error("Scoped extraction batch failed:", err);
    }

    if (i < batches.length - 1) {
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_MS));
    }
  }

  return NextResponse.json({ success: true, itemCount: totalItems });
}
