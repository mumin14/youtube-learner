"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ExternalLink, Download, Info } from "lucide-react";

interface Article {
  title: string;
  url: string;
  author: string | null;
  publishedDate: string | null;
  summary: string | null;
  score: number | null;
  favicon: string | null;
  hasFullText: boolean;
  textLength: number;
}

interface Props {
  onIngested: () => void;
}

type Stage =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "results"; articles: Article[] };

export function JournalSearch({ onIngested }: Props) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });
  const [ingestingUrl, setIngestingUrl] = useState<string | null>(null);
  const [ingestedUrls, setIngestedUrls] = useState<Set<string>>(new Set());
  const [expandedInfo, setExpandedInfo] = useState<number | null>(null);
  const [insightCache, setInsightCache] = useState<Record<number, string>>({});
  const [loadingInsight, setLoadingInsight] = useState<number | null>(null);

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;

      setStage({ kind: "searching" });
      setIngestedUrls(new Set());
      setExpandedInfo(null);
      setInsightCache({});

      try {
        const res = await fetch("/api/journal-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: query.trim() }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");

        if (data.articles.length === 0) {
          toast.error("No journal articles found for that topic");
          setStage({ kind: "idle" });
          return;
        }

        setStage({ kind: "results", articles: data.articles });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Search failed");
        setStage({ kind: "idle" });
      }
    },
    [query]
  );

  const handleIngest = useCallback(
    async (article: Article) => {
      setIngestingUrl(article.url);
      try {
        const res = await fetch("/api/journal-search/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: article.url, title: article.title }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Ingest failed");

        toast.success(`Ingested "${data.title}" — ${data.chunks} chunks`);
        setIngestedUrls((prev) => new Set(prev).add(article.url));
        onIngested();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to ingest article");
      } finally {
        setIngestingUrl(null);
      }
    },
    [onIngested]
  );

  const handleInfoToggle = useCallback(
    async (index: number, article: Article) => {
      if (expandedInfo === index) {
        setExpandedInfo(null);
        return;
      }
      setExpandedInfo(index);

      if (insightCache[index]) return;

      setLoadingInsight(index);
      try {
        const res = await fetch("/api/journal-search/insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: article.title,
            summary: article.summary,
            author: article.author,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setInsightCache((prev) => ({ ...prev, [index]: data.insight }));
      } catch {
        setInsightCache((prev) => ({
          ...prev,
          [index]: "Could not generate insight for this article.",
        }));
      } finally {
        setLoadingInsight(null);
      }
    },
    [expandedInfo, insightCache]
  );

  const reset = () => {
    setStage({ kind: "idle" });
    setQuery("");
    setIngestedUrls(new Set());
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      <form onSubmit={handleSearch}>
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search for journal articles e.g. "cognitive load theory", "spaced repetition learning"...'
            className="w-full pl-12 pr-24 py-4 rounded-xl border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all placeholder:text-muted-foreground/60"
            disabled={stage.kind === "searching"}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              size="sm"
              disabled={!query.trim() || stage.kind === "searching"}
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
          Find academic papers and journal articles from PubMed, arXiv, Nature, IEEE, and more
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
                <p className="text-sm font-medium">Searching academic databases...</p>
                <p className="text-xs text-muted-foreground">
                  Finding journal articles about &ldquo;{query}&rdquo;
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
                  {stage.articles.length} articles found
                </p>
                <p className="text-xs text-muted-foreground">
                  Sorted by relevance
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={reset} className="rounded-lg text-xs">
                New search
              </Button>
            </div>

            <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
              {stage.articles.map((article, i) => {
                const isIngesting = ingestingUrl === article.url;
                const isIngested = ingestedUrls.has(article.url);

                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {article.favicon && (
                            <img
                              src={article.favicon}
                              alt=""
                              className="w-4 h-4 rounded shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors"
                          >
                            {article.title}
                          </a>
                        </div>
                        {article.summary && (
                          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-1.5">
                            {article.summary}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {article.author && (
                            <span className="truncate max-w-[200px]">{article.author}</span>
                          )}
                          {article.publishedDate && (
                            <span>{formatDate(article.publishedDate)}</span>
                          )}
                          <span className="truncate max-w-[200px] opacity-60">
                            {new URL(article.url).hostname}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleInfoToggle(i, article)}
                          className={`p-1.5 rounded-md transition-colors ${
                            expandedInfo === i
                              ? "text-primary bg-primary/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title="Why should I read this?"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                        {article.hasFullText && (
                          <button
                            onClick={() => handleIngest(article)}
                            disabled={isIngesting || isIngested}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isIngested
                                ? "bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300"
                                : isIngesting
                                ? "bg-primary/10 text-primary"
                                : "bg-primary/10 text-primary hover:bg-primary/20"
                            }`}
                          >
                            {isIngesting ? (
                              <>
                                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Ingesting...
                              </>
                            ) : isIngested ? (
                              <>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                Ingested
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                Ingest
                              </>
                            )}
                          </button>
                        )}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                    {expandedInfo === i && (
                      <div className="mt-2.5 pt-2.5 border-t border-border/50">
                        {loadingInsight === i ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Generating insight...
                          </div>
                        ) : insightCache[i] ? (
                          <div className="flex gap-2">
                            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center shrink-0 mt-0.5">
                              <Info className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {insightCache[i]}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
