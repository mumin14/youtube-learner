import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { chunkText, chunkTranscriptSegments } from "@/lib/chunker";
import {
  parseYouTubeInput,
  fetchTranscript,
  getPlaylistVideos,
  getChannelVideos,
  searchChannels,
} from "@/lib/youtube";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { url } = (await req.json()) as { url: string };

  if (!url?.trim()) {
    return NextResponse.json(
      { error: "No URL provided" },
      { status: 400 }
    );
  }

  const parsed = parseYouTubeInput(url);

  try {
    switch (parsed.type) {
      case "video": {
        const result = await ingestSingleVideo(
          parsed.id,
          parsed.originalUrl,
          user.id
        );
        return NextResponse.json({
          type: "video",
          result,
        });
      }

      case "playlist": {
        const videos = await getPlaylistVideos(parsed.id);
        return NextResponse.json({
          type: "playlist",
          videos,
          playlistId: parsed.id,
        });
      }

      case "channel": {
        const { channelName, videos } = await getChannelVideos(parsed.id);
        return NextResponse.json({
          type: "channel",
          channelName,
          videos,
        });
      }

      case "search": {
        const { channelName, videos } = await searchChannels(parsed.id);
        return NextResponse.json({
          type: "channel",
          channelName,
          videos,
        });
      }

      default:
        return NextResponse.json(
          { error: "Unrecognized input" },
          { status: 400 }
        );
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function ingestSingleVideo(
  videoId: string,
  originalUrl: string,
  userId: number
): Promise<{
  id: number;
  name: string;
  chunks: number;
  success: boolean;
  error?: string;
}> {
  try {
    const { text, title, segments } = await fetchTranscript(videoId);

    if (!text.trim()) {
      return {
        id: 0,
        name: title,
        chunks: 0,
        success: false,
        error: "Transcript is empty",
      };
    }

    const db = getDb();
    const insertFile = db.prepare(
      `INSERT INTO files (filename, original_name, size_bytes, status, source_type, youtube_url, video_id, user_id)
       VALUES (?, ?, ?, 'chunked', 'youtube', ?, ?, ?)`
    );
    const insertChunk = db.prepare(
      `INSERT INTO chunks (file_id, chunk_index, content, token_estimate, start_seconds, end_seconds) VALUES (?, ?, ?, ?, ?, ?)`
    );
    const updateFileChunks = db.prepare(
      `UPDATE files SET chunk_count = ? WHERE id = ?`
    );

    const safeName = `yt-${videoId}`;
    const info = insertFile.run(
      safeName,
      title,
      Buffer.byteLength(text),
      originalUrl,
      videoId,
      userId
    );
    const fileId = info.lastInsertRowid as number;

    const chunks = segments.length > 0
      ? chunkTranscriptSegments(segments, title)
      : chunkText(text, title);

    const tx = db.transaction(() => {
      for (let i = 0; i < chunks.length; i++) {
        insertChunk.run(
          fileId,
          i,
          chunks[i].content,
          chunks[i].tokenEstimate,
          chunks[i].startSeconds ?? null,
          chunks[i].endSeconds ?? null
        );
      }
      updateFileChunks.run(chunks.length, fileId);
    });
    tx();

    return {
      id: fileId,
      name: title,
      chunks: chunks.length,
      success: true,
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Transcript not available";
    return {
      id: 0,
      name: `Video ${videoId}`,
      chunks: 0,
      success: false,
      error: message,
    };
  }
}
