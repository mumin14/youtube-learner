export function EXTRACTION_PROMPT(chunkedContent: string, learnerProfile?: string, folderSpec?: string): string {
  const profileSection = learnerProfile?.trim()
    ? `\n\n<learner_profile>\nBefore generating action items, you MUST read and internalize the following learner profile. Every action item you produce must be shaped by this profile — match the learner's preferred style, depth, pacing, and format. Write descriptions the way this person learns best:\n\n${learnerProfile}\n</learner_profile>\n`
    : "";
  const specSection = folderSpec?.trim()
    ? `\n\n<folder_specification>\nThe following is the marking criteria / specification for this subject folder. You MUST tailor action items to this academic level and align learning objectives with these grading requirements. Reference specific criteria points where relevant. Difficulty labels (easy/medium/hard) should reflect what is expected at THIS level, not a generic beginner-to-expert scale.\n\n${folderSpec}\n</folder_specification>\n`
    : "";
  return `You are an expert learning coach analyzing YouTube video transcripts. Extract specific, actionable learning items from the following transcript chunks.${profileSection}${specSection}

For each learning item, categorize its difficulty:

<difficulty_definitions>
- **easy**: Foundational knowledge — the bare minimum concepts a learner needs to understand first. These are definitions, basic concepts, prerequisite knowledge, and fundamental building blocks. A beginner encountering this topic for the first time should start here.

- **medium**: Knowledge solidification — building on foundations by connecting concepts together, understanding relationships between ideas, applying knowledge to standard scenarios, and recognizing common patterns. A learner who understands the basics is ready for these.

- **hard**: Deep mastery — advanced understanding requiring nuanced application, edge cases, performance implications, architectural decisions, trade-offs, and expert-level insights. These items distinguish a practitioner from a true expert.
</difficulty_definitions>

<instructions>
1. Read each chunk carefully and identify distinct learning concepts
2. For each concept, create a specific, actionable learning item
3. The title should be concise (under 80 characters) and describe what to learn
4. The description should explain WHY this matters and HOW to learn it (2-3 sentences)
5. Include the source_context: a brief quote or paraphrase from the transcript that this item is based on
6. Assign a topic tag (e.g., "React Hooks", "CSS Layout", "JavaScript Async")
7. Each chunk may have start_seconds and end_seconds attributes indicating the video timestamp range. For each learning item, estimate a timestamp_seconds value (a number in seconds) that points to where in the video this concept is discussed. Pick a value within the chunk's time range. If no timestamps are available, use null.
8. Return ONLY valid JSON, no other text
</instructions>

<transcript_chunks>
${chunkedContent}
</transcript_chunks>

Respond with this exact JSON structure:
{
  "items": [
    {
      "chunk_id": <number - the id attribute from the chunk tag>,
      "difficulty": "easy" | "medium" | "hard",
      "title": "<concise learning action>",
      "description": "<why it matters and how to learn it>",
      "source_context": "<relevant quote from transcript>",
      "topic": "<topic category>",
      "timestamp_seconds": <number or null - estimated video timestamp in seconds>
    }
  ]
}`;
}

export function ASK_AI_SYSTEM_PROMPT(relevantChunks: string, learnerProfile?: string, folderSpec?: string): string {
  const profileSection = learnerProfile?.trim()
    ? `\n\nYou MUST personalize every response using this learner profile. Speak in a way that matches how they learn — use their preferred explanation style, depth, pacing, and format. Make them feel like you were built specifically for them:\n\n${learnerProfile}\n`
    : "";
  const specSection = folderSpec?.trim()
    ? `\n\n<marking_criteria>\nThis folder has the following specification / marking criteria:\n\n${folderSpec}\n\nRules for using this criteria:\n- When the user shares an essay or written work, proactively offer to evaluate it against these marking criteria. Provide an estimated grade, strengths, and specific improvements referencing the criteria.\n- If the user asks about action items, offer to generate new ones aligned with these marking criteria: "Would you like me to generate action items based on your marking criteria so your study feels more relevant to what your grading requires?"\n- Reference specific criteria points when giving feedback or suggestions.\n</marking_criteria>\n`
    : "";
  return `You are a personal learning assistant.${profileSection}${specSection}Answer based on this context from the user's uploaded content:

<context>
${relevantChunks}
</context>

Rules:
- Answer from context. If insufficient, say so.
- For video timestamps, use: **[Watch at MM:SS](video_id:abc123,t:154)**
- Use markdown formatting: **bold** for key terms, ## for section headers, - for bullet points, numbered lists for steps. Keep it clean and scannable.
- Be clear, use examples, suggest next steps.`;
}

export function SCHEDULE_PROMPT(
  items: { id: number; difficulty: string; title: string; topic: string | null }[],
  existingLoad: { date: string; count: number }[],
  todayStr: string,
  learnerProfile?: string,
  calendarSettings?: {
    timezone: string;
    items_per_day: number;
    availability: Record<string, { enabled: boolean; start: string; end: string }>;
  }
): string {
  const profileSection = learnerProfile?.trim()
    ? `\n<learner_profile>\n${learnerProfile}\n</learner_profile>\n`
    : "";

  const loadSection = existingLoad.length > 0
    ? `\nDays that already have scheduled items (do not exceed daily limits when adding more):\n${JSON.stringify(existingLoad)}\n`
    : "\nNo existing scheduled items.";

  const maxPerDay = calendarSettings?.items_per_day ?? 6;

  // Build availability description
  let availabilitySection = "";
  if (calendarSettings?.availability) {
    const lines = Object.entries(calendarSettings.availability).map(
      ([day, config]) =>
        config.enabled
          ? `  ${day}: ${config.start}–${config.end}`
          : `  ${day}: OFF (do not schedule)`
    );
    availabilitySection = `\n<study_schedule>\nTimezone: ${calendarSettings.timezone}\n${lines.join("\n")}\n</study_schedule>\n`;
  }

  return `You are a learning schedule optimizer. Distribute the following unscheduled learning items across the next 30 days starting from ${todayStr}.
${profileSection}${availabilitySection}
<scheduling_rules>
1. ADAPTIVE DAILY LIMITS: Maximum ${maxPerDay} total items per day. Within that limit, assign adaptively by difficulty:
   - Easy items: up to 4 per day (quick reviews, flashcards, simple tasks)
   - Medium items: up to 3 per day (moderate depth, practice exercises)
   - Hard/mastery items: up to 2 per day (deep study, complex topics)
   Fill each day with a healthy mix. A typical day could have 3 easy + 2 medium + 1 hard = 6 items.
2. TIME ASSIGNMENT: For each item, assign a specific scheduled_time (HH:MM, 24h format) within that day's study hours. Space items at least 30 minutes apart. Schedule easy items first in the session, then medium, then hard.
3. TOPIC VARIETY: Max 2 items from the same topic on the same day. Interleave topics for better retention.
4. DIFFICULTY PROGRESSION: Within each topic, schedule easy items on earlier days than medium, and medium before hard.
5. EVEN DISTRIBUTION: Spread items across the full 30-day window. Do not front-load. Aim for consistent daily load.
6. AVAILABILITY: Only schedule items on days marked as available. Place items within the study hours for that day. If a day is OFF, do not schedule anything on it.
7. EXISTING LOAD: ${loadSection}
</scheduling_rules>

<items_to_schedule>
${JSON.stringify(items)}
</items_to_schedule>

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "assignments": [
    { "id": <item_id>, "scheduled_date": "YYYY-MM-DD", "scheduled_time": "HH:MM" }
  ]
}`;
}

export function RECOMMENDATION_PROMPT(context: {
  learnerProfile: string;
  weakTopics: { topic: string; avgScore: number; improvements: string[] }[];
  existingTopics: string[];
  existingUrls: string[];
}): string {
  const { learnerProfile, weakTopics, existingTopics, existingUrls } = context;

  const weakTopicsSection = weakTopics.length > 0
    ? weakTopics.map(t =>
        `- **${t.topic}**: avg score ${t.avgScore}/100\n  Grader feedback: ${t.improvements.length > 0 ? t.improvements.join("; ") : "No specific feedback"}`
      ).join("\n")
    : "No graded notes yet — cannot identify weak areas.";

  const existingTopicsSection = existingTopics.length > 0
    ? existingTopics.join(", ")
    : "None";

  return `You are a learning resource scout for a student. Based on their REAL performance data below, suggest search queries to find resources that address their documented weaknesses.

<learner_profile>
${learnerProfile || "No learner profile provided."}
</learner_profile>

<performance_data>
${weakTopicsSection}
</performance_data>

<existing_topics>
Topics they already have action items for (do NOT recommend beginner content on these):
${existingTopicsSection}
</existing_topics>

<rules>
1. ONLY recommend resources that directly address weaknesses shown in the performance data above. Do not guess or invent gaps.
2. If there are no weak topics (no graded notes), return an EMPTY queries array — do not fabricate recommendations.
3. Each recommendation reason MUST reference the actual score and specific grader feedback. Example: "You scored 58/100 on React Hooks — the grader noted you missed useEffect cleanup patterns."
4. Consider the learner's level/year from their profile when choosing query complexity. A 2nd-year CS student needs different resources than a senior engineer.
5. Never recommend content on topics where the student scores B+ (87) or above.
6. Mix YouTube and journal sources — YouTube for practical tutorials, journals for deeper conceptual understanding.
7. Return 3-5 search queries maximum.
</rules>

<urls_to_exclude>
${existingUrls.length > 0 ? existingUrls.join("\n") : "None"}
</urls_to_exclude>

Respond with ONLY valid JSON:
{
  "queries": [
    {
      "query": "<specific search string tailored to the gap>",
      "source": "youtube" | "journal",
      "reason": "<1 sentence referencing their actual score and grader feedback>",
      "targetTopic": "<which weak topic this addresses>"
    }
  ]
}`;
}
