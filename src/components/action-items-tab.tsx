"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ActionItem, ActionItemSource, Folder } from "@/types";
import { useAppView } from "@/components/app-shell";

interface AssessmentResult {
  score: number;
  grade: string;
  strengths: string[];
  improvements: string[];
}

interface NoteWithAssessment {
  id: number;
  content: string;
  created_at: string;
  assessment: AssessmentResult | null;
}

function getGradeColor(grade: string) {
  if (grade.startsWith("A")) return "text-emerald-600 dark:text-emerald-400";
  if (grade.startsWith("B")) return "text-blue-600 dark:text-blue-400";
  if (grade.startsWith("C")) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreColor(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreStrokeColor(score: number) {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-red-500";
}

function getGradeFeedback(grade: string): string {
  if (grade.startsWith("A")) return "You've demonstrated mastery of this concept.";
  if (grade.startsWith("B")) return "Strong understanding. Tighten up the areas below and you'll own this.";
  if (grade.startsWith("C")) return "You're building a foundation. Revisit the source material and try again.";
  return "This needs more time. Re-read the source, then take another shot.";
}

function NotesModal({
  item,
  onClose,
}: {
  item: ActionItem;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [pastNotes, setPastNotes] = useState<NoteWithAssessment[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
    fetch(`/api/notes?actionItemId=${item.id}`)
      .then((r) => r.json())
      .then((d) => setPastNotes(d.notes || []))
      .catch(() => {})
      .finally(() => setLoadingPast(false));
  }, [item.id]);

  const handleSubmit = async () => {
    if (!notes.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actionItemId: item.id, content: notes.trim() }),
      });
      const data = await res.json();
      if (data.assessment) {
        setAssessment(data.assessment);
      }
      setPastNotes((prev) => [
        {
          id: data.noteId,
          content: notes.trim(),
          created_at: new Date().toISOString(),
          assessment: data.assessment || null,
        },
        ...prev,
      ]);
      setNotes("");
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold leading-snug">{item.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Assessment result popup */}
          {assessment && (() => {
            const circumference = 2 * Math.PI * 15.5;
            const targetOffset = circumference - (assessment.score / 100) * circumference;
            const isHighGrade = assessment.grade.startsWith("A");
            return (
            <div className={`rounded-xl border-2 bg-primary/5 p-5 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 ${isHighGrade ? "border-emerald-300 dark:border-emerald-700" : "border-primary/20"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Your Grade</p>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span className={`text-4xl font-bold animate-grade-reveal ${getGradeColor(assessment.grade)}`}>
                      {assessment.grade}
                    </span>
                    <span className="text-lg text-muted-foreground">{assessment.score}/100</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{getGradeFeedback(assessment.grade)}</p>
                </div>
                <div className="w-16 h-16 relative">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/30" />
                    <circle
                      cx="18" cy="18" r="15.5" fill="none"
                      strokeWidth="3"
                      strokeLinecap="round"
                      className={`animate-score-fill ${getScoreStrokeColor(assessment.score)}`}
                      style={{
                        "--circumference": circumference,
                        "--target-offset": targetOffset,
                        strokeDasharray: circumference,
                        stroke: "currentColor",
                      } as React.CSSProperties}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                    {assessment.score}
                  </span>
                </div>
              </div>

              {/* Strengths */}
              {assessment.strengths.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  What you did well
                </p>
                <ul className="space-y-1.5">
                  {assessment.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              )}

              {/* Improvements */}
              {assessment.improvements.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  Areas to focus on
                </p>
                <ul className="space-y-1.5">
                  {assessment.improvements.map((s, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              )}

              <button
                onClick={() => setAssessment(null)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Dismiss
              </button>
            </div>
            );
          })()}

          {/* Notes input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Write your notes</label>
            <p className="text-xs text-muted-foreground">
              Explain what you learned about this topic in your own words. The AI will grade how well you understood the material.
            </p>
            <textarea
              ref={textareaRef}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you learn? Explain the concept in your own words..."
              className="w-full h-36 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none transition-all placeholder:text-muted-foreground/60"
              disabled={submitting}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!notes.trim() || submitting}
                size="sm"
                className="rounded-lg"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Grading...
                  </span>
                ) : (
                  "Submit & Grade"
                )}
              </Button>
            </div>
          </div>

          {/* Past notes */}
          {loadingPast ? (
            <div className="h-12 rounded-xl bg-muted/50 animate-pulse" />
          ) : pastNotes.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">Past Submissions</p>
              {pastNotes.map((note, idx) => {
                const prevNote = pastNotes[idx + 1];
                const prevScore = prevNote?.assessment?.score;
                const curScore = note.assessment?.score;
                const scoreDelta = curScore != null && prevScore != null ? curScore - prevScore : null;
                return (
                <div key={note.id} className="rounded-xl border border-border/50 p-4 space-y-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{note.content}</p>
                  {note.assessment && (
                    <div className="flex items-center gap-4 pt-2 border-t border-border/50">
                      <span className={`text-lg font-bold ${getGradeColor(note.assessment.grade)}`}>
                        {note.assessment.grade}
                      </span>
                      <span className="text-sm text-muted-foreground">{note.assessment.score}/100</span>
                      {scoreDelta !== null && scoreDelta !== 0 && (
                        <span className={`text-xs font-medium flex items-center gap-0.5 ${scoreDelta > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          <svg className={`w-3 h-3 ${scoreDelta < 0 ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                          </svg>
                          {Math.abs(scoreDelta)}
                        </span>
                      )}
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${getScoreColor(note.assessment.score)}`}
                          style={{ width: `${note.assessment.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(note.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

function buildAskSocratyPrompt(item: ActionItem): string {
  let prompt = `I have an action item: "${item.title}"\n\nDescription: ${item.description}`;
  if (item.source_context) prompt += `\n\nSource context: "${item.source_context}"`;
  if (item.topic) prompt += `\nTopic: ${item.topic}`;
  prompt += `\nDifficulty: ${item.difficulty}`;
  prompt += `\n\nPlease help me understand:\n1. What this action item is asking me to do\n2. What I need to research and learn about\n3. Key questions I should explore to deepen my understanding\n4. What I'll gain from completing this task\n5. Tips for writing strong notes on this topic`;
  return prompt;
}

export function ActionItemsTab() {
  const { askAboutActionItem } = useAppView();
  const [items, setItems] = useState<ActionItem[]>([]);
  const [sources, setSources] = useState<ActionItemSource[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [counts, setCounts] = useState({ easy: 0, medium: 0, hard: 0 });
  const [completedCounts, setCompletedCounts] = useState({ easy: 0, medium: 0, hard: 0 });
  const [reviewCount, setReviewCount] = useState(0);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("easy");
  const [selectedSource, setSelectedSource] = useState<number | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [reviewMode, setReviewMode] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [notesItem, setNotesItem] = useState<ActionItem | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [scopeOpen, setScopeOpen] = useState(false);
  const [scopeText, setScopeText] = useState("");
  const [scopeLoading, setScopeLoading] = useState(false);
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
      if (selectedDifficulty === "completed") {
        params.set("difficulty", "easy,medium,hard");
        params.set("completed", "true");
      } else {
        params.set("difficulty", selectedDifficulty);
      }
      if (selectedTopic) {
        params.set("topic", selectedTopic);
      }
      if (selectedSource !== null) {
        params.set("fileId", String(selectedSource));
      }
      if (selectedFolder !== null) {
        params.set("folderId", String(selectedFolder));
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
  }, [selectedDifficulty, selectedTopic, selectedSource, selectedFolder, reviewMode]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    fetch("/api/folders")
      .then((res) => res.json())
      .then((data) => setFolders(data.folders ?? []))
      .catch(() => {});
  }, []);

  // Poll for new items while processing is running
  useEffect(() => {
    let prevTotal = -1;
    let stableCount = 0;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/action-items?difficulty=easy,medium,hard");
        const data = await res.json();
        const total = (data.counts?.easy ?? 0) + (data.counts?.medium ?? 0) + (data.counts?.hard ?? 0);
        if (total !== prevTotal) {
          prevTotal = total;
          stableCount = 0;
          fetchItems();
        } else {
          stableCount++;
          // Stop polling after count is stable for 4 checks (20 seconds)
          if (stableCount >= 4) clearInterval(interval);
        }
      } catch {
        // silent
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleScope = useCallback(async () => {
    if (!scopeText.trim() || scopeLoading) return;
    setScopeLoading(true);
    try {
      const body: { scope: string; fileId?: number; folderId?: number } = { scope: scopeText.trim() };
      if (selectedSource !== null) body.fileId = selectedSource;
      if (selectedFolder !== null) body.folderId = selectedFolder;
      const res = await fetch("/api/action-items/scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to scope action items");
        return;
      }
      setScopeOpen(false);
      setScopeText("");
      fetchItems();
    } catch {
      alert("Failed to scope action items");
    } finally {
      setScopeLoading(false);
    }
  }, [scopeText, scopeLoading, selectedSource, selectedFolder, fetchItems]);

  const [showCompleted, setShowCompleted] = useState(false);

  // Split items into active and completed
  const activeItems = items.filter((i) => !i.completed);
  const completedItems = items.filter((i) => i.completed);

  // Group items by source file
  const groupBySource = (list: ActionItem[]) =>
    list.reduce<Record<number, { name: string; sourceType: string; videoId: string | null; articleUrl: string | null; items: ActionItem[] }>>((acc, item) => {
      const fileId = item.file_id;
      if (!acc[fileId]) {
        acc[fileId] = {
          name: item.filename || "Unknown",
          sourceType: item.source_type || "file",
          videoId: item.video_id || null,
          articleUrl: item.source_type === "article" ? (item.youtube_url || null) : null,
          items: [],
        };
      }
      acc[fileId].items.push(item);
      return acc;
    }, {});

  const groupedBySource = groupBySource(activeItems);
  const completedGroupedBySource = groupBySource(completedItems);

  const totalItems = counts.easy + counts.medium + counts.hard;

  const renderSourceGroups = (groups: Record<number, { name: string; sourceType: string; videoId: string | null; articleUrl: string | null; items: ActionItem[] }>) => (
    <>
      {Object.entries(groups).map(([fileId, group]) => (
        <div key={fileId} className="space-y-3">
          <div className="flex items-center gap-2">
            {group.sourceType === "youtube" ? (
              <div className="w-6 h-6 rounded-md bg-red-100 dark:bg-red-900 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </div>
            ) : group.sourceType === "article" ? (
              <div className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
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
              const isArticle = item.source_type === "article";
              const watchSeconds = item.timestamp_seconds ?? item.chunk_start_seconds ?? 0;
              const endSeconds = item.chunk_end_seconds ?? null;
              const hasExactTime = item.timestamp_seconds != null || item.chunk_start_seconds != null;
              return (
                <Card
                  key={item.id}
                  className="overflow-hidden border-border/50 transition-all duration-500 hover:border-border"
                >
                  <CardContent className="p-0">
                    <div className="flex">
                      <div className={`flex-1 p-4 transition-opacity duration-500 ${item.completed ? "opacity-60" : ""}`}>
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
                                <path className="animate-check-draw" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
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
                            {isArticle && item.youtube_url && (
                              <a
                                href={item.youtube_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                Read Article
                              </a>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setNotesItem(item);
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              Upload notes to get graded
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                askAboutActionItem(item.file_id, buildAskSocratyPrompt(item));
                              }}
                              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Ask Socraty
                            </button>
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
    </>
  );

  return (
    <div className="space-y-6">
      {/* Difficulty stat cards */}
      <div className="grid grid-cols-4 gap-3">
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
        {/* Completed tab */}
        {(() => {
          const totalCompleted = completedCounts.easy + completedCounts.medium + completedCounts.hard;
          const isActive = selectedDifficulty === "completed";
          return (
            <button
              onClick={() => selectDifficulty("completed")}
              className={`
                relative overflow-hidden rounded-xl p-4 text-left transition-all duration-200
                ${isActive
                  ? "bg-emerald-50 dark:bg-emerald-950 border-emerald-200 dark:border-emerald-800 border-2 shadow-sm"
                  : "bg-muted/30 border-2 border-transparent opacity-50 hover:opacity-75"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-2xl font-bold ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
                    {totalCompleted}<span className="text-base font-normal text-muted-foreground">/{totalItems}</span>
                  </p>
                  <p className={`text-sm font-medium ${isActive ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"}`}>
                    Completed
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">All done</p>
                </div>
                <div className={`p-2 rounded-lg ${isActive ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </button>
          );
        })()}
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
            Worth revisiting
            {reviewCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                reviewMode ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
              }`}>
                {reviewCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setScopeOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Scope
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
          {folders.length > 0 && (
            <select
              className="border rounded-lg px-3 py-1.5 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all max-w-[240px] truncate"
              value={selectedFolder ?? ""}
              onChange={(e) => {
                setSelectedFolder(e.target.value ? Number(e.target.value) : null);
                setSelectedSource(null);
              }}
            >
              <option value="">All folders ({totalItems})</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.file_count ?? 0} resources)
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
      ) : items.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-5">
            <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {selectedDifficulty === "completed" ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              )}
            </svg>
          </div>
          <p className="text-lg font-semibold text-foreground">
            {selectedDifficulty === "completed" ? "No completed tasks yet" : "No action items yet"}
          </p>
          <p className="text-sm mt-2 max-w-xs mx-auto leading-relaxed">
            {selectedDifficulty === "completed"
              ? "Complete action items by ticking the checkbox, and they\u2019ll appear here."
              : "Your study plan will appear here once you add something to your library."
            }
          </p>
        </div>
      ) : selectedDifficulty === "completed" ? (
        /* Completed tab — show all completed items flat */
        <div className="space-y-6">
          <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
            Completed Tasks
          </p>
          {renderSourceGroups(groupBySource(items))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active items */}
          {Object.keys(groupedBySource).length > 0 && (
            <>
              <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground">
                Action Items
              </p>
              {renderSourceGroups(groupedBySource)}
            </>
          )}

          {/* Completed items */}
          {completedItems.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs font-medium tracking-widest uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className={`w-3.5 h-3.5 transition-transform ${showCompleted ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Completed Tasks
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 font-semibold">
                  {completedItems.length}
                </span>
              </button>
              {showCompleted && renderSourceGroups(completedGroupedBySource)}
            </div>
          )}

          {/* Empty active state when all are completed */}
          {Object.keys(groupedBySource).length === 0 && completedItems.length > 0 && (() => {
            const tierLabel = DIFFICULTY_CONFIG[selectedDifficulty as keyof typeof DIFFICULTY_CONFIG]?.label ?? selectedDifficulty;
            const nextTier = selectedDifficulty === "easy" ? "Solidification" : selectedDifficulty === "medium" ? "Mastery" : null;
            return (
            <div className="text-center py-12 text-muted-foreground">
              <div className="mx-auto w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mb-4 animate-tier-glow">
                <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path className="animate-check-draw" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-foreground">{tierLabel} complete.</p>
              <p className="text-sm mt-1">
                {nextTier
                  ? `You've built a strong foundation — move to ${nextTier} when you're ready.`
                  : "You've worked through every level. Revisit anything worth reinforcing."
                }
              </p>
            </div>
            );
          })()}
        </div>
      )}

      {/* Scope modal */}
      {scopeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => !scopeLoading && setScopeOpen(false)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">Scope Action Items</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Tell us what you want to focus on and we&apos;ll regenerate your action items</p>
              </div>
              <button
                onClick={() => !scopeLoading && setScopeOpen(false)}
                className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <textarea
                value={scopeText}
                onChange={(e) => setScopeText(e.target.value)}
                placeholder="e.g. I'm struggling with understanding async/await and promises. I want to focus on practical examples..."
                className="w-full h-32 rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 resize-none transition-all placeholder:text-muted-foreground/60"
                disabled={scopeLoading}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  This will replace your uncompleted action items. Completed items are kept.
                </p>
                <Button
                  onClick={handleScope}
                  disabled={!scopeText.trim() || scopeLoading}
                  size="sm"
                  className="rounded-lg"
                >
                  {scopeLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    "Regenerate"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes modal */}
      {notesItem && (
        <NotesModal item={notesItem} onClose={() => setNotesItem(null)} />
      )}
    </div>
  );
}
