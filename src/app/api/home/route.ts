import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { callClaude } from "@/lib/claude";
import { RECOMMENDATION_PROMPT } from "@/lib/prompts";
import { searchVideos } from "@/lib/youtube";
import Exa from "exa-js";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

interface WeakTopic {
  topic: string;
  avgScore: number;
  improvements: string[];
}

interface RecommendationQuery {
  query: string;
  source: "youtube" | "journal";
  reason: string;
  targetTopic: string;
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Today's scheduled items
  const todayItems = await db.all(
    `SELECT ai.*, f.original_name as filename, f.source_type, f.video_id, f.youtube_url,
        c.start_seconds as chunk_start_seconds, c.end_seconds as chunk_end_seconds
     FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     LEFT JOIN chunks c ON c.id = ai.chunk_id
     WHERE ai.scheduled_date = ?
     ORDER BY ai.scheduled_time,
       CASE ai.difficulty WHEN 'easy' THEN 1 WHEN 'medium' THEN 2 WHEN 'hard' THEN 3 END`,
    user.id, today
  );

  // Missed items — scheduled before today, not completed, last 14 days
  const missedItems = await db.all(
    `SELECT ai.*, f.original_name as filename, f.source_type, f.video_id, f.youtube_url
     FROM action_items ai
     JOIN files f ON f.id = ai.file_id AND f.user_id = ?
     WHERE ai.scheduled_date BETWEEN ? AND ?
       AND ai.completed = 0
     ORDER BY ai.scheduled_date DESC
     LIMIT 10`,
    user.id, fourteenDaysAgo, yesterday
  );

  // Learner summary stats
  const totalNotes = (
    await db.get(`SELECT COUNT(*) as cnt FROM learning_notes WHERE user_id = ?`, user.id) as { cnt: number }
  ).cnt;

  const avgScoreRow = await db.get(
    `SELECT AVG(a.score) as avg_score
     FROM assessments a
     JOIN learning_notes ln ON ln.id = a.note_id
     WHERE ln.user_id = ?`,
    user.id
  ) as { avg_score: number | null };

  // Weak topics — from assessments where avg score is below 87 (B+)
  const weakTopics: WeakTopic[] = [];
  const topicScores = await db.all(
    `SELECT ai_item.topic, AVG(a.score) as avg_score, STRING_AGG(a.improvements, '|||') as all_improvements
     FROM assessments a
     JOIN learning_notes ln ON ln.id = a.note_id
     JOIN action_items ai_item ON ai_item.id = a.action_item_id
     WHERE ln.user_id = ? AND ai_item.topic IS NOT NULL
     GROUP BY ai_item.topic
     HAVING AVG(a.score) < 87`,
    user.id
  ) as { topic: string; avg_score: number; all_improvements: string | null }[];

  for (const row of topicScores) {
    const improvements: string[] = [];
    if (row.all_improvements) {
      for (const chunk of row.all_improvements.split("|||")) {
        try {
          const parsed = JSON.parse(chunk);
          if (Array.isArray(parsed)) improvements.push(...parsed);
        } catch {
          if (chunk.trim()) improvements.push(chunk.trim());
        }
      }
    }
    weakTopics.push({
      topic: row.topic,
      avgScore: Math.round(row.avg_score),
      improvements: [...new Set(improvements)].slice(0, 5),
    });
  }

  // Existing topics the user already has action items for
  const existingTopics = (
    await db.all(
      `SELECT DISTINCT ai.topic FROM action_items ai
       JOIN files f ON f.id = ai.file_id AND f.user_id = ?
       WHERE ai.topic IS NOT NULL`,
      user.id
    ) as { topic: string }[]
  ).map((r) => r.topic);

  // Check for cached recommendations (< 24h old)
  const oneDayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
  const cachedRecs = await db.all(
    `SELECT * FROM recommendations WHERE user_id = ? AND created_at > ? ORDER BY created_at DESC`,
    user.id, oneDayAgo
  ) as {
    id: number;
    title: string;
    description: string;
    url: string;
    source_type: string;
    topic: string | null;
    thumbnail_url: string | null;
    created_at: string;
  }[];

  let recommendations = cachedRecs;

  // Generate fresh recommendations if none cached and user has weak areas
  if (cachedRecs.length === 0 && weakTopics.length > 0) {
    try {
      recommendations = await generateRecommendations(db, user.id, weakTopics, existingTopics);
    } catch (err) {
      console.error("[home] Recommendation generation failed:", err);
      recommendations = [];
    }
  }

  // Learner profile for greeting
  const profile = await db.get(
    `SELECT profile_text, llm_profile_text FROM learner_profiles WHERE user_id = ?`,
    user.id
  ) as { profile_text: string; llm_profile_text: string } | undefined;

  return NextResponse.json({
    today: todayItems,
    missed: missedItems,
    recommendations,
    learnerSummary: {
      totalNotes,
      avgScore: avgScoreRow.avg_score ? Math.round(avgScoreRow.avg_score) : null,
      weakTopics: weakTopics.map((t) => t.topic),
    },
    userName: user.name || null,
    hasLearnerProfile: !!(profile?.profile_text?.trim() || profile?.llm_profile_text?.trim()),
  });
}

async function generateRecommendations(
  db: ReturnType<typeof getDb>,
  userId: number,
  weakTopics: WeakTopic[],
  existingTopics: string[]
) {
  // Get learner profile
  const profile = await db.get(
    `SELECT profile_text, llm_profile_text FROM learner_profiles WHERE user_id = ?`,
    userId
  ) as { profile_text: string; llm_profile_text: string } | undefined;

  const learnerProfile = [profile?.profile_text, profile?.llm_profile_text].filter(Boolean).join("\n\n");

  // Get existing URLs to exclude
  const existingUrls = (
    await db.all(
      `SELECT youtube_url FROM files WHERE user_id = ? AND youtube_url IS NOT NULL`,
      userId
    ) as { youtube_url: string }[]
  ).map((r) => r.youtube_url);

  // Ask LLM for search queries based on real performance data
  const prompt = RECOMMENDATION_PROMPT({
    learnerProfile,
    weakTopics,
    existingTopics,
    existingUrls,
  });

  const raw = await callClaude(prompt, { maxTokens: 2048 });

  // Parse JSON response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const parsed = JSON.parse(jsonMatch[0]) as { queries: RecommendationQuery[] };
  if (!parsed.queries || parsed.queries.length === 0) return [];

  // Execute search queries and collect results
  const recommendations: {
    id: number;
    title: string;
    description: string;
    url: string;
    source_type: string;
    topic: string | null;
    thumbnail_url: string | null;
    created_at: string;
  }[] = [];

  const existingUrlSet = new Set(existingUrls);

  for (const q of parsed.queries.slice(0, 5)) {
    try {
      if (q.source === "youtube") {
        const videos = await searchVideos(q.query);
        const video = videos.find((v) => {
          const url = `https://www.youtube.com/watch?v=${v.videoId}`;
          return !existingUrlSet.has(url);
        });
        if (video) {
          const url = `https://www.youtube.com/watch?v=${video.videoId}`;
          existingUrlSet.add(url);
          const result = await db.run(
            `INSERT INTO recommendations (user_id, title, description, url, source_type, topic, thumbnail_url)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            userId, video.title, q.reason, url, "youtube", q.targetTopic, video.thumbnail
          );
          recommendations.push({
            id: Number(result.lastInsertRowid),
            title: video.title,
            description: q.reason,
            url,
            source_type: "youtube",
            topic: q.targetTopic,
            thumbnail_url: video.thumbnail,
            created_at: new Date().toISOString(),
          });
        }
      } else {
        // Journal search via Exa
        const apiKey = process.env.EXA_API_KEY;
        if (apiKey) {
          const exa = new Exa(apiKey);
          const result = await exa.search(
            `academic journal article research paper: ${q.query}`,
            {
              numResults: 3,
              includeDomains: [
                "scholar.google.com", "pubmed.ncbi.nlm.nih.gov", "arxiv.org",
                "researchgate.net", "sciencedirect.com", "springer.com",
                "nature.com", "ieee.org", "jstor.org",
              ],
            }
          );
          const article = result.results.find((r) => !existingUrlSet.has(r.url));
          if (article) {
            existingUrlSet.add(article.url);
            const dbResult = await db.run(
              `INSERT INTO recommendations (user_id, title, description, url, source_type, topic, thumbnail_url)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              userId, article.title || "Untitled Article", q.reason, article.url,
              "article", q.targetTopic, article.favicon || null
            );
            recommendations.push({
              id: Number(dbResult.lastInsertRowid),
              title: article.title || "Untitled Article",
              description: q.reason,
              url: article.url,
              source_type: "article",
              topic: q.targetTopic,
              thumbnail_url: article.favicon || null,
              created_at: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.error(`[home] Search failed for query "${q.query}":`, err);
    }
  }

  return recommendations;
}

// POST to force-refresh recommendations
export async function POST(req: NextRequest) {
  const user = await requireAuth(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = checkRateLimit(`${user.id}:home-refresh`, RATE_LIMITS.heavy);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before refreshing again." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
    );
  }

  const db = getDb();

  // Delete old recommendations for this user
  await db.run(`DELETE FROM recommendations WHERE user_id = ?`, user.id);

  // Recalculate weak topics
  const topicScores = await db.all(
    `SELECT ai_item.topic, AVG(a.score) as avg_score, STRING_AGG(a.improvements, '|||') as all_improvements
     FROM assessments a
     JOIN learning_notes ln ON ln.id = a.note_id
     JOIN action_items ai_item ON ai_item.id = a.action_item_id
     WHERE ln.user_id = ? AND ai_item.topic IS NOT NULL
     GROUP BY ai_item.topic
     HAVING AVG(a.score) < 87`,
    user.id
  ) as { topic: string; avg_score: number; all_improvements: string | null }[];

  const weakTopics: WeakTopic[] = topicScores.map((row) => {
    const improvements: string[] = [];
    if (row.all_improvements) {
      for (const chunk of row.all_improvements.split("|||")) {
        try {
          const parsed = JSON.parse(chunk);
          if (Array.isArray(parsed)) improvements.push(...parsed);
        } catch {
          if (chunk.trim()) improvements.push(chunk.trim());
        }
      }
    }
    return {
      topic: row.topic,
      avgScore: Math.round(row.avg_score),
      improvements: [...new Set(improvements)].slice(0, 5),
    };
  });

  if (weakTopics.length === 0) {
    return NextResponse.json({ recommendations: [] });
  }

  const existingTopics = (
    await db.all(
      `SELECT DISTINCT ai.topic FROM action_items ai
       JOIN files f ON f.id = ai.file_id AND f.user_id = ?
       WHERE ai.topic IS NOT NULL`,
      user.id
    ) as { topic: string }[]
  ).map((r) => r.topic);

  try {
    const recommendations = await generateRecommendations(db, user.id, weakTopics, existingTopics);
    return NextResponse.json({ recommendations });
  } catch (err) {
    console.error("[home] Recommendation refresh failed:", err);
    return NextResponse.json({ error: "Failed to generate recommendations" }, { status: 500 });
  }
}
