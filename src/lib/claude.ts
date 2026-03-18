import OpenAI from "openai";

// Primary: Groq (fast, free tier)
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "",
  baseURL: "https://api.groq.com/openai/v1",
});

// Fallback: OpenRouter (free models, uses OpenAI-compatible API)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
});

// Free OpenRouter models ranked by quality (largest/best first)
const FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "google/gemma-3-27b-it:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
];

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

  const maxTokens = options?.maxTokens ?? 4096;

  // Try Groq first (primary)
  if (process.env.GROQ_API_KEY) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.1-8b-instant",
          max_tokens: maxTokens,
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
        // On final retry or non-429 error, fall through to OpenRouter
        console.warn(`[groq] Failed after ${attempt + 1} attempt(s):`, (err as Error).message ?? err);
        break;
      }
    }
  }

  // Fallback: try OpenRouter free models in order
  if (process.env.OPENROUTER_API_KEY) {
    for (const model of FALLBACK_MODELS) {
      try {
        console.log(`[openrouter] Trying fallback model: ${model}`);
        const response = await openrouter.chat.completions.create({
          model,
          max_tokens: maxTokens,
          messages,
        });
        return response.choices[0]?.message?.content ?? "";
      } catch (err: unknown) {
        console.warn(`[openrouter] ${model} failed:`, (err as Error).message ?? err);
        continue;
      }
    }
  }

  throw new Error("All LLM providers failed. Check GROQ_API_KEY and OPENROUTER_API_KEY.");
}

/**
 * Returns an OpenAI-compatible client for streaming responses.
 * Tries Groq first, falls back to OpenRouter.
 */
export function getGroqClient(): OpenAI {
  if (process.env.GROQ_API_KEY) return groq;
  if (process.env.OPENROUTER_API_KEY) return openrouter;
  return groq; // will fail with auth error, but callClaude handles gracefully
}

/**
 * Returns the best available model ID for streaming.
 * Used by routes that call getGroqClient() directly.
 */
export function getStreamingModel(): string {
  if (process.env.GROQ_API_KEY) return "llama-3.1-8b-instant";
  return FALLBACK_MODELS[0]; // best free OpenRouter model
}
