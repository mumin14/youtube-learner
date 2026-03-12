"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useProcessingStatus } from "@/hooks/use-processing-status";
import { YouTubeInput } from "@/components/youtube-input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { TopicSearch } from "@/components/topic-search";
import { JournalSearch } from "@/components/journal-search";
import { useAppView } from "@/components/app-shell";

type InputMode = "youtube" | "file" | "topic" | "journal";

export function UploadTab() {
  const { files, uploading, error, uploadFiles, fetchFiles } = useFileUpload();
  const { status, startProcessing } = useProcessingStatus();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { setActiveView } = useAppView();
  const [mode, setMode] = useState<InputMode>("youtube");

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (status.status === "completed") {
      toast.success("Action items generated! Check the Action Items tab.");
      fetchFiles();
    }
    if (status.status === "error") {
      toast.error(status.error ? `Processing failed: ${status.error}` : "Processing encountered an error. Try again.");
    }
  }, [status.status, status.error, fetchFiles]);

  const handleIngested = useCallback(async () => {
    await fetchFiles();
    try {
      await startProcessing(false);
    } catch {
      // If processing fails to start (e.g. already running), that's fine
    }
    // Navigate to library so user can see their ingested files
    setActiveView("library");
  }, [fetchFiles, startProcessing, setActiveView]);

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.endsWith(".txt")
      );
      if (droppedFiles.length > 0) {
        uploadFiles(droppedFiles).then(() => setActiveView("library"));
      } else {
        toast.error("Please drop .txt files only");
      }
    },
    [uploadFiles, setActiveView]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        uploadFiles(e.target.files).then(() => setActiveView("library"));
      }
    },
    [uploadFiles, setActiveView]
  );

  const isProcessing =
    status.status === "running" || status.status === "pending";

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setMode("youtube")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "youtube"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          YouTube URL
        </button>
        <button
          onClick={() => setMode("file")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "file"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Upload Files
        </button>
        <button
          onClick={() => setMode("topic")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "topic"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Topic Search
        </button>
        <button
          onClick={() => setMode("journal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            mode === "journal"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Journal Articles
        </button>
      </div>

      {/* YouTube input mode */}
      {mode === "youtube" && <YouTubeInput onIngested={handleIngested} />}

      {/* Topic search mode */}
      {mode === "topic" && <TopicSearch onIngested={handleIngested} />}

      {/* Journal article search mode */}
      {mode === "journal" && <JournalSearch onIngested={handleIngested} />}

      {/* File upload mode */}
      {mode === "file" && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative overflow-hidden rounded-2xl border-2 border-dashed p-16 text-center cursor-pointer
            transition-all duration-300 ease-out group
            ${
              dragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-semibold">
                {uploading ? "Uploading files..." : "Drop transcript files here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse &middot; accepts .txt files
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing progress (shown if running in background) */}
      {isProcessing && (
        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
          <div className="animate-shimmer h-0.5" />
          <CardContent className="py-5 px-5">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Analyzing content with AI...</span>
                <span className="tabular-nums text-muted-foreground">
                  {status.processedChunks} / {status.totalChunks} chunks &middot; {status.progress}%
                  {status.itemsFound ? ` · ${status.itemsFound} items found` : ""}
                </span>
              </div>
              <Progress value={status.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                You can switch tabs while this runs in the background.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick link to library if files exist */}
      {files.length > 0 && (
        <button
          onClick={() => setActiveView("library")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
          View {files.length} source{files.length !== 1 ? "s" : ""} in Library
        </button>
      )}

      {files.length === 0 && !uploading && (
        <div className="py-8">
          <p className="text-sm font-medium text-muted-foreground mb-4 px-1">Get started in 3 steps</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                title: "Add a video",
                desc: "Paste a YouTube URL above — videos, playlists, or channels all work.",
                icon: (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                ),
              },
              {
                step: "2",
                title: "Generate items",
                desc: "Click Generate Action Items — AI breaks the content into learning tasks.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
              },
              {
                step: "3",
                title: "Start learning",
                desc: "Follow your personalized path — Easy, Medium, then Hard action items.",
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map((s) => (
              <div
                key={s.step}
                className="p-5 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {s.step}
                  </div>
                  <div className="text-primary">{s.icon}</div>
                </div>
                <h4 className="text-sm font-semibold mb-1">{s.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
