import { NextRequest } from "next/server";
import { retrieveRelevantChunks } from "@/lib/retriever";
import { ASK_AI_SYSTEM_PROMPT } from "@/lib/prompts";
import { getGroqClient, getStreamingModel } from "@/lib/claude";
import { requireAuth } from "@/lib/auth";
import { getLearnerContext, getFolderSpecContext } from "@/lib/learner-profile";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { askAiSchema, validateBody } from "@/lib/validations";

export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rl = checkRateLimit(`${user.id}:ask`, RATE_LIMITS.ai);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please slow down." }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const body = await req.json();
  const parsed = validateBody(askAiSchema, body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const { messages, fileId, folderId, attachmentText } = parsed.data;

  const latestUserMessage =
    messages.filter((m) => m.role === "user").pop()?.content ?? "";

  // Load combined learner profile (manual + LLM-imported)
  const learnerProfile = await getLearnerContext(user.id);

  // Load folder specification / marking criteria if chatting about a folder
  const folderSpec = folderId ? await getFolderSpecContext(folderId) : "";

  const chunks = await retrieveRelevantChunks(latestUserMessage, user.id, 6, 3000, fileId, folderId);

  const attachmentSection = attachmentText
    ? `\n\n--- ATTACHED DOCUMENT ---\n${attachmentText}\n--- END ATTACHED DOCUMENT ---`
    : "";

  if (chunks.length === 0 && !attachmentText) {
    const contextText =
      "No relevant content was found in the uploaded transcripts for this query.";
    return streamResponse(messages, ASK_AI_SYSTEM_PROMPT(contextText, learnerProfile, folderSpec));
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

  return streamResponse(messages, ASK_AI_SYSTEM_PROMPT(chunksText + attachmentSection, learnerProfile, folderSpec));
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
          model: getStreamingModel(),
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
