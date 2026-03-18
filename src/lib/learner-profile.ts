import { getDb } from "./db";

/**
 * Loads and combines the user's manual profile and LLM-imported profile
 * into a single string for injection into AI prompts.
 */
export async function getLearnerContext(userId: number): Promise<string> {
  const db = getDb();
  const row = await db.get(
    "SELECT profile_text, llm_profile_text FROM learner_profiles WHERE user_id = ?",
    userId
  ) as { profile_text: string; llm_profile_text: string } | undefined;

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

const STUDY_LEVEL_LABELS: Record<string, string> = {
  undergraduate: "Undergraduate",
  masters: "Masters",
  phd: "PhD",
  adult_learning: "Adult Learning",
  employment_learning: "Employment Learning",
  other: "Other",
};

/**
 * Loads the folder's specification / marking criteria context
 * for injection into AI prompts alongside the learner profile.
 */
export async function getFolderSpecContext(folderId: number): Promise<string> {
  const db = getDb();
  const row = await db.get(
    "SELECT spec_text, spec_filename, study_level, study_level_details FROM folders WHERE id = ?",
    folderId
  ) as {
    spec_text: string | null;
    spec_filename: string | null;
    study_level: string | null;
    study_level_details: string | null;
  } | undefined;

  if (!row) return "";

  const parts: string[] = [];

  if (row.study_level) {
    const label = STUDY_LEVEL_LABELS[row.study_level] || row.study_level;
    parts.push(`[Study Level]: ${label}`);
    if (row.study_level === "other" && row.study_level_details?.trim()) {
      parts.push(`[Study Context]: ${row.study_level_details.trim()}`);
    }
  }

  if (row.spec_text?.trim()) {
    const filename = row.spec_filename || "uploaded document";
    parts.push(`[Specification Document (${filename})]:\n${row.spec_text.trim()}`);
  }

  return parts.join("\n\n");
}
