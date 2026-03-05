"use client";

import { useState, useCallback } from "react";
import type { FileRecord } from "@/types";

export function useFileUpload() {
  const [files, setFiles] = useState<(FileRecord & { action_item_count: number })[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("/api/files");
      const data = await res.json();
      setFiles(data.files);
    } catch {
      setError("Failed to fetch files");
    }
  }, []);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (const file of Array.from(fileList)) {
        formData.append("files", file);
      }

      const res = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      await fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [fetchFiles]);

  const deleteFile = useCallback(async (id: number) => {
    try {
      await fetch(`/api/files/${id}`, { method: "DELETE" });
      await fetchFiles();
    } catch {
      setError("Failed to delete file");
    }
  }, [fetchFiles]);

  const deleteAllFiles = useCallback(async () => {
    try {
      await fetch("/api/files", { method: "DELETE" });
      await fetchFiles();
    } catch {
      setError("Failed to delete files");
    }
  }, [fetchFiles]);

  return { files, uploading, error, uploadFiles, deleteFile, deleteAllFiles, fetchFiles };
}
