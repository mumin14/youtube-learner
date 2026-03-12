import { Innertube } from "youtubei.js";
import { YoutubeTranscript } from "youtube-transcript";
import type { YouTubeVideo, YouTubeInputType } from "@/types";

export interface TranscriptSegment {
  text: string;
  startSeconds: number;
  durationSeconds: number;
}

let _yt: Innertube | null = null;
let _ytCreatedAt = 0;
const YT_SESSION_TTL = 10 * 60 * 1000; // 10 minutes

// Circuit breakers: if YouTube is rate limiting, skip for all subsequent videos
let _captionXmlBlocked = false;
let _captionXmlBlockedAt = 0;
let _ytTranscriptBlocked = false;
let _ytTranscriptBlockedAt = 0;
const BLOCK_TTL = 5 * 60 * 1000; // retry after 5 minutes

async function getYt(): Promise<Innertube> {
  if (!_yt || Date.now() - _ytCreatedAt > YT_SESSION_TTL) {
    _yt = await Innertube.create({ generate_session_locally: true });
    _ytCreatedAt = Date.now();
  }
  return _yt;
}

function resetYt() {
  _yt = null;
  _ytCreatedAt = 0;
}

export interface ParsedInput {
  type: YouTubeInputType;
  id: string;
  originalUrl: string;
}

export function parseYouTubeInput(input: string): ParsedInput {
  const trimmed = input.trim();

  try {
    const url = new URL(
      trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
    );
    const hostname = url.hostname.replace("www.", "");

    if (hostname === "youtu.be") {
      const videoId = url.pathname.slice(1);
      return { type: "video", id: videoId, originalUrl: trimmed };
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      const listId = url.searchParams.get("list");
      if (
        url.pathname === "/playlist" ||
        (listId && !url.searchParams.get("v"))
      ) {
        return { type: "playlist", id: listId || "", originalUrl: trimmed };
      }

      const videoId = url.searchParams.get("v");
      if (videoId) {
        return { type: "video", id: videoId, originalUrl: trimmed };
      }

      if (url.pathname.startsWith("/@")) {
        return { type: "channel", id: url.pathname.slice(1), originalUrl: trimmed };
      }

      if (url.pathname.startsWith("/channel/")) {
        return { type: "channel", id: url.pathname.split("/")[2], originalUrl: trimmed };
      }

      if (url.pathname.startsWith("/c/")) {
        return { type: "channel", id: url.pathname.split("/")[2], originalUrl: trimmed };
      }
    }
  } catch {
    // Not a valid URL — treat as search
  }

  return { type: "search", id: trimmed, originalUrl: trimmed };
}

// Keep CaptionMeta export for batch route compatibility (no longer used for prefetch)
export interface CaptionMeta {
  videoId: string;
  title: string;
  captionUrl: string | null;
}

/**
 * Fetch transcript for a YouTube video.
 *
 * Strategy:
 * 1. youtube-transcript package (single InnerTube call)
 * 2. youtubei.js getBasicInfo + caption XML fetch (with 429 retry/backoff)
 * 3. Whisper audio transcription (requires OPENAI_API_KEY)
 */
export async function fetchTranscript(
  videoId: string
): Promise<{ text: string; title: string; segments: TranscriptSegment[] }> {
  // Get title via oEmbed (fast, reliable, never rate-limited)
  let title = await fetchTitle(videoId);

  // Tier 1: youtube-transcript package (skip if circuit breaker tripped)
  if (!_ytTranscriptBlocked || Date.now() - _ytTranscriptBlockedAt > BLOCK_TTL) {
    try {
      const entries = await YoutubeTranscript.fetchTranscript(videoId, { lang: "en" });
      if (entries.length > 0) {
        _ytTranscriptBlocked = false; // clear on success
        const segments: TranscriptSegment[] = entries.map((e) => ({
          text: e.text,
          startSeconds: e.offset / 1000,
          durationSeconds: e.duration / 1000,
        }));
        const text = entries.map((e) => e.text).join(" ").replace(/\n/g, " ").trim();
        if (text) return { text, title, segments };
      }
    } catch {
      _ytTranscriptBlocked = true;
      _ytTranscriptBlockedAt = Date.now();
    }
  }

  // Tier 2: youtubei.js getBasicInfo + caption XML (with robust 429 handling)
  try {
    const yt = await getYt();
    const info = await yt.getBasicInfo(videoId);
    if (info.basic_info.title) title = info.basic_info.title;
    const tracks = info.captions?.caption_tracks || [];

    if (tracks.length > 0) {
      const track =
        tracks.find((t) => t.language_code === "en" && !String(t.name?.text || "").includes("auto")) ||
        tracks.find((t) => t.language_code === "en") ||
        tracks[0];

      const xml = await fetchCaptionXml(track.base_url);
      return parseXmlCaptions(xml, title);
    }
  } catch (err) {
    console.error(`[transcript] youtubei.js FAILED ${videoId}:`, err instanceof Error ? err.message : err);
    resetYt();
  }

  // Tier 3: Whisper audio transcription
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("No captions available and OPENAI_API_KEY not set for audio transcription");
  }
  const { transcribeFromAudio } = await import("./transcribe");
  return transcribeFromAudio(videoId);
}

async function fetchTitle(videoId: string): Promise<string> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://youtube.com/watch?v=${videoId}&format=json`
    );
    if (res.ok) {
      const data = await res.json();
      return data.title || `Video ${videoId}`;
    }
  } catch {
    // oEmbed failed, use fallback
  }
  return `Video ${videoId}`;
}

async function fetchCaptionXml(captionUrl: string): Promise<string> {
  // Circuit breaker: if we already know YouTube is blocking, fail immediately
  if (_captionXmlBlocked && Date.now() - _captionXmlBlockedAt < BLOCK_TTL) {
    throw new Error("YouTube rate limited — skipping (will retry in a few minutes)");
  }

  const res = await fetch(captionUrl);

  if (res.ok) {
    // Clear circuit breaker on success
    _captionXmlBlocked = false;
    return await res.text();
  }

  if (res.status === 429) {
    // Trip the circuit breaker — don't waste time retrying for other videos
    _captionXmlBlocked = true;
    _captionXmlBlockedAt = Date.now();
    throw new Error("YouTube rate limited — try again in a few minutes");
  }

  throw new Error(`Caption fetch failed: HTTP ${res.status}`);
}

function parseXmlCaptions(
  xml: string,
  title: string
): { text: string; title: string; segments: TranscriptSegment[] } {
  const segments: TranscriptSegment[] = [];
  const textParts: string[] = [];
  const regex = /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const startSeconds = parseFloat(match[1]) || 0;
    const durationSeconds = parseFloat(match[2]) || 0;
    let t = match[3];
    t = t
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"');
    segments.push({ text: t, startSeconds, durationSeconds });
    textParts.push(t);
  }

  const text = textParts.join(" ").replace(/\n/g, " ").trim();

  if (!text) {
    throw new Error("Transcript is empty — captions may be disabled for this video");
  }

  return { text, title, segments };
}

export async function getPlaylistVideos(
  playlistId: string
): Promise<YouTubeVideo[]> {
  const yt = await getYt();
  const playlist = await yt.getPlaylist(playlistId);
  const videos: YouTubeVideo[] = [];

  if (playlist.items) {
    for (const item of playlist.items) {
      if (item.type === "PlaylistVideo") {
        const v = item as {
          id: string;
          title: { text?: string };
          thumbnails?: { url: string }[];
          duration?: { text?: string };
        };
        videos.push({
          videoId: v.id,
          title: v.title?.text || `Video ${v.id}`,
          thumbnail: v.thumbnails?.[0]?.url || "",
          duration: v.duration?.text || "",
        });
      }
    }
  }

  return videos;
}

export async function getChannelVideos(
  handleOrId: string
): Promise<{ channelName: string; videos: YouTubeVideo[] }> {
  const yt = await getYt();
  const channel = await yt.getChannel(handleOrId);
  const channelName =
    channel.metadata?.title || channel.metadata?.external_id || handleOrId;

  const videosTab = await channel.getVideos();
  const videos: YouTubeVideo[] = [];

  if (videosTab.videos) {
    for (const item of videosTab.videos) {
      if (item.type === "Video") {
        const v = item as {
          id: string;
          title: { text?: string };
          thumbnails?: { url: string }[];
          duration?: { text?: string };
        };
        videos.push({
          videoId: v.id,
          title: v.title?.text || `Video ${v.id}`,
          thumbnail: v.thumbnails?.[0]?.url || "",
          duration: v.duration?.text || "",
        });
      }
    }
  }

  return { channelName, videos };
}

export async function searchVideos(
  query: string
): Promise<YouTubeVideo[]> {
  const yt = await getYt();

  const courseQuery = `${query} full course`;
  const [courseResults, generalResults] = await Promise.all([
    yt.search(courseQuery, { type: "video", sort_by: "relevance" }),
    yt.search(query, { type: "video", sort_by: "relevance" }),
  ]);

  const seen = new Set<string>();
  const videos: YouTubeVideo[] = [];

  const extract = (results: typeof courseResults) => {
    if (!results.results) return;
    for (const item of results.results) {
      if (item.type !== "Video") continue;
      const v = item as unknown as {
        id: string;
        title: { text?: string };
        thumbnails?: { url: string }[];
        duration?: { text?: string };
      };
      if (!v.id || seen.has(v.id)) continue;
      seen.add(v.id);
      videos.push({
        videoId: v.id,
        title: v.title?.text || `Video ${v.id}`,
        thumbnail: v.thumbnails?.[0]?.url || "",
        duration: v.duration?.text || "",
      });
    }
  };

  extract(courseResults);
  extract(generalResults);

  videos.sort((a, b) => {
    const parseDuration = (d: string) => {
      const parts = d.split(":").map(Number);
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      return 0;
    };
    return parseDuration(b.duration) - parseDuration(a.duration);
  });

  return videos.slice(0, 20);
}

export async function searchChannels(
  query: string
): Promise<{ channelName: string; videos: YouTubeVideo[] }> {
  const yt = await getYt();

  const results = await yt.search(query, { type: "channel" });
  const firstChannel = results.results?.find(
    (r) => r.type === "Channel"
  ) as { id: string; author?: { name?: string } } | undefined;

  if (!firstChannel?.id) {
    throw new Error(`No channel found for "${query}"`);
  }

  return getChannelVideos(firstChannel.id);
}
