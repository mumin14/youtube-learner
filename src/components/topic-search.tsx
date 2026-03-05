"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { YouTubeVideo } from "@/types";

interface Props {
  onIngested: () => void;
}

type Stage =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "results"; videos: YouTubeVideo[] }
  | {
      kind: "ingesting";
      progress: number;
      completed: number;
      total: number;
    }
  | { kind: "done"; succeeded: number; failed: number; errors: string[] };

export function TopicSearch({ onIngested }: Props) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;

      setStage({ kind: "searching" });

      try {
        const res = await fetch("/api/youtube/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");

        if (data.videos.length === 0) {
          toast.error("No videos found for that topic");
          setStage({ kind: "idle" });
          return;
        }

        setStage({ kind: "results", videos: data.videos });
        // Pre-select top 5 longest (likely courses)
        setSelectedIds(
          new Set(data.videos.slice(0, 5).map((v: YouTubeVideo) => v.videoId))
        );
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Search failed");
        setStage({ kind: "idle" });
      }
    },
    [query]
  );

  const toggleVideo = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (stage.kind !== "results") return;
    if (selectedIds.size === stage.videos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(stage.videos.map((v) => v.videoId)));
    }
  };

  const startBatchIngest = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setStage({ kind: "ingesting", progress: 0, completed: 0, total: ids.length });

    try {
      const res = await fetch("/api/youtube/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoIds: ids }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      const errors: string[] = [];

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.status === "processing" || data.status === "video_done") {
              setStage({
                kind: "ingesting",
                progress: data.progress || 0,
                completed: data.completed || 0,
                total: data.total,
              });
            } else if (data.status === "video_error") {
              errors.push(data.error || "Unknown error");
            } else if (data.status === "done") {
              setStage({
                kind: "done",
                succeeded: data.succeeded,
                failed: data.failed,
                errors,
              });
              onIngested();
            }
          } catch {
            // skip malformed SSE
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Batch ingest failed");
      setStage({ kind: "idle" });
    }
  }, [selectedIds, onIngested]);

  const reset = () => {
    setStage({ kind: "idle" });
    setQuery("");
    setSelectedIds(new Set());
  };

  const formatDuration = (d: string) => {
    const parts = d.split(":").map(Number);
    if (parts.length === 3) {
      return `${parts[0]}h ${parts[1]}m`;
    }
    if (parts.length === 2 && parts[0] >= 60) {
      return `${Math.floor(parts[0] / 60)}h ${parts[0] % 60}m`;
    }
    return d;
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to learn? e.g. &quot;React hooks&quot;, &quot;machine learning basics&quot;..."
            className="w-full pl-12 pr-24 py-4 rounded-xl border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
            disabled={stage.kind === "searching" || stage.kind === "ingesting"}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              size="sm"
              disabled={!query.trim() || stage.kind === "searching" || stage.kind === "ingesting"}
              className="rounded-lg"
            >
              {stage.kind === "searching" ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                "Search"
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">
          Describe what you want to learn — we'll find the best YouTube courses and videos for you
        </p>
      </form>

      {/* Searching */}
      {stage.kind === "searching" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 animate-spin text-primary shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p className="text-sm font-medium">Searching YouTube...</p>
                <p className="text-xs text-muted-foreground">
                  Finding courses and videos about "{query}"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {stage.kind === "results" && (
        <Card className="border-border/50">
          <CardContent className="py-4 px-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">
                  {stage.videos.length} videos found
                </p>
                <p className="text-xs text-muted-foreground">
                  Sorted by length (courses first) &middot; {selectedIds.size} selected
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={toggleAll} className="rounded-lg text-xs">
                  {selectedIds.size === stage.videos.length ? "Deselect all" : "Select all"}
                </Button>
                <Button variant="outline" size="sm" onClick={reset} className="rounded-lg text-xs">
                  New search
                </Button>
                <Button
                  size="sm"
                  onClick={startBatchIngest}
                  disabled={selectedIds.size === 0}
                  className="rounded-lg text-xs"
                >
                  Ingest {selectedIds.size} videos
                </Button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
              {stage.videos.map((video) => (
                <label
                  key={video.videoId}
                  className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                    selectedIds.has(video.videoId)
                      ? "bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(video.videoId)}
                    onChange={() => toggleVideo(video.videoId)}
                    className="rounded accent-primary shrink-0"
                  />
                  {video.thumbnail && (
                    <img
                      src={video.thumbnail}
                      alt=""
                      className="w-24 h-14 rounded object-cover shrink-0 bg-muted"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium line-clamp-2">{video.title}</p>
                    {video.duration && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDuration(video.duration)}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ingesting progress */}
      {stage.kind === "ingesting" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 px-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Fetching transcripts...</span>
              <span className="tabular-nums text-muted-foreground">
                {stage.completed} / {stage.total} videos &middot; {stage.progress}%
              </span>
            </div>
            <Progress value={stage.progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Done */}
      {stage.kind === "done" && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {stage.succeeded} videos ingested
                  {stage.failed > 0 && (
                    <span className="text-amber-700 dark:text-amber-400">
                      {" "}&middot; {stage.failed} skipped
                    </span>
                  )}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="rounded-lg text-xs">
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
