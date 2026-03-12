"use client";

import { useEffect, useCallback, useState } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useProcessingStatus } from "@/hooks/use-processing-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAppView } from "@/components/app-shell";

interface ReaderState {
  open: boolean;
  loading: boolean;
  title: string;
  url: string | null;
  content: string;
}

type FilterType = "all" | "youtube" | "article" | "file";

export function LibraryTab() {
  const { files, deleteFile, deleteAllFiles, fetchFiles } = useFileUpload();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [reingestingId, setReingestingId] = useState<number | null>(null);
  const [reingestingAll, setReingestingAll] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [reader, setReader] = useState<ReaderState>({
    open: false,
    loading: false,
    title: "",
    url: null,
    content: "",
  });
  const { status, startProcessing, reset } = useProcessingStatus();
  const { askAboutFile } = useAppView();

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const isProcessing =
    status.status === "running" || status.status === "pending";

  const handleProcess = useCallback(async () => {
    try {
      await startProcessing();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to start processing"
      );
    }
  }, [startProcessing]);

  const handleReingest = useCallback(async (fileId: number) => {
    setReingestingId(fileId);
    try {
      const res = await fetch(`/api/files/${fileId}/reingest`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Re-ingest failed");
      toast.success(`Re-ingested with ${data.chunks} chunks (timestamps updated)`);
      fetchFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-ingest failed");
    } finally {
      setReingestingId(null);
    }
  }, [fetchFiles]);

  const handleReingestAll = useCallback(async () => {
    setReingestingAll(true);
    try {
      const res = await fetch("/api/files/reingest-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Re-ingest failed");
      toast.success(`Re-ingested ${data.reingested} videos with timestamps`);
      fetchFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Re-ingest all failed");
    } finally {
      setReingestingAll(false);
    }
  }, [fetchFiles]);

  const openReader = useCallback(async (fileId: number) => {
    setReader((r) => ({ ...r, open: true, loading: true, content: "", title: "", url: null }));
    try {
      const res = await fetch(`/api/files/${fileId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setReader({
        open: true,
        loading: false,
        title: data.title,
        url: data.url,
        content: data.content,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load content");
      setReader((r) => ({ ...r, open: false, loading: false }));
    }
  }, []);

  const filteredFiles = filter === "all"
    ? files
    : files.filter((f) => f.source_type === filter);

  const youtubeCount = files.filter((f) => f.source_type === "youtube").length;
  const articleCount = files.filter((f) => f.source_type === "article").length;
  const fileCount = files.filter((f) => f.source_type === "file").length;
  const totalChunks = files.reduce((sum, f) => sum + (f.chunk_count || 0), 0);
  const totalSize = files.reduce((sum, f) => sum + (f.size_bytes || 0), 0);
  const youtubeFiles = files.filter((f) => f.source_type === "youtube");

  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-1">Your library is empty</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Ingested YouTube videos, articles, and files will appear here. Head to the Upload tab to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <Card className="bg-card border-border">
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-2xl font-bold">{files.length}</p>
                <p className="text-xs text-muted-foreground">Sources</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-2xl font-bold">{totalChunks}</p>
                <p className="text-xs text-muted-foreground">Chunks</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div>
                <p className="text-2xl font-bold">
                  {totalSize > 1048576
                    ? `${(totalSize / 1048576).toFixed(1)} MB`
                    : `${(totalSize / 1024).toFixed(0)} KB`}
                </p>
                <p className="text-xs text-muted-foreground">Total size</p>
              </div>
            </div>
            <div className="flex gap-2">
              {status.status === "completed" && (
                <Button variant="outline" size="sm" onClick={reset} className="rounded-lg">
                  Reset
                </Button>
              )}
              <Button
                onClick={handleProcess}
                disabled={isProcessing || files.length === 0}
                className="rounded-lg"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generate Action Items
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Processing progress */}
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
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs + actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
          {([
            { key: "all" as FilterType, label: "All", count: files.length },
            ...(youtubeCount > 0 ? [{ key: "youtube" as FilterType, label: "YouTube", count: youtubeCount }] : []),
            ...(articleCount > 0 ? [{ key: "article" as FilterType, label: "Articles", count: articleCount }] : []),
            ...(fileCount > 0 ? [{ key: "file" as FilterType, label: "Files", count: fileCount }] : []),
          ]).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                filter === key
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label} <span className="opacity-60">({count})</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {youtubeFiles.length > 0 && !confirmDeleteAll && (
            <button
              onClick={handleReingestAll}
              disabled={isProcessing || reingestingId !== null || reingestingAll}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              {reingestingAll ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Re-ingest all
            </button>
          )}
          {confirmDeleteAll ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive font-medium">Delete all {files.length} items?</span>
              <button
                onClick={() => {
                  deleteAllFiles();
                  setConfirmDeleteAll(false);
                  toast.success("All content deleted");
                }}
                disabled={isProcessing}
                className="text-xs font-medium px-2.5 py-1 rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDeleteAll(false)}
                className="text-xs font-medium px-2.5 py-1 rounded-md border border-border hover:bg-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteAll(true)}
              disabled={isProcessing}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete all
            </button>
          )}
        </div>
      </div>

      {/* Visual card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredFiles.map((file) => {
          const isYouTube = file.source_type === "youtube";
          const isArticle = file.source_type === "article";
          const thumbnailUrl = isYouTube && file.video_id
            ? `https://img.youtube.com/vi/${file.video_id}/hqdefault.jpg`
            : null;

          return (
            <div
              key={file.id}
              onClick={() => {
                if (isYouTube && file.youtube_url) {
                  window.open(file.youtube_url, "_blank", "noopener,noreferrer");
                } else {
                  openReader(file.id);
                }
              }}
              className="group relative rounded-xl border border-border bg-card overflow-hidden cursor-pointer hover:border-primary/40 hover:shadow-md transition-all"
            >
              {/* Thumbnail / Preview area */}
              <div className="relative aspect-video bg-muted overflow-hidden">
                {isYouTube && thumbnailUrl ? (
                  <>
                    <img
                      src={thumbnailUrl}
                      alt={file.original_name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                    {/* YouTube badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold tracking-wide">
                      YOUTUBE
                    </div>
                  </>
                ) : isArticle ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-950">
                    <svg className="w-10 h-10 text-blue-500 dark:text-blue-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400">Journal Article</span>
                    {/* Article badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold tracking-wide">
                      ARTICLE
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-slate-100 dark:from-gray-900 dark:to-slate-900">
                    <svg className="w-10 h-10 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-xs font-medium text-muted-foreground">Text File</span>
                    {/* File badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-gray-600 text-white text-[10px] font-bold tracking-wide">
                      FILE
                    </div>
                  </div>
                )}

                {/* Status badge top-right */}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={file.status} />
                </div>
              </div>

              {/* Card body */}
              <div className="p-3">
                <h3 className="text-sm font-semibold leading-snug line-clamp-2 mb-1.5 group-hover:text-primary transition-colors">
                  {file.original_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {(file.size_bytes / 1024).toFixed(1)} KB &middot; {file.chunk_count} chunks
                  {file.action_item_count > 0 && (
                    <span className="text-primary"> &middot; {file.action_item_count} items</span>
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  {new Date(file.created_at).toLocaleDateString()}
                </p>

                {/* Action buttons */}
                <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border">
                  {(file.status === "completed" || file.status === "chunked") && (
                    <button
                      onClick={(e) => { e.stopPropagation(); askAboutFile(file.id); }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                      title="Ask AI about this material"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      Ask AI
                    </button>
                  )}
                  <div className="flex-1" />
                  {isYouTube && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReingest(file.id); }}
                      disabled={isProcessing || reingestingId !== null}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                      title="Re-ingest with timestamps"
                    >
                      {reingestingId === file.id ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteFile(file.id); }}
                    disabled={isProcessing}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                    title="Delete"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Article reader modal */}
      {reader.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setReader((r) => ({ ...r, open: false }))}
        >
          <div
            className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold truncate">{reader.title || "Loading..."}</h2>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {reader.url && (
                  <a
                    href={reader.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open original
                  </a>
                )}
                <button
                  onClick={() => setReader((r) => ({ ...r, open: false }))}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {reader.loading ? (
                <div className="flex items-center justify-center py-16">
                  <svg className="w-6 h-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : (
                <article className="prose prose-sm dark:prose-invert max-w-none">
                  {reader.content.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-sm leading-relaxed text-foreground/90 mb-4">
                      {paragraph}
                    </p>
                  ))}
                </article>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    uploaded: { bg: "bg-blue-50 dark:bg-blue-950", text: "text-blue-700 dark:text-blue-300", dot: "bg-blue-500", label: "Uploaded" },
    chunked: { bg: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300", dot: "bg-violet-500", label: "Ready" },
    processing: { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500", label: "Processing" },
    completed: { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500", label: "Completed" },
    error: { bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300", dot: "bg-red-500", label: "Error" },
  };

  const c = config[status] || config.uploaded;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === "processing" ? "animate-pulse" : ""}`} />
      {c.label}
    </span>
  );
}
