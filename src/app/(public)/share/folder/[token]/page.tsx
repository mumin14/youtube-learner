"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

const DIFFICULTY_CONFIG = {
  easy: {
    color: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50 dark:bg-emerald-950",
    text: "text-emerald-700 dark:text-emerald-300",
    label: "Foundations",
  },
  medium: {
    color: "from-amber-500 to-orange-500",
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
    label: "Solidification",
  },
  hard: {
    color: "from-red-500 to-rose-500",
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-700 dark:text-red-300",
    label: "Mastery",
  },
} as const;

interface SharedNote {
  id: number;
  content: string;
  created_at: string;
  actionItem: {
    title: string;
    difficulty: "easy" | "medium" | "hard";
    topic: string | null;
  };
  assessment: {
    score: number;
    grade: string;
    strengths: string[];
    improvements: string[];
  } | null;
  filename: string;
}

interface SharedFolderData {
  folder: { name: string; color: string };
  notes: SharedNote[];
}

export default function SharedFolderPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedFolderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/folder/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("This shared folder was not found or has been removed."));
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-lg font-medium">{error}</p>
          <a href="/" className="text-primary hover:underline text-sm">
            Go to Socraty AI
          </a>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  // Group notes by difficulty
  const grouped: Record<string, SharedNote[]> = {};
  for (const diff of ["easy", "medium", "hard"] as const) {
    const items = data.notes.filter((n) => n.actionItem.difficulty === diff);
    if (items.length > 0) grouped[diff] = items;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      {/* CTA Banner */}
      <div className="bg-primary/10 border-b border-primary/20">
        <div className="container mx-auto max-w-3xl px-6 py-3 flex items-center justify-between">
          <p className="text-sm text-foreground">
            <span className="font-medium">This learner used Socraty to turn videos into proof of understanding.</span>
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Get Socraty AI
          </a>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-6 py-12">
        <div className="mb-8 space-y-2">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Socraty AI
          </a>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: data.folder.color + "20" }}
            >
              <svg className="w-4 h-4" style={{ color: data.folder.color }} fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{data.folder.name}</h1>
              <p className="text-sm text-muted-foreground">
                {data.notes.length} study {data.notes.length === 1 ? "note" : "notes"} &middot; Shared folder
              </p>
            </div>
          </div>
        </div>

        {data.notes.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">No study notes in this folder yet.</p>
        ) : (
          <div className="space-y-6">
            {(["easy", "medium", "hard"] as const).map((diff) => {
              const notes = grouped[diff];
              if (!notes) return null;
              const cfg = DIFFICULTY_CONFIG[diff];
              return (
                <div key={diff} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${cfg.color}`} />
                    <h2 className={`text-sm font-semibold ${cfg.text}`}>
                      {cfg.label} ({notes.length})
                    </h2>
                  </div>
                  <div className="grid gap-3">
                    {notes.map((note) => (
                      <Card key={note.id} className="overflow-hidden border-border/50">
                        <CardContent className="p-0">
                          <div className="flex">
                            <div className={`w-1 shrink-0 bg-gradient-to-b ${cfg.color}`} />
                            <div className="flex-1 p-4 space-y-3">
                              <div>
                                <h4 className="text-sm font-semibold leading-snug">{note.actionItem.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {note.actionItem.topic && (
                                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                      {note.actionItem.topic}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-muted-foreground">{note.filename}</span>
                                </div>
                              </div>

                              <div className="bg-muted/50 rounded-lg p-3">
                                <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                              </div>

                              {note.assessment && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
                                      {note.assessment.grade}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {note.assessment.score}/100
                                    </span>
                                  </div>
                                  {note.assessment.strengths.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">Strengths</p>
                                      <ul className="space-y-0.5">
                                        {note.assessment.strengths.map((s, i) => (
                                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                            <span className="text-emerald-500 mt-0.5 shrink-0">+</span>
                                            {s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {note.assessment.improvements.length > 0 && (
                                    <div>
                                      <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1">Areas to Improve</p>
                                      <ul className="space-y-0.5">
                                        {note.assessment.improvements.map((s, i) => (
                                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                            <span className="text-amber-500 mt-0.5 shrink-0">-</span>
                                            {s}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}

                              <p className="text-[10px] text-muted-foreground/60">
                                {new Date(note.created_at).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-12 rounded-xl bg-primary/5 border border-primary/20 p-6 text-center space-y-3">
          <h3 className="text-lg font-semibold">One tab. Watch anything. Get a study plan. Write to learn. Prove you know it.</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Stop switching between YouTube, ChatGPT, and scattered notes. Socraty turns any video or article into a structured study plan with AI grading.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            Try Socraty — it&apos;s free
          </a>
        </div>
      </div>
    </div>
  );
}
