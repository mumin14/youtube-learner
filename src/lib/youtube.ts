import { Innertube } from "youtubei.js";
import type { YouTubeVideo, YouTubeInputType } from "@/types";

export interface TranscriptSegment {
  text: string;
  startSeconds: number;
  durationSeconds: number;
}

let _yt: Innertube | null = null;
let _ytCreatedAt = 0;
const YT_SESSION_TTL = 10 * 60 * 1000; // 10 minutes — refresh before sessions go stale

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
  id: string; // videoId, playlistId, channelHandle, or search query
  originalUrl: string;
}

export function parseYouTubeInput(input: string): ParsedInput {
  const trimmed = input.trim();

  // Try parsing as URL
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
      // Playlist
      const listId = url.searchParams.get("list");
      if (
        url.pathname === "/playlist" ||
        (listId && !url.searchParams.get("v"))
      ) {
        return {
          type: "playlist",
          id: listId || "",
          originalUrl: trimmed,
        };
      }

      // Video (may also have list param, but v= takes priority for single video)
      const videoId = url.searchParams.get("v");
      if (videoId) {
        return { type: "video", id: videoId, originalUrl: trimmed };
      }

      // Channel handle: /@handle
      if (url.pathname.startsWith("/@")) {
        return {
          type: "channel",
          id: url.pathname.slice(1), // keep the @ prefix
          originalUrl: trimmed,
        };
      }

      // Channel: /channel/UC...
      if (url.pathname.startsWith("/channel/")) {
        return {
          type: "channel",
          id: url.pathname.split("/")[2],
          originalUrl: trimmed,
        };
      }

      // /c/ChannelName
      if (url.pathname.startsWith("/c/")) {
        return {
          type: "channel",
          id: url.pathname.split("/")[2],
          originalUrl: trimmed,
        };
      }
    }
  } catch {
    // Not a valid URL — treat as search
  }

  // Plain text: treat as channel/search
  return { type: "search", id: trimmed, originalUrl: trimmed };
}

export async function fetchTranscript(
  videoId: string
): Promise<{ text: string; title: string; segments: TranscriptSegment[] }> {
  let title = `Video ${videoId}`;
  let captionUrl: string | null = null;

  // Try youtubei.js first
  try {
    console.log(`[transcript] Tier 1: youtubei.js getInfo for ${videoId}...`);
    const yt = await getYt();
    const info = await yt.getInfo(videoId);
    title = info.basic_info.title || title;
    console.log(`[transcript] Got video info: "${title}"`);

    const tracks = info.captions?.caption_tracks || [];
    console.log(`[transcript] Found ${tracks.length} caption tracks`);
    if (tracks.length > 0) {
      const track =
        tracks.find(
          (t) =>
            t.language_code === "en" &&
            !String(t.name?.text || "").includes("auto")
        ) ||
        tracks.find((t) => t.language_code === "en") ||
        tracks[0];
      captionUrl = track.base_url;
      console.log(`[transcript] Using caption track: lang=${track.language_code}`);
    } else {
      console.log(`[transcript] No caption tracks found via youtubei.js`);
    }
  } catch (err) {
    console.error(`[transcript] Tier 1 FAILED for ${videoId}:`, err instanceof Error ? err.stack : err);
    // Reset cached instance in case session is stale
    resetYt();
  }

  // Fallback: scrape caption URL from the YouTube watch page
  if (!captionUrl) {
    console.log(`[transcript] Tier 2: scraping YouTube watch page for ${videoId}...`);
    try {
      const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      console.log(`[transcript] Page fetch status: ${pageRes.status}`);
      const html = await pageRes.text();
      console.log(`[transcript] Page HTML length: ${html.length} chars`);

      // Extract title from page
      const titleMatch = html.match(/"title":"((?:[^"\\]|\\.)*)"/);
      if (titleMatch && title === `Video ${videoId}`) {
        title = JSON.parse(`"${titleMatch[1]}"`);
        console.log(`[transcript] Extracted title from page: "${title}"`);
      }

      // Extract captionTracks from playerResponse JSON
      const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
      if (captionMatch) {
        const captionTracks = JSON.parse(captionMatch[1]) as Array<{
          baseUrl: string;
          languageCode: string;
          kind?: string;
        }>;
        console.log(`[transcript] Found ${captionTracks.length} caption tracks from page scrape`);

        if (captionTracks.length > 0) {
          const picked =
            captionTracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ||
            captionTracks.find((t) => t.languageCode === "en") ||
            captionTracks[0];
          captionUrl = picked.baseUrl;
          console.log(`[transcript] Using scraped caption track: lang=${picked.languageCode}`);
        }
      } else {
        console.log(`[transcript] No captionTracks found in page HTML`);
        // Check if we got a bot-detection page or login wall
        if (html.includes("consent.youtube.com") || html.includes("CONSENT")) {
          console.log(`[transcript] YouTube is showing a consent/cookie wall`);
        }
        if (html.includes("Sign in")) {
          console.log(`[transcript] YouTube may be requiring sign-in`);
        }
      }
    } catch (err) {
      console.error(`[transcript] Tier 2 FAILED for ${videoId}:`, err instanceof Error ? err.stack : err);
    }
  }

  // Final fallback: download audio and transcribe via Whisper
  if (!captionUrl) {
    console.log(`[transcript] Tier 3: audio transcription via Whisper for ${videoId}...`);
    if (!process.env.OPENAI_API_KEY) {
      console.error(`[transcript] OPENAI_API_KEY not set, cannot use Whisper fallback`);
      throw new Error("No captions available and OPENAI_API_KEY not set for audio transcription");
    }
    console.log(`[transcript] OPENAI_API_KEY is set (${process.env.OPENAI_API_KEY.slice(0, 10)}...), importing transcribe module...`);
    const { transcribeFromAudio } = await import("./transcribe");
    console.log(`[transcript] Calling transcribeFromAudio...`);
    return transcribeFromAudio(videoId);
  }

  // Fetch subtitle XML from the caption URL
  console.log(`[transcript] Fetching caption XML from URL...`);
  const res = await fetch(captionUrl);
  console.log(`[transcript] Caption XML fetch status: ${res.status}`);
  const xml = await res.text();
  console.log(`[transcript] Caption XML length: ${xml.length} chars`);

  // Parse <text start="12.5" dur="3.2">content</text> elements with timestamps
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

export async function searchChannels(
  query: string
): Promise<{ channelName: string; videos: YouTubeVideo[] }> {
  const yt = await getYt();

  // Search for channel
  const results = await yt.search(query, { type: "channel" });
  const firstChannel = results.results?.find(
    (r) => r.type === "Channel"
  ) as { id: string; author?: { name?: string } } | undefined;

  if (!firstChannel?.id) {
    throw new Error(`No channel found for "${query}"`);
  }

  return getChannelVideos(firstChannel.id);
}
