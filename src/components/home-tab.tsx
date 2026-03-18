"use client";

import { useState, useEffect, useCallback } from "react";
import { useAppView } from "@/components/app-shell";
import type { ActionItem } from "@/types";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  Play,
  FileText,
  RefreshCw,
  Plus,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

interface Recommendation {
  id: number;
  title: string;
  description: string;
  url: string;
  source_type: "youtube" | "article" | "paper";
  topic: string | null;
  thumbnail_url: string | null;
  created_at: string;
}

interface HomeData {
  today: ActionItem[];
  missed: ActionItem[];
  recommendations: Recommendation[];
  learnerSummary: {
    totalNotes: number;
    avgScore: number | null;
    weakTopics: string[];
  };
  userName: string | null;
  hasLearnerProfile: boolean;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDifficultyBadge(difficulty: string) {
  const styles = {
    easy: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400",
    medium: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400",
    hard: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400",
  };
  const labels = { easy: "Foundation", medium: "Solidification", hard: "Mastery" };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[difficulty as keyof typeof styles] || ""}`}>
      {labels[difficulty as keyof typeof labels] || difficulty}
    </span>
  );
}

function buildAskSocratyPrompt(item: ActionItem): string {
  let prompt = `I have an action item: "${item.title}"\n\nDescription: ${item.description}`;
  if (item.source_context) prompt += `\n\nSource context: "${item.source_context}"`;
  if (item.topic) prompt += `\nTopic: ${item.topic}`;
  prompt += `\nDifficulty: ${item.difficulty}`;
  prompt += `\n\nPlease help me understand:\n1. What this action item is asking me to do\n2. What I need to research and learn about\n3. Key questions I should explore to deepen my understanding\n4. What I'll gain from completing this task\n5. Tips for writing strong notes on this topic`;
  return prompt;
}

export function HomeTab() {
  const { setActiveView, askAboutActionItem } = useAppView();
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [catchUpOpen, setCatchUpOpen] = useState(true);
  const [refreshingRecs, setRefreshingRecs] = useState(false);
  const [ingestingUrl, setIngestingUrl] = useState<string | null>(null);
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/home");
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleComplete = useCallback(async (itemId: number, currentCompleted: number) => {
    const newCompleted = currentCompleted === 0;
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (newCompleted) next.add(itemId);
      else next.delete(itemId);
      return next;
    });
    setData((prev) => {
      if (!prev) return prev;
      const updateItem = (item: ActionItem) =>
        item.id === itemId
          ? { ...item, completed: newCompleted ? 1 : 0, completed_at: newCompleted ? new Date().toISOString() : null }
          : item;
      return { ...prev, today: prev.today.map(updateItem), missed: prev.missed.map(updateItem) };
    });

    try {
      const res = await fetch("/api/action-items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId, completed: newCompleted }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch {
      // Revert on failure
      setCompletedIds((prev) => {
        const next = new Set(prev);
        if (!newCompleted) next.add(itemId);
        else next.delete(itemId);
        return next;
      });
      setData((prev) => {
        if (!prev) return prev;
        const revertItem = (item: ActionItem) =>
          item.id === itemId
            ? { ...item, completed: currentCompleted, completed_at: null }
            : item;
        return { ...prev, today: prev.today.map(revertItem), missed: prev.missed.map(revertItem) };
      });
      toast.error("Failed to update");
    }
  }, []);

  const refreshRecommendations = useCallback(async () => {
    setRefreshingRecs(true);
    try {
      const res = await fetch("/api/home", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData((prev) => prev ? { ...prev, recommendations: json.recommendations } : prev);
      toast.success("Recommendations refreshed");
    } catch {
      toast.error("Failed to refresh recommendations");
    } finally {
      setRefreshingRecs(false);
    }
  }, []);

  const addToLibrary = useCallback(async (rec: Recommendation) => {
    setIngestingUrl(rec.url);
    try {
      if (rec.source_type === "youtube") {
        const res = await fetch("/api/youtube", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: rec.url }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to add");
        }
        toast.success(`Added "${rec.title}" to your library`);
      } else {
        const res = await fetch("/api/journal-search/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: rec.url, title: rec.title }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to add");
        }
        toast.success(`Added "${rec.title}" to your library`);
      }
      // Remove from recommendations display
      setData((prev) =>
        prev ? { ...prev, recommendations: prev.recommendations.filter((r) => r.id !== rec.id) } : prev
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add to library");
    } finally {
      setIngestingUrl(null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) return null;

  const todayCompleted = data.today.filter((i) => i.completed || completedIds.has(i.id));
  const todayRemaining = data.today.filter((i) => !i.completed && !completedIds.has(i.id));
  const allTodayDone = data.today.length > 0 && todayRemaining.length === 0;
  const activeMissed = data.missed.filter((i) => !i.completed && !completedIds.has(i.id));

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Greeting + Quick Stats */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {getGreeting()}{data.userName ? `, ${data.userName.split(" ")[0]}` : ""}
        </h1>
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
          {data.today.length > 0 && (
            <span>{todayRemaining.length} item{todayRemaining.length !== 1 ? "s" : ""} today</span>
          )}
          {data.today.length > 0 && activeMissed.length > 0 && <span>·</span>}
          {activeMissed.length > 0 && (
            <span>{activeMissed.length} missed</span>
          )}
          {(data.today.length > 0 || activeMissed.length > 0) && data.learnerSummary.avgScore !== null && <span>·</span>}
          {data.learnerSummary.avgScore !== null && (
            <span>Avg score: {data.learnerSummary.avgScore}/100</span>
          )}
        </div>
      </div>

      {/* Today's Focus */}
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" />
          Today&apos;s Focus
        </h2>

        {data.today.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/60 p-6 text-center">
            <p className="text-muted-foreground text-sm">
              Nothing scheduled for today.{" "}
              <button
                onClick={() => setActiveView("action-items")}
                className="text-primary hover:underline font-medium"
              >
                Head to your action items
              </button>{" "}
              and auto-schedule to build your study plan.
            </p>
          </div>
        ) : allTodayDone ? (
          <div className="rounded-xl border border-border bg-card/60 p-6 text-center animate-tier-glow">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-medium text-foreground">You&apos;re caught up for today.</p>
            <p className="text-sm text-muted-foreground mt-1">
              {todayCompleted.length} item{todayCompleted.length !== 1 ? "s" : ""} completed. Nice work.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayRemaining.map((item) => (
              <ActionItemCard
                key={item.id}
                item={item}
                onToggle={() => toggleComplete(item.id, item.completed)}
                onAskSocraty={() => askAboutActionItem(item.file_id, buildAskSocratyPrompt(item))}
              />
            ))}
            {todayCompleted.length > 0 && (
              <p className="text-xs text-muted-foreground pt-1">
                {todayCompleted.length} completed today
              </p>
            )}
          </div>
        )}
      </section>

      {/* Catch Up */}
      {activeMissed.length > 0 && (
        <section>
          <button
            onClick={() => setCatchUpOpen(!catchUpOpen)}
            className="flex items-center gap-2 text-lg font-semibold text-foreground mb-3 hover:text-primary transition-colors"
          >
            {catchUpOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            Catch Up
            <span className="text-sm font-normal text-muted-foreground">
              ({activeMissed.length} missed)
            </span>
          </button>

          {catchUpOpen && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                These were on your schedule but didn&apos;t get done.
              </p>
              {activeMissed.map((item) => (
                <ActionItemCard
                  key={item.id}
                  item={item}
                  onToggle={() => toggleComplete(item.id, item.completed)}
                  onAskSocraty={() => askAboutActionItem(item.file_id, buildAskSocratyPrompt(item))}
                  showDate
                />
              ))}
              {activeMissed.length >= 10 && (
                <button
                  onClick={() => setActiveView("calendar")}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  View full calendar
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {/* Recommended For You */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Recommended For You
          </h2>
          {data.recommendations.length > 0 && (
            <button
              onClick={refreshRecommendations}
              disabled={refreshingRecs}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingRecs ? "animate-spin" : ""}`} />
              Find more
            </button>
          )}
        </div>

        {refreshingRecs && data.recommendations.length === 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card/60 p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-full mb-1" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : data.recommendations.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/60 p-6 text-center">
            <p className="text-muted-foreground text-sm">
              {data.learnerSummary.totalNotes === 0
                ? "Complete some action items and submit notes to help Socraty understand where you need help. Recommendations are built from your real performance data."
                : data.learnerSummary.weakTopics.length === 0
                  ? "You're scoring well across all graded topics. Keep submitting notes — Socraty will find resources when it spots gaps."
                  : "No recommendations available right now. Try refreshing."}
            </p>
            {data.learnerSummary.weakTopics.length > 0 && (
              <button
                onClick={refreshRecommendations}
                disabled={refreshingRecs}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingRecs ? "animate-spin" : ""}`} />
                Generate recommendations
              </button>
            )}
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted-foreground mb-3">
              Based on your graded notes, Socraty found resources to strengthen your weak areas.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.recommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onAdd={() => addToLibrary(rec)}
                  adding={ingestingUrl === rec.url}
                />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function ActionItemCard({
  item,
  onToggle,
  onAskSocraty,
  showDate,
}: {
  item: ActionItem;
  onToggle: () => void;
  onAskSocraty: () => void;
  showDate?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/60 p-4 transition-all hover:border-border/80">
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`shrink-0 mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
          item.completed
            ? "bg-primary border-primary text-primary-foreground"
            : "border-border hover:border-primary/50"
        }`}
      >
        {item.completed ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              className="animate-check-draw"
            />
          </svg>
        ) : null}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{item.title}</span>
          {getDifficultyBadge(item.difficulty)}
          {item.topic && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {item.topic}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          {item.filename && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {item.filename}
            </span>
          )}
          {showDate && item.scheduled_date && (
            <span className="text-xs text-muted-foreground">
              {new Date(item.scheduled_date + "T00:00:00").toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {item.scheduled_time && !showDate && (
            <span className="text-xs text-muted-foreground">{item.scheduled_time}</span>
          )}
        </div>
      </div>

      {/* Ask Socraty */}
      <button
        onClick={onAskSocraty}
        className="shrink-0 inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Ask Socraty
      </button>
    </div>
  );
}

function RecommendationCard({
  rec,
  onAdd,
  adding,
}: {
  rec: Recommendation;
  onAdd: () => void;
  adding: boolean;
}) {
  const isYouTube = rec.source_type === "youtube";

  return (
    <div className="rounded-xl border border-border bg-card/60 overflow-hidden flex flex-col">
      {/* Thumbnail for YouTube */}
      {isYouTube && rec.thumbnail_url && (
        <div className="relative aspect-video bg-muted">
          <img
            src={rec.thumbnail_url}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
              <Play className="w-5 h-5 text-white ml-0.5" />
            </div>
          </div>
        </div>
      )}

      <div className="p-4 flex-1 flex flex-col">
        {/* Source icon + topic */}
        <div className="flex items-center gap-2 mb-1.5">
          {isYouTube ? (
            <Play className="w-3.5 h-3.5 text-red-500 shrink-0" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          )}
          <span className="text-xs text-muted-foreground">
            {isYouTube ? "Video" : "Article"}
          </span>
          {rec.topic && (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <span className="text-xs font-medium text-primary">{rec.topic}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-foreground line-clamp-2 mb-1.5">
          {rec.title}
        </h3>

        {/* Reason — grounded in real data */}
        <p className="text-xs text-muted-foreground leading-relaxed flex-1 mb-3">
          {rec.description}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onAdd}
            disabled={adding}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {adding ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Add to Library
          </button>
          <a
            href={rec.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview
          </a>
        </div>
      </div>
    </div>
  );
}
