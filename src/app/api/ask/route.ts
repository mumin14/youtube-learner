import { NextRequest } from "next/server";
import { retrieveRelevantChunks } from "@/lib/retriever";
import { ASK_AI_SYSTEM_PROMPT } from "@/lib/prompts";
import { getClient } from "@/lib/claude";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { messages, fileId } = (await req.json()) as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    fileId?: number;
  };

  if (!messages?.length) {
    return new Response("No messages provided", { status: 400 });
  }

  const latestUserMessage =
    messages.filter((m) => m.role === "user").pop()?.content ?? "";

  const chunks = retrieveRelevantChunks(latestUserMessage, user.id, 15, 12000, fileId);

  if (chunks.length === 0) {
    const contextText =
      "No relevant content was found in the uploaded transcripts for this query.";
    return streamResponse(messages, ASK_AI_SYSTEM_PROMPT(contextText));
  }

  const contextText = chunks
    .map((c, i) => {
      const timeInfo = c.startSeconds != null
        ? ` [Timestamp: ${formatSeconds(c.startSeconds)}-${formatSeconds(c.endSeconds ?? c.startSeconds)}]`
        : "";
      const videoInfo = c.videoId ? ` (video_id:${c.videoId})` : "";
      return `[${i + 1}] (from "${c.filename}"${videoInfo}${timeInfo}):\n${c.content}`;
    })
    .join("\n\n---\n\n");

  return streamResponse(messages, ASK_AI_SYSTEM_PROMPT(contextText));
}

async function streamResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string
) {
  const client = getClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (error) {
        const msg =
          error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`\n\n[Error: ${msg}]`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

function formatSeconds(s: number): string {
  const mins = Math.floor(s / 60);
  const secs = Math.floor(s % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
