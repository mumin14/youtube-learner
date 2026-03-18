import { NextRequest } from "next/server";
import { Innertube, Platform } from "youtubei.js";
import { requireAuth } from "@/lib/auth";

// Provide a JS evaluator so youtubei.js can decipher stream URLs
Platform.shim.eval = (data: { output: string }, env: Record<string, string>) => {
  const properties: string[] = [];
  if (env.n) properties.push(`n: exportedVars.nFunction("${env.n}")`);
  if (env.sig) properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
  const code = `${data.output}\nreturn { ${properties.join(", ")} }`;
  return new Function(code)();
};

let _streamYt: Innertube | null = null;

async function getStreamYt(): Promise<Innertube> {
  if (!_streamYt) {
    _streamYt = await Innertube.create({ generate_session_locally: true });
  }
  return _streamYt;
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const videoId = req.nextUrl.searchParams.get("v");
  if (!videoId) {
    return new Response("Missing video ID", { status: 400 });
  }

  try {
    const yt = await getStreamYt();
    const info = await yt.getBasicInfo(videoId);

    // Prefer a combined audio+video format (itag 18 = 360p mp4)
    const formats = info.streaming_data?.formats || [];
    const format = formats[0];

    if (!format) {
      return new Response("No suitable format found", { status: 404 });
    }

    const streamUrl = await format.decipher(yt.session.player);

    if (!streamUrl) {
      return new Response("Failed to decipher stream URL", { status: 500 });
    }

    // Proxy the range request to YouTube
    const rangeHeader = req.headers.get("range");
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const ytRes = await fetch(streamUrl, { headers });

    const responseHeaders = new Headers();
    responseHeaders.set(
      "Content-Type",
      format.mime_type?.split(";")[0] || "video/mp4"
    );
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "private, max-age=3600");

    const contentLength = ytRes.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    const contentRange = ytRes.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    return new Response(ytRes.body, {
      status: ytRes.status,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[stream] Failed to stream ${videoId}:`, err);
    _streamYt = null; // Reset on failure
    return new Response("Failed to stream video", { status: 500 });
  }
}
