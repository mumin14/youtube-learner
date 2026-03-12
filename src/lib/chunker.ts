import type { TranscriptSegment } from "./youtube";

export interface ChunkResult {
  content: string;
  tokenEstimate: number;
  startSeconds?: number;
  endSeconds?: number;
}

const TARGET_CHUNK_TOKENS = 2500;
const OVERLAP_TOKENS = 300;
const CHARS_PER_TOKEN = 4;

export function chunkText(text: string, filename: string): ChunkResult[] {
  const cleaned = cleanTranscript(text);
  if (!cleaned.trim()) return [];

  const targetChars = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN;
  const overlapChars = OVERLAP_TOKENS * CHARS_PER_TOKEN;
  const chunks: ChunkResult[] = [];

  const paragraphs = cleaned.split(/\n\s*\n/);
  let currentChunk = "";

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    if ((currentChunk + "\n\n" + trimmed).length <= targetChars) {
      currentChunk = currentChunk ? currentChunk + "\n\n" + trimmed : trimmed;
    } else {
      if (currentChunk) {
        chunks.push(makeChunk(currentChunk, filename));
      }

      if (trimmed.length > targetChars) {
        const sentenceChunks = splitBySentences(
          trimmed,
          targetChars,
          overlapChars,
          filename
        );
        chunks.push(...sentenceChunks);
        currentChunk = "";
      } else {
        const overlap = getOverlapSuffix(currentChunk, overlapChars);
        currentChunk = overlap ? overlap + "\n\n" + trimmed : trimmed;
      }
    }
  }

  if (currentChunk.trim()) {
    chunks.push(makeChunk(currentChunk, filename));
  }

  return chunks;
}

function cleanTranscript(text: string): string {
  return text
    .replace(/\[.*?\]/g, "")
    .replace(/\d{1,2}:\d{2}(:\d{2})?/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitBySentences(
  text: string,
  targetChars: number,
  overlapChars: number,
  filename: string
): ChunkResult[] {
  const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
  const chunks: ChunkResult[] = [];
  let current = "";

  for (const sentence of sentences) {
    if ((current + sentence).length <= targetChars) {
      current += sentence;
    } else {
      if (current) chunks.push(makeChunk(current, filename));
      const overlap = getOverlapSuffix(current, overlapChars);
      current = overlap ? overlap + " " + sentence : sentence;
    }
  }

  if (current.trim()) {
    chunks.push(makeChunk(current, filename));
  }

  return chunks;
}

function getOverlapSuffix(text: string, chars: number): string {
  if (!text || text.length <= chars) return text || "";
  const suffix = text.slice(-chars);
  const sentenceStart = suffix.search(/[.!?]\s+[A-Z]/);
  return sentenceStart > 0 ? suffix.slice(sentenceStart + 2) : suffix;
}

function makeChunk(content: string, source: string): ChunkResult {
  return {
    content: `[Source: ${source}]\n${content}`,
    tokenEstimate: Math.ceil(content.length / CHARS_PER_TOKEN),
  };
}

/**
 * Chunks timestamped transcript segments, preserving start/end time ranges per chunk.
 * Used for YouTube videos where we have per-caption timestamps.
 */
export function chunkTranscriptSegments(
  segments: TranscriptSegment[],
  filename: string
): ChunkResult[] {
  if (segments.length === 0) return [];

  const targetChars = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN;
  const chunks: ChunkResult[] = [];

  let currentContent = "";
  let chunkStartSeconds = segments[0].startSeconds;
  let lastEndSeconds = 0;

  for (const seg of segments) {
    const segEnd = seg.startSeconds + seg.durationSeconds;
    const text = seg.text.replace(/\n/g, " ").trim();
    if (!text) continue;

    if ((currentContent + " " + text).length <= targetChars) {
      currentContent = currentContent ? currentContent + " " + text : text;
      lastEndSeconds = segEnd;
    } else {
      if (currentContent) {
        chunks.push({
          content: `[Source: ${filename}]\n${currentContent}`,
          tokenEstimate: Math.ceil(currentContent.length / CHARS_PER_TOKEN),
          startSeconds: chunkStartSeconds,
          endSeconds: lastEndSeconds,
        });
      }
      currentContent = text;
      chunkStartSeconds = seg.startSeconds;
      lastEndSeconds = segEnd;
    }
  }

  if (currentContent.trim()) {
    chunks.push({
      content: `[Source: ${filename}]\n${currentContent}`,
      tokenEstimate: Math.ceil(currentContent.length / CHARS_PER_TOKEN),
      startSeconds: chunkStartSeconds,
      endSeconds: lastEndSeconds,
    });
  }

  return chunks;
}
