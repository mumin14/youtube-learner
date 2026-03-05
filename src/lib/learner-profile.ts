import { getDb } from "./db";

/**
 * Loads and combines the user's manual profile and LLM-imported profile
 * into a single string for injection into AI prompts.
 */
export function getLearnerContext(userId: number): string {
  const db = getDb();
  const row = db
    .prepare("SELECT profile_text, llm_profile_text FROM learner_profiles WHERE user_id = ?")
    .get(userId) as { profile_text: string; llm_profile_text: string } | undefined;

  if (!row) return "";

  const manual = row.profile_text?.trim() || "";
  const llm = row.llm_profile_text?.trim() || "";

  if (!manual && !llm) return "";

  const parts: string[] = [];
  if (manual) {
    parts.push(`[Self-described profile]\n${manual}`);
  }
  if (llm) {
    parts.push(`[LLM-assessed learning preferences]\n${llm}`);
  }
  return parts.join("\n\n");
}
