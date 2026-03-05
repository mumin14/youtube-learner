import ytdl from "@distube/ytdl-core";
import { OpenAI } from "openai";
import { tmpdir } from "os";
import { join } from "path";
import { createWriteStream, createReadStream, unlinkSync } from "fs";
import { randomUUID } from "crypto";
import type { TranscriptSegment } from "./youtube";

let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not set — needed for audio transcription");
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

/**
 * Downloads audio from a YouTube video and transcribes it via OpenAI Whisper.
 * Used as a fallback when no captions are available.
 */
export async function transcribeFromAudio(
  videoId: string
): Promise<{ text: string; title: string; segments: TranscriptSegment[] }> {
  const tempPath = join(tmpdir(), `yt-audio-${randomUUID()}.mp4`);

  try {
    // Download audio-only stream
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    console.log(`[transcribe] Getting video info for ${videoId}...`);
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title || `Video ${videoId}`;
    console.log(`[transcribe] Title: "${title}", downloading audio...`);

    await new Promise<void>((resolve, reject) => {
      const stream = ytdl(url, {
        filter: "audioonly",
        quality: "lowestaudio", // smallest file for faster upload
      });
      const writer = createWriteStream(tempPath);
      stream.pipe(writer);
      writer.on("finish", () => {
        console.log(`[transcribe] Audio downloaded to ${tempPath}`);
        resolve();
      });
      writer.on("error", (err) => {
        console.error(`[transcribe] Writer error:`, err.message);
        reject(err);
      });
      stream.on("error", (err) => {
        console.error(`[transcribe] Stream error:`, err.message);
        reject(err);
      });
    });

    // Transcribe via Whisper with word-level timestamps
    console.log(`[transcribe] Sending to Whisper API...`);
    const openai = getOpenAI();
    const transcription = await openai.audio.transcriptions.create({
      file: createReadStream(tempPath),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });
    console.log(`[transcribe] Whisper returned ${transcription.segments?.length || 0} segments`);

    const segments: TranscriptSegment[] = [];
    const textParts: string[] = [];

    if (transcription.segments) {
      for (const seg of transcription.segments) {
        segments.push({
          text: seg.text.trim(),
          startSeconds: seg.start,
          durationSeconds: seg.end - seg.start,
        });
        textParts.push(seg.text.trim());
      }
    }

    const text = textParts.length > 0
      ? textParts.join(" ")
      : transcription.text || "";

    return { text, title, segments };
  } finally {
    // Clean up temp file
    try { unlinkSync(tempPath); } catch { /* ignore */ }
  }
}
