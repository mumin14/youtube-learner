import OpenAI from "openai";

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

const MAX_RETRIES = 3;

export async function callClaude(
  prompt: string,
  options?: { maxTokens?: number; system?: string }
): Promise<string> {
  const messages: OpenAI.ChatCompletionMessageParam[] = [];
  if (options?.system) {
    messages.push({ role: "system", content: options.system });
  }
  messages.push({ role: "user", content: prompt });

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        max_tokens: options?.maxTokens ?? 4096,
        messages,
      });

      return response.choices[0]?.message?.content ?? "";
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 429 && attempt < MAX_RETRIES - 1) {
        const delay = (attempt + 1) * 5000;
        console.log(`[groq] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Max retries exceeded");
}

export function getGroqClient(): OpenAI {
  return groq;
}
