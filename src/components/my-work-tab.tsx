"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { Folder } from "@/types";

const DIFFICULTY_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  easy: { dot: "bg-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300" },
  medium: { dot: "bg-amber-500", bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300" },
  hard: { dot: "bg-red-500", bg: "bg-red-50 dark:bg-red-950", text: "text-red-700 dark:text-red-300" },
};

interface WorkNote {
  id: number;
  content: string;
  created_at: string;
  share_token: string | null;
  actionItem: {
    id: number;
    title: string;
    difficulty: string;
    topic: string | null;
  };
  assessment: {
    score: number;
    grade: string;
    strengths: string[];
    improvements: string[];
  } | null;
  folder: { id: number; name: string; color: string } | null;
  filename: string;
  source_type: string;
}

export function MyWorkTab() {
  const [notes, setNotes] = useState<WorkNote[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [sharingFolderId, setSharingFolderId] = useState<number | null>(null);
  const [allNotesShareToken, setAllNotesShareToken] = useState<string | null>(null);

  // Fetch folders on mount
  useEffect(() => {
    fetch("/api/folders")
      .then((r) => r.json())
      .then((data) => setFolders(data.folders ?? []))
      .catch(() => {});
  }, []);

  // Fetch notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedFolder
        ? `/api/my-work?folderId=${selectedFolder}`
        : "/api/my-work";
      const res = await fetch(url);
      const data = await res.json();
      setNotes(data.notes ?? []);
      if (data.allNotesShareToken !== undefined) {
        setAllNotesShareToken(data.allNotesShareToken);
      }
    } catch {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [selectedFolder]);

  useEffect(() => {
    fetchNotes();
    setShareToken(null);
    setSharingFolderId(null);
  }, [fetchNotes]);

  const toggleExpanded = (id: number) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownloadPdf = (noteId?: number) => {
    let url = "/api/my-work/export";
    if (noteId) {
      url += `?noteId=${noteId}`;
    } else if (selectedFolder) {
      url += `?folderId=${selectedFolder}`;
    }
    window.open(url, "_blank");
  };

  const handleShare = async () => {
    if (!selectedFolder) return;
    try {
      const res = await fetch(`/api/folders/${selectedFolder}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShareToken(data.token);
      setSharingFolderId(Number(selectedFolder));
      const shareUrl = `${window.location.origin}/share/folder/${data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Failed to generate share link");
    }
  };

  const handleStopSharing = async () => {
    if (!sharingFolderId) return;
    try {
      await fetch(`/api/folders/${sharingFolderId}/share`, { method: "DELETE" });
      setShareToken(null);
      setSharingFolderId(null);
      toast.success("Sharing stopped");
    } catch {
      toast.error("Failed to stop sharing");
    }
  };

  const handleShareAll = async () => {
    try {
      const res = await fetch("/api/my-work/share", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAllNotesShareToken(data.token);
      const shareUrl = `${window.location.origin}/share/notes/${data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");
    } catch {
      toast.error("Failed to generate share link");
    }
  };

  const handleStopSharingAll = async () => {
    try {
      await fetch("/api/my-work/share", { method: "DELETE" });
      setAllNotesShareToken(null);
      toast.success("Sharing stopped");
    } catch {
      toast.error("Failed to stop sharing");
    }
  };

  const handleShareNote = async (noteId: number) => {
    try {
      const res = await fetch(`/api/my-work/${noteId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, share_token: data.token } : n))
      );
      const shareUrl = `${window.location.origin}/share/note/${data.token}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Note share link copied");
    } catch {
      toast.error("Failed to share note");
    }
  };

  const handleStopSharingNote = async (noteId: number) => {
    try {
      await fetch(`/api/my-work/${noteId}/share`, { method: "DELETE" });
      setNotes((prev) =>
        prev.map((n) => (n.id === noteId ? { ...n, share_token: null } : n))
      );
      toast.success("Note sharing stopped");
    } catch {
      toast.error("Failed to stop sharing note");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Folder filter */}
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All Folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>

          {notes.length > 0 && (() => {
            const scored = notes.filter((n) => n.assessment?.score != null);
            const avg = scored.length > 0 ? Math.round(scored.reduce((s, n) => s + (n.assessment?.score ?? 0), 0) / scored.length) : null;
            const mastery = notes.filter((n) => n.actionItem.difficulty === "hard" && n.assessment && n.assessment.score >= 80).length;
            return (
            <span className="text-sm text-muted-foreground">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
              {avg !== null && <> · Avg score: {avg}/100</>}
              {mastery > 0 && <> · {mastery} at mastery level</>}
            </span>
            );
          })()}
        </div>

        <div className="flex items-center gap-2">
          {/* Share button — folder share or share all */}
          {selectedFolder ? (
            shareToken ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Shared</span>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/share/folder/${shareToken}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  }}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  Copy Link
                </button>
                <button
                  onClick={handleStopSharing}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  Stop Sharing
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleShare} className="rounded-lg">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Folder
              </Button>
            )
          ) : notes.length > 0 && (
            allNotesShareToken ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">All notes shared</span>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/share/notes/${allNotesShareToken}`;
                    navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  }}
                  className="text-xs text-primary hover:text-primary/80 font-medium"
                >
                  Copy Link
                </button>
                <button
                  onClick={handleStopSharingAll}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  Stop Sharing
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleShareAll} className="rounded-lg">
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share All
              </Button>
            )
          )}

          {/* Export button */}
          {notes.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadPdf()}
              className="rounded-lg"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {selectedFolder ? "Export Folder PDF" : "Export All PDF"}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="w-6 h-6 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <svg className="w-12 h-12 mx-auto text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-muted-foreground">No study notes yet</p>
          <p className="text-sm text-muted-foreground/60">
            When you write notes on an action item and get graded, they show up here — your proof of understanding.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => {
            const dc = DIFFICULTY_COLORS[note.actionItem.difficulty] || DIFFICULTY_COLORS.easy;
            const isExpanded = expandedNotes.has(note.id);
            const isLong = note.content.length > 200;

            return (
              <Card key={note.id} className="border-border bg-card">
                <CardContent className="p-4">
                  {/* Action item header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold leading-snug">{note.actionItem.title}</h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${dc.bg} ${dc.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dc.dot}`} />
                          {note.actionItem.difficulty}
                        </span>
                        {note.actionItem.topic && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {note.actionItem.topic}
                          </span>
                        )}
                        {note.folder && (
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: note.folder.color + "15",
                              color: note.folder.color,
                            }}
                          >
                            {note.folder.name}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">
                          {note.source_type === "youtube" ? "\u25B6 " : ""}{note.filename}
                        </span>
                      </div>
                    </div>
                    {note.assessment && (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary shrink-0">
                        {note.assessment.grade}
                      </span>
                    )}
                  </div>

                  {/* Note content */}
                  <div className="bg-muted/40 rounded-lg p-3 mb-3">
                    <p className={`text-sm text-foreground whitespace-pre-wrap ${
                      !isExpanded && isLong ? "line-clamp-4" : ""
                    }`}>
                      {note.content}
                    </p>
                    {isLong && (
                      <button
                        onClick={() => toggleExpanded(note.id)}
                        className="text-xs text-primary hover:text-primary/80 mt-1 font-medium"
                      >
                        {isExpanded ? "Show less" : "Show more"}
                      </button>
                    )}
                  </div>

                  {/* Assessment */}
                  {note.assessment && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${note.assessment.score}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {note.assessment.score}/100
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {note.assessment.strengths.length > 0 && (
                          <div>
                            <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">Strengths</p>
                            <ul className="space-y-0.5">
                              {note.assessment.strengths.map((s, i) => (
                                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                                  <span className="text-emerald-500 mt-px shrink-0">+</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {note.assessment.improvements.length > 0 && (
                          <div>
                            <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mb-1">To Improve</p>
                            <ul className="space-y-0.5">
                              {note.assessment.improvements.map((s, i) => (
                                <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-1">
                                  <span className="text-amber-500 mt-px shrink-0">-</span>
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <span className="text-[10px] text-muted-foreground/60">
                      {new Date(note.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <div className="flex items-center gap-3">
                      {note.share_token ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={async () => {
                              const url = `${window.location.origin}/share/note/${note.share_token}`;
                              await navigator.clipboard.writeText(url);
                              toast.success("Share link copied");
                            }}
                            className="inline-flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                            </svg>
                            Copy Link
                          </button>
                          <button
                            onClick={() => handleStopSharingNote(note.id)}
                            className="text-[10px] text-destructive hover:text-destructive/80 transition-colors"
                          >
                            Stop
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleShareNote(note.id)}
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Share
                        </button>
                      )}
                      <button
                        onClick={() => handleDownloadPdf(note.id)}
                        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
