import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const profile = await db.get(
    "SELECT profile_text, llm_profile_text, updated_at, llm_updated_at FROM learner_profiles WHERE user_id = ?",
    user.id
  ) as { profile_text: string; llm_profile_text: string; updated_at: string; llm_updated_at: string | null } | undefined;

  return NextResponse.json({
    profileText: profile?.profile_text ?? "",
    llmProfileText: profile?.llm_profile_text ?? "",
    updatedAt: profile?.updated_at ?? null,
    llmUpdatedAt: profile?.llm_updated_at ?? null,
  });
}

export async function PUT(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { profileText?: string; llmProfileText?: string };

  const db = getDb();

  // Ensure a row exists
  await db.run(
    `INSERT INTO learner_profiles (user_id) VALUES (?) ON CONFLICT(user_id) DO NOTHING`,
    user.id
  );

  if (typeof body.profileText === "string") {
    await db.run(
      `UPDATE learner_profiles SET profile_text = ?, updated_at = NOW() WHERE user_id = ?`,
      body.profileText.trim(), user.id
    );
  }

  if (typeof body.llmProfileText === "string") {
    await db.run(
      `UPDATE learner_profiles SET llm_profile_text = ?, llm_updated_at = NOW() WHERE user_id = ?`,
      body.llmProfileText.trim(), user.id
    );
  }

  return NextResponse.json({ success: true });
}
