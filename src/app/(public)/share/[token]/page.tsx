"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { YouTubePlayer } from "@/components/youtube-player";

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

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface ShareItem {
  id: number;
  difficulty: "easy" | "medium" | "hard";
  title: string;
  description: string;
  source_context: string | null;
  topic: string | null;
  timestamp_seconds: number | null;
  completed: number;
  chunk_start_seconds: number | null;
  chunk_end_seconds: number | null;
}

interface ShareData {
  source: {
    name: string;
    source_type: string;
    video_id: string | null;
  };
  items: ShareItem[];
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<ShareData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchingItem, setWatchingItem] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then(setData)
      .catch(() => setError("This shared learning path was not found or has been removed."));
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

  const grouped: Record<string, ShareItem[]> = {};
  for (const diff of ["easy", "medium", "hard"] as const) {
    const items = data.items.filter((i) => i.difficulty === diff);
    if (items.length > 0) grouped[diff] = items;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
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
            {data.source.source_type === "youtube" && (
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{data.source.name}</h1>
              <p className="text-sm text-muted-foreground">
                {data.items.length} action items &middot; Shared learning path
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {(["easy", "medium", "hard"] as const).map((diff) => {
            const items = grouped[diff];
            if (!items) return null;
            const cfg = DIFFICULTY_CONFIG[diff];
            return (
              <div key={diff} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${cfg.color}`} />
                  <h2 className={`text-sm font-semibold ${cfg.text}`}>
                    {cfg.label} ({items.length})
                  </h2>
                </div>
                <div className="grid gap-2">
                  {items.map((item) => {
                    const isYoutube = !!data.source.video_id;
                    const isWatching = watchingItem === item.id;
                    const watchSeconds =
                      item.timestamp_seconds ?? item.chunk_start_seconds ?? 0;
                    const hasExactTime =
                      item.timestamp_seconds != null ||
                      item.chunk_start_seconds != null;
                    return (
                      <Card
                        key={item.id}
                        className={`overflow-hidden border-border/50 transition-all ${
                          isYoutube ? "cursor-pointer hover:border-red-300 hover:shadow-md" : ""
                        } ${isWatching ? "border-red-300 shadow-md" : ""}`}
                        onClick={() => {
                          if (isYoutube) setWatchingItem(isWatching ? null : item.id);
                        }}
                      >
                        <CardContent className="p-0">
                          <div className="flex">
                            <div className={`w-1 shrink-0 bg-gradient-to-b ${cfg.color}`} />
                            <div className={`flex-1 p-4 ${item.completed ? "opacity-60" : ""}`}>
                              <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1 min-w-0">
                                  <h4 className={`text-sm font-semibold leading-snug ${item.completed ? "line-through" : ""}`}>
                                    {item.title}
                                  </h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {item.description}
                                  </p>
                                </div>
                                {isYoutube && (
                                  <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                                    isWatching ? "bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300" : "bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400"
                                  }`}>
                                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                      <path d="M8 5v14l11-7z" />
                                    </svg>
                                    {hasExactTime ? formatTimestamp(watchSeconds) : "Watch"}
                                  </span>
                                )}
                              </div>
                              {isWatching && data.source.video_id && (
                                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                                  <YouTubePlayer
                                    videoId={data.source.video_id}
                                    start={watchSeconds}
                                    title={item.title}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Create your own learning path with Socraty AI
          </a>
        </div>
      </div>
    </div>
  );
}
