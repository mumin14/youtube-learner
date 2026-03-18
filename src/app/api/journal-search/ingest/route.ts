import { NextRequest, NextResponse } from "next/server";
import Exa from "exa-js";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { chunkText } from "@/lib/chunker";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, title } = (await req.json()) as { url: string; title: string };

  if (!url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Exa API key not configured" }, { status: 500 });
  }

  const db = getDb();

  // Check if already ingested
  const existing = await db.get(
    "SELECT id FROM files WHERE youtube_url = ? AND user_id = ?",
    url, user.id
  );
  if (existing) {
    return NextResponse.json({ error: "This article has already been ingested" }, { status: 409 });
  }

  try {
    // Use Exa getContents to fetch full text by URL
    const exa = new Exa(apiKey);
    const result = await exa.getContents([url], {
      text: { maxCharacters: 100000 },
    });

    const page = result.results[0];
    const text = (page as Record<string, unknown>).text as string | undefined;

    if (!text || text.length < 100) {
      return NextResponse.json(
        { error: "Could not extract enough text from this article. It may be behind a paywall." },
        { status: 422 }
      );
    }

    const articleTitle = title || page.title || "Untitled Article";
    const safeName = `article-${Date.now()}`;

    const info = await db.run(
      `INSERT INTO files (filename, original_name, size_bytes, status, source_type, youtube_url, user_id)
       VALUES (?, ?, ?, 'chunked', 'article', ?, ?)`,
      safeName, articleTitle, Buffer.byteLength(text), url, user.id
    );
    const fileId = info.lastInsertRowid as number;

    const chunks = chunkText(text, articleTitle);

    await db.transaction(async () => {
      for (let i = 0; i < chunks.length; i++) {
        await db.run(
          `INSERT INTO chunks (file_id, chunk_index, content, token_estimate) VALUES (?, ?, ?, ?)`,
          fileId, i, chunks[i].content, chunks[i].tokenEstimate
        );
      }
      await db.run(
        `UPDATE files SET chunk_count = ? WHERE id = ?`,
        chunks.length, fileId
      );
    });

    return NextResponse.json({
      success: true,
      fileId,
      title: articleTitle,
      chunks: chunks.length,
      textLength: text.length,
    });
  } catch (err) {
    console.error("Article ingest failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to ingest article" },
      { status: 500 }
    );
  }
}
