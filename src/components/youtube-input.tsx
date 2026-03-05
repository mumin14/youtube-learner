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
  | { kind: "loading"; message?: string }
  | { kind: "video_list"; videos: YouTubeVideo[]; channelName?: string }
  | {
      kind: "ingesting";
      progress: number;
      completed: number;
      total: number;
      current?: string;
    }
  | { kind: "done"; succeeded: number; failed: number; errors: string[] };

export function YouTubeInput({ onIngested }: Props) {
  const [input, setInput] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim()) return;

      setStage({ kind: "loading", message: "Fetching video info..." });

      try {
        const res = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: input.trim() }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to process URL");
        }

        if (data.type === "video") {
          if (data.result.success) {
            toast.success(
              `Ingested "${data.result.name}" (${data.result.chunks} chunks)`
            );
            onIngested();
          } else {
            toast.error(data.result.error || "Failed to get transcript");
          }
          setStage({ kind: "idle" });
          setInput("");
        } else if (
          data.type === "playlist" ||
          data.type === "channel"
        ) {
          // Show video list for selection
          setStage({
            kind: "video_list",
            videos: data.videos,
            channelName: data.channelName,
          });
          setSelectedIds(
            new Set(data.videos.map((v: YouTubeVideo) => v.videoId))
          );
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to process URL"
        );
        setStage({ kind: "idle" });
      }
    },
    [input, onIngested]
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
    if (stage.kind !== "video_list") return;
    if (selectedIds.size === stage.videos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(
        new Set(stage.videos.map((v) => v.videoId))
      );
    }
  };

  const startBatchIngest = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setStage({
      kind: "ingesting",
      progress: 0,
      completed: 0,
      total: ids.length,
    });

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

            if (data.status === "processing") {
              setStage({
                kind: "ingesting",
                progress: data.progress || 0,
                completed: data.completed || 0,
                total: data.total,
                current: data.videoId,
              });
            } else if (data.status === "video_done") {
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
      toast.error(
        err instanceof Error ? err.message : "Batch ingest failed"
      );
      setStage({ kind: "idle" });
    }
  }, [selectedIds, onIngested]);

  const reset = () => {
    setStage({ kind: "idle" });
    setInput("");
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste YouTube URL, playlist link, or channel name..."
            className="w-full pl-12 pr-24 py-4 rounded-xl border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
            disabled={stage.kind === "loading" || stage.kind === "ingesting"}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              size="sm"
              disabled={
                !input.trim() ||
                stage.kind === "loading" ||
                stage.kind === "ingesting"
              }
              className="rounded-lg"
            >
              {stage.kind === "loading" ? (
                <span className="flex items-center gap-1.5">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                </span>
              ) : (
                "Fetch"
              )}
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2 px-1">
          Supports video URLs, playlist URLs, channel URLs (@handle), or
          channel name search
        </p>
      </form>

      {/* Loading indicator */}
      {stage.kind === "loading" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="py-4 px-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 animate-spin text-primary shrink-0"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium">
                  {stage.message || "Processing..."}
                </p>
                <p className="text-xs text-muted-foreground">
                  Fetching transcript and video details from YouTube
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Video list (playlist/channel) */}
      {stage.kind === "video_list" && (
        <Card className="border-border/50">
          <CardContent className="py-4 px-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                {stage.channelName && (
                  <p className="text-sm font-semibold">
                    {stage.channelName}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {stage.videos.length} videos found &middot;{" "}
                  {selectedIds.size} selected
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAll}
                  className="rounded-lg text-xs"
                >
                  {selectedIds.size === stage.videos.length
                    ? "Deselect all"
                    : "Select all"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={reset}
                  className="rounded-lg text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={startBatchIngest}
                  disabled={selectedIds.size === 0}
                  className="rounded-lg bg-gradient-to-r from-primary to-primary/80 shadow-sm text-xs"
                >
                  Ingest {selectedIds.size} videos
                </Button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto space-y-1 pr-1">
              {stage.videos.map((video) => (
                <label
                  key={video.videoId}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    selectedIds.has(video.videoId)
                      ? "bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(video.videoId)}
                    onChange={() => toggleVideo(video.videoId)}
                    className="rounded accent-primary"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {video.title}
                    </p>
                    {video.duration && (
                      <p className="text-xs text-muted-foreground">
                        {video.duration}
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
                {stage.completed} / {stage.total} videos &middot;{" "}
                {stage.progress}%
              </span>
            </div>
            <Progress value={stage.progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Done summary */}
      {stage.kind === "done" && (
        <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950">
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                  {stage.succeeded} videos ingested
                  {stage.failed > 0 && (
                    <span className="text-amber-700 dark:text-amber-400">
                      {" "}&middot; {stage.failed} skipped
                    </span>
                  )}
                  {stage.errors.length > 0 && (
                    <p className="mt-1 text-xs font-normal text-muted-foreground">
                      {stage.errors[0]}
                    </p>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reset}
                className="rounded-lg text-xs"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
