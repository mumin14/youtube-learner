"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ActionItem, ActionItemSource } from "@/types";

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const DIFFICULTY_CONFIG = {
  easy: {
    color: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-950",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    label: "Foundations",
    sublabel: "Start here",
  },
  medium: {
    color: "bg-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    label: "Solidification",
    sublabel: "Build on basics",
  },
  hard: {
    color: "bg-red-500",
    bg: "bg-red-50 dark:bg-red-950",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    label: "Mastery",
    sublabel: "Go deep",
  },
} as const;

export function ActionItemsTab() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [sources, setSources] = useState<ActionItemSource[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [counts, setCounts] = useState({ easy: 0, medium: 0, hard: 0 });
  const [completedCounts, setCompletedCounts] = useState({ easy: 0, medium: 0, hard: 0 });
  const [reviewCount, setReviewCount] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("easy");
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);

  // Close export dropdown on click outside or Escape
  useEffect(() => {
    if (!exportOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [exportOpen]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("difficulty", selectedDifficulty);
      if (selectedTopic) {
        params.set("topic", selectedTopic);
      }
      if (selectedSource !== null) {
        params.set("fileId", String(selectedSource));
      }
      if (reviewMode) {
        params.set("review", "true");
      }

      const res = await fetch(`/api/action-items?${params}`);
      const data = await res.json();
      setItems(data.items);
      setTopics(data.topics);
      setSources(data.sources || []);
      setCounts(data.counts);
      setCompletedCounts(data.completedCounts || { easy: 0, medium: 0, hard: 0 });
      setReviewCount(data.reviewCount ?? 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [selectedDifficulty, selectedTopic, selectedSource, reviewMode]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const selectDifficulty = (d: string) => {
    setSelectedDifficulty(d);
  };

  const toggleExpand = (id: number) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleComplete = useCallback(async (itemId: number, currentCompleted: number) => {
    const newCompleted = currentCompleted === 0;
    setItems(prev => prev.map(item =>
      item.id === itemId
        ? { ...item, completed: newCompleted ? 1 : 0, completed_at: newCompleted ? new Date().toISOString() : null }
        : item
    ));
    // Optimistically update completed counts
    const item = items.find(i => i.id === itemId);
    if (item) {
      setCompletedCounts(prev => ({
        ...prev,
        [item.difficulty]: prev[item.difficulty as keyof typeof prev] + (newCompleted ? 1 : -1),
      }));
    }
    try {
      await fetch("/api/action-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, completed: newCompleted }),
      });
    } catch {
      setItems(prev => prev.map(i =>
        i.id === itemId ? { ...i, completed: currentCompleted, completed_at: null } : i
      ));
      if (item) {
        setCompletedCounts(prev => ({
          ...prev,
          [item.difficulty]: prev[item.difficulty as keyof typeof prev] + (newCompleted ? -1 : 1),
        }));
      }
    }
  }, [items]);

  const handleExport = useCallback(async (mode: "copy" | "download") => {
    setExportOpen(false);
    if (mode === "download") {
      window.open("/api/action-items/export?format=download", "_blank");
      return;
    }
    try {
      const res = await fetch("/api/action-items/export");
      const data = await res.json();
      await navigator.clipboard.writeText(data.markdown);
    } catch { /* silent */ }
  }, []);

  const handleShare = useCallback(async (fileId: number) => {
    try {
      const res = await fetch(`/api/files/${fileId}/share`, { method: "POST" });
      const data = await res.json();
      const url = `${window.location.origin}/share/${data.token}`;
      await navigator.clipboard.writeText(url);
    } catch { /* silent */ }
  }, []);

  // Group items by source file
  const groupedBySource = items.reduce<Record<number, { name: string; sourceType: string; videoId: string | null; items: ActionItem[] }>>((acc, item) => {
    const fileId = item.file_id;
    if (!acc[fileId]) {
      acc[fileId] = {
        name: item.filename || "Unknown",
        sourceType: item.source_type || "file",
        videoId: item.video_id || null,
        items: [],
      };
    }
    acc[fileId].items.push(item);
    return acc;
  }, {});

  const totalItems = counts.easy + counts.medium + counts.hard;

  return (
    <div className="space-y-6">
      {/* Difficulty stat cards */}
      <div className="grid grid-cols-3 gap-3">
        {(["easy", "medium", "hard"] as const).map((d) => {
          const cfg = DIFFICULTY_CONFIG[d];
          const isActive = selectedDifficulty === d;
          return (
            <button
              key={d}
              onClick={() => selectDifficulty(d)}
              className={`
                relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200
                ${isActive
                  ? `${cfg.bg} ${cfg.border} border-2 shadow-sm`
                  : "bg-muted/30 border-2 border-transparent opacity-50 hover:opacity-75"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${isActive ? cfg.text : "text-muted-foreground"}`}>
                    {completedCounts[d]}<span className="text-base font-normal text-muted-foreground">/{counts[d]}</span>
                  </p>
                  <p className={`text-sm font-medium ${isActive ? cfg.text : "text-muted-foreground"}`}>
                    {cfg.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.sublabel}</p>
                </div>
                <div className={`p-2 rounded-lg ${isActive ? cfg.bg : "bg-muted"} ${isActive ? cfg.text : "text-muted-foreground"}`}>
                  {cfg.icon}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{items.length}</span> of {totalItems} items
          </p>
          <button
            onClick={() => fetchItems()}
            disabled={loading}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            title="Refresh action items"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setReviewMode(!reviewMode)}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all ${
              reviewMode
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Review
            {reviewCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                reviewMode ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
              }`}>
                {reviewCount}
              </span>
            )}
          </button>
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportOpen(!exportOpen)}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              title="Export action items"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
            {exportOpen && (
              <div className="absolute top-full left-0 mt-1 z-10 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                <button
                  onClick={() => handleExport("copy")}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copy as Markdown
                </button>
                <button
                  onClick={() => handleExport("download")}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download .md
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sources.length > 0 && (
            <select
              className="border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all max-w-[240px] truncate"
              value={selectedSource ?? ""}
              onChange={(e) => setSelectedSource(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All sources ({totalItems})</option>
              {sources.map((src) => (
                <option key={src.id} value={src.id}>
                  {src.source_type === "youtube" ? "\u25B6 " : "\uD83D\uDCC4 "}{src.original_name} ({src.item_count})
                </option>
              ))}
            </select>
          )}
          {topics.length > 0 && (
            <select
              className="border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all max-w-[180px]"
              value={selectedTopic || ""}
              onChange={(e) => setSelectedTopic(e.target.value || null)}
            >
              <option value="">All topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Items grouped by source */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : Object.keys(groupedBySource).length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-foreground">No action items yet</p>
          <p className="text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            Ingest a YouTube video, then click &ldquo;Generate Action Items&rdquo; to get a difficulty-sorted learning path.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
            Past Action Items
          </p>
          {Object.entries(groupedBySource).map(([fileId, group]) => (
          <div key={fileId} className="space-y-3">
            <div className="flex items-center gap-2">
              {group.sourceType === "youtube" ? (
                <div className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <svg className="w-3.5 h-3.5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              )}
              <h3 className="text-base font-semibold truncate">{group.name}</h3>
              <Badge variant="secondary" className="rounded-full text-xs shrink-0">
                {group.items.length}
              </Badge>
              <button
                onClick={() => handleShare(Number(fileId))}
                className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                title="Share learning path"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </button>
            </div>
            <div className="grid gap-2">
              {group.items.map((item) => {
                const cfg = DIFFICULTY_CONFIG[item.difficulty];
                const isYoutube = !!item.video_id;
                // Best timestamp: action item > chunk start > 0
                const watchSeconds = item.timestamp_seconds
                  ?? item.chunk_start_seconds
                  ?? 0;
                const endSeconds = item.chunk_end_seconds ?? null;
                const hasExactTime = item.timestamp_seconds != null || item.chunk_start_seconds != null;
                return (
                  <Card
                    key={item.id}
                    className="overflow-hidden border-border/50 transition-all hover:border-border"
                  >
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className={`flex-1 p-4 transition-opacity ${item.completed ? "opacity-60" : ""}`}>
                          <div className="flex items-start gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleComplete(item.id, item.completed);
                              }}
                              className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                                item.completed
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border hover:border-primary/50"
                              }`}
                            >
                              {item.completed ? (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : null}
                            </button>
                            <div className="flex-1 flex items-start justify-between gap-3 min-w-0">
                            <div className="space-y-1 min-w-0">
                              <h4 className={`text-sm font-semibold leading-snug ${item.completed ? "line-through" : ""}`}>
                                {item.title}
                              </h4>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isYoutube && hasExactTime && (
                                <a
                                  href={`https://www.youtube.com/watch?v=${item.video_id}&t=${Math.floor(watchSeconds)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                  {formatTimestamp(watchSeconds)}{endSeconds != null ? ` - ${formatTimestamp(endSeconds)}` : ""}
                                </a>
                              )}
                              {isYoutube && !hasExactTime && (
                                <a
                                  href={`https://www.youtube.com/watch?v=${item.video_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M8 5v14l11-7z" />
                                  </svg>
                                  Watch
                                </a>
                              )}
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}
                              >
                                {cfg.icon}
                                {cfg.label}
                              </span>
                            </div>
                          </div>
                          </div>

                          {item.source_context && (
                            <div className="mt-2">
                              <button
                                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(item.id);
                                }}
                              >
                                <svg className={`w-3 h-3 transition-transform ${expandedItems.has(item.id) ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                Source context
                              </button>
                              {expandedItems.has(item.id) && (
                                <blockquote className="mt-2 border-l-2 border-primary/20 pl-3 text-xs text-muted-foreground italic leading-relaxed">
                                  &ldquo;{item.source_context}&rdquo;
                                </blockquote>
                              )}
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
        ))}
        </div>
      )}
    </div>
  );
}
