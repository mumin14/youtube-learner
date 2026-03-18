import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { callClaude } from "@/lib/claude";
import { requireAuth } from "@/lib/auth";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { noteCreateSchema, validateBody } from "@/lib/validations";

const ASSESSMENT_PROMPT = (
  actionTitle: string,
  actionDescription: string,
  sourceContext: string,
  userNotes: string
) => `You are a learning assessment expert. A student watched a YouTube video and was given a learning action item. They have written notes about what they learned. Grade their understanding.

<action_item>
Title: ${actionTitle}
Description: ${actionDescription}
</action_item>

<original_source_material>
${sourceContext}
</original_source_material>

<student_notes>
${userNotes}
</student_notes>

Evaluate how well the student understands this material based on their notes compared to what was taught. Be encouraging but honest.

Respond with ONLY valid JSON in this exact format:
{
  "score": <number 0-100>,
  "grade": "<letter grade: A+, A, B+, B, C+, C, D, F>",
  "strengths": [
    "<specific thing they demonstrated understanding of>",
    "<another strength>",
    "<another strength>"
  ],
  "improvements": [
    "<specific area they missed or should focus on>",
    "<another area to improve>",
    "<another area to improve>"
  ]
}`;

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = validateBody(noteCreateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { actionItemId, content } = parsed.data;

  const rl = checkRateLimit(`${user.id}:notes`, RATE_LIMITS.ai);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many submissions. Please slow down." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const db = getDb();

  // Get the action item + source context
  const actionItem = await db.get(`
    SELECT ai.*, c.content as chunk_content
    FROM action_items ai
    JOIN chunks c ON c.id = ai.chunk_id
    JOIN files f ON f.id = ai.file_id AND f.user_id = ?
    WHERE ai.id = ?
  `, user.id, actionItemId) as {
    id: number;
    title: string;
    description: string;
    source_context: string | null;
    chunk_content: string;
  } | undefined;

  if (!actionItem) {
    return NextResponse.json({ error: "Action item not found" }, { status: 404 });
  }

  // Save the note
  const noteResult = await db.run(`
    INSERT INTO learning_notes (action_item_id, user_id, content)
    VALUES (?, ?, ?)
  `, actionItemId, user.id, content.trim());

  const noteId = noteResult.lastInsertRowid as number;

  // Call LLM for assessment
  try {
    const sourceContext = actionItem.source_context || actionItem.chunk_content;
    const response = await callClaude(
      ASSESSMENT_PROMPT(
        actionItem.title,
        actionItem.description,
        sourceContext,
        content.trim()
      )
    );

    let jsonStr = response;
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const assessment = JSON.parse(jsonStr) as {
      score: number;
      grade: string;
      strengths: string[];
      improvements: string[];
    };

    // Save assessment
    await db.run(`
      INSERT INTO assessments (note_id, action_item_id, score, grade, strengths, improvements)
      VALUES (?, ?, ?, ?, ?, ?)
    `, noteId, actionItemId, assessment.score, assessment.grade,
      JSON.stringify(assessment.strengths), JSON.stringify(assessment.improvements)
    );

    return NextResponse.json({
      noteId,
      assessment: {
        score: assessment.score,
        grade: assessment.grade,
        strengths: assessment.strengths,
        improvements: assessment.improvements,
      },
    });
  } catch (err) {
    console.error("Assessment failed:", err);
    return NextResponse.json({
      noteId,
      assessment: null,
      error: "Note saved but assessment failed",
    });
  }
}

// GET - fetch notes + assessments for an action item
export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const actionItemId = req.nextUrl.searchParams.get("actionItemId");
  if (!actionItemId) {
    return NextResponse.json({ error: "Missing actionItemId" }, { status: 400 });
  }

  const db = getDb();

  const notes = await db.all(`
    SELECT ln.*, a.score, a.grade, a.strengths, a.improvements
    FROM learning_notes ln
    LEFT JOIN assessments a ON a.note_id = ln.id
    WHERE ln.action_item_id = ? AND ln.user_id = ?
    ORDER BY ln.created_at DESC
  `, Number(actionItemId), user.id) as Array<{
    id: number;
    content: string;
    created_at: string;
    score: number | null;
    grade: string | null;
    strengths: string | null;
    improvements: string | null;
  }>;

  const formatted = notes.map((n) => ({
    id: n.id,
    content: n.content,
    created_at: n.created_at,
    assessment: n.score != null ? {
      score: n.score,
      grade: n.grade,
      strengths: JSON.parse(n.strengths || "[]"),
      improvements: JSON.parse(n.improvements || "[]"),
    } : null,
  }));

  return NextResponse.json({ notes: formatted });
}
