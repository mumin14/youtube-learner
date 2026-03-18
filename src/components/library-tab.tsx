"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useProcessingStatus } from "@/hooks/use-processing-status";
import { YouTubeInput } from "@/components/youtube-input";
import { TopicSearch } from "@/components/topic-search";
import { JournalSearch } from "@/components/journal-search";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAppView } from "@/components/app-shell";
import type { Folder, FileRecord, ProcessingStatus } from "@/types";

type FileWithCount = FileRecord & { action_item_count: number };
type InputMode = "youtube" | "file" | "topic" | "journal";

interface ReaderState {
  open: boolean;
  loading: boolean;
  title: string;
  url: string | null;
  content: string;
}

export function LibraryTab() {
  const { files, uploading, error: uploadError, uploadFiles, deleteFile, deleteAllFiles, fetchFiles } = useFileUpload();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [openFolderId, setOpenFolderId] = useState<number | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [reingestingId, setReingestingId] = useState<number | null>(null);
  const [reingestingAll, setReingestingAll] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragFileId, setDragFileId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [specFolderId, setSpecFolderId] = useState<number | null>(null);
  const [specStudyLevel, setSpecStudyLevel] = useState<string | null>(null);
  const [specDetails, setSpecDetails] = useState("");
  const [specText, setSpecText] = useState<string | null>(null);
  const [specFilename, setSpecFilename] = useState<string | null>(null);
  const [specSaving, setSpecSaving] = useState(false);
  const [specUploading, setSpecUploading] = useState(false);
  const specFileRef = useRef<HTMLInputElement>(null);
  const [reader, setReader] = useState<ReaderState>({
    open: false,
    loading: false,
    title: "",
    url: null,
    content: "",
  });
  const { status, startProcessing, reset } = useProcessingStatus();
  const { askAboutFile } = useAppView();
  const renameInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  // Upload section state
  const [inputMode, setInputMode] = useState<InputMode>("youtube");
  const [dragOverUpload, setDragOverUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isProcessing =
    status.status === "running" || status.status === "pending";

  const fetchFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      setFolders(data.folders ?? []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchFiles();
    fetchFolders();
  }, [fetchFiles, fetchFolders]);

  // Upload error handler
  useEffect(() => {
    if (uploadError) toast.error(uploadError);
  }, [uploadError]);

  // Processing completion handler
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
    await fetchFolders();
    try {
      await startProcessing(false);
    } catch {
      // If processing fails to start (e.g. already running), that's fine
    }
  }, [fetchFiles, fetchFolders, startProcessing]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOverUpload(false);
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.endsWith(".txt")
      );
      if (droppedFiles.length > 0) {
        uploadFiles(droppedFiles).then(() => { fetchFiles(); fetchFolders(); });
      } else {
        toast.error("Please drop .txt files only");
      }
    },
    [uploadFiles, fetchFiles, fetchFolders]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        uploadFiles(e.target.files).then(() => { fetchFiles(); fetchFolders(); });
      }
    },
    [uploadFiles, fetchFiles, fetchFolders]
  );

  useEffect(() => {
    if (creatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [creatingFolder]);

  useEffect(() => {
    if (renamingFolderId && renameInputRef.current) {
      renameInputRef.current.focus();
    }
  }, [renamingFolderId]);

  const handleProcess = useCallback(async (folderId: number) => {
    try {
      await startProcessing(true, folderId);
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
      toast.success(`Re-ingested with ${data.chunks} chunks`);
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
      toast.success(`Re-ingested ${data.reingested} videos`);
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

  const handleAutoOrganize = useCallback(async () => {
    setOrganizing(true);
    try {
      const res = await fetch("/api/folders/auto-organize", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auto-organize failed");
      setFolders(data.folders ?? []);
      toast.success(`Organized ${data.organized} resources into ${data.folders?.length ?? 0} folders`);
      fetchFiles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Auto-organize failed");
    } finally {
      setOrganizing(false);
    }
  }, [fetchFiles]);

  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim()) {
      setCreatingFolder(false);
      return;
    }
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create folder");
      setFolders((prev) => [...prev, data.folder]);
      toast.success(`Created folder "${data.folder.name}"`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
      setNewFolderName("");
    }
  }, [newFolderName]);

  const handleRenameFolder = useCallback(async (folderId: number) => {
    if (!renameValue.trim()) {
      setRenamingFolderId(null);
      return;
    }
    try {
      await fetch(`/api/folders/${folderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameValue.trim() }),
      });
      setFolders((prev) =>
        prev.map((f) => (f.id === folderId ? { ...f, name: renameValue.trim() } : f))
      );
    } catch {
      toast.error("Failed to rename folder");
    } finally {
      setRenamingFolderId(null);
      setRenameValue("");
    }
  }, [renameValue]);

  const handleDeleteFolder = useCallback(async (folderId: number) => {
    try {
      await fetch(`/api/folders/${folderId}`, { method: "DELETE" });
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (openFolderId === folderId) setOpenFolderId(null);
      toast.success("Folder deleted");
      fetchFiles();
    } catch {
      toast.error("Failed to delete folder");
    }
  }, [openFolderId, fetchFiles]);

  const openSpecModal = useCallback((folder: Folder) => {
    setSpecFolderId(folder.id);
    setSpecStudyLevel(folder.study_level ?? null);
    setSpecDetails(folder.study_level_details ?? "");
    setSpecText(folder.spec_text ?? null);
    setSpecFilename(folder.spec_filename ?? null);
  }, []);

  const handleSpecUpload = useCallback(async (file: File) => {
    setSpecUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-attachment", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Failed to parse file");
      const data = await res.json();
      setSpecText(data.text);
      setSpecFilename(data.filename);
      toast.success(`Parsed ${data.filename}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setSpecUploading(false);
    }
  }, []);

  const handleSpecSave = useCallback(async () => {
    if (!specFolderId) return;
    setSpecSaving(true);
    try {
      const res = await fetch(`/api/folders/${specFolderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spec_text: specText,
          spec_filename: specFilename,
          study_level: specStudyLevel,
          study_level_details: specStudyLevel === "other" ? specDetails : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setFolders((prev) =>
        prev.map((f) =>
          f.id === specFolderId
            ? { ...f, spec_text: specText, spec_filename: specFilename, study_level: specStudyLevel, study_level_details: specStudyLevel === "other" ? specDetails : null }
            : f
        )
      );
      toast.success("Specification saved");
      setSpecFolderId(null);
    } catch {
      toast.error("Failed to save specification");
    } finally {
      setSpecSaving(false);
    }
  }, [specFolderId, specText, specFilename, specStudyLevel, specDetails]);

  const handleMoveFiles = useCallback(async (fileIds: number[], folderId: number | null) => {
    try {
      await fetch("/api/folders/move-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds, folderId }),
      });
      fetchFiles();
      fetchFolders();
    } catch {
      toast.error("Failed to move file");
    }
  }, [fetchFiles, fetchFolders]);

  // Drag and drop handlers
  const onDragStart = (fileId: number) => {
    setDragFileId(fileId);
  };

  const onDragOver = (e: React.DragEvent, target: string) => {
    e.preventDefault();
    setDragOverTarget(target);
  };

  const onDragLeave = () => {
    setDragOverTarget(null);
  };

  const onDropOnFolder = (e: React.DragEvent, folderId: number) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (dragFileId !== null) {
      handleMoveFiles([dragFileId], folderId);
      setDragFileId(null);
    }
  };

  const onDropOnUnsorted = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverTarget(null);
    if (dragFileId !== null) {
      handleMoveFiles([dragFileId], null);
      setDragFileId(null);
    }
  };

  const onDragEnd = () => {
    setDragFileId(null);
    setDragOverTarget(null);
  };

  // Files grouped by folder
  const unsortedFiles = files.filter((f) => !f.folder_id);
  const folderFiles = (folderId: number) => files.filter((f) => f.folder_id === folderId);
  const totalChunks = files.reduce((sum, f) => sum + (f.chunk_count || 0), 0);
  const totalSize = files.reduce((sum, f) => sum + (f.size_bytes || 0), 0);
  const youtubeFiles = files.filter((f) => f.source_type === "youtube");

  if (files.length === 0) {
    return (
      <div className="space-y-6">
        {/* Upload section always expanded when empty */}
        <UploadSection
          inputMode={inputMode}
          setInputMode={setInputMode}
          onIngested={handleIngested}
          dragOverUpload={dragOverUpload}
          setDragOverUpload={setDragOverUpload}
          onFileDrop={handleFileDrop}
          onFileSelect={handleFileSelect}
          fileInputRef={fileInputRef}
          uploading={uploading}
          isProcessing={isProcessing}
          status={status}
        />

        {/* Onboarding steps */}
        <div className="py-4">
          <p className="text-sm font-medium text-muted-foreground mb-4 px-1">Add a video, article, or document. Socraty builds your study plan from there.</p>
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
      </div>
    );
  }

  const currentFolder = openFolderId ? folders.find((f) => f.id === openFolderId) : null;
  const displayFiles = openFolderId ? folderFiles(openFolderId) : null;

  return (
    <div className="space-y-6">
      {/* Compact stats + upload section — root level only */}
      {!openFolderId && (
        <>
          <div className="flex items-center justify-end gap-3">
            <p className="text-xs text-muted-foreground">
              {files.length} {files.length === 1 ? "source" : "sources"} &middot; {folders.length} {folders.length === 1 ? "folder" : "folders"} &middot; {totalChunks} chunks &middot; {totalSize > 1048576 ? `${(totalSize / 1048576).toFixed(1)} MB` : `${(totalSize / 1024).toFixed(0)} KB`}
            </p>
            {status.status === "completed" && (
              <Button variant="outline" size="sm" onClick={reset} className="rounded-lg text-xs h-6 px-2">
                Reset
              </Button>
            )}
          </div>
          <UploadSection
            inputMode={inputMode}
            setInputMode={setInputMode}
            onIngested={handleIngested}
            dragOverUpload={dragOverUpload}
            setDragOverUpload={setDragOverUpload}
            onFileDrop={handleFileDrop}
            onFileSelect={handleFileSelect}
            fileInputRef={fileInputRef}
            uploading={uploading}
            isProcessing={isProcessing}
            status={status}
          />
        </>
      )}

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

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {openFolderId && currentFolder ? (
            <button
              onClick={() => setOpenFolderId(null)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to folders
            </button>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreatingFolder(true)}
                className="rounded-lg text-xs"
              >
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                New Folder
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoOrganize}
                disabled={organizing || files.length === 0}
                className="rounded-lg text-xs"
              >
                {organizing ? (
                  <>
                    <svg className="w-3.5 h-3.5 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Organizing...
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Auto Organize
                  </>
                )}
              </Button>
            </>
          )}
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

      {/* New folder input */}
      {creatingFolder && (
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
            <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <input
            ref={newFolderInputRef}
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
            }}
            onBlur={handleCreateFolder}
            placeholder="Folder name..."
            className="flex-1 px-3 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      )}

      {/* Folder view or file grid inside folder */}
      {openFolderId && currentFolder ? (
        // Inside a folder — show files
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: currentFolder.color + "20" }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: currentFolder.color }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">{currentFolder.name}</h2>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">{displayFiles?.length ?? 0} resources</p>
                  {(currentFolder.study_level || currentFolder.spec_text) && (
                    <button
                      onClick={() => openSpecModal(currentFolder)}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {currentFolder.study_level
                        ? { undergraduate: "Undergraduate", masters: "Masters", phd: "PhD", adult_learning: "Adult Learning", employment_learning: "Employment Learning", other: "Custom" }[currentFolder.study_level] || currentFolder.study_level
                        : "Spec attached"}
                      {currentFolder.spec_filename ? ` · ${currentFolder.spec_filename}` : ""}
                    </button>
                  )}
                  {!currentFolder.study_level && !currentFolder.spec_text && (
                    <button
                      onClick={() => openSpecModal(currentFolder)}
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-dashed border-primary/40 text-primary/70 hover:bg-primary/5 transition-colors"
                    >
                      + Add Specification
                    </button>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleProcess(currentFolder.id)}
              disabled={isProcessing || !displayFiles?.length}
              className="rounded-lg"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayFiles?.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                isProcessing={isProcessing}
                reingestingId={reingestingId}
                onAskAi={askAboutFile}
                onReingest={handleReingest}
                onDelete={deleteFile}
                onOpen={openReader}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
              />
            ))}
          </div>
        </div>
      ) : (
        // Root view — folders grid + unsorted files
        <>
          {/* Folders grid */}
          {folders.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {folders.map((folder) => {
                const fFiles = folderFiles(folder.id);
                const isDragOver = dragOverTarget === `folder-${folder.id}`;
                return (
                  <div
                    key={folder.id}
                    onDragOver={(e) => onDragOver(e, `folder-${folder.id}`)}
                    onDragLeave={onDragLeave}
                    onDrop={(e) => onDropOnFolder(e, folder.id)}
                    onClick={() => setOpenFolderId(folder.id)}
                    className={`group relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                      isDragOver
                        ? "border-primary bg-primary/5 scale-[1.02] shadow-lg"
                        : "border-border bg-card hover:border-primary/40 hover:shadow-md"
                    }`}
                  >
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: folder.color + "20" }}
                    >
                      <svg
                        className="w-6 h-6"
                        style={{ color: folder.color }}
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M10 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2h-8l-2-2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      {renamingFolderId === folder.id ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") handleRenameFolder(folder.id);
                            if (e.key === "Escape") setRenamingFolderId(null);
                          }}
                          onBlur={() => handleRenameFolder(folder.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full px-2 py-0.5 rounded border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      ) : (
                        <h3 className="text-sm font-semibold truncate">{folder.name}</h3>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {fFiles.length} {fFiles.length === 1 ? "resource" : "resources"}
                      </p>
                    </div>
                    {/* Spec badge */}
                    {(folder.study_level || folder.spec_text) && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                        {folder.study_level
                          ? { undergraduate: "Undergrad", masters: "Masters", phd: "PhD", adult_learning: "Adult", employment_learning: "Employment", other: "Custom" }[folder.study_level] || folder.study_level
                          : "Spec"}
                      </span>
                    )}
                    {/* Folder actions */}
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openSpecModal(folder);
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Specification & Marking Criteria"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingFolderId(folder.id);
                          setRenameValue(folder.name);
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        title="Rename"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(folder.id);
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title="Delete folder"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Unsorted files */}
          {unsortedFiles.length > 0 && (
            <div>
              <div
                className={`flex items-center gap-2 mb-3 px-1 py-2 rounded-lg transition-all ${
                  dragOverTarget === "unsorted"
                    ? "bg-muted/80 border border-dashed border-primary"
                    : ""
                }`}
                onDragOver={(e) => onDragOver(e, "unsorted")}
                onDragLeave={onDragLeave}
                onDrop={onDropOnUnsorted}
              >
                <h3 className="text-sm font-medium text-muted-foreground">
                  {folders.length > 0 ? "Unsorted" : "All Resources"}
                </h3>
                <span className="text-xs text-muted-foreground/60">({unsortedFiles.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {unsortedFiles.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    isProcessing={isProcessing}
                    reingestingId={reingestingId}
                    onAskAi={askAboutFile}
                    onReingest={handleReingest}
                    onDelete={deleteFile}
                    onOpen={openReader}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

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

      {/* Specification & Marking Criteria Modal */}
      {specFolderId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setSpecFolderId(null)}>
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Specification & Marking Criteria</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Set your study level or upload your marking rubric so action items match what your course expects.
              </p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Study Level */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">What level are you studying at?</label>
                <div className="space-y-1.5">
                  {[
                    { value: "undergraduate", label: "Undergraduate" },
                    { value: "masters", label: "Masters" },
                    { value: "phd", label: "PhD" },
                    { value: "adult_learning", label: "Adult Learning" },
                    { value: "employment_learning", label: "Employment Learning" },
                    { value: "other", label: "Other" },
                  ].map((level) => (
                    <label
                      key={level.value}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                        specStudyLevel === level.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <input
                        type="radio"
                        name="study-level"
                        checked={specStudyLevel === level.value}
                        onChange={() => setSpecStudyLevel(level.value)}
                        className="accent-primary"
                      />
                      <span className="text-sm">{level.label}</span>
                    </label>
                  ))}
                </div>

                {specStudyLevel === "other" && (
                  <input
                    type="text"
                    value={specDetails}
                    onChange={(e) => setSpecDetails(e.target.value)}
                    placeholder="What are you learning this for?"
                    className="w-full mt-2 px-3 py-2.5 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
                  />
                )}

                {specStudyLevel && (
                  <button
                    onClick={() => { setSpecStudyLevel(null); setSpecDetails(""); }}
                    className="text-xs text-muted-foreground hover:text-foreground mt-2"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">or upload your specification</span>
                </div>
              </div>

              {/* File Upload */}
              <div>
                {specText ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted/30">
                    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-foreground truncate flex-1">{specFilename || "Document uploaded"}</span>
                    <button
                      onClick={() => { setSpecText(null); setSpecFilename(null); }}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={specFileRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSpecUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      onClick={() => specFileRef.current?.click()}
                      disabled={specUploading}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted/30 transition-all text-sm text-muted-foreground"
                    >
                      {specUploading ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      )}
                      {specUploading ? "Parsing..." : "Upload spec / marking rubric"}
                    </button>
                    <p className="text-xs text-muted-foreground mt-1.5 text-center">
                      Accepts PDF, Word, or text files
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-end gap-2">
              <button
                onClick={() => setSpecFolderId(null)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSpecSave}
                disabled={specSaving}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {specSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- File Card Component ---

function FileCard({
  file,
  isProcessing,
  reingestingId,
  onAskAi,
  onReingest,
  onDelete,
  onOpen,
  onDragStart,
  onDragEnd,
}: {
  file: FileWithCount;
  isProcessing: boolean;
  reingestingId: number | null;
  onAskAi: (fileId: number) => void;
  onReingest: (fileId: number) => void;
  onDelete: (fileId: number) => void;
  onOpen: (fileId: number) => void;
  onDragStart: (fileId: number) => void;
  onDragEnd: () => void;
}) {
  const isYouTube = file.source_type === "youtube";
  const isArticle = file.source_type === "article";
  const thumbnailUrl = isYouTube && file.video_id
    ? `https://img.youtube.com/vi/${file.video_id}/hqdefault.jpg`
    : null;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(file.id)}
      onDragEnd={onDragEnd}
      onClick={() => {
        if (isYouTube && file.youtube_url) {
          window.open(file.youtube_url, "_blank", "noopener,noreferrer");
        } else {
          onOpen(file.id);
        }
      }}
      className="group relative rounded-xl border border-border bg-card overflow-hidden cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md transition-all"
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
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
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
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-gray-600 text-white text-[10px] font-bold tracking-wide">
              FILE
            </div>
          </div>
        )}
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
              onClick={(e) => { e.stopPropagation(); onAskAi(file.id); }}
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-all"
              title="Ask Socraty about this material"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              Ask Socraty
            </button>
          )}
          <div className="flex-1" />
          {isYouTube && (
            <button
              onClick={(e) => { e.stopPropagation(); onReingest(file.id); }}
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
            onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
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
}

// --- Upload Section Component ---

function UploadSection({
  inputMode,
  setInputMode,
  onIngested,
  dragOverUpload,
  setDragOverUpload,
  onFileDrop,
  onFileSelect,
  fileInputRef,
  uploading,
  isProcessing,
  status,
}: {
  inputMode: InputMode;
  setInputMode: (mode: InputMode) => void;
  onIngested: () => void;
  dragOverUpload: boolean;
  setDragOverUpload: (v: boolean) => void;
  onFileDrop: (e: React.DragEvent) => void;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  isProcessing: boolean;
  status: ProcessingStatus;
}) {
  return (
    <div className="space-y-4">
      {/* Mode toggle — never shrink or wrap */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit shrink-0">
        <button
          onClick={() => setInputMode("youtube")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
            inputMode === "youtube"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          YouTube URL
        </button>
        <button
          onClick={() => setInputMode("file")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
            inputMode === "file"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Upload Files
        </button>
        <button
          onClick={() => setInputMode("topic")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
            inputMode === "topic"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Topic Search
        </button>
        <button
          onClick={() => setInputMode("journal")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-all ${
            inputMode === "journal"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Journal Articles
        </button>
      </div>

      {/* Input content */}
      {inputMode === "youtube" && <YouTubeInput onIngested={onIngested} />}
      {inputMode === "topic" && <TopicSearch onIngested={onIngested} />}
      {inputMode === "journal" && <JournalSearch onIngested={onIngested} />}
      {inputMode === "file" && (
        <div
          onDrop={onFileDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOverUpload(true); }}
          onDragLeave={() => setDragOverUpload(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`relative overflow-hidden rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${
            dragOverUpload
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt"
            onChange={onFileSelect}
            className="hidden"
          />
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold">
                {uploading ? "Uploading files..." : "Drop transcript files here"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                or click to browse &middot; accepts .txt files
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Processing progress */}
      {isProcessing && (
        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
          <div className="animate-shimmer h-0.5" />
          <CardContent className="py-4 px-5">
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
