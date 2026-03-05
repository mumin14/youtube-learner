import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { callClaude } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, summary, author } = (await req.json()) as {
    title: string;
    summary: string | null;
    author: string | null;
  };

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const prompt = `Given this journal article, write 2-3 concise sentences explaining why someone should read and ingest it into their learning library. Focus on what they will learn and how it could be useful. Be specific about the key insights, not generic.

Title: ${title}
${author ? `Author: ${author}` : ""}
${summary ? `Summary: ${summary}` : ""}

Respond with ONLY the 2-3 sentences, no preamble or labels.`;

  try {
    const insight = await callClaude(prompt, { maxTokens: 200 });
    return NextResponse.json({ insight: insight.trim() });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate insight" },
      { status: 500 }
    );
  }
}
