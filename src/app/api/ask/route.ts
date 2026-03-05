import { NextRequest } from "next/server";
import { retrieveRelevantChunks } from "@/lib/retriever";
import { ASK_AI_SYSTEM_PROMPT } from "@/lib/prompts";
import { getGroqClient } from "@/lib/claude";
import { requireAuth } from "@/lib/auth";
import { getLearnerContext } from "@/lib/learner-profile";

export async function POST(req: NextRequest) {
  const user = requireAuth(req);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { messages, fileId, attachmentText } = (await req.json()) as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    fileId?: number;
    attachmentText?: string;
  };

  if (!messages?.length) {
    return new Response("No messages provided", { status: 400 });
  }

  const latestUserMessage =
    messages.filter((m) => m.role === "user").pop()?.content ?? "";

  // Load combined learner profile (manual + LLM-imported)
  const learnerProfile = getLearnerContext(user.id);

  const chunks = retrieveRelevantChunks(latestUserMessage, user.id, 6, 3000, fileId);

  const attachmentSection = attachmentText
    ? `\n\n--- ATTACHED DOCUMENT ---\n${attachmentText}\n--- END ATTACHED DOCUMENT ---`
    : "";

  if (chunks.length === 0 && !attachmentText) {
    const contextText =
      "No relevant content was found in the uploaded transcripts for this query.";
    return streamResponse(messages, ASK_AI_SYSTEM_PROMPT(contextText, learnerProfile));
  }

  const chunksText = chunks.length > 0
    ? chunks
        .map((c, i) => {
          const timeInfo = c.startSeconds != null
            ? ` [Timestamp: ${formatSeconds(c.startSeconds)}-${formatSeconds(c.endSeconds ?? c.startSeconds)}]`
            : "";
          const videoInfo = c.videoId ? ` (video_id:${c.videoId})` : "";
          return `[${i + 1}] (from "${c.filename}"${videoInfo}${timeInfo}):\n${c.content}`;
        })
        .join("\n\n---\n\n")
    : "No transcript content found.";

  return streamResponse(messages, ASK_AI_SYSTEM_PROMPT(chunksText + attachmentSection, learnerProfile));
}

async function streamResponse(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  systemPrompt: string
) {
  const groq = getGroqClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          max_tokens: 4096,
          stream: true,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            })),
          ],
        });

        for await (const chunk of response) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) {
            controller.enqueue(encoder.encode(text));
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
