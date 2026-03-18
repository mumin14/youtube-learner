import { z } from "zod";

/** Action item PATCH — toggle completion */
export const actionItemPatchSchema = z.object({
  id: z.number().int().positive(),
  completed: z.boolean(),
});

/** Folder creation */
export const folderCreateSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

/** Folder update */
export const folderUpdateSchema = z.object({
  name: z.string().min(1).max(200).transform((s) => s.trim()).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  spec_text: z.string().max(10000).nullable().optional(),
  spec_filename: z.string().max(500).nullable().optional(),
  study_level: z.enum(["undergraduate", "masters", "phd", "adult_learning", "employment_learning", "other"]).nullable().optional(),
  study_level_details: z.string().max(500).nullable().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined),
  { message: "At least one field must be provided" }
);

/** Conversation creation */
export const conversationCreateSchema = z.object({
  title: z.string().max(500).optional(),
  fileId: z.number().int().positive().optional(),
});

/** Ask AI messages */
export const askAiSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(50000),
      })
    )
    .min(1)
    .max(100),
  fileId: z.number().int().positive().optional(),
  folderId: z.number().int().positive().optional(),
  attachmentText: z.string().max(100000).optional(),
});

/** Notes submission */
export const noteCreateSchema = z.object({
  actionItemId: z.number().int().positive(),
  content: z.string().min(1).max(50000).transform((s) => s.trim()),
});

/** YouTube ingest */
export const youtubeIngestSchema = z.object({
  url: z.string().url().max(2000),
  folderId: z.number().int().positive().optional(),
});

/** Helper to validate and return parsed data or error response */
export function validateBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return {
      success: false,
      error: `${firstError.path.join(".")}: ${firstError.message}`,
    };
  }
  return { success: true, data: result.data };
}
